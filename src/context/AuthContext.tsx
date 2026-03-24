import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';

type AuthContextType = {
    session: Session | null;
    user: User | null;
    profile: any | null;
    artistAct: any | null;
    realUser: User | null;
    realProfile: any | null;
    impersonatedProfile: any | null;
    impersonatedAct: any | null;
    isImpersonating: boolean;
    loading: boolean;
    unreadCount: number;
    signOut: () => Promise<void>;
    refreshAuth: () => Promise<void>;
    startImpersonation: (userId: string) => Promise<void>;
    stopImpersonation: () => void;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    profile: null,
    artistAct: null,
    realUser: null,
    realProfile: null,
    impersonatedProfile: null,
    impersonatedAct: null,
    isImpersonating: false,
    loading: true,
    unreadCount: 0,
    signOut: async () => { },
    refreshAuth: async () => { },
    startImpersonation: async () => { },
    stopImpersonation: () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [artistAct, setArtistAct] = useState<any | null>(null);
    const [impersonatedProfile, setImpersonatedProfile] = useState<any | null>(null);
    const [impersonatedAct, setImpersonatedAct] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchProfileData = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
                setProfile({
                    id: userId,
                    role: 'user'
                });
            } else {
                setProfile(data);

                // Fetch artist act if user is an artist
                const { data: actData } = await supabase
                    .from('acts')
                    .select('*')
                    .eq('owner_id', userId)
                    .single();

                setArtistAct(actData);
            }
        } catch (err) {
            console.error('Unexpected error fetching profile:', err);
        } finally {
            fetchUnreadCount(userId);
            setLoading(false);
        }
    };

    const [fetchingUnread, setFetchingUnread] = useState(false);
    const fetchUnreadCount = async (userId: string) => {
        if (!userId || fetchingUnread) return;
        setFetchingUnread(true);
        try {
            let supportUnread = 0;
            let bookingUnread = 0;

            if (profile?.role === 'admin' || profile?.is_admin) {
                // Admin sees ALL unread support messages
                const { count: sCount } = await supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'unread');
                supportUnread = sCount || 0;
                
                // Admin sees ALL unread booking messages
                const { count: bCount } = await supabase
                    .from('booking_messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('is_read', false)
                    .neq('sender_role', 'admin');
                bookingUnread = bCount || 0;
            } else {
                // Regular user logic: Support messages sent TO them
                const { count: sCount } = await supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('receiver_id', userId)
                    .eq('status', 'unread');
                supportUnread = sCount || 0;

                // Regular user logic: Booking messages in their threads not sent BY them
                const { data: userBookings } = await supabase
                    .from('booking_requests')
                    .select('id')
                    .or(`client_id.eq.${userId},artist_id.eq.${userId}`);
                
                if (userBookings && userBookings.length > 0) {
                    const bookingIds = userBookings.map(b => b.id);
                    const { count: bCount } = await supabase
                        .from('booking_messages')
                        .select('*', { count: 'exact', head: true })
                        .in('booking_request_id', bookingIds)
                        .neq('sender_id', userId)
                        .eq('is_read', false);
                    bookingUnread = bCount || 0;
                }
            }
            setUnreadCount(supportUnread + bookingUnread);
        } catch (err) {
            console.error('Error fetching unread count:', err);
        } finally {
            setFetchingUnread(false);
        }
    };

    const startImpersonation = async (userId: string) => {
        if (!profile?.is_admin && profile?.role !== 'admin') {
            console.error('Only admins can impersonate users.');
            return;
        }

        try {
            const { data: prof } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            const { data: act } = await supabase
                .from('acts')
                .select('*')
                .eq('owner_id', userId)
                .single();

            setImpersonatedProfile(prof);
            setImpersonatedAct(act);
            console.log(`[Auth] Impersonating user: ${userId}`);
        } catch (err) {
            console.error('Error starting impersonation:', err);
        }
    };

    const stopImpersonation = () => {
        setImpersonatedProfile(null);
        setImpersonatedAct(null);
        console.log('[Auth] Impersonation stopped');
    };

    useEffect(() => {
        let mounted = true;
        if (Platform.OS === 'web') {
            console.log('[Auth Context] Current URL:', window.location.href);
            console.log('[Auth Context] Current Hash:', window.location.hash);
        }

        const handleAuthStateChange = async (currentSession: Session | null) => {
            if (!mounted) return;

            setSession(currentSession);
            setUser(currentSession?.user ?? null);

            if (currentSession?.user) {
                await fetchProfileData(currentSession.user.id);
            } else if (mounted) {
                setProfile(null);
                setArtistAct(null);
                setImpersonatedProfile(null);
                setImpersonatedAct(null);
                setLoading(false);
            }
        };

        // Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            console.log('[Auth Event]', event, currentSession?.user?.email);
            
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                handleAuthStateChange(currentSession);
            } else if (event === 'SIGNED_OUT') {
                handleAuthStateChange(null);
            }
        });

        // Initial session check
        const checkInitialSession = async () => {
            try {
                const { data: { session: initialSession }, error } = await supabase.auth.getSession();
                if (error) {
                    console.error('[Auth Context] Error getting initial session:', error);
                }
                
                if (initialSession && mounted) {
                    console.log('[Auth Context] Initial session found:', initialSession.user?.email);
                    handleAuthStateChange(initialSession);
                } else if (mounted) {
                    console.log('[Auth Context] No initial session found');
                    setLoading(false);
                }
            } catch (err) {
                if (mounted) {
                    console.error('[Auth Context] Fatal error in initial session check:', err);
                    setLoading(false);
                }
            }
        };

        checkInitialSession();

        // Subscribe to unread count changes
        let supportSub: any;
        let bookingSub: any;

        if (user?.id) {
            supportSub = supabase.channel('global_support_unread')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchUnreadCount(user.id))
                .subscribe();
            
            bookingSub = supabase.channel('global_booking_unread')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_messages' }, () => fetchUnreadCount(user.id))
                .subscribe();
        }

        return () => {
            mounted = false;
            subscription.unsubscribe();
            if (supportSub) supabase.removeChannel(supportSub);
            if (bookingSub) supabase.removeChannel(bookingSub);
        };
    }, [user?.id]);

    const refreshAuth = async () => {
        setLoading(true);
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
            await fetchProfileData(currentSession.user.id);
            
            // Also refresh impersonated data if active
            if (impersonatedProfile) {
                const { data: prof } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', impersonatedProfile.id)
                    .single();
                const { data: act } = await supabase
                    .from('acts')
                    .select('*')
                    .eq('owner_id', impersonatedProfile.id)
                    .single();
                
                if (prof) setImpersonatedProfile(prof);
                if (act) setImpersonatedAct(act);
            }
        } else {
            setLoading(false);
        }
    };

    const signOut = async () => {
        setLoading(true);
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Error signing out:', error);
        } finally {
            setSession(null);
            setUser(null);
            setProfile(null);
            setArtistAct(null);
            setImpersonatedProfile(null);
            setImpersonatedAct(null);
            setLoading(false);
        }
    };

    // Determined effective user and profile (impersonated if active)
    const effectiveUser = impersonatedProfile 
        ? { id: impersonatedProfile.id, email: impersonatedProfile.email } as User 
        : user;
    const effectiveProfile = impersonatedProfile || profile;
    const effectiveAct = impersonatedAct || artistAct;

    return (
        <AuthContext.Provider value={{
            session,
            user: effectiveUser,
            profile: effectiveProfile,
            artistAct: effectiveAct,
            realUser: user,
            realProfile: profile,
            impersonatedProfile,
            impersonatedAct,
            isImpersonating: !!impersonatedProfile,
            loading,
            unreadCount,
            signOut,
            refreshAuth,
            startImpersonation,
            stopImpersonation
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
