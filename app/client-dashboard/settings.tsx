import { COLORS } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';
import { useRouter } from 'expo-router';
import { Camera, CheckCircle, LogOut, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Image, Platform, Pressable,
    ScrollView, StyleSheet, Text, TextInput, View
} from 'react-native';
import Toast from 'react-native-toast-message';

export default function SettingsPage() {
    const { profile, refreshAuth } = useAuth();
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: '', phone: '', company: '', preferred_event_type: '', preferred_location: ''
    });

    useEffect(() => {
        if (profile) {
            setForm({
                name: profile.name || '',
                phone: profile.phone || '',
                company: profile.company || '',
                preferred_event_type: profile.preferred_event_type || '',
                preferred_location: profile.preferred_location || '',
            });
        }
    }, [profile]);

    const save = async () => {
        if (!form.name.trim()) { Toast.show({ type: 'error', text1: 'Name is required.' }); return; }
        setSaving(true);
        try {
            const { error } = await supabase.from('profiles').update({
                name: form.name,
                phone: form.phone || null,
                company: form.company || null,
                preferred_event_type: form.preferred_event_type || null,
                preferred_location: form.preferred_location || null,
            }).eq('id', profile.id);
            if (error) throw error;
            await refreshAuth();
            Toast.show({ type: 'success', text1: 'Settings saved!' });
        } catch (e: any) {
            Toast.show({ type: 'error', text1: 'Error', text2: e.message });
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        Alert.alert('Log Out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log Out', style: 'destructive', onPress: async () => { await supabase.auth.signOut(); router.replace('/login'); } }
        ]);
    };

    const fi = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

    return (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.pageTitle}>Settings</Text>
                <Text style={styles.pageSub}>Manage your account</Text>
            </View>

            {/* Avatar */}
            <View style={styles.avatarSection}>
                <View style={styles.avatar}>
                    {profile?.avatar_url
                        ? <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
                        : <Text style={styles.avatarInitial}>{profile?.name?.[0]?.toUpperCase() || 'C'}</Text>
                    }
                </View>
                <View>
                    <Text style={styles.avatarName}>{profile?.name || 'Client'}</Text>
                    <Text style={styles.avatarEmail}>{profile?.email}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>Private Client</Text>
                    </View>
                </View>
            </View>

            {/* Form */}
            <View style={styles.formCard}>
                <Text style={styles.sectionTitle}>Personal Info</Text>
                <Field label="Full Name *" value={form.name} onChange={fi('name')} placeholder="Your name" />
                <Field label="Phone" value={form.phone} onChange={fi('phone')} placeholder="+34 600 000 000" keyboardType="phone-pad" />
                <Field label="Company / Organisation" value={form.company} onChange={fi('company')} placeholder="e.g. Luxury Events Co." />

                <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Event Preferences</Text>
                <Field label="Preferred Event Type" value={form.preferred_event_type} onChange={fi('preferred_event_type')} placeholder="e.g. Private Party, Corporate, Wedding" />
                <Field label="Preferred Location" value={form.preferred_location} onChange={fi('preferred_location')} placeholder="e.g. Ibiza, Dubai, Mykonos" />

                <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
                    {saving
                        ? <ActivityIndicator color="#000" size="small" />
                        : <><CheckCircle size={16} color="#000" /><Text style={styles.saveBtnText}>Save Changes</Text></>
                    }
                </Pressable>
            </View>

            {/* Account info */}
            <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{profile?.email || '—'}</Text>
                <Text style={styles.infoNote}>To change your email, contact our support team.</Text>
            </View>

            {/* Danger zone */}
            <View style={styles.dangerCard}>
                <Text style={styles.dangerTitle}>Account</Text>
                <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                    <LogOut size={16} color="#EF4444" />
                    <Text style={styles.logoutText}>Log Out</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}

function Field({ label, value, onChange, placeholder, keyboardType }: any) {
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

const styles = StyleSheet.create({
    scroll: { flex: 1, backgroundColor: '#050505' },
    container: { padding: Platform.OS === 'web' ? 40 : 24, paddingBottom: 120 },
    header: { marginBottom: 28 },
    pageTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
    pageSub: { fontSize: 14, color: '#6B7280' },
    avatarSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        backgroundColor: '#0F0F0F',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#1A1A1A',
        padding: 20,
        marginBottom: 24,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(204,255,0,0.1)',
        borderWidth: 2,
        borderColor: 'rgba(204,255,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImg: { width: 64, height: 64 },
    avatarInitial: { color: COLORS.primary, fontWeight: '800', fontSize: 24 },
    avatarName: { color: '#FFFFFF', fontWeight: '700', fontSize: 17, marginBottom: 3 },
    avatarEmail: { color: '#6B7280', fontSize: 13, marginBottom: 8 },
    roleBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(204,255,0,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(204,255,0,0.3)',
        borderRadius: 20,
        paddingVertical: 3,
        paddingHorizontal: 10,
    },
    roleBadgeText: { fontSize: 11, color: COLORS.primary, fontWeight: '700', letterSpacing: 0.5 },
    formCard: {
        backgroundColor: '#0F0F0F',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#1A1A1A',
        padding: 24,
        marginBottom: 20,
    },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: '#4B5563', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 20 },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', marginBottom: 8 },
    input: {
        backgroundColor: '#171717',
        borderWidth: 1,
        borderColor: '#222',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        color: '#FFFFFF',
        fontSize: 15,
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: COLORS.primary,
        paddingVertical: 15,
        borderRadius: 14,
        marginTop: 8,
    },
    saveBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },
    infoCard: {
        backgroundColor: '#0F0F0F',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#1A1A1A',
        padding: 20,
        marginBottom: 20,
    },
    infoLabel: { fontSize: 11, fontWeight: '700', color: '#4B5563', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
    infoValue: { fontSize: 15, color: '#9CA3AF', marginBottom: 6 },
    infoNote: { fontSize: 12, color: '#374151', fontStyle: 'italic' },
    dangerCard: {
        backgroundColor: '#0F0F0F',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#1F1F1F',
        padding: 20,
    },
    dangerTitle: { fontSize: 11, fontWeight: '700', color: '#4B5563', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: 'rgba(239,68,68,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.2)',
        alignSelf: 'flex-start',
    },
    logoutText: { color: '#EF4444', fontWeight: '700', fontSize: 14 },
});
