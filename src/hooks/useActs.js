import { useEffect, useState } from 'react';
import { ACTS as MOCK_ACTS } from '../data/mock';
import { supabase } from '../lib/supabase';

export function useActs() {
    // Initialize with mock data to prevent 'never[]' type inference issues and show data immediately
    const [acts, setActs] = useState(MOCK_ACTS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchActs();
    }, []);

    async function fetchActs() {
        try {
            setLoading(true);

            // Check if Supabase is actually configured with valid keys
            const isSupabaseConfigured = process.env.EXPO_PUBLIC_SUPABASE_URL &&
                process.env.EXPO_PUBLIC_SUPABASE_URL !== 'your-supabase-url' &&
                process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

            if (!isSupabaseConfigured) {
                console.log('Supabase not fully configured, using mock data.');
                setActs(MOCK_ACTS);
                return;
            }

            const { data, error } = await supabase
                .from('acts')
                .select('*, category:categories(name, slug)')
                .eq('is_published', true);

            if (data && data.length > 0) {
                // Flatten category object to string for frontend compatibility with existing components
                const mappedData = data.map(act => ({
                    ...act,
                    category: act.category?.name || 'Uncategorized'
                }));
                setActs(mappedData);
            } else {
                // Fallback if DB is connected but empty
                console.log('No published acts in DB, using mock data.');
                // Note: Mock data still uses 'title', we might want to update it later
                setActs(MOCK_ACTS);
            }

            if (error) {
                throw error;
            }
        } catch (e) {
            console.error('Error fetching acts:', e);
            setError(e);
            // Fallback on error - acts is already MOCK_ACTS from initial state, but explicit set ensures consistency
            setActs(MOCK_ACTS);
        } finally {
            setLoading(false);
        }
    }

    return { acts, loading, error, refetch: fetchActs };
}
