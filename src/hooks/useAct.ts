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
    avatar_url: string;
    banner_url?: string;
    video_url: string;
    photos_url: string[];
    videos_url: string[];
    video_gallery: { id: string, url: string, type: 'upload' | 'external_link', thumbnail?: string }[];
    packages: any[];
    technical_specs: string;
    technical_rider_url: string;
    is_verified: boolean;
    is_pro: boolean;
    is_published?: boolean;
    artistName: string;
    location: string;
    owner_id?: string;
    category_id?: string;
    category_ids?: string[];
    categories?: string[];
    price_guide?: string;
    profile?: ActProfile;
    reviews?: Review[];
    role?: string;
    social_links?: {
        instagram?: string;
        tiktok?: string;
        website?: string;
    };
}

// Static category map — avoids PostgREST PGRST200 join errors
const CATEGORY_MAP: Record<string, string> = {
    '636d2dcd-3e1d-4b1e-b111-a6400ca1b025': 'Musicians',
    'bf451e54-4edb-4453-8ff7-f74a3882e89c': 'Dancers',
    'f26b86db-2ef5-476b-bf53-3a09d4ecba17': 'Magic',
    '42f050db-aa72-4a8f-97ba-8521b4c1ec03': 'Roaming',
    '95585a4e-1cc1-417e-a064-7f210b9c2996': 'Fire & Flow',
    '6e2eba1a-54ee-4360-95b1-932089633089': 'Circus',
    'bff4df18-b95f-4f7e-821b-ab303b030c9a': 'DJ',
    '7dc05cb1-fa8a-4317-9c17-d2682831d73c': 'Specialty Acts',
    '0ca60f4f-2c8b-421c-9711-88f1e9327cb8': 'Singer',
    '8a662c88-7702-4ec7-bd70-671d707a0774': 'Art',
    '95a06893-94ff-4500-9fbf-b32efce7026f': 'Actors',
    '6a48f266-d4a5-4e8b-babe-e58fb204645d': 'Drags',
    '347f8d09-522b-44a7-8453-3950f907ce9f': 'Water Acts',
};

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

    async function fetchAct(profileId: string) {
        try {
            setLoading(true);
            setError(null);

            // Fetch Profile
            const { data: prof, error: profError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', profileId)
                .single();

            if (profError) {
                console.error('[useAct] Profile fetch error:', profError);
                throw profError;
            }

            // Fetch Act
            const { data: actData, error: actError } = await supabase
                .from('acts')
                .select('*')
                .eq('owner_id', profileId)
                .maybeSingle();

            if (actError) {
                console.error('[useAct] Act fetch error:', actError);
                // Don't throw here, act is optional if profile is just a client
            }

            // Fetch reviews
            let reviews: Review[] = [];
            try {
                const { data: reviewData } = await supabase
                    .from('reviews')
                    .select('id, rating, comment, created_at, reviewer_id')
                    .eq('act_id', profileId)
                    .order('created_at', { ascending: false });

                if (reviewData && reviewData.length > 0) {
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
                console.warn('[useAct] Reviews fetch error:', revErr);
            }

            // Apply 20% markup to price_guide for client view
            const rawPrice = actData?.price_guide || prof.price_guide || '';
            let finalPrice = rawPrice;
            if (rawPrice) {
                const numericMatch = rawPrice.match(/\d+/);
                if (numericMatch) {
                    const num = parseFloat(rawPrice.replace(/[^0-9.]/g, ''));
                    if (!isNaN(num)) {
                        finalPrice = `€${Math.round(num * 1.2).toLocaleString()}`;
                    }
                }
            }

            // Map Unified Profile to ActDetailData structure
            const mappedData: ActDetailData = {
                id: prof.id,
                name: actData?.name || prof.name || 'Artist',
                artistName: actData?.name || prof.name || 'Artist',
                title: actData?.name || prof.name || 'Artist',
                description: actData?.description || prof.description || prof.bio || '',
                category: CATEGORY_MAP[actData?.category_id || prof.category_id] || 'Artist',
                genre: actData?.genre || prof.genre || '',
                artist_type: actData?.artist_type || prof.artist_type || '',
                location_base: actData?.location_base || prof.city || '',
                experience_years: actData?.experience_years || prof.experience_years || 0,
                image_url: actData?.image_url || prof.avatar_url || '',
                avatar_url: prof.avatar_url || '',
                banner_url: prof.banner_url || '',
                video_url: actData?.video_url || prof.video_url || '',
                photos_url: actData?.photos_url || prof.gallery_urls || prof.photos_url || [],
                videos_url: actData?.videos_url || prof.videos_url || [],
                video_gallery: actData?.video_gallery || prof.video_gallery || [],
                packages: actData?.packages || prof.packages || [],
                technical_specs: actData?.technical_specs || prof.technical_specs || '',
                technical_rider_url: actData?.technical_rider_url || prof.technical_rider_url || '',
                is_verified: prof.is_verified || false,
                is_pro: prof.is_pro || false,
                is_published: prof.is_published || false,
                location: prof.city ? [prof.city, prof.country].filter(Boolean).join(', ') : 'International',
                owner_id: prof.id, 
                category_id: actData?.category_id || prof.category_id,
                category_ids: actData?.category_ids || prof.category_ids || [],
                categories: actData?.categories || prof.categories || [],
                price_guide: finalPrice,
                role: prof.role,
                social_links: prof.social_links || { instagram: '', tiktok: '', website: '' },
                reviews,
            };

            console.log('[useAct] Loaded Unified Profile:', mappedData.id, '→', mappedData.artistName);
            setAct(mappedData);
        } catch (e: any) {
            console.error('[useAct] Error fetching unified act:', e);
            setError(e);
        } finally {
            setLoading(false);
        }
    }

    return {
        act,
        loading,
        error,
        refetch: () => {
            const actId = Array.isArray(id) ? id[0] : id;
            if (actId) fetchAct(actId);
        }
    };
}
