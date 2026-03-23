import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project-url.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

// Custom storage adapter to handle SSR (Server Side Rendering) where AsyncStorage might glitch
const ExpoStorage = {
    getItem: (key) => {
        if (Platform.OS === 'web' && typeof window === 'undefined') return null;
        return AsyncStorage.getItem(key);
    },
    setItem: (key, value) => {
        if (Platform.OS === 'web' && typeof window === 'undefined') return;
        AsyncStorage.setItem(key, value);
    },
    removeItem: (key) => {
        if (Platform.OS === 'web' && typeof window === 'undefined') return;
        AsyncStorage.removeItem(key);
    },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: ExpoStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

// AppState listener using a safer check
if (Platform.OS !== 'web' || typeof window !== 'undefined') {
    AppState.addEventListener('change', (state) => {
        if (state === 'active') {
            supabase.auth.startAutoRefresh();
        } else {
            supabase.auth.stopAutoRefresh();
        }
    });
}

