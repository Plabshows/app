import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';
import { useRouter } from 'expo-router';
import { Heart, Search, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FavoritesScreen() {
    const { profile, loading: authLoading } = useAuth();
    const [favorites, setFavorites] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (profile?.favorites && profile.favorites.length > 0) {
            fetchFavoriteArtists();
        } else {
            setLoading(false);
        }
    }, [profile?.favorites]);

    async function fetchFavoriteArtists() {
        try {
            const { data, error } = await supabase
                .from('acts')
                .select('*')
                .in('owner_id', profile.favorites);

            if (error) throw error;
            setFavorites(data || []);
        } catch (err) {
            console.error('Error fetching favorites:', err);
        } finally {
            setLoading(false);
        }
    }

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBulkRequest = () => {
        if (selectedIds.length === 0) return;
        // Navigate to booking wizard with all selected act IDs
        router.push(`/booking/${selectedIds.join(',')}`);
    };

    if (loading || authLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
        );
    }

    if (!profile?.favorites || profile.favorites.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Favorites</Text>
                </View>
                <View style={styles.emptyState}>
                    <Heart size={64} color="#333" />
                    <Text style={styles.emptyTitle}>No favorites yet</Text>
                    <Text style={styles.emptyText}>
                        Start exploring artists and save your favorites to see them here.
                    </Text>
                    <Pressable 
                        style={styles.exploreBtn} 
                        onPress={() => router.push('/(tabs)')}
                    >
                        <Text style={styles.exploreBtnText}>Explore Artists</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <Text style={styles.title}>My Favorites</Text>
                    {selectedIds.length > 0 && (
                        <Pressable onPress={() => setSelectedIds([])}>
                            <Text style={styles.clearBtn}>Deselect all</Text>
                        </Pressable>
                    )}
                </View>
                <Text style={styles.subtitle}>
                    {selectedIds.length > 0 
                        ? `${selectedIds.length} selected` 
                        : `${favorites.length} artists saved`}
                </Text>
            </View>

            <FlatList
                data={favorites}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
                renderItem={({ item }) => {
                    const isSelected = selectedIds.includes(item.id);
                    return (
                        <Pressable 
                            style={[styles.artistCard, isSelected && styles.selectedCard]}
                            onPress={() => toggleSelection(item.id)}
                            onLongPress={() => router.push(`/act/${item.id}`)}
                        >
                            <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                                {isSelected && <Search size={12} color="#000" />}
                            </View>
                            <Image 
                                source={{ uri: item.image_url || 'https://via.placeholder.com/150' }} 
                                style={styles.artistImage} 
                            />
                            <View style={styles.artistInfo}>
                                <Text style={styles.artistName}>{item.name}</Text>
                                <Text style={styles.artistCategory}>{item.category || 'Artist'}</Text>
                                <View style={styles.priceRow}>
                                    <Text style={styles.priceText}>{item.price_guide || 'Contact for price'}</Text>
                                </View>
                            </View>
                            <Heart size={20} color={COLORS.primary} fill={COLORS.primary} />
                        </Pressable>
                    );
                }}
            />

            {selectedIds.length > 0 && (
                <View style={styles.footerAction}>
                    <Pressable style={styles.bulkBtn} onPress={handleBulkRequest}>
                        <Text style={styles.bulkBtnText}>Get Quote for {selectedIds.length} acts</Text>
                    </Pressable>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    header: { padding: SPACING.l, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
    subtitle: { fontSize: 14, color: COLORS.textDim, marginTop: 4 },
    clearBtn: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    
    list: { padding: SPACING.l },
    artistCard: {
        flexDirection: 'row',
        backgroundColor: '#111',
        borderRadius: 16,
        padding: 12,
        marginBottom: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#222',
    },
    selectedCard: {
        borderColor: COLORS.primary,
        backgroundColor: 'rgba(204, 255, 0, 0.05)',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#333',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    artistImage: {
        width: 70,
        height: 70,
        borderRadius: 12,
        backgroundColor: '#222',
    },
    artistInfo: {
        flex: 1,
        marginLeft: 16,
    },
    artistName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 4,
    },
    artistCategory: {
        fontSize: 14,
        color: COLORS.primary,
        marginBottom: 4,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    priceText: {
        fontSize: 13,
        color: COLORS.textDim,
    },

    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
        marginTop: 20,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.textDim,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 30,
    },
    exploreBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        paddingHorizontal: 30,
        borderRadius: 30,
    },
    exploreBtnText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 16,
    },

    footerAction: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.9)',
        padding: 20,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderTopColor: '#222',
    },
    bulkBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 18,
        borderRadius: 100,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    bulkBtnText: {
        color: '#000',
        fontSize: 18,
        fontWeight: '900',
    },
});
