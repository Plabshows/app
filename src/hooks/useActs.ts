import { useEffect, useState } from 'react';
import { ACTS as MOCK_ACTS } from '../data/mock';
import { supabase } from '../lib/supabase';

export interface Act {
    id: string;
    name: string;
    title?: string;
    category: string;
    image_url: string;
    video_url?: string;
    location?: string;
    description?: string;
    technical_specs?: string;
    specs?: string;
    price_guide?: string;
    price_range?: string;
    owner_id: string;
    is_published: boolean;
    created_at: string;
}

export function useActs() {
    // Initialize with mock data to prevent 'never[]' type inference issues and show data immediately
    const [acts, setActs] = useState<Act[]>(MOCK_ACTS as any);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        fetchActs();
    }, []);

    async function fetchActs(filters: { query?: string; category?: string } = {}) {
        const { query, category } = filters;
        try {
            setLoading(true);

            // Check if Supabase is actually configured
            const isSupabaseConfigured = process.env.EXPO_PUBLIC_SUPABASE_URL &&
                process.env.EXPO_PUBLIC_SUPABASE_URL !== 'your-supabase-url' &&
                process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

            if (!isSupabaseConfigured) {
                setActs(MOCK_ACTS as any);
                return;
            }

            let supabaseQuery = supabase
                .from('acts')
                .select('*, category:categories(name, slug)')
                .eq('is_published', true);

            if (category) {
                // Filter by category name (joined column)
                // Note: In Supabase, filtering on a joined table's column:
                supabaseQuery = supabaseQuery.filter('category.name', 'eq', category);
            }

            if (query) {
                supabaseQuery = supabaseQuery.ilike('name', `%${query}%`);
            }

            const { data, error } = await supabaseQuery;

            if (data && data.length > 0) {
                const mappedData = data.map((act: any) => ({
                    ...act,
                    category: act.category?.name || 'Uncategorized'
                }));
                setActs(mappedData);
            } else if (!query && !category) {
                setActs(MOCK_ACTS as any);
            } else {
                setActs([]); // No results for the filter
            }

            if (error) {
                throw error;
            }
        } catch (e) {
            console.error('Error fetching acts:', e);
            setError(e);
            setActs(MOCK_ACTS as any);
        } finally {
            setLoading(false);
        }
    }

    return { acts, loading, error, refetch: fetchActs };
}
