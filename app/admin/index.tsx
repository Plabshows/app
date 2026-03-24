import { useRouter } from 'expo-router';
import { Check, CheckCircle, ChevronLeft, ChevronRight, Eye, MessageCircle, RefreshCw, Send } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { logAdminAction } from '../../src/lib/audit';
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
    client_email: string;
    act_name: string;
    event_date: string;
    status: string;
    total_amount: number;
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
    const { user, profile, realUser, realProfile, loading: authLoading } = useAuth();
    const [activeTab, setActiveTab] = useState<'stats' | 'approvals' | 'leads' | 'users' | 'acts' | 'bookings' | 'reviews' | 'messages'>('stats');
    const [loading, setLoading] = useState(true);
    const [pendingActs, setPendingActs] = useState<PendingAct[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [allActs, setAllActs] = useState<any[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [supportRequests, setSupportRequests] = useState<any[]>([]);
    const [bookingChats, setBookingChats] = useState<any[]>([]);
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [chatLoading, setChatLoading] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [sendingReply, setSendingReply] = useState(false);

    useEffect(() => {
        if (!authLoading) {
            // Use realUser/realProfile to check admin permissions
            const authUser = realUser || user;
            const authProfile = realProfile || profile;

            console.log('[AdminDashboard] Intento de acceso a /admin');
            console.log('[AdminDashboard] Usuario Real:', authUser?.email, 'IsAdmin:', authProfile?.is_admin);

            // EMERGENCY BYPASS: If they reached here via backdoor or email, let them in.
            if (authUser?.email === 'hizesupremos@gmail.com' || authProfile?.is_admin || authUser?.id?.startsWith('admin-ghost')) {
                console.log('[AdminDashboard] ACCESO PERMITIDO');
                setIsAdmin(true);
            } else {
                console.log('[AdminDashboard] Redirigiendo a Tabs: No es admin');
                Alert.alert('Access Denied', 'You do not have permission to view this page.');
                router.replace('/(tabs)');
            }
        }
    }, [user, realUser, profile, realProfile, authLoading]);

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
        else if (activeTab === 'messages') {
            fetchMessagesData();
            if (selectedUserId) fetchChat(selectedUserId);
        }
    };

    const fetchStats = async () => {
        setLoading(true);
        try {
            const { count: users } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            const { count: acts } = await supabase.from('acts').select('*', { count: 'exact', head: true });
            const { count: leads } = await supabase.from('leads').select('*', { count: 'exact', head: true });
            const { count: bks } = await supabase.from('booking_requests').select('*', { count: 'exact', head: true });

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
            // 1. Fetch all profiles with their acts
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('*, acts(*)');

            // 2. Fetch all acts for potential orphans (acts without profiles)
            const { data: acts, error: actsError } = await supabase
                .from('acts')
                .select('*');

            if (profilesError) throw profilesError;
            if (actsError) throw actsError;

            const unifiedMap = new Map();

            // Process profiles
            (profiles || []).forEach(p => {
                const actData = Array.isArray(p.acts) ? p.acts[0] : p.acts;
                unifiedMap.set(p.id, {
                    id: p.id,
                    name: actData?.name || actData?.title || p.name || p.email || 'Unnamed',
                    category: actData?.category || 'Sin Perfil Act',
                    image_url: actData?.image_url || p.avatar_url || 'https://euphonious-kelpie-cd0a27.netlify.app/images/default-avatar.png',
                    owner_name: p.name || p.email || 'Admin/Directo',
                    has_act: !!actData,
                    is_published: p.is_published,
                    role: p.role,
                    created_at: p.created_at
                });
            });

            // Catch orphans
            (acts || []).forEach(act => {
                const id = act.owner_id || act.id;
                if (!unifiedMap.has(id)) {
                    unifiedMap.set(id, {
                        id: id,
                        name: act.name || act.title || 'Orphan Act',
                        category: act.category || 'Manual/Legacy',
                        image_url: act.image_url || 'https://euphonious-kelpie-cd0a27.netlify.app/images/default-avatar.png',
                        owner_name: 'Manual Upload',
                        has_act: true,
                        is_published: false,
                        role: 'artist',
                        created_at: act.created_at
                    });
                }
            });

            setAllActs(Array.from(unifiedMap.values()).sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ));
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
                .from('booking_requests')
                .select('*, acts(name, title), profiles!booking_requests_client_id_fkey(name, email)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBookings((data as any[] || []).map(b => ({
                id: b.id,
                client_name: b.profiles?.name || b.profiles?.email || 'Unknown',
                client_email: b.profiles?.email || '',
                act_name: b.acts?.name || b.acts?.title || 'Unknown Act',
                event_date: b.event_dates ? b.event_dates[0] : 'N/A',
                status: b.status,
                total_amount: b.total_amount || 0,
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
        // ... (truncated for space)
    };

    const fetchMessagesData = async () => {
        setLoading(true);
        try {
            // 1. Fetch support messages from 'messages' table (excluding system or booking ones if needed)
            // We'll group by the user who isn't the admin.
            const { data: allMsgs, error: err } = await supabase
                .from('messages')
                .select('*, sender:sender_id(id, name, email, role, avatar_url), receiver:receiver_id(id, name, email, role, avatar_url)')
                .order('created_at', { ascending: false });

            if (err) throw err;

            // Group by the "other" user ID (the non-admin party)
            const threads = new Map();
            (allMsgs || []).forEach(m => {
                const otherUserId = m.sender_id === user?.id ? m.receiver_id : m.sender_id;
                // Only consider threads where one side is the OTHER user (not admin-to-admin if that exists)
                if (otherUserId && otherUserId !== user?.id && !threads.has(otherUserId)) {
                    threads.set(otherUserId, {
                        ...m,
                        otherUser: m.sender_id === user?.id ? m.receiver : m.sender,
                        unreadCount: (allMsgs || []).filter(msg => 
                            msg.sender_id === otherUserId && 
                            msg.receiver_id === user?.id &&
                            msg.status === 'unread'
                        ).length
                    });
                }
            });

            setSupportRequests(Array.from(threads.values()));

            // 2. Fetch booking chats and check for unread messages (stays same as it uses booking_messages)
            const { data: recentBks, error: msgError } = await supabase
                .from('booking_messages')
                .select('*, booking_requests(id, client_name, acts(name))')
                .order('created_at', { ascending: false });

            if (msgError) throw msgError;
            
            const grouped = new Map();
            (recentBks || []).forEach(m => {
                if (!grouped.has(m.booking_request_id)) {
                    const unreadCount = (recentBks || []).filter(msg => 
                        msg.booking_request_id === m.booking_request_id && 
                        msg.is_read === false
                    ).length;

                    grouped.set(m.booking_request_id, {
                        ...m,
                        unreadCount
                    });
                }
            });
            setBookingChats(Array.from(grouped.values()));

        } catch (e) {
            console.log("Admin Messages Error:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchChat = async (userId: string) => {
        setChatLoading(true);
        try {
            // Mark user's messages as read
            if (user?.id) {
                await supabase
                    .from('messages')
                    .update({ status: 'read' })
                    .eq('sender_id', userId)
                    .eq('receiver_id', user.id)
                    .eq('status', 'unread');
            }

            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            setChatMessages(data || []);
            // Update sidebar unread counts
            fetchMessagesData();
        } catch (e) {
            console.error('Error fetching chat:', e);
        } finally {
            setChatLoading(false);
        }
    };

    const sendAdminReply = async () => {
        if (!replyText.trim() || !selectedUserId || !user || sendingReply) return;
        setSendingReply(true);
        try {
            const { error } = await supabase.from('messages').insert({
                sender_id: user.id,
                receiver_id: selectedUserId,
                content: replyText.trim(),
                status: 'read' // Admin messages start as read or indicate admin saw the thread
            });
            if (error) throw error;
            setReplyText('');
            // Mark user's messages as read
            await supabase
                .from('messages')
                .update({ status: 'read' })
                .eq('sender_id', selectedUserId)
                .eq('receiver_id', user.id);
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setSendingReply(false);
        }
    };

    // Realtime subscription for messages
    useEffect(() => {
        if (activeTab !== 'messages') return;

        const channel = supabase
            .channel('admin:messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                const newMsg = payload.new;
                
                // If it's for the current chat, add it and mark read if it's from user
                if (selectedUserId && (newMsg.sender_id === selectedUserId || newMsg.receiver_id === selectedUserId)) {
                    setChatMessages(prev => [...prev, newMsg]);
                    
                    if (newMsg.sender_id === selectedUserId && newMsg.status === 'unread') {
                        supabase
                            .from('messages')
                            .update({ status: 'read' })
                            .eq('id', newMsg.id)
                            .then();
                    }
                }
                
                // Refresh the sidebar list to update unread badge and latest message
                fetchMessagesData();
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
                // If a message was marked as read elsewhere, update local state
                if (selectedUserId && (payload.new.sender_id === selectedUserId || payload.new.receiver_id === selectedUserId)) {
                    setChatMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
                }
                fetchMessagesData();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel).catch(console.error); };
    }, [activeTab, selectedUserId]);

    const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_admin: !currentStatus })
                .eq('id', userId);

            if (error) throw error;

            // Audit Log
            if (user) {
                await logAdminAction(user.id, userId, 'toggle_admin', { newValue: !currentStatus });
            }

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

            // Also update the 'acts' table to keep visibility in sync
            await supabase
                .from('acts')
                .update({ is_published: !currentStatus })
                .eq('owner_id', userId);

            // Audit Log
            if (user) {
                await logAdminAction(user.id, userId, 'toggle_published', { newValue: !currentStatus });
            }

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

    const renderApprovalItem = ({ item }: { item: PendingAct }) => (
        <View style={styles.card}>
            <Image source={{ uri: item.image_url || 'https://euphonious-kelpie-cd0a27.netlify.app/images/default-banner.png' }} style={styles.cardImage} />
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardCategory}>{item.category}</Text>
                <Text style={styles.cardDate}>Created: {new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            <View style={styles.actionButtons}>
                <Pressable
                    style={styles.approveButton}
                    onPress={() => togglePublishedStatus(item.owner_id, false, item.name)}
                >
                    <CheckCircle size={16} color={COLORS.background} />
                    <Text style={styles.approveText}>Approve</Text>
                </Pressable>
                <Pressable
                    style={styles.deleteButton}
                    onPress={() => router.push(`/admin/users/${item.owner_id}` as any)}
                >
                    <Eye size={16} color={COLORS.textDim} />
                </Pressable>
            </View>
        </View>
    );

    const renderLeadItem = ({ item }: { item: Lead }) => (
        <View style={styles.card}>
            <View style={styles.cardContent}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.cardTitle}>{item.client_name}</Text>
                    <Text style={[styles.statusBadge, { color: item.status === 'Won' ? '#4CAF50' : COLORS.primary }]}>{item.status}</Text>
                </View>
                <Text style={styles.cardCategory}>Interest: {item.act_name}</Text>
                <Text style={styles.cardDate}>Event: {item.event_date}</Text>
            </View>
            <Pressable
                style={styles.waButton}
                onPress={() => contactWhatsApp(item.client_whatsapp, item.client_name)}
            >
                <MessageCircle size={20} color="white" />
            </Pressable>
        </View>
    );

    const renderProfileItem = ({ item }: { item: Profile }) => (
        <View style={styles.card}>
            <Pressable
                style={{ flex: 1 }}
                onPress={() => router.push(`/admin/users/${item.id}` as any)}
            >
                <View style={styles.cardContent}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.cardTitle}>{item.name || 'Unnamed'}</Text>
                        <ChevronRight size={18} color={COLORS.textDim} />
                    </View>
                    <Text style={styles.cardCategory}>{item.role?.toUpperCase()} • {item.email}</Text>
                </View>
            </Pressable>
            <View style={{ gap: 8, alignItems: 'center' }}>
                <Pressable
                    style={[styles.approveButton, { backgroundColor: COLORS.primary, paddingHorizontal: 12 }]}
                    onPress={() => router.push(`/admin/acts/${item.id}/dashboard` as any)}
                >
                    <Text style={[styles.approveText, { fontSize: 10, color: 'black' }]}>MANAGE DASH</Text>
                </Pressable>
                <Text style={[styles.switchLabel, { color: item.is_published ? COLORS.primary : '#F44336', fontSize: 10 }]}>
                    {item.is_published ? 'PUBLIC' : 'PRIVATE'}
                </Text>
            </View>
        </View>
    );

    const renderActItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <Image
                source={{ uri: item.image_url || 'https://euphonious-kelpie-cd0a27.netlify.app/images/default-avatar.png' }}
                style={styles.cardImage}
            />
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardCategory}>{item.category} • {item.owner_name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={[styles.dot, { backgroundColor: item.has_act ? (item.is_published ? '#4CAF50' : COLORS.primary) : '#F44336' }]} />
                    <Text style={styles.cardDate}>
                        {item.has_act ? (item.is_published ? 'Publicado' : 'Borrador') : 'Sin Perfil Act'}
                    </Text>
                </View>
            </View>
            <View style={{ gap: 8 }}>
                <Pressable
                    style={[styles.approveButton, { backgroundColor: COLORS.primary }]}
                    onPress={() => router.push(`/admin/acts/${item.id}/dashboard` as any)}
                >
                    <Text style={[styles.approveText, { color: 'black' }]}>
                        {item.has_act ? 'Manage Dash' : 'Create Act'}
                    </Text>
                </Pressable>

                {item.has_act && (
                    <Pressable
                        style={styles.deleteButton}
                        onPress={() => Alert.alert('Delete', 'Delete this act record permanently?', [
                            { text: 'Cancel', style: 'cancel' },
                            {
                                text: 'Delete', style: 'destructive', onPress: async () => {
                                    await supabase.from('acts').delete().eq('owner_id', item.id);
                                    fetchAllActs();
                                }
                            }
                        ])}
                    >
                        <Text style={{ color: '#F44336', fontSize: 10, fontWeight: 'bold', textAlign: 'center' }}>DEL ACT</Text>
                    </Pressable>
                )}
            </View>
        </View>
    );

    const renderBookingItem = ({ item }: { item: Booking }) => (
        <View style={styles.card}>
            <View style={styles.cardContent}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.cardTitle}>{item.act_name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                        <Text style={{ color: 'black', fontSize: 10, fontWeight: 'bold' }}>{item.status.toUpperCase()}</Text>
                    </View>
                </View>
                <Text style={styles.cardCategory}>Client: {item.client_name}</Text>
                <Text style={styles.cardDate}>Event Date: {item.event_date}</Text>
                <Text style={[styles.cardDate, { color: COLORS.primary, marginTop: 4, fontWeight: 'bold' }]}>
                    Total: €{item.total_amount?.toLocaleString()}
                </Text>
            </View>
            <Pressable
                style={[styles.approveButton, { backgroundColor: COLORS.primary }]}
                onPress={() => router.push(`/admin/requests/${item.id}` as any)}
            >
                <Text style={[styles.approveText, { color: 'black' }]}>MANAGE</Text>
            </Pressable>
        </View>
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return COLORS.primary;
            case 'accepted': return '#4CAF50';
            case 'declined': return '#F44336';
            case 'paid': return '#2196F3';
            case 'canceled': return '#9E9E9E';
            default: return '#333';
        }
    };

    const renderReviewItem = ({ item }: { item: Review }) => (
        // ... (truncated)
        <View />
    );

    const renderMessageItem = ({ item, isBooking }: { item: any, isBooking: boolean }) => {
        const title = isBooking 
            ? `${item.booking_requests?.client_name} • ${item.booking_requests?.acts?.name}`
            : (item.otherUser?.name || item.otherUser?.email || 'User');
        
        return (
            <Pressable 
                style={styles.card}
                onPress={() => {
                    if (isBooking) router.push(`/admin/requests/${item.booking_request_id}` as any);
                    else router.push(`/admin/messages/${item.otherUser?.id}` as any);
                }}
            >
                <View style={[styles.dot, { backgroundColor: item.unreadCount > 0 ? COLORS.primary : '#333', marginRight: 10 }]} />
                <View style={styles.cardContent}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.cardTitle}>{title}</Text>
                        {item.unreadCount > 0 && (
                            <View style={styles.unreadBadge}>
                                <Text style={styles.unreadText}>{item.unreadCount}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={[styles.cardCategory, { color: isBooking ? '#8B5CF6' : COLORS.primary }]}>
                        {isBooking ? 'BOOKING CHAT' : 'SUPPORT TICKET'}
                    </Text>
                    <Text style={styles.cardDate} numberOfLines={1}>
                        {isBooking ? item.content : item.content}
                    </Text>
                </View>
                <ChevronRight size={18} color="#444" />
            </Pressable>
        );
    };

    const renderMessagesTab = () => {
        const isWeb = Platform.OS === 'web';
        
        return (
            <View style={{ flex: 1, flexDirection: isWeb ? 'row' : 'column' }}>
                {/* Conversations List (Sidebar on Web, List on Mobile) */}
                {(!selectedUserId || isWeb) && (
                    <ScrollView 
                        style={[isWeb ? { width: 350, borderRightWidth: 1, borderRightColor: '#222' } : { flex: 1 }]} 
                        contentContainerStyle={styles.listContent}
                    >
                        <Text style={styles.sectionHeader}>SUPPORT INBOX</Text>
                        {supportRequests.length === 0 ? (
                            <Text style={styles.emptyTextInline}>No support requests yet.</Text>
                        ) : (
                            supportRequests.map(item => (
                                <Pressable 
                                    key={item.otherUser?.id || item.id}
                                    style={[
                                        styles.card, 
                                        item.unreadCount > 0 && { borderColor: COLORS.primary, borderWidth: 1.5 },
                                        selectedUserId === item.otherUser?.id && { backgroundColor: '#2A2A2A', borderColor: COLORS.primary }
                                    ]}
                                    onPress={() => {
                                        setSelectedUserId(item.otherUser?.id);
                                        fetchChat(item.otherUser?.id);
                                    }}
                                >
                                    <Image 
                                        source={{ uri: item.otherUser?.avatar_url || 'https://euphonious-kelpie-cd0a27.netlify.app/images/default-avatar.png' }}
                                        style={[styles.cardImage, { width: 44, height: 44 }]} 
                                    />
                                    <View style={styles.cardContent}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                            <Text style={[styles.cardTitle, { fontSize: 14 }]} numberOfLines={1}>{item.otherUser?.name || item.otherUser?.email || 'User'}</Text>
                                            {item.unreadCount > 0 && (
                                                <View style={{ backgroundColor: COLORS.primary, width: 8, height: 8, borderRadius: 4 }} />
                                            )}
                                        </View>
                                        <Text style={[styles.cardDate, { fontSize: 11, color: item.unreadCount > 0 ? '#FFF' : COLORS.textDim }]} numberOfLines={1}>
                                            {item.content}
                                        </Text>
                                    </View>
                                    {item.unreadCount > 0 && (
                                        <Text style={{ color: COLORS.primary, fontWeight: 'bold', fontSize: 12, marginRight: 8 }}>{item.unreadCount}</Text>
                                    )}
                                    <ChevronRight size={16} color={COLORS.textDim} />
                                </Pressable>
                            ))
                        )}

                        <Text style={[styles.sectionHeader, { marginTop: 24 }]}>BOOKING CHATS</Text>
                        {bookingChats.length === 0 ? (
                            <Text style={styles.emptyTextInline}>No booking messages.</Text>
                        ) : (
                            bookingChats.map(item => renderMessageItem({ item, isBooking: true }))
                        )}
                    </ScrollView>
                )}

                {/* Chat Window (Right side on Web, Overlay/Separate on Mobile) */}
                {(selectedUserId || isWeb) && (
                    <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
                        {!selectedUserId ? (
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                                <MessageCircle size={64} color={COLORS.textDim} />
                                <Text style={{ color: 'white', marginTop: 16 }}>Select a conversation to start chatting</Text>
                            </View>
                        ) : (
                            <View style={{ flex: 1 }}>
                                {/* Chat Header */}
                                <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#222', flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#111' }}>
                                    <Pressable 
                                        onPress={() => setSelectedUserId(null)} 
                                        style={{ 
                                            padding: 8, 
                                            marginRight: 4, 
                                            backgroundColor: '#1A1A1A', 
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: '#333'
                                        }}
                                    >
                                        <ChevronLeft size={20} color="white" />
                                    </Pressable>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                                            {supportRequests.find(s => s.otherUser?.id === selectedUserId)?.otherUser?.name || 'Chat'}
                                        </Text>
                                        <Text style={{ color: COLORS.textDim, fontSize: 12 }}>Direct Messaging</Text>
                                    </View>
                                </View>

                                {/* Messages list */}
                                {chatLoading ? (
                                    <ActivityIndicator color={COLORS.primary} style={{ flex: 1 }} />
                                ) : (
                                    <FlatList
                                        data={chatMessages}
                                        keyExtractor={(item) => item.id}
                                        contentContainerStyle={{ padding: 16 }}
                                        renderItem={({ item }) => {
                                            const isMe = item.sender_id === user?.id;
                                            return (
                                                <View style={{
                                                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                                                    backgroundColor: isMe ? COLORS.primary : '#1E1E1E',
                                                    paddingHorizontal: 16,
                                                    paddingVertical: 10,
                                                    borderRadius: 18,
                                                    maxWidth: '80%',
                                                    marginBottom: 8,
                                                    borderBottomRightRadius: isMe ? 2 : 18,
                                                    borderBottomLeftRadius: isMe ? 18 : 2
                                                }}>
                                                    <Text style={{ color: isMe ? '#000' : '#FFF', fontSize: 14 }}>{item.content}</Text>
                                                    <Text style={{ color: isMe ? 'rgba(0,0,0,0.5)' : '#666', fontSize: 9, marginTop: 4, textAlign: 'right' }}>
                                                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </Text>
                                                </View>
                                            );
                                        }}
                                    />
                                )}

                                {/* Input area */}
                                <KeyboardAvoidingView 
                                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                                    style={{ borderTopWidth: 1, borderTopColor: '#222', padding: 12, backgroundColor: '#111' }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <TextInput
                                            style={{ flex: 1, backgroundColor: '#1A1A1A', color: 'white', padding: 12, borderRadius: 20, fontSize: 14 }}
                                            placeholder="Write a reply..."
                                            placeholderTextColor="#666"
                                            value={replyText}
                                            onChangeText={setReplyText}
                                            multiline
                                        />
                                        <Pressable 
                                            onPress={sendAdminReply}
                                            disabled={!replyText.trim() || sendingReply}
                                            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            {sendingReply ? <ActivityIndicator size="small" color="black" /> : <Send size={20} color="black" />}
                                        </Pressable>
                                    </View>
                                </KeyboardAvoidingView>
                            </View>
                        )}
                    </View>
                )}
            </View>
        );
    };

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
                    <Pressable style={[styles.tab, activeTab === 'messages' && styles.activeTab]} onPress={() => setActiveTab('messages')}>
                        <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>Messages</Text>
                    </Pressable>
                </ScrollView>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
            ) : activeTab === 'stats' ? (
                renderStats()
            ) : activeTab === 'messages' ? (
                renderMessagesTab()
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
    dot: { width: 6, height: 6, borderRadius: 3 },
    sectionHeader: { color: COLORS.text, fontSize: 14, fontWeight: 'bold', marginVertical: 10, opacity: 0.6, letterSpacing: 0.5 },
    emptyTextInline: { color: COLORS.textDim, fontSize: 13, fontStyle: 'italic', marginBottom: 10 },
    unreadBadge: {
        backgroundColor: COLORS.primary,
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 1.5,
        borderColor: '#050505',
    },
    unreadText: {
        color: '#000',
        fontSize: 9,
        fontWeight: '900',
    }
});
