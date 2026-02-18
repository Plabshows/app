
import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { useRouter } from 'expo-router';
import { Check, ChevronRight, RefreshCw } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type PendingAct = {
    id: string;
    name: string; // mapped from title/name
    category: string;
    image_url: string;
    owner_id: string;
    created_at: string;
    title?: string; // fallback
};

export default function AdminDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [pendingActs, setPendingActs] = useState<PendingAct[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchPendingActs();
    }, []);

    const fetchPendingActs = async () => {
        setLoading(true);
        try {
            // 1. Fetch acts where the OWNER profile is NOT published, OR simply acts that are pending approval.
            // The requirement was: "Lista de Fichas Pendientes (donde is_published es false)".
            // However, 'is_published' is on the PROFILES table, not the acts table in the prompt description (Phase 1).
            // "Tabla profiles: ... Añade un campo booleano is_published".
            // Let's query acts and join with profiles to see if the profile is published.

            const { data, error } = await supabase
                .from('acts')
                .select(`
          *,
          profiles!inner(is_published)
        `)
                .eq('profiles.is_published', false)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Map to PendingAct type
            const mappedActs = (data || []).map((act: any) => ({
                ...act,
                name: act.name || act.title, // Handle the name/title migration overlap
            }));

            setPendingActs(mappedActs);
        } catch (e: any) {
            // Alert.alert('Error', e.message); 
            console.log("Admin Fetch Error:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const publishProfile = async (ownerId: string, actName: string) => {
        try {
            // Update the PROFILE is_published to TRUE
            const { error } = await supabase
                .from('profiles')
                .update({ is_published: true })
                .eq('id', ownerId);

            if (error) throw error;

            Alert.alert('Success', `Published ${actName}!`);
            fetchPendingActs(); // Refresh list
        } catch (e: any) {
            Alert.alert('Error Publishing', e.message);
        }
    };

    const renderItem = ({ item }: { item: PendingAct }) => (
        <View style={styles.card}>
            <Image
                source={{ uri: item.image_url || 'https://via.placeholder.com/100' }}
                style={styles.cardImage}
            />
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardCategory}>{item.category}</Text>
                <Text style={styles.cardDate}>
                    Submitted: {new Date(item.created_at).toLocaleDateString()}
                </Text>
            </View>

            <View style={styles.actionButtons}>
                <Pressable
                    style={styles.approveButton}
                    onPress={() => publishProfile(item.owner_id, item.name)}
                >
                    <Check size={20} color={COLORS.background} />
                    <Text style={styles.approveText}>Approve</Text>
                </Pressable>

                {/* Placeholder for "Detail View" if we want to inspect before approving */}
                <Pressable
                    style={styles.inspectButton}
                    onPress={() => router.push(`/act/${item.id}`)}
                >
                    <ChevronRight size={20} color={COLORS.textDim} />
                </Pressable>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Admin Dashboard</Text>
                <Pressable onPress={fetchPendingActs} style={styles.refreshButton}>
                    <RefreshCw size={20} color={COLORS.primary} />
                </Pressable>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={pendingActs}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No pending approvals.</Text>
                    }
                    refreshing={refreshing}
                    onRefresh={() => {
                        setRefreshing(true);
                        fetchPendingActs();
                    }}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.m,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    refreshButton: {
        padding: 8,
    },
    listContent: {
        padding: SPACING.m,
    },
    card: {
        flexDirection: 'row',
        backgroundColor: '#1E1E1E',
        borderRadius: 12,
        marginBottom: SPACING.m,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#333',
        padding: SPACING.s,
        alignItems: 'center',
    },
    cardImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: '#333',
    },
    cardContent: {
        flex: 1,
        marginLeft: SPACING.m,
    },
    cardTitle: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    cardCategory: {
        color: COLORS.primary,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 2,
    },
    cardDate: {
        color: COLORS.textDim,
        fontSize: 10,
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    approveButton: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    approveText: {
        color: COLORS.background,
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    inspectButton: {
        padding: 8,
    },
    emptyText: {
        color: COLORS.textDim,
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
    },
});
