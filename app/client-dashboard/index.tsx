import { COLORS } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';
import { useRouter } from 'expo-router';
import { ArrowRight, Calendar, Heart, Plus, Send, Settings, Sparkles } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ClientOverview() {
    const { profile } = useAuth();
    const router = useRouter();
    
    // Redirect to the new profile-based dashboard
    useEffect(() => {
        router.replace('/(tabs)/profile' as any);
    }, []);

    const [stats, setStats] = useState({ favorites: 0, requests: 0, eventStatus: '' });
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!profile?.id) return;
        try {
            const [{ count: reqCount }, { data: evt }] = await Promise.all([
                supabase.from('booking_requests').select('id', { count: 'exact', head: true }).eq('client_id', profile.id),
                supabase.from('client_events').select('status').eq('client_id', profile.id).maybeSingle(),
            ]);
            setStats({
                favorites: (profile.favorites || []).length,
                requests: reqCount || 0,
                eventStatus: evt?.status || '',
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [profile?.id, profile?.favorites]);

    useEffect(() => { load(); }, [load]);

    const firstName = profile?.name?.split(' ')[0] || 'there';
    const hasEvent = !!stats.eventStatus;

    if (loading) return (
        <View style={styles.center}>
            <ActivityIndicator color={COLORS.primary} />
        </View>
    );

    return (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.greeting}>Hello, {firstName} 👋</Text>
                <Text style={styles.subtitle}>Your private event workspace</Text>
            </View>

            {/* Event prompt if no event */}
            {!hasEvent && (
                <Pressable style={styles.promptCard} onPress={() => router.push('/client-dashboard/my-event' as any)}>
                    <View style={styles.promptLeft}>
                        <Sparkles size={20} color={COLORS.primary} />
                        <View>
                            <Text style={styles.promptTitle}>Set up your event</Text>
                            <Text style={styles.promptSub}>Add your event details to get started</Text>
                        </View>
                    </View>
                    <ArrowRight size={18} color={COLORS.primary} />
                </Pressable>
            )}

            {/* Stats */}
            <View style={styles.statsRow}>
                <StatCard icon={Heart} label="Saved Artists" value={stats.favorites} color="#E91E63" onPress={() => router.push('/client-dashboard/favorites' as any)} />
                <StatCard icon={Send} label="Requests" value={stats.requests} color="#2196F3" onPress={() => router.push('/client-dashboard/requests' as any)} />
                <StatCard
                    icon={Calendar}
                    label="My Event"
                    value={hasEvent ? (stats.eventStatus.charAt(0).toUpperCase() + stats.eventStatus.slice(1)) : 'None'}
                    color="#CCFF00"
                    isText
                    onPress={() => router.push('/client-dashboard/my-event' as any)}
                />
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
                <ActionCard
                    title="Explore Artists"
                    desc="Browse the full talent catalog"
                    icon="🎤"
                    onPress={() => router.replace('/(tabs)' as any)}
                />
                <ActionCard
                    title={hasEvent ? "Edit My Event" : "Create Event"}
                    desc={hasEvent ? "Update your event details" : "Describe your event brief"}
                    icon="📋"
                    onPress={() => router.push('/client-dashboard/my-event' as any)}
                />
                <ActionCard
                    title="My Favorites"
                    desc="View your saved artists"
                    icon="♥"
                    onPress={() => router.push('/client-dashboard/favorites' as any)}
                />
                <ActionCard
                    title="Contact Admin"
                    desc="Get help from our team"
                    icon="💬"
                    onPress={() => router.push('/(tabs)/messages' as any)}
                />
            </View>
        </ScrollView>
    );
}

function StatCard({ icon: Icon, label, value, color, isText = false, onPress }: any) {
    return (
        <Pressable style={styles.statCard} onPress={onPress}>
            <View style={[styles.statIcon, { backgroundColor: color + '18' }]}>
                <Icon size={18} color={color} />
            </View>
            <Text style={[styles.statValue, isText && { fontSize: 13 }]}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </Pressable>
    );
}

function ActionCard({ title, desc, icon, onPress }: any) {
    return (
        <Pressable style={styles.actionCard} onPress={onPress}>
            <Text style={styles.actionIcon}>{icon}</Text>
            <Text style={styles.actionTitle}>{title}</Text>
            <Text style={styles.actionDesc}>{desc}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#050505' },
    scroll: { flex: 1, backgroundColor: '#050505' },
    container: { padding: Platform.OS === 'web' ? 40 : 24, paddingBottom: 120 },
    header: { marginBottom: 28 },
    greeting: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
    subtitle: { fontSize: 15, color: '#6B7280' },
    promptCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(204,255,0,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(204,255,0,0.25)',
        borderRadius: 16,
        padding: 18,
        marginBottom: 28,
    },
    promptLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
    promptTitle: { color: COLORS.text, fontWeight: '700', fontSize: 15, marginBottom: 2 },
    promptSub: { color: '#6B7280', fontSize: 13 },
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 36 },
    statCard: {
        flex: 1,
        backgroundColor: '#0F0F0F',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#1A1A1A',
        padding: 16,
        alignItems: 'flex-start',
    },
    statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    statValue: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
    statLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: '#4B5563', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 },
    actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    actionCard: {
        width: Platform.OS === 'web' ? 220 : '47%',
        backgroundColor: '#0F0F0F',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#1A1A1A',
        padding: 20,
    },
    actionIcon: { fontSize: 26, marginBottom: 12 },
    actionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
    actionDesc: { fontSize: 12, color: '#6B7280', lineHeight: 17 },
});
