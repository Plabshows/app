import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface Act {
    id: string;
    name: string;
    title?: string;
    category: string;
    category_id?: string;
    category_ids?: string[];
    categories?: string[];
    image_url: string;
    banner_url?: string;
    avatar_url?: string;
    gallery_urls?: string[];
    video_url?: string;
    location?: string;
    location_base?: string;
    city?: string;
    description?: string;
    technical_specs?: string;
    price_guide?: string;
    owner_id?: string;
    role?: string;
    is_published: boolean;
    created_at: string;
    photos_url?: string[];
    videos_url?: string[];
    packages?: { name: string; price: string; duration: string; description: string }[];
}

import { CATEGORY_MAP } from '../constants/categories';
export { CATEGORY_MAP };

export function useActs() {
    const [acts, setActs] = useState<Act[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        fetchActs();
    }, []);

    async function fetchActs(filters: { query?: string; category?: string } = {}) {
        const { query, category } = filters;
        try {
            setLoading(true);

            // Simple select — no JOIN to avoid PGRST200 cache issues
            let q = supabase
                .from('profiles')
                .select('*')
                .eq('is_published', true)
                .or('role.eq.artist,role.eq.talent')
                .order('created_at', { ascending: false });

            if (query) {
                q = q.ilike('name', `%${query}%`);
            }

            const { data, error: fetchError } = await q;

            if (fetchError) throw fetchError;

            if (data && data.length > 0) {
                let mapped = data.map((item: any) => ({
                    ...item,
                    // Resolve category name from static map
                    category: CATEGORY_MAP[item.category_id] || item.category || 'Artist',
                    category_ids: item.category_ids || [],
                    categories: item.categories || [],
                    // Best available image — no filtering
                    image_url: item.avatar_url
                        || item.banner_url
                        || (Array.isArray(item.gallery_urls) ? item.gallery_urls[0] : null)
                        || 'https://euphonious-kelpie-cd0a27.netlify.app/images/default-banner.png',
                    location_base: item.city || 'International',
                    location: item.city || 'International',
                }));

                // Client-side category filter applied after fetching all
                if (category) {
                    mapped = mapped.filter(a =>
                        a.category?.toLowerCase() === category.toLowerCase() ||
                        a.categories?.some((c: string) => c.toLowerCase() === category.toLowerCase())
                    );
                }

                setActs(mapped);
            } else {
                setActs([]);
            }
        } catch (e) {
            console.error('[useActs] Error:', e);
            setError(e);
            setActs([]);
        } finally {
            setLoading(false);
        }
    }

    return { acts, loading, error, refetch: fetchActs };
}
