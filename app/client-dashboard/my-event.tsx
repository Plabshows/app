import { COLORS } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';
import { Calendar, CheckCircle, Edit3, FileText, MapPin, Users } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Platform, Pressable, ScrollView,
    StyleSheet, Text, TextInput, View
} from 'react-native';
import Toast from 'react-native-toast-message';

const EVENT_TYPES = ['Private Party', 'Corporate Event', 'Wedding', 'Festival', 'Brand Activation', 'Gala', 'Birthday', 'Other'];
const BUDGET_RANGES = ['Under €5k', '€5k–€15k', '€15k–€30k', '€30k–€50k', '€50k+'];

export default function MyEventPage() {
    const { profile } = useAuth();
    const [event, setEvent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({
        title: '', event_type: '', location: '', event_date: '', guest_count: '', budget_range: '', notes: '', status: 'draft'
    });

    const load = useCallback(async () => {
        if (!profile?.id) return;
        const { data } = await supabase.from('client_events').select('*').eq('client_id', profile.id).maybeSingle();
        setEvent(data);
        if (data) {
            setForm({
                title: data.title || '',
                event_type: data.event_type || '',
                location: data.location || '',
                event_date: data.event_date || '',
                guest_count: data.guest_count?.toString() || '',
                budget_range: data.budget_range || '',
                notes: data.notes || '',
                status: data.status || 'draft',
            });
        }
        setLoading(false);
    }, [profile?.id]);

    useEffect(() => { load(); }, [load]);

    const save = async () => {
        if (!form.title.trim()) { Alert.alert('Required', 'Please add an event title.'); return; }
        setSaving(true);
        try {
            const payload = {
                client_id: profile.id,
                title: form.title,
                event_type: form.event_type,
                location: form.location,
                event_date: form.event_date || null,
                guest_count: form.guest_count ? parseInt(form.guest_count) : null,
                budget_range: form.budget_range,
                notes: form.notes,
                status: form.status,
                updated_at: new Date().toISOString(),
            };
            const { error } = event
                ? await supabase.from('client_events').update(payload).eq('id', event.id)
                : await supabase.from('client_events').insert(payload);
            if (error) throw error;
            Toast.show({ type: 'success', text1: 'Saved!', text2: 'Your event brief has been updated.' });
            setIsEditing(false);
            load();
        } catch (e: any) {
            Toast.show({ type: 'error', text1: 'Error', text2: e.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;

    return (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.pageTitle}>My Event</Text>
                <Text style={styles.pageSub}>Your private event brief</Text>
            </View>

            {/* Summary Card if event exists and not editing */}
            {event && !isEditing && (
                <View style={styles.summaryCard}>
                    <View style={styles.summaryTop}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.summaryTitle}>{event.title}</Text>
                            {event.event_type ? <Text style={styles.summaryType}>{event.event_type}</Text> : null}
                        </View>
                        <StatusBadge status={event.status} />
                    </View>
                    <View style={styles.summaryMeta}>
                        {event.location ? <MetaRow icon={MapPin} text={event.location} /> : null}
                        {event.event_date ? <MetaRow icon={Calendar} text={event.event_date} /> : null}
                        {event.guest_count ? <MetaRow icon={Users} text={`${event.guest_count} guests`} /> : null}
                        {event.budget_range ? <MetaRow icon={FileText} text={event.budget_range} /> : null}
                    </View>
                    {event.notes ? <Text style={styles.notesText}>"{event.notes}"</Text> : null}
                    <Pressable style={styles.editBtn} onPress={() => setIsEditing(true)}>
                        <Edit3 size={15} color={COLORS.primary} />
                        <Text style={styles.editBtnText}>Edit Event Details</Text>
                    </Pressable>
                </View>
            )}

            {/* Empty state */}
            {!event && !isEditing && (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>📋</Text>
                    <Text style={styles.emptyTitle}>No event yet</Text>
                    <Text style={styles.emptySub}>Create your private event brief so we can find the perfect talent for you.</Text>
                    <Pressable style={styles.createBtn} onPress={() => setIsEditing(true)}>
                        <Text style={styles.createBtnText}>Create Event Brief</Text>
                    </Pressable>
                </View>
            )}

            {/* Form */}
            {isEditing && (
                <View style={styles.form}>
                    <Text style={styles.formTitle}>{event ? 'Edit Event Brief' : 'Create Event Brief'}</Text>

                    <Field label="Event Title *" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="e.g. Summer Gala 2025" />
                    <Field label="Location" value={form.location} onChange={v => setForm(f => ({ ...f, location: v }))} placeholder="e.g. Ibiza, Dubai, Mykonos" />
                    <Field label="Event Date" value={form.event_date} onChange={v => setForm(f => ({ ...f, event_date: v }))} placeholder="YYYY-MM-DD" />
                    <Field label="Guest Count" value={form.guest_count} onChange={v => setForm(f => ({ ...f, guest_count: v }))} placeholder="e.g. 200" keyboardType="numeric" />

                    <Text style={styles.fieldLabel}>Event Type</Text>
                    <View style={styles.chipRow}>
                        {EVENT_TYPES.map(t => (
                            <Pressable key={t} style={[styles.chip, form.event_type === t && styles.chipActive]} onPress={() => setForm(f => ({ ...f, event_type: t }))}>
                                <Text style={[styles.chipText, form.event_type === t && styles.chipTextActive]}>{t}</Text>
                            </Pressable>
                        ))}
                    </View>

                    <Text style={styles.fieldLabel}>Budget Range</Text>
                    <View style={styles.chipRow}>
                        {BUDGET_RANGES.map(b => (
                            <Pressable key={b} style={[styles.chip, form.budget_range === b && styles.chipActive]} onPress={() => setForm(f => ({ ...f, budget_range: b }))}>
                                <Text style={[styles.chipText, form.budget_range === b && styles.chipTextActive]}>{b}</Text>
                            </Pressable>
                        ))}
                    </View>

                    <Text style={styles.fieldLabel}>Notes / Creative Brief</Text>
                    <TextInput
                        style={[styles.input, styles.textarea]}
                        value={form.notes}
                        onChangeText={v => setForm(f => ({ ...f, notes: v }))}
                        placeholder="Describe the vibe, theme, or anything specific you want..."
                        placeholderTextColor="#4B5563"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />

                    <Text style={styles.fieldLabel}>Status</Text>
                    <View style={styles.chipRow}>
                        {(['draft', 'ready'] as const).map(s => (
                            <Pressable key={s} style={[styles.chip, form.status === s && styles.chipActive]} onPress={() => setForm(f => ({ ...f, status: s }))}>
                                <Text style={[styles.chipText, form.status === s && styles.chipTextActive]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
                            </Pressable>
                        ))}
                    </View>

                    <View style={styles.formActions}>
                        {event && (
                            <Pressable style={styles.cancelBtn} onPress={() => setIsEditing(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </Pressable>
                        )}
                        <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
                            {saving ? <ActivityIndicator color="#000" size="small" /> : <><CheckCircle size={16} color="#000" /><Text style={styles.saveBtnText}>Save Event</Text></>}
                        </Pressable>
                    </View>
                </View>
            )}
        </ScrollView>
    );
}

function Field({ label, value, onChange, placeholder, keyboardType }: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; keyboardType?: any;
}) {
    return (
        <View style={{ marginBottom: 20 }}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor="#4B5563"
                keyboardType={keyboardType || 'default'}
            />
        </View>
    );
}

function MetaRow({ icon: Icon, text }: any) {
    return (
        <View style={styles.metaRow}>
            <Icon size={14} color="#6B7280" />
            <Text style={styles.metaText}>{text}</Text>
        </View>
    );
}

function StatusBadge({ status }: any) {
    const colors: any = { draft: '#F59E0B', ready: '#10B981', submitted: '#6366F1' };
    const c = colors[status] || '#6B7280';
    return (
        <View style={[styles.badge, { backgroundColor: c + '22', borderColor: c + '44' }]}>
            <Text style={[styles.badgeText, { color: c }]}>{status}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#050505' },
    scroll: { flex: 1, backgroundColor: '#050505' },
    container: { padding: Platform.OS === 'web' ? 40 : 24, paddingBottom: 120 },
    header: { marginBottom: 28 },
    pageTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
    pageSub: { fontSize: 14, color: '#6B7280' },
    summaryCard: {
        backgroundColor: '#0F0F0F',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#1A1A1A',
        padding: 24,
        marginBottom: 24,
    },
    summaryTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
    summaryTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
    summaryType: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
    summaryMeta: { gap: 8, marginBottom: 16 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    metaText: { color: '#9CA3AF', fontSize: 14 },
    notesText: { color: '#6B7280', fontSize: 14, fontStyle: 'italic', lineHeight: 22, marginBottom: 16, borderLeftWidth: 2, borderLeftColor: '#2A2A2A', paddingLeft: 14 },
    editBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(204,255,0,0.3)', backgroundColor: 'rgba(204,255,0,0.05)' },
    editBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
    badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
    badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    emptyState: { alignItems: 'center', paddingVertical: 60 },
    emptyEmoji: { fontSize: 48, marginBottom: 16 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
    emptySub: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 28, maxWidth: 300 },
    createBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14 },
    createBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },
    form: { backgroundColor: '#0F0F0F', borderRadius: 20, borderWidth: 1, borderColor: '#1A1A1A', padding: 24 },
    formTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 24 },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', marginBottom: 10 },
    input: { backgroundColor: '#171717', borderWidth: 1, borderColor: '#222', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, color: '#FFFFFF', fontSize: 15 },
    textarea: { height: 110, textAlignVertical: 'top' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
    chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#2A2A2A', backgroundColor: '#171717' },
    chipActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(204,255,0,0.1)' },
    chipText: { color: '#6B7280', fontSize: 13, fontWeight: '500' },
    chipTextActive: { color: COLORS.primary, fontWeight: '700' },
    formActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: '#222', alignItems: 'center' },
    cancelBtnText: { color: '#6B7280', fontWeight: '600' },
    saveBtn: { flex: 2, flexDirection: 'row', paddingVertical: 14, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', gap: 8 },
    saveBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },
});
