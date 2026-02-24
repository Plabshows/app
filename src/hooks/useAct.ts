import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface ActProfile {
    name: string;
    avatar_url: string;
    banner_url?: string;
    managed_by_admin?: boolean;
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
    banner_url?: string;
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

            // Step 1: Fetch the act with its category
            const { data: actData, error: actError } = await supabase
                .from('acts')
                .select(`
                    *,
                    category_data:categories(name)
                `)
                .eq('id', actId)
                .single();

            if (actError) {
                console.error('[useAct] Supabase act fetch error:', actError);
                throw actError;
            }

            if (!actData) {
                setError(new Error('No data returned for act ID: ' + actId));
                return;
            }

            // Step 2: Fetch the owner's profile separately (avoids FK join issues)
            let ownerProfile: ActProfile | null = null;
            if (actData.owner_id) {
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('name, avatar_url, banner_url, managed_by_admin')
                    .eq('id', actData.owner_id)
                    .single();

                if (profileError) {
                    console.warn('[useAct] Could not fetch owner profile:', profileError.message);
                } else {
                    ownerProfile = profileData;
                }
            }

            // Step 3: Fetch reviews separately
            let reviews: Review[] = [];
            try {
                const { data: reviewData } = await supabase
                    .from('reviews')
                    .select('id, rating, comment, created_at, reviewer_id')
                    .eq('act_id', actId)
                    .order('created_at', { ascending: false });

                if (reviewData && reviewData.length > 0) {
                    // Fetch reviewer profiles
                    const reviewerIds = reviewData.map(r => r.reviewer_id).filter(Boolean);
                    const { data: reviewerProfiles } = await supabase
                        .from('profiles')
                        .select('id, name, avatar_url')
                        .in('id', reviewerIds);

                    const profileMap = new Map((reviewerProfiles || []).map(p => [p.id, p]));

                    reviews = reviewData.map(r => ({
                        ...r,
                        profile: profileMap.get(r.reviewer_id) || { name: 'Client', avatar_url: '' },
                    }));
                }
            } catch (revErr) {
                console.warn('[useAct] Reviews fetch skipped:', revErr);
            }

            // Step 4: Map all data for the UI
            const mappedData: ActDetailData = {
                ...actData,
                category: (actData.category_data as any)?.name || actData.category || 'Artist',
                artistName: ownerProfile?.name || actData.name || 'Artist',
                avatar_url: ownerProfile?.avatar_url || '',
                banner_url: ownerProfile?.banner_url || '',
                location: actData.location_base || 'International',
                profile: ownerProfile || undefined,
                reviews,
                packages: actData.packages || [],
            };

            console.log('[useAct] Loaded act:', mappedData.id, '→', mappedData.artistName);
            setAct(mappedData);
        } catch (e: any) {
            console.error('[useAct] Error fetching act:', e);
            setError(e);
        } finally {
            setLoading(false);
        }
    }

    return { act, loading, error, refetch: fetchAct };
}
