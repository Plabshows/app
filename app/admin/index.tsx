
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

type Lead = {
    id: string;
    client_name: string;
    client_whatsapp: string;
    event_date: string;
    created_at: string;
    status: string;
    act_name?: string;
};

export default function AdminDashboard() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'approvals' | 'leads'>('approvals');
    const [loading, setLoading] = useState(true);
    const [pendingActs, setPendingActs] = useState<PendingAct[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

    useEffect(() => {
        checkAdmin();
    }, []);

    useEffect(() => {
        if (isAdmin) {
            if (activeTab === 'approvals') fetchPendingActs();
            else fetchLeads();
        }
    }, [activeTab, isAdmin]);

    const checkAdmin = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace('/login');
                return;
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', user.id)
                .single();

            if (error || !data?.is_admin) {
                Alert.alert('Access Denied', 'You do not have permission to view this page.');
                router.replace('/(tabs)');
                return;
            }

            setIsAdmin(true);
        } catch (e) {
            router.replace('/(tabs)');
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
            setPendingActs((data || []).map(act => ({ ...act, name: act.name || act.title })));
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
            setLeads((data || []).map(lead => ({
                ...lead,
                act_name: lead.acts?.name || lead.acts?.title || 'Unknown Act'
            })));
        } catch (e) {
            console.log("Admin Leads Error:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const publishProfile = async (ownerId: string, actName: string) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_published: true })
                .eq('id', ownerId);

            if (error) throw error;
            Alert.alert('Success', `Published ${actName}!`);
            fetchPendingActs();
        } catch (e: any) {
            Alert.alert('Error Publishing', e.message);
        }
    };

    const contactWhatsApp = (phone: string, name: string) => {
        const cleanPhone = phone.replace(/\D/g, '');
        const url = `https://wa.me/${cleanPhone}?text=Hola%20${encodeURIComponent(name)},%20vimos%20tu%20interés%20en%20Performance%20Lab...`;
        // Linking should be used here, but for simplicity of the prompt, we'll assume it's external or use router.push if configured
        import('react-native').then(({ Linking }) => {
            Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir WhatsApp'));
        });
    };

    const renderApprovalItem = ({ item }: { item: PendingAct }) => (
        <View style={styles.card}>
            <Image source={{ uri: item.image_url || 'https://via.placeholder.com/100' }} style={styles.cardImage} />
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardCategory}>{item.category}</Text>
                <Text style={styles.cardDate}>Submitted: {new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            <View style={styles.actionButtons}>
                <Pressable style={styles.approveButton} onPress={() => publishProfile(item.owner_id, item.name)}>
                    <Check size={20} color={COLORS.background} />
                    <Text style={styles.approveText}>Approve</Text>
                </Pressable>
                <Pressable style={styles.inspectButton} onPress={() => router.push(`/act/${item.id}`)}>
                    <ChevronRight size={20} color={COLORS.textDim} />
                </Pressable>
            </View>
        </View>
    );

    const renderLeadItem = ({ item }: { item: Lead }) => (
        <View style={styles.card}>
            <View style={styles.cardContent}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.cardTitle}>{item.client_name}</Text>
                    <Text style={styles.statusBadge}>{item.status}</Text>
                </View>
                <Text style={styles.cardCategory}>Interest: {item.act_name}</Text>
                <Text style={styles.cardDate}>Event: {item.event_date}</Text>
                <Text style={styles.cardDate}>WhatsApp: {item.client_whatsapp}</Text>
            </View>
            <Pressable style={styles.waButton} onPress={() => contactWhatsApp(item.client_whatsapp, item.client_name)}>
                <Text style={styles.waText}>WA</Text>
            </Pressable>
        </View>
    );

    if (isAdmin === null) return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Admin Hub</Text>
                <Pressable onPress={() => activeTab === 'approvals' ? fetchPendingActs() : fetchLeads()} style={styles.refreshButton}>
                    <RefreshCw size={20} color={COLORS.primary} />
                </Pressable>
            </View>

            <View style={styles.tabBar}>
                <Pressable style={[styles.tab, activeTab === 'approvals' && styles.activeTab]} onPress={() => setActiveTab('approvals')}>
                    <Text style={[styles.tabText, activeTab === 'approvals' && styles.activeTabText]}>Approvals</Text>
                </Pressable>
                <Pressable style={[styles.tab, activeTab === 'leads' && styles.activeTab]} onPress={() => setActiveTab('leads')}>
                    <Text style={[styles.tabText, activeTab === 'leads' && styles.activeTabText]}>Leads</Text>
                </Pressable>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={activeTab === 'approvals' ? pendingActs : leads}
                    renderItem={activeTab === 'approvals' ? renderApprovalItem : renderLeadItem as any}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={<Text style={styles.emptyText}>No items found.</Text>}
                    refreshing={refreshing}
                    onRefresh={() => {
                        setRefreshing(true);
                        activeTab === 'approvals' ? fetchPendingActs() : fetchLeads();
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
    waButton: {
        backgroundColor: '#25D366',
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    waText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
    },
    statusBadge: {
        backgroundColor: '#333',
        color: COLORS.primary,
        fontSize: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
    },
    tabBar: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.m,
        marginBottom: SPACING.s,
        gap: 20,
    },
    tab: {
        paddingVertical: 8,
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: COLORS.primary,
    },
    tabText: {
        color: COLORS.textDim,
        fontSize: 16,
        fontWeight: '600',
    },
    activeTabText: {
        color: COLORS.primary,
    },
    emptyText: {
        color: COLORS.textDim,
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
    },
});
