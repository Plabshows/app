
import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { useRouter } from 'expo-router';
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    Edit3,
    Eye,
    FileText,
    Image as ImageIcon,
    MessageSquare,
    Settings,
    Star
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

export default function DashboardOverview() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [act, setAct] = useState<any>(null);

    useEffect(() => {
        fetchAct();
    }, []);

    const fetchAct = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('acts')
                .select('*')
                .eq('owner_id', user.id)
                .maybeSingle();
            setAct(data);
        }
        setLoading(false);
    };

    if (loading) return (
        <View style={styles.centered}>
            <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
    );

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Welcome back, {act?.name || 'Artist'}</Text>
                <Text style={styles.subtitle}>Here is what's happening with your profile today.</Text>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
                <ActionBtn title="Edit Profile" icon={Edit3} onPress={() => router.push('/artist-dashboard/edit-profile' as any)} />
                <ActionBtn title="Photos" icon={ImageIcon} onPress={() => router.push('/artist-dashboard/photos' as any)} />
                <ActionBtn title="Riders" icon={FileText} onPress={() => router.push('/artist-dashboard/requirements' as any)} />
                <ActionBtn title="Settings" icon={Settings} onPress={() => router.push('/artist-dashboard/settings' as any)} />
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
                <StatCard title="Views" value="1.2k" icon={Eye} trend="+12%" />
                <StatCard title="Bookings" value="8" icon={Star} trend="+2" />
                <StatCard title="Reviews" value="4.9" icon={MessageSquare} trend="5 total" />
            </View>

            {/* Act Summary */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Profile Preview</Text>
                <View style={styles.actCard}>
                    <Text style={styles.actName}>{act?.name || 'Your Act Name'}</Text>
                    <Text style={styles.actType}>{act?.artist_type} • {act?.category}</Text>
                    <Text style={styles.actDesc} numberOfLines={3}>{act?.description || 'No description added yet.'}</Text>
                    <View style={styles.tags}>
                        {act?.is_published ? (
                            <View style={[styles.tag, { backgroundColor: '#4CAF5022' }]}>
                                <Text style={[styles.tagText, { color: '#4CAF50' }]}>Published</Text>
                            </View>
                        ) : (
                            <View style={[styles.tag, { backgroundColor: '#FF980022' }]}>
                                <Text style={[styles.tagText, { color: '#FF9800' }]}>Draft</Text>
                            </View>
                        )}
                        <Text style={styles.location}>{act?.location_base || 'No location set'}</Text>
                    </View>
                </View>
            </View>

            {/* Missing Items */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>To-Do List</Text>
                <TodoItem label="Add Award Information" icon={AlertCircle} type="warning" />
                <TodoItem label="Upload Technical Rider" icon={Clock} type="pending" />
                <TodoItem label="Verify Payment Information" icon={AlertCircle} type="warning" />
                <TodoItem label="Media Library Updated" icon={CheckCircle2} type="success" />
            </View>
        </ScrollView>
    );
}

const ActionBtn = ({ title, icon: Icon, onPress }: any) => (
    <Pressable style={styles.actionBtn} onPress={onPress}>
        <View style={styles.actionIconBox}>
            <Icon size={22} color={COLORS.primary} />
        </View>
        <Text style={styles.actionBtnText}>{title}</Text>
    </Pressable>
);

const StatCard = ({ title, value, icon: Icon, trend }: any) => (
    <View style={styles.statCard}>
        <View style={styles.statHeader}>
            <View style={styles.iconBox}>
                <Icon size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.trendText}>{trend}</Text>
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
    </View>
);

const TodoItem = ({ label, icon: Icon, type }: any) => (
    <View style={styles.todoItem}>
        <Icon size={20} color={type === 'success' ? '#4CAF50' : type === 'warning' ? '#FF9800' : COLORS.textDim} />
        <Text style={styles.todoLabel}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { padding: SPACING.l },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    header: { marginBottom: SPACING.xl },
    title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
    subtitle: { fontSize: 16, color: COLORS.textDim },

    quickActions: { flexDirection: 'row', gap: 12, marginBottom: SPACING.xl, flexWrap: Platform.OS === 'web' ? 'nowrap' : 'wrap' },
    actionBtn: { flex: 1, backgroundColor: '#1A1A1A', padding: 16, borderRadius: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#222' },
    actionIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
    actionBtnText: { color: COLORS.text, fontSize: 12, fontWeight: 'bold' },

    statsGrid: { flexDirection: 'row', gap: 16, marginBottom: SPACING.xl, flexWrap: 'wrap' },
    statCard: {
        backgroundColor: '#1A1A1A',
        padding: 20,
        borderRadius: 16,
        minWidth: 160,
        flex: 1,
        borderWidth: 1,
        borderColor: '#222'
    },
    statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(204, 255, 0, 0.1)', justifyContent: 'center', alignItems: 'center' },
    trendText: { fontSize: 12, color: COLORS.primary, fontWeight: 'bold' },
    statValue: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
    statTitle: { fontSize: 14, color: COLORS.textDim },

    section: { marginBottom: SPACING.xl },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginBottom: 16 },

    actCard: { backgroundColor: '#111', padding: 24, borderRadius: 20, borderWidth: 1, borderColor: '#333' },
    actName: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
    actType: { fontSize: 14, color: COLORS.primary, fontWeight: '600', marginBottom: 12 },
    actDesc: { color: COLORS.textDim, fontSize: 14, lineHeight: 20, marginBottom: 16 },
    tags: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    tagText: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
    location: { color: COLORS.textDim, fontSize: 12 },

    todoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1A1A',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        gap: 12,
        borderWidth: 1,
        borderColor: '#222'
    },
    todoLabel: { color: COLORS.text, fontSize: 15 }
});
