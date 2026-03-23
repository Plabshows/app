import { COLORS } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';
import { useRouter } from 'expo-router';
import { Calendar, ChevronRight, Clock, ExternalLink, Heart, MapPin, MessageCircle, Send } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
    pending:  { color: '#F59E0B', label: 'Pending' },
    quoted:   { color: '#3B82F6', label: 'Quoted' },
    accepted: { color: '#10B981', label: 'Accepted' },
    declined: { color: '#EF4444', label: 'Declined' },
    expired:  { color: '#6B7280', label: 'Expired' },
    paid:     { color: '#8B5CF6', label: 'Paid' },
    canceled: { color: '#EF4444', label: 'Cancelled' },
};

export default function RequestsPage() {
    const { profile } = useAuth();
    const router = useRouter();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!profile?.id) return;
        const { data } = await supabase
            .from('booking_requests')
            .select('*, acts(name, image_url, category)')
            .eq('client_id', profile.id)
            .order('created_at', { ascending: false });
        setRequests(data || []);
        setLoading(false);
    }, [profile?.id]);

    useEffect(() => { load(); }, [load]);

    if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;

    if (requests.length === 0) {
        return (
            <View style={styles.center}>
                <Text style={styles.emptyEmoji}>📨</Text>
                <Text style={styles.emptyTitle}>No requests yet</Text>
                <Text style={styles.emptySub}>When you send an inquiry to an artist, it will appear here.</Text>
                <View style={styles.emptyActions}>
                    <Pressable style={styles.primaryBtn} onPress={() => router.replace('/(tabs)' as any)}>
                        <Text style={styles.primaryBtnText}>Explore Artists</Text>
                    </Pressable>
                    <Pressable style={styles.secondaryBtn} onPress={() => router.push('/client-dashboard/favorites' as any)}>
                        <Heart size={15} color="#9CA3AF" />
                        <Text style={styles.secondaryBtnText}>My Favorites</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    return (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.pageTitle}>Booking Requests</Text>
                <Text style={styles.pageSub}>{requests.length} request{requests.length !== 1 ? 's' : ''} sent</Text>
            </View>

            {requests.map(req => {
                const status = STATUS_CONFIG[req.status] || { color: '#6B7280', label: req.status };
                const isOpen = expanded === req.id;
                const act = req.acts;
                return (
                    <Pressable key={req.id} style={styles.card} onPress={() => setExpanded(isOpen ? null : req.id)}>
                        {/* Card header */}
                        <View style={styles.cardHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.actName}>{act?.name || 'Artist'}</Text>
                                {act?.category && <Text style={styles.actCategory}>{act.category}</Text>}
                            </View>
                            <View style={{ alignItems: 'flex-end', gap: 8 }}>
                                <View style={[styles.statusBadge, { backgroundColor: status.color + '18', borderColor: status.color + '44' }]}>
                                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                                </View>
                                <ChevronRight size={16} color="#4B5563" style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }} />
                            </View>
                        </View>

                        {/* Meta row */}
                        <View style={styles.metaRow}>
                            {req.event_dates?.[0] && (
                                <View style={styles.metaItem}>
                                    <Calendar size={13} color="#6B7280" />
                                    <Text style={styles.metaText}>{new Date(req.event_dates[0]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                                </View>
                            )}
                            {req.location_text && (
                                <View style={styles.metaItem}>
                                    <MapPin size={13} color="#6B7280" />
                                    <Text style={styles.metaText} numberOfLines={1}>{req.location_text}</Text>
                                </View>
                            )}
                            <View style={styles.metaItem}>
                                <Clock size={13} color="#6B7280" />
                                <Text style={styles.metaText}>{new Date(req.created_at).toLocaleDateString('en-GB')}</Text>
                            </View>
                        </View>

                        {/* Expanded details */}
                        {isOpen && (
                            <View style={styles.expanded}>
                                {req.event_type && <DetailRow label="Event Type" value={req.event_type} />}
                                {req.guests_count && <DetailRow label="Guests" value={`${req.guests_count}`} />}
                                {req.budget_amount && <DetailRow label="Budget" value={`${req.budget_currency || ''} ${req.budget_amount}`} />}
                                {req.notes && (
                                    <View style={styles.notesBlock}>
                                        <Text style={styles.detailLabel}>Notes</Text>
                                        <Text style={styles.notesText}>{req.notes}</Text>
                                    </View>
                                )}
                                <View style={styles.expandedActions}>
                                    <Pressable style={styles.viewActBtn} onPress={() => req.act_id && router.push(`/act/${req.act_id}` as any)}>
                                        <ExternalLink size={14} color="#9CA3AF" />
                                        <Text style={styles.viewActBtnText}>View Artist</Text>
                                    </Pressable>
                                    <Pressable style={styles.contactBtn} onPress={() => router.push('/client-dashboard/messages' as any)}>
                                        <MessageCircle size={14} color={COLORS.primary} />
                                        <Text style={styles.contactBtnText}>Contact Admin</Text>
                                    </Pressable>
                                </View>
                            </View>
                        )}
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#050505', padding: 40 },
    scroll: { flex: 1, backgroundColor: '#050505' },
    container: { padding: Platform.OS === 'web' ? 40 : 24, paddingBottom: 120 },
    header: { marginBottom: 24 },
    pageTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
    pageSub: { fontSize: 14, color: '#6B7280' },
    emptyEmoji: { fontSize: 52, marginBottom: 16 },
    emptyTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
    emptySub: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 28, maxWidth: 280 },
    emptyActions: { flexDirection: 'row', gap: 12 },
    primaryBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 22, borderRadius: 12 },
    primaryBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
    secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1, borderColor: '#222' },
    secondaryBtnText: { color: '#9CA3AF', fontWeight: '600', fontSize: 14 },
    card: {
        backgroundColor: '#0F0F0F',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#1A1A1A',
        padding: 18,
        marginBottom: 12,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    actName: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 3 },
    actCategory: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
    statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    metaText: { color: '#6B7280', fontSize: 12 },
    expanded: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#1A1A1A',
        gap: 8,
    },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    detailLabel: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
    detailValue: { color: '#9CA3AF', fontSize: 13 },
    notesBlock: { marginTop: 4 },
    notesText: { color: '#6B7280', fontSize: 13, lineHeight: 20, marginTop: 4, fontStyle: 'italic' },
    expandedActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
    viewActBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#222' },
    viewActBtnText: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },
    contactBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(204,255,0,0.3)', backgroundColor: 'rgba(204,255,0,0.05)' },
    contactBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
});
