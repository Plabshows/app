
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    Activity,
    Calendar,
    ChevronLeft,
    Eye,
    Lock,
    Mail,
    MapPin,
    Shield,
    Trash2,
    Unlock,
    User
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../../src/constants/theme';
import { useAuth } from '../../../src/context/AuthContext';
import { logAdminAction } from '../../../src/lib/audit';
import { supabase } from '../../../src/lib/supabase';

export default function AdminUserDetail() {
    const { userId } = useLocalSearchParams();
    const router = useRouter();
    const { startImpersonation, user: currentAdmin } = useAuth();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [stats, setStats] = useState<any>({
        bookings: 0,
        reviews: 0,
        leads: 0
    });

    useEffect(() => {
        if (userId) fetchUserDetails();
    }, [userId]);

    const fetchUserDetails = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            setUser(data);

            // Fetch some stats
            const { count: bookingCount } = await supabase
                .from('bookings')
                .select('*', { count: 'exact', head: true })
                .or(`client_id.eq.${userId},artist_id.eq.${userId}`);

            setStats((prev: any) => ({ ...prev, bookings: bookingCount || 0 }));

        } catch (e) {
            console.error('Error fetching user detail:', e);
            Alert.alert('Error', 'Could not load user details.');
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (field: 'is_admin' | 'is_published') => {
        try {
            const newValue = !user[field];
            const { error } = await supabase
                .from('profiles')
                .update({ [field]: newValue })
                .eq('id', userId);

            if (error) throw error;
            setUser({ ...user, [field]: newValue });

            // Audit Log
            if (currentAdmin) {
                await logAdminAction(
                    currentAdmin.id,
                    userId as string,
                    field === 'is_admin' ? 'toggle_admin' : 'toggle_published',
                    { newValue }
                );
            }
        } catch (e) {
            Alert.alert('Error', 'Update failed.');
        }
    };

    const handleImpersonate = async () => {
        Alert.alert(
            'Impersonate User',
            `You are about to enter the app as ${user.name || 'this user'}. Any changes you make will be saved as them.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Proceed',
                    onPress: async () => {
                        if (currentAdmin) {
                            await logAdminAction(currentAdmin.id, user.id, 'impersonate');
                        }
                        await startImpersonation(user.id);
                        router.replace('/(tabs)/profile');
                    }
                }
            ]
        );
    };

    if (loading) return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
    );

    if (!user) return (
        <View style={styles.errorContainer}>
            <Text style={styles.errorText}>User not found.</Text>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
                <Text style={styles.backButtonText}>Go Back</Text>
            </Pressable>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.iconButton}>
                    <ChevronLeft size={24} color={COLORS.text} />
                </Pressable>
                <Text style={styles.headerTitle}>User Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.profileHeader}>
                    <View style={styles.avatarWrapper}>
                        {user.avatar_url ? (
                            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <User size={40} color={COLORS.textDim} />
                            </View>
                        )}
                        {user.role === 'admin' && (
                            <View style={styles.adminBadge}>
                                <Shield size={16} color="#000" />
                            </View>
                        )}
                    </View>
                    <Text style={styles.name}>{user.name || 'Unnamed User'}</Text>
                    <Text style={styles.roleTag}>{user.role?.toUpperCase()}</Text>
                </View>

                <View style={styles.card}>
                    <DetailRow icon={<Mail size={18} color={COLORS.textDim} />} label="Email" value={user.email || 'N/A'} />
                    <DetailRow icon={<MapPin size={18} color={COLORS.textDim} />} label="Location" value={user.city || 'Not set'} />
                    <DetailRow icon={<Calendar size={18} color={COLORS.textDim} />} label="Joined" value={new Date(user.created_at).toLocaleDateString()} />
                </View>

                <View style={styles.statsRow}>
                    <StatItem label="Bookings" value={stats.bookings} />
                    <StatItem label="Reviews" value={stats.reviews} />
                    <StatItem label="Leads" value={stats.leads} />
                </View>

                <Text style={styles.sectionTitle}>Actions</Text>

                <View style={styles.actionGrid}>
                    <ActionButton
                        icon={<Eye size={20} color={COLORS.text} />}
                        label="View Public Profile"
                        onPress={() => router.push(`/act/${user.id}`)}
                    />
                    <ActionButton
                        icon={<Activity size={20} color={COLORS.primary} />}
                        label="Impersonate"
                        onPress={handleImpersonate}
                        highlight
                    />
                    <ActionButton
                        icon={user.is_published ? <Lock size={20} color="#FF4444" /> : <Unlock size={20} color="#44FF44" />}
                        label={user.is_published ? "Unpublish Act" : "Publish Act"}
                        onPress={() => toggleStatus('is_published')}
                    />
                    <ActionButton
                        icon={<Shield size={20} color={COLORS.text} />}
                        label={user.is_admin ? "Remove Admin" : "Make Admin"}
                        onPress={() => toggleStatus('is_admin')}
                    />
                </View>

                <Text style={styles.sectionTitle}>Management</Text>
                <Pressable
                    style={[styles.fullButton, { borderColor: '#FF4444' }]}
                    onPress={() => Alert.alert('Delete User', 'This action is PERMANENT and cannot be undone.', [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive' }])}
                >
                    <Trash2 size={20} color="#FF4444" />
                    <Text style={[styles.fullButtonText, { color: '#FF4444' }]}>Delete Account</Text>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}

const DetailRow = ({ icon, label, value }: { icon: any, label: string, value: string }) => (
    <View style={styles.detailRow}>
        <View style={styles.detailIcon}>{icon}</View>
        <View>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value}</Text>
        </View>
    </View>
);

const StatItem = ({ label, value }: { label: string, value: number }) => (
    <View style={styles.statItem}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

const ActionButton = ({ icon, label, onPress, highlight }: { icon: any, label: string, onPress: () => void, highlight?: boolean }) => (
    <Pressable
        style={[styles.actionButton, highlight && styles.highlightAction]}
        onPress={onPress}
    >
        {icon}
        <Text style={[styles.actionButtonText, highlight && { color: COLORS.primary }]}>{label}</Text>
    </Pressable>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    loadingContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
    errorContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', padding: 40 },
    errorText: { color: COLORS.textDim, fontSize: 18, marginBottom: 20 },
    backButton: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    backButtonText: { color: '#000', fontWeight: 'bold' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.m,
        height: 60
    },
    headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
    iconButton: { padding: 8 },
    scrollContent: { padding: SPACING.l },
    profileHeader: { alignItems: 'center', marginBottom: 30 },
    avatarWrapper: { position: 'relative', marginBottom: 16 },
    avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: COLORS.primary },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#1A1A1A',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#333'
    },
    adminBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: COLORS.primary,
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: COLORS.background
    },
    name: { color: COLORS.text, fontSize: 24, fontWeight: 'bold' },
    roleTag: {
        color: COLORS.primary,
        fontSize: 12,
        fontWeight: '900',
        marginTop: 6,
        letterSpacing: 1,
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 4
    },
    card: {
        backgroundColor: '#141414',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#222'
    },
    detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    detailIcon: { marginRight: 15, width: 24 },
    detailLabel: { color: COLORS.textDim, fontSize: 12 },
    detailValue: { color: COLORS.text, fontSize: 15, fontWeight: '500' },
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 30 },
    statItem: {
        flex: 1,
        backgroundColor: '#1A1A1A',
        padding: 15,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333'
    },
    statValue: { color: COLORS.primary, fontSize: 20, fontWeight: 'bold' },
    statLabel: { color: COLORS.textDim, fontSize: 10, marginTop: 4, fontWeight: 'bold' },
    sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 30 },
    actionButton: {
        width: '48%',
        backgroundColor: '#1A1A1A',
        padding: 15,
        borderRadius: 16,
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#333'
    },
    highlightAction: { borderColor: COLORS.primary },
    actionButtonText: { color: COLORS.text, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    fullButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        gap: 10
    },
    fullButtonText: { fontSize: 16, fontWeight: 'bold' }
});
