import { COLORS } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';
import { useRouter } from 'expo-router';
import { ExternalLink, Heart, MapPin, Send, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Image, Platform, Pressable,
    ScrollView, StyleSheet, Text, View
} from 'react-native';
import Toast from 'react-native-toast-message';

export default function FavoritesPage() {
    const { profile, refreshAuth } = useAuth();
    const router = useRouter();
    const [acts, setActs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');
    const [removing, setRemoving] = useState<string | null>(null);

    const load = useCallback(async () => {
        const ids = profile?.favorites || [];
        if (ids.length === 0) { setActs([]); setLoading(false); return; }
        const { data } = await supabase.from('acts').select('id,name,category,image_url,location_base,price_guide,description').in('id', ids);
        setActs(data || []);
        setLoading(false);
    }, [profile?.favorites]);

    useEffect(() => { load(); }, [load]);

    const removeFavorite = async (actId: string) => {
        setRemoving(actId);
        const newFavs = (profile?.favorites || []).filter((id: string) => id !== actId);
        const { error } = await supabase.from('profiles').update({ favorites: newFavs }).eq('id', profile.id);
        if (!error) { await refreshAuth(); Toast.show({ type: 'success', text1: 'Removed from favorites' }); }
        setRemoving(null);
    };

    const sendInquiry = (act: any) => router.push(`/act/${act.id}` as any);

    const categories = ['All', ...Array.from(new Set(acts.map(a => a.category).filter(Boolean)))];
    const filtered = filter === 'All' ? acts : acts.filter(a => a.category === filter);

    if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;

    if (acts.length === 0) {
        return (
            <View style={styles.center}>
                <Text style={styles.emptyEmoji}>♥</Text>
                <Text style={styles.emptyTitle}>No favorites yet</Text>
                <Text style={styles.emptySub}>Explore artists and save your shortlist here.</Text>
                <Pressable style={styles.exploreBtn} onPress={() => router.replace('/(tabs)' as any)}>
                    <Text style={styles.exploreBtnText}>Explore Artists</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.pageTitle}>Favorites</Text>
                <Text style={styles.pageSub}>{acts.length} artist{acts.length !== 1 ? 's' : ''} saved</Text>
            </View>

            {/* Category filter */}
            {categories.length > 2 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        {categories.map(c => (
                            <Pressable key={c} style={[styles.filterChip, filter === c && styles.filterChipActive]} onPress={() => setFilter(c)}>
                                <Text style={[styles.filterChipText, filter === c && styles.filterChipTextActive]}>{c}</Text>
                            </Pressable>
                        ))}
                    </View>
                </ScrollView>
            )}

            {/* Grid */}
            <View style={styles.grid}>
                {filtered.map(act => (
                    <View key={act.id} style={styles.card}>
                        <Pressable onPress={() => router.push(`/act/${act.id}` as any)}>
                            <Image
                                source={{ uri: act.image_url || 'https://via.placeholder.com/300x200/111111/333333?text=Artist' }}
                                style={styles.cardImg}
                            />
                        </Pressable>
                        <View style={styles.cardBody}>
                            <Text style={styles.cardName} numberOfLines={1}>{act.name}</Text>
                            {act.category && <Text style={styles.cardCategory}>{act.category}</Text>}
                            {act.location_base && (
                                <View style={styles.locationRow}>
                                    <MapPin size={12} color="#6B7280" />
                                    <Text style={styles.locationText}>{act.location_base}</Text>
                                </View>
                            )}
                            {act.price_guide && <Text style={styles.price}>{act.price_guide}</Text>}
                        </View>
                        <View style={styles.cardActions}>
                            <Pressable style={styles.actionBtn} onPress={() => router.push(`/act/${act.id}` as any)}>
                                <ExternalLink size={14} color="#9CA3AF" />
                                <Text style={styles.actionBtnText}>View</Text>
                            </Pressable>
                            <Pressable style={[styles.actionBtn, styles.inquiryBtn]} onPress={() => sendInquiry(act)}>
                                <Send size={14} color={COLORS.primary} />
                                <Text style={[styles.actionBtnText, { color: COLORS.primary }]}>Inquire</Text>
                            </Pressable>
                            <Pressable
                                style={styles.removeBtn}
                                onPress={() => removeFavorite(act.id)}
                                disabled={removing === act.id}
                            >
                                {removing === act.id
                                    ? <ActivityIndicator size={14} color="#EF4444" />
                                    : <X size={14} color="#EF4444" />
                                }
                            </Pressable>
                        </View>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

const CARD_WIDTH = Platform.OS === 'web' ? 260 : '47%';

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#050505', padding: 40 },
    scroll: { flex: 1, backgroundColor: '#050505' },
    container: { padding: Platform.OS === 'web' ? 40 : 24, paddingBottom: 120 },
    header: { marginBottom: 24 },
    pageTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
    pageSub: { fontSize: 14, color: '#6B7280' },
    emptyEmoji: { fontSize: 52, marginBottom: 16 },
    emptyTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
    emptySub: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 28, maxWidth: 280 },
    exploreBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14 },
    exploreBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },
    filterChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#1E1E1E', backgroundColor: '#0F0F0F' },
    filterChipActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(204,255,0,0.1)' },
    filterChipText: { color: '#6B7280', fontSize: 13, fontWeight: '500' },
    filterChipTextActive: { color: COLORS.primary, fontWeight: '700' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    card: {
        width: CARD_WIDTH as any,
        backgroundColor: '#0F0F0F',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#1A1A1A',
        overflow: 'hidden',
    },
    cardImg: { width: '100%', height: 160, backgroundColor: '#111' },
    cardBody: { padding: 14, gap: 4 },
    cardName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
    cardCategory: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    locationText: { fontSize: 12, color: '#6B7280' },
    price: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
    cardActions: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#1A1A1A', padding: 12, gap: 8 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#222' },
    inquiryBtn: { borderColor: 'rgba(204,255,0,0.3)', backgroundColor: 'rgba(204,255,0,0.05)' },
    actionBtnText: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
    removeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.08)' },
});
