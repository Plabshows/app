import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { useRouter } from 'expo-router';
import {
    ChevronRight,
    Clock,
    Filter,
    Inbox,
    MapPin,
    User
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ArtistRequestsInbox() {
    const router = useRouter();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('booking_requests')
                .select(`
                    *,
                    client:profiles!client_id(name, avatar_url),
                    act:acts!act_id(name)
                `)
                .eq('artist_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRequests(data || []);
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'pending': return { bg: '#FF980022', text: '#FF9800' };
            case 'quoted': return { bg: '#2196F322', text: '#2196F3' };
            case 'paid': return { bg: '#4CAF5022', text: '#4CAF50' };
            case 'declined': return { bg: '#F4433622', text: '#F44336' };
            default: return { bg: '#333', text: '#888' };
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchRequests();
    };

    const renderItem = ({ item }: { item: any }) => {
        const statusStyle = getStatusStyle(item.status);
        const eventDate = item.event_dates?.[0] || 'TBD';

        return (
            <Pressable
                style={styles.requestItem}
                onPress={() => router.push(`/artist-dashboard/booking/${item.id}` as any)}
            >
                <View style={styles.requestHeader}>
                    <View style={styles.clientInfo}>
                        <View style={styles.avatarPlaceholder}>
                            <User size={18} color={COLORS.textDim} />
                        </View>
                        <View>
                            <Text style={styles.clientName}>{item.client?.name || 'Guest User'}</Text>
                            <Text style={styles.actName}>{item.act?.name}</Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <Text style={[styles.statusText, { color: statusStyle.text }]}>
                            {item.status.toUpperCase()}
                        </Text>
                    </View>
                </View>

                <View style={styles.requestBody}>
                    <View style={styles.infoRow}>
                        <Clock size={14} color={COLORS.textDim} />
                        <Text style={styles.infoText}>{eventDate} • {item.start_time}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <MapPin size={14} color={COLORS.textDim} />
                        <Text style={styles.infoText} numberOfLines={1}>{item.location_text}</Text>
                    </View>
                </View>

                <View style={styles.requestFooter}>
                    <Text style={styles.createdText}>Received {new Date(item.created_at).toLocaleDateString()}</Text>
                    <ChevronRight size={18} color={COLORS.textDim} />
                </View>
            </Pressable>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Booking Requests</Text>
                <Pressable style={styles.filterBtn}>
                    <Filter size={20} color={COLORS.text} />
                </Pressable>
            </View>

            {loading && !refreshing ? (
                <View style={styles.centered}>
                    <ActivityIndicator color={COLORS.primary} size="large" />
                </View>
            ) : (
                <FlatList
                    data={requests}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Inbox size={64} color="#222" />
                            <Text style={styles.emptyText}>No requests yet.</Text>
                            <Text style={styles.emptySubtext}>New inquiries will appear here.</Text>
                        </View>
                    }
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
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.l,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    filterBtn: {
        padding: 8,
        backgroundColor: '#1A1A1A',
        borderRadius: 8,
    },
    listContent: {
        padding: SPACING.l,
    },
    requestItem: {
        backgroundColor: '#111',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#222',
    },
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    clientInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#222',
        justifyContent: 'center',
        alignItems: 'center',
    },
    clientName: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    actName: {
        color: COLORS.primary,
        fontSize: 12,
        fontWeight: '600',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    requestBody: {
        gap: 8,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    infoText: {
        color: COLORS.textDim,
        fontSize: 14,
    },
    requestFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    createdText: {
        color: '#555',
        fontSize: 12,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        gap: 12,
    },
    emptyText: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
    emptySubtext: {
        color: COLORS.textDim,
        fontSize: 14,
    }
});
