import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface Act {
    id: string;
    name: string;
    title?: string;
    category: string;
    category_id?: string;
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

// Static category map (avoids PostgREST join issues)
const CATEGORY_MAP: Record<string, string> = {
    '636d2dcd-3e1d-4b1e-b111-a6400ca1b025': 'Musician',
    'bf451e54-4edb-4453-8ff7-f74a3882e89c': 'Dancer',
    'f26b86db-2ef5-476b-bf53-3a09d4ecba17': 'Magic',
    '42f050db-aa72-4a8f-97ba-8521b4c1ec03': 'Roaming',
    '95585a4e-1cc1-417e-a064-7f210b9c2996': 'Fire & Flow',
    '6e2eba1a-54ee-4360-95b1-932089633089': 'Circus',
    'bff4df18-b95f-4f7e-821b-ab303b030c9a': 'DJ',
    '7dc05cb1-fa8a-4317-9c17-d2682831d73c': 'Specialty Act',
    'd2a26c3d-cae5-44be-b93d-69dff6d8413b': 'Presenter',
    '0213d374-c4f2-48b7-bfe8-da15cfd79ed9': 'Comedian',
    '0ca60f4f-2c8b-421c-9711-88f1e9327cb8': 'Singer',
    '3f2c5fde-a1b9-4e10-a653-8f851a34b678': 'Others',
    '8a662c88-7702-4ec7-bd70-671d707a0774': 'Art',
};

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
                .eq('is_public', true)
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
                        a.category?.toLowerCase() === category.toLowerCase()
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
