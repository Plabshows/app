
import { useRouter } from 'expo-router';
import { RefreshCw } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { supabase } from '../../src/lib/supabase';

type PendingAct = {
    id: string;
    name: string;
    category: string;
    image_url: string;
    owner_id: string;
    created_at: string;
};

type Lead = {
    id: string;
    client_name: string;
    client_whatsapp: string;
    event_date: string;
    created_at: string;
    status: string;
    act_name?: string;
};

type Profile = {
    id: string;
    name: string;
    email: string;
    role: string;
    is_admin: boolean;
    is_published: boolean;
    created_at: string;
};

type Booking = {
    id: string;
    client_name: string;
    act_name: string;
    event_date: string;
    status: string;
    created_at: string;
};

type Review = {
    id: string;
    act_name: string;
    client_name: string;
    rating: number;
    comment: string;
    created_at: string;
};

type Stats = {
    totalUsers: number;
    totalActs: number;
    totalLeads: number;
    totalBookings: number;
};

export default function AdminDashboard() {
    const router = useRouter();
    const { user, profile, loading: authLoading } = useAuth();
    const [activeTab, setActiveTab] = useState<'stats' | 'approvals' | 'leads' | 'users' | 'acts' | 'bookings' | 'reviews'>('stats');
    const [loading, setLoading] = useState(true);
    const [pendingActs, setPendingActs] = useState<PendingAct[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [allActs, setAllActs] = useState<any[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

    useEffect(() => {
        if (!authLoading) {
            console.log('[AdminDashboard] Intento de acceso a /admin');
            console.log('[AdminDashboard] Usuario:', user?.email, 'IsAdmin:', profile?.is_admin);

            // EMERGENCY BYPASS: If they reached here via backdoor or email, let them in.
            if (user?.email === 'hizesupremos@gmail.com' || profile?.is_admin || user?.id?.startsWith('admin-ghost')) {
                console.log('[AdminDashboard] ACCESO PERMITIDO');
                setIsAdmin(true);
            } else {
                console.log('[AdminDashboard] Redirigiendo a Tabs: No es admin');
                Alert.alert('Access Denied', 'You do not have permission to view this page.');
                router.replace('/(tabs)');
            }
        }
    }, [user, profile, authLoading]);

    useEffect(() => {
        if (isAdmin === true) {
            fetchData();
        }
    }, [activeTab, isAdmin]);

    const fetchData = () => {
        if (activeTab === 'stats') fetchStats();
        else if (activeTab === 'approvals') fetchPendingActs();
        else if (activeTab === 'leads') fetchLeads();
        else if (activeTab === 'users') fetchProfiles();
        else if (activeTab === 'acts') fetchAllActs();
        else if (activeTab === 'bookings') fetchBookings();
        else if (activeTab === 'reviews') fetchReviews();
    };

    const fetchStats = async () => {
        setLoading(true);
        try {
            const { count: users } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            const { count: acts } = await supabase.from('acts').select('*', { count: 'exact', head: true });
            const { count: leads } = await supabase.from('leads').select('*', { count: 'exact', head: true });
            const { count: bks } = await supabase.from('bookings').select('*', { count: 'exact', head: true });

            setStats({
                totalUsers: users || 0,
                totalActs: acts || 0,
                totalLeads: leads || 0,
                totalBookings: bks || 0
            });
        } catch (e) {
            console.log("Admin Stats Error:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchPendingActs = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('acts')
                .select('*, profiles!inner(is_published)')
                .eq('profiles.is_published', false)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPendingActs((data as any[] || []).map(act => ({
                ...act,
                name: act.name || act.title || 'Untitled Act'
            })));
        } catch (e) {
            console.log("Admin Approvals Error:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('*, acts(name, title)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLeads((data as any[] || []).map(lead => ({
                ...lead,
                act_name: lead.acts ? (lead.acts.name || lead.acts.title) : 'Unknown Act'
            })));
        } catch (e) {
            console.log("Admin Leads Error:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchProfiles = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProfiles(data || []);
        } catch (e) {
            console.log("Admin Profiles Error:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchAllActs = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('acts')
                .select('*, profiles(name, email, is_published)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAllActs((data as any[] || []).map(act => ({
                ...act,
                name: act.name || act.title || 'Untitled Act',
                owner_name: act.profiles?.name || act.profiles?.email || 'Unknown'
            })));
        } catch (e) {
            console.log("Admin All Acts Error:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select('*, acts(name, title), profiles!bookings_client_id_fkey(name, email)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBookings((data as any[] || []).map(b => ({
                id: b.id,
                client_name: b.profiles?.name || b.profiles?.email || 'Unknown',
                act_name: b.acts?.name || b.acts?.title || 'Unknown Act',
                event_date: b.event_date,
                status: b.status,
                created_at: b.created_at
            })));
        } catch (e) {
            console.log("Admin Bookings Error:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchReviews = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('reviews')
                .select('*, acts(name, title), profiles(name, email)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReviews((data as any[] || []).map(r => ({
                id: r.id,
                act_name: r.acts?.name || r.acts?.title || 'Unknown Act',
                client_name: r.profiles?.name || r.profiles?.email || 'Unknown',
                rating: r.rating,
                comment: r.comment,
                created_at: r.created_at
            })));
        } catch (e) {
            console.log("Admin Reviews Error:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_admin: !currentStatus })
                .eq('id', userId);

            if (error) throw error;
            fetchProfiles();
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const togglePublishedStatus = async (userId: string, currentStatus: boolean, name: string) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_published: !currentStatus })
                .eq('id', userId);

            if (error) throw error;
            Alert.alert('Success', `${name} is now ${!currentStatus ? 'Published' : 'Unpublished'}`);
            if (activeTab === 'approvals') fetchPendingActs();
            else fetchProfiles();
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const contactWhatsApp = (phone: string, name: string) => {
        const cleanPhone = phone.replace(/\D/g, '');
        const url = `https://wa.me/${cleanPhone}?text=Hola%20${encodeURIComponent(name)},%20vimos%20tu%20interés%20en%20Performance%20Lab...`;
        import('react-native').then(({ Linking }) => {
            Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir WhatsApp'));
        });
    };

    const renderStats = () => (
        <View style={styles.statsGrid}>
            <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats?.totalUsers || 0}</Text>
                <Text style={styles.statLabel}>Usuarios</Text>
            </View>
            <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats?.totalActs || 0}</Text>
                <Text style={styles.statLabel}>Acts/Talento</Text>
            </View>
            <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats?.totalLeads || 0}</Text>
                <Text style={styles.statLabel}>Interesados</Text>
            </View>
            <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: COLORS.primary }]}>{stats?.totalBookings || 0}</Text>
                <Text style={styles.statLabel}>Reservas</Text>
            </View>
        </View>
    );

    const renderActItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <Image source={{ uri: item.image_url || 'https://via.placeholder.com/100' }} style={styles.cardImage} />
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardCategory}>{item.category} • {item.owner_name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={[styles.dot, { backgroundColor: item.profiles?.is_published ? '#4CAF50' : '#F44336' }]} />
                    <Text style={styles.cardDate}>{item.profiles?.is_published ? 'Publicado' : 'Borrador'}</Text>
                </View>
            </View>
            <Pressable
                style={styles.deleteButton}
                onPress={() => Alert.alert('Delete', 'Delete this act permanently?', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete', style: 'destructive', onPress: async () => {
                            await supabase.from('acts').delete().eq('id', item.id);
                            fetchAllActs();
                        }
                    }
                ])}
            >
                <Text style={{ color: '#F44336', fontSize: 10, fontWeight: 'bold' }}>DEL</Text>
            </Pressable>
        </View>
    );

    const renderBookingItem = ({ item }: { item: Booking }) => (
        <View style={styles.card}>
            <View style={styles.cardContent}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.cardTitle}>{item.act_name}</Text>
                    <Text style={[styles.statusBadge, { color: COLORS.primary }]}>{item.status}</Text>
                </View>
                <Text style={styles.cardCategory}>Client: {item.client_name}</Text>
                <Text style={styles.cardDate}>Event Date: {item.event_date}</Text>
            </View>
        </View>
    );

    const renderReviewItem = ({ item }: { item: Review }) => (
        <View style={styles.card}>
            <View style={styles.cardContent}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.cardTitle}>{item.act_name}</Text>
                    <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>{'★'.repeat(item.rating)}</Text>
                </View>
                <Text style={styles.cardCategory}>By: {item.client_name}</Text>
                <Text style={[styles.cardDate, { fontStyle: 'italic', marginTop: 4 }]}>"{item.comment}"</Text>
            </View>
            <Pressable
                style={styles.deleteButton}
                onPress={() => Alert.alert('Moderate', 'Delete this review?', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete', style: 'destructive', onPress: async () => {
                            await supabase.from('reviews').delete().eq('id', item.id);
                            fetchReviews();
                        }
                    }
                ])}
            >
                <Text style={{ color: '#F44336', fontSize: 10, fontWeight: 'bold' }}>DEL</Text>
            </Pressable>
        </View>
    );

    if (isAdmin === null) return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Admin Hub</Text>
                <Pressable onPress={fetchData} style={styles.refreshButton}>
                    <RefreshCw size={20} color={COLORS.primary} />
                </Pressable>
            </View>

            <View style={styles.tabBar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 20 }}>
                    <Pressable style={[styles.tab, activeTab === 'stats' && styles.activeTab]} onPress={() => setActiveTab('stats')}>
                        <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>Stats</Text>
                    </Pressable>
                    <Pressable style={[styles.tab, activeTab === 'approvals' && styles.activeTab]} onPress={() => setActiveTab('approvals')}>
                        <Text style={[styles.tabText, activeTab === 'approvals' && styles.activeTabText]}>Approvals</Text>
                    </Pressable>
                    <Pressable style={[styles.tab, activeTab === 'leads' && styles.activeTab]} onPress={() => setActiveTab('leads')}>
                        <Text style={[styles.tabText, activeTab === 'leads' && styles.activeTabText]}>Leads</Text>
                    </Pressable>
                    <Pressable style={[styles.tab, activeTab === 'users' && styles.activeTab]} onPress={() => setActiveTab('users')}>
                        <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>Users</Text>
                    </Pressable>
                    <Pressable style={[styles.tab, activeTab === 'acts' && styles.activeTab]} onPress={() => setActiveTab('acts')}>
                        <Text style={[styles.tabText, activeTab === 'acts' && styles.activeTabText]}>Acts</Text>
                    </Pressable>
                    <Pressable style={[styles.tab, activeTab === 'bookings' && styles.activeTab]} onPress={() => setActiveTab('bookings')}>
                        <Text style={[styles.tabText, activeTab === 'bookings' && styles.activeTabText]}>Bookings</Text>
                    </Pressable>
                    <Pressable style={[styles.tab, activeTab === 'reviews' && styles.activeTab]} onPress={() => setActiveTab('reviews')}>
                        <Text style={[styles.tabText, activeTab === 'reviews' && styles.activeTabText]}>Reviews</Text>
                    </Pressable>
                </ScrollView>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
            ) : activeTab === 'stats' ? (
                renderStats()
            ) : (
                <FlatList
                    data={
                        activeTab === 'approvals' ? pendingActs :
                            activeTab === 'leads' ? leads :
                                activeTab === 'users' ? profiles :
                                    activeTab === 'acts' ? allActs :
                                        activeTab === 'bookings' ? bookings :
                                            reviews
                    }
                    renderItem={
                        activeTab === 'approvals' ? renderApprovalItem as any :
                            activeTab === 'leads' ? renderLeadItem as any :
                                activeTab === 'users' ? renderProfileItem as any :
                                    activeTab === 'acts' ? renderActItem as any :
                                        activeTab === 'bookings' ? renderBookingItem as any :
                                            renderReviewItem as any
                    }
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={<Text style={styles.emptyText}>No items found.</Text>}
                    refreshing={refreshing}
                    onRefresh={() => {
                        setRefreshing(true);
                        fetchData();
                    }}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.m, borderBottomWidth: 1, borderBottomColor: '#222' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
    refreshButton: { padding: 8 },
    listContent: { padding: SPACING.m },
    card: {
        flexDirection: 'row', backgroundColor: '#1E1E1E', borderRadius: 12, marginBottom: SPACING.m,
        overflow: 'hidden', borderWidth: 1, borderColor: '#333', padding: SPACING.s, alignItems: 'center'
    },
    cardImage: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#333' },
    cardContent: { flex: 1, marginLeft: SPACING.m },
    cardTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    cardCategory: { color: COLORS.primary, fontSize: 12, fontWeight: '600', marginBottom: 2 },
    cardDate: { color: COLORS.textDim, fontSize: 10 },
    actionButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    approveButton: { backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
    approveText: { color: COLORS.background, fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
    waButton: { backgroundColor: '#25D366', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    waText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    statusBadge: { backgroundColor: '#333', color: COLORS.primary, fontSize: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
    tabBar: { flexDirection: 'row', paddingHorizontal: SPACING.m, marginBottom: SPACING.s, gap: 20 },
    tab: { paddingVertical: 8 },
    activeTab: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
    tabText: { color: COLORS.textDim, fontSize: 16, fontWeight: '600' },
    activeTabText: { color: COLORS.primary },
    emptyText: { color: COLORS.textDim, textAlign: 'center', marginTop: 50, fontSize: 16 },
    profileActions: { alignItems: 'flex-end', gap: 4 },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    switchLabel: { color: COLORS.textDim, fontSize: 10, fontWeight: 'bold' },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: SPACING.m, gap: SPACING.m },
    statCard: {
        width: '47%', backgroundColor: '#1E1E1E', padding: SPACING.m, borderRadius: 12,
        borderWidth: 1, borderColor: '#333', alignItems: 'center'
    },
    statValue: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
    statLabel: { fontSize: 12, color: COLORS.textDim, marginTop: 4 },
    deleteButton: { marginLeft: 8, padding: 8, backgroundColor: 'rgba(244, 67, 54, 0.1)', borderRadius: 8 },
    dot: { width: 6, height: 6, borderRadius: 3 }
});
