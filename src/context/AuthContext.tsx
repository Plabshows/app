import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type AuthContextType = {
    session: Session | null;
    user: User | null;
    profile: any | null;
    artistAct: any | null;
    loading: boolean;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    profile: null,
    artistAct: null,
    loading: true,
    signOut: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [artistAct, setArtistAct] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // --- GHOST MODE CHECK ---
        const checkGhostMode = async () => {
            try {
                const ghostId = await AsyncStorage.getItem('GHOST_AUTH_USER_ID');
                if (ghostId) {
                    console.log('[AuthContext] GHOST MODE ACTIVE for:', ghostId);
                    // Use a more generic mock user structure for the demo
                    const mockUser = { id: ghostId, email: 'demo@manuelforner.com' } as any;
                    const mockSession = { user: mockUser, access_token: 'ghost_token' } as any;

                    setSession(mockSession);
                    setUser(mockUser);
                    await fetchProfile(ghostId);
                    return true;
                }
            } catch (e) {
                console.error('[AuthContext] Error checking ghost mode:', e);
            }
            return false;
        };

        const initializeAuth = async () => {
            const isGhost = await checkGhostMode();
            if (isGhost) return;

            // Get initial session if not in ghost mode
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                await fetchProfile(session.user.id);
            } else {
                setLoading(false);
            }
        };

        initializeAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                await fetchProfile(session.user.id);
            } else {
                setProfile(null);
                setArtistAct(null);
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
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

    const signOut = async () => {
        await AsyncStorage.removeItem('GHOST_AUTH_USER_ID');
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ session, user, profile, artistAct, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
