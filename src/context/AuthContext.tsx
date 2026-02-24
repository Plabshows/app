import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type AuthContextType = {
    session: Session | null;
    user: User | null;
    profile: any | null;
    artistAct: any | null;
    impersonatedProfile: any | null;
    impersonatedAct: any | null;
    isImpersonating: boolean;
    loading: boolean;
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
    impersonatedProfile: null,
    impersonatedAct: null,
    isImpersonating: false,
    loading: true,
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
            setLoading(false);
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
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
            console.log('[Auth Event]', event);
            handleAuthStateChange(currentSession);
        });

        // Small delay to allow the subscription to fire its initial event if it's going to
        const timer = setTimeout(async () => {
            if (mounted && loading) {
                console.log('[Auth Context] Manual session check (fallback)');
                const { data: { session: initialSession } } = await supabase.auth.getSession();
                if (mounted && loading) {
                    handleAuthStateChange(initialSession);
                }
            }
        }, 500);

        return () => {
            mounted = false;
            subscription.unsubscribe();
            clearTimeout(timer);
        };
    }, [loading]);

    const refreshAuth = async () => {
        setLoading(true);
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
            await fetchProfileData(currentSession.user.id);
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

    return (
        <AuthContext.Provider value={{
            session,
            user,
            profile,
            artistAct,
            impersonatedProfile,
            impersonatedAct,
            isImpersonating: !!impersonatedProfile,
            loading,
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
