import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface ActProfile {
    name: string;
    avatar_url: string;
}

export interface Review {
    id: string;
    rating: number;
    comment: string;
    created_at: string;
    profile: {
        name: string;
        avatar_url: string;
    };
}

export interface ActDetailData {
    id: string;
    name: string;
    title: string;
    description: string;
    category: string;
    genre: string;
    artist_type: string;
    location_base: string;
    experience_years: number;
    image_url: string;
    video_url: string;
    photos_url: string[];
    videos_url: string[];
    packages: any[];
    technical_specs: string;
    technical_rider_url: string;
    is_verified: boolean;
    is_pro: boolean;
    artistName: string;
    avatar_url: string;
    location: string;
    profile?: ActProfile;
    reviews?: Review[];
}

export function useAct(id: string | string[]) {
    const [act, setAct] = useState<ActDetailData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        if (id) {
            const actId = Array.isArray(id) ? id[0] : id;
            fetchAct(actId);
        }
    }, [id]);

    async function fetchAct(actId: string) {
        try {
            setLoading(true);
            setError(null);

            // Fetch act with joined profile for avatar and name
            // Correct syntax for multi-relation joins is alias:table!fk_column
            const { data, error: fetchError } = await supabase
                .from('acts')
                .select(`
                    *,
                    profile:profiles!owner_id(name, avatar_url),
                    reviews(
                        id,
                        rating,
                        comment,
                        created_at,
                        profile:profiles!reviewer_id(name, avatar_url)
                    )
                `)
                .eq('id', actId)
                .single();

            if (fetchError) {
                console.error('Supabase fetch error:', fetchError);
                throw fetchError;
            }

            if (data) {
                // Map the joined data for easier consumption
                const mappedData: ActDetailData = {
                    ...data,
                    category: data.category || 'Artist',
                    artistName: (data.profile as any)?.name || data.name || data.title || 'Artist',
                    avatar_url: (data.profile as any)?.avatar_url,
                    location: data.location_base || 'Dubai, UAE',
                    reviews: data.reviews || []
                };
                setAct(mappedData);
            } else {
                setError(new Error('No data returned for act ID: ' + actId));
            }
        } catch (e: any) {
            console.error('Error fetching act in hook:', e);
            setError(e);
        } finally {
            setLoading(false);
        }
    }

    return { act, loading, error, refetch: fetchAct };
}
