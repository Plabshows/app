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

    async function fetchActs(filters = {}) {
        const { query, category } = filters;
        try {
            setLoading(true);

            // Check if Supabase is actually configured
            const isSupabaseConfigured = process.env.EXPO_PUBLIC_SUPABASE_URL &&
                process.env.EXPO_PUBLIC_SUPABASE_URL !== 'your-supabase-url' &&
                process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

            if (!isSupabaseConfigured) {
                setActs(MOCK_ACTS);
                return;
            }

            let supabaseQuery = supabase
                .from('acts')
                .select('*, category:categories(name, slug)')
                .eq('is_published', true);

            if (category) {
                // Filter by category name (joined column)
                // Note: categories is a joined table, we use dot notation for filtering nested data if supported,
                // otherwise we filter on acts.category_id after fetching or use a join-aware filter.
                // In Supabase, filtering on a joined table's column:
                supabaseQuery = supabaseQuery.filter('categories.name', 'eq', category);
            }

            if (query) {
                supabaseQuery = supabaseQuery.ilike('name', `%${query}%`);
            }

            const { data, error } = await supabaseQuery;

            if (data && data.length > 0) {
                const mappedData = data.map(act => ({
                    ...act,
                    category: act.category?.name || 'Uncategorized'
                }));
                setActs(mappedData);
            } else if (!query && !category) {
                setActs(MOCK_ACTS);
            } else {
                setActs([]); // No results for the filter
            }

            if (error) {
                throw error;
            }
        } catch (e) {
            console.error('Error fetching acts:', e);
            setError(e);
            setActs(MOCK_ACTS);
        } finally {
            setLoading(false);
        }
    }

    return { acts, loading, error, refetch: fetchActs };
}
