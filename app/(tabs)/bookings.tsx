import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import {
    Calendar,
    Clock,
    MapPin,
    MessageSquare,
    MoreHorizontal
} from 'lucide-react-native';
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

export default function BookingsScreen() {
    const [session, setSession] = useState<any>(null);
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) fetchBookings();
            else setLoading(false);
        });

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) fetchBookings();
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const fetchBookings = async () => {
        try {
            // Fetch bookings where user is client OR owner of the act
            const { data, error } = await supabase
                .from('bookings')
                .select(`
          *,
          act:acts(*),
          client:profiles!bookings_client_id_fkey(*)
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBookings(data || []);
        } catch (error) {
            console.error('Error fetching bookings:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchBookings();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return COLORS.primary;
            case 'completed': return '#4CAF50';
            case 'cancelled': return COLORS.error;
            default: return '#FFA500'; // pending
        }
    };

    const renderBookingCard = ({ item }: { item: any }) => {
        const isArtist = item.act.owner_id === session?.user.id;
        const partner = isArtist ? item.client : item.act;

        return (
            <Pressable style={styles.bookingCard}>
                <View style={styles.cardHeader}>
                    <Image
                        source={{ uri: partner.image_url || 'https://images.unsplash.com/photo-1514525253361-bee8718a300c?q=80&w=200&auto=format&fit=crop' }}
                        style={styles.cardImage}
                    />
                    <View style={styles.cardHeaderContent}>
                        <View style={styles.statusRow}>
                            <Text style={styles.partnerName}>{partner.name || partner.full_name}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                                    {item.status.toUpperCase()}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.actName}>{isArtist ? 'Client Booking' : item.act.name}</Text>
                    </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}>
                        <Calendar size={14} color={COLORS.textDim} />
                        <Text style={styles.detailText}>{new Date(item.event_date).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Clock size={14} color={COLORS.textDim} />
                        <Text style={styles.detailText}>{item.duration || 'TBD'}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <MapPin size={14} color={COLORS.textDim} />
                        <Text style={styles.detailText} numberOfLines={1}>{item.location || 'TBD'}</Text>
                    </View>
                </View>

                <View style={styles.cardFooter}>
                    <Text style={styles.price}>AED {item.quote_price?.toLocaleString() || '---'}</Text>
                    <View style={styles.actions}>
                        <Pressable style={styles.actionButton}>
                            <MessageSquare size={18} color={COLORS.text} />
                        </Pressable>
                        <Pressable style={styles.actionButton}>
                            <MoreHorizontal size={18} color={COLORS.text} />
                        </Pressable>
                    </View>
                </View>
            </Pressable>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
        );
    }

    if (!session) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContainer}>
                    <Calendar size={60} color={COLORS.primary} style={{ opacity: 0.5 }} />
                    <Text style={styles.title}>Your Bookings</Text>
                    <Text style={styles.subtitle}>Sign in to see your show history and upcoming performances.</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Bookings</Text>
            </View>

            <FlatList
                data={bookings}
                renderItem={renderBookingCard}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                refreshing={refreshing}
                onRefresh={onRefresh}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Calendar size={40} color={COLORS.textDim} />
                        <Text style={styles.emptyText}>No bookings found</Text>
                        <Text style={styles.emptySubtext}>Upcoming performances will appear here.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { justifyContent: 'center', alignItems: 'center' },
    header: { padding: SPACING.m, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },

    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
    title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginTop: 20, marginBottom: 10 },
    subtitle: { fontSize: 16, color: COLORS.textDim, textAlign: 'center', lineHeight: 22 },

    listContent: { padding: SPACING.m, paddingBottom: 100 },

    bookingCard: {
        backgroundColor: '#111',
        borderRadius: 16,
        marginBottom: SPACING.m,
        borderWidth: 1,
        borderColor: '#222',
        overflow: 'hidden'
    },
    cardHeader: { flexDirection: 'row', padding: 12, alignItems: 'center' },
    cardImage: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#222' },
    cardHeaderContent: { flex: 1, marginLeft: 12 },
    statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    partnerName: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
    actName: { fontSize: 13, color: COLORS.textDim, marginTop: 2 },

    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 10, fontWeight: 'bold' },

    cardDivider: { height: 1, backgroundColor: '#1A1A1A', marginHorizontal: 12 },

    detailsGrid: { flexDirection: 'row', padding: 12, gap: 15 },
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    detailText: { fontSize: 12, color: COLORS.textDim },

    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#161616'
    },
    price: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
    actions: { flexDirection: 'row', gap: 8 },
    actionButton: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#222', justifyContent: 'center', alignItems: 'center'
    },

    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginTop: 16 },
    emptySubtext: { fontSize: 14, color: COLORS.textDim, marginTop: 8, textAlign: 'center' }
});
