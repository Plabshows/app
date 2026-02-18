
import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { ChevronDown, Save, Star, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';

const ARTIST_TYPES = ['Solo', 'Duo', 'Trio', 'Quartet', 'Band (5+)', 'Group/Crew'];

export default function UnifiedEditProfile() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);

    // Unified State
    const [profileData, setProfileData] = useState({
        // From 'profiles' table
        full_name: '',
        email: '',
        city: '',
        country: '',

        // From 'acts' table
        act_name: '',
        category_id: '',
        artist_type: '',
        genre: '',
        bio: ''
    });

    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'category' | 'type'>('category');
    const [errors, setErrors] = useState<string[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data: catData } = await supabase.from('categories').select('*').order('name');
            setCategories(catData || []);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch Profile
            const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();

            // Fetch Act
            const { data: act } = await supabase.from('acts').select('*').eq('owner_id', user.id).maybeSingle();

            setProfileData({
                full_name: prof?.name || '',
                email: user.email || '',
                city: prof?.city || '',
                country: prof?.country || '',
                act_name: act?.name || '',
                category_id: act?.category_id || '',
                artist_type: act?.artist_type || '',
                genre: act?.genre || '',
                bio: act?.description || ''
            });
        } catch (err) {
            console.error('Error fetching profile data:', err);
        } finally {
            setLoading(false);
        }
    };

    const validate = () => {
        const newErrors: string[] = [];
        if (!profileData.full_name) newErrors.push('full_name');
        if (!profileData.act_name) newErrors.push('act_name');
        if (!profileData.category_id) newErrors.push('category_id');
        if (!profileData.artist_type) newErrors.push('artist_type');
        setErrors(newErrors);
        return newErrors.length === 0;
    };

    const handleSave = async () => {
        if (!validate()) {
            return Alert.alert('Incomplete Form', 'Please fill in the required fields highlighted in red.');
        }

        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            // 1. Update Profiles Table
            const { error: profError } = await supabase
                .from('profiles')
                .update({
                    name: profileData.full_name,
                    city: profileData.city,
                    country: profileData.country
                })
                .eq('id', user.id);

            if (profError) throw profError;

            // 2. Update/Upsert Acts Table
            const { error: actError } = await supabase
                .from('acts')
                .upsert({
                    owner_id: user.id,
                    name: profileData.act_name,
                    category_id: profileData.category_id,
                    artist_type: profileData.artist_type,
                    genre: profileData.genre,
                    description: profileData.bio
                }, { onConflict: 'owner_id' });

            if (actError) throw actError;

            Alert.alert('Success', 'Profile and Act updated successfully!');
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <View style={styles.centered}>
            <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
    );

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Edit My Profile</Text>
                    <Text style={styles.subtitle}>Complete your information to stand out in the marketplace.</Text>
                </View>

                {/* --- PERSONAL INFO SECTION --- */}
                <View style={styles.sectionHeader}>
                    <User size={18} color={COLORS.primary} />
                    <Text style={styles.sectionTitle}>Personal Details</Text>
                </View>

                <View style={styles.card}>
                    <View style={styles.field}>
                        <Text style={[styles.label, errors.includes('full_name') && { color: COLORS.error }]}>Full Name</Text>
                        <TextInput
                            style={[styles.input, errors.includes('full_name') && styles.inputError]}
                            value={profileData.full_name}
                            onChangeText={t => setProfileData({ ...profileData, full_name: t })}
                            placeholder="John Doe"
                            placeholderTextColor={COLORS.textDim}
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.field, { flex: 1, marginRight: 12 }]}>
                            <Text style={styles.label}>City</Text>
                            <TextInput
                                style={styles.input}
                                value={profileData.city}
                                onChangeText={t => setProfileData({ ...profileData, city: t })}
                                placeholder="Dubai"
                                placeholderTextColor={COLORS.textDim}
                            />
                        </View>
                        <View style={[styles.field, { flex: 1 }]}>
                            <Text style={styles.label}>Country</Text>
                            <TextInput
                                style={styles.input}
                                value={profileData.country}
                                onChangeText={t => setProfileData({ ...profileData, country: t })}
                                placeholder="UAE"
                                placeholderTextColor={COLORS.textDim}
                            />
                        </View>
                    </View>
                </View>

                {/* --- ARTIST PROFILE SECTION --- */}
                <View style={styles.sectionHeader}>
                    <Star size={18} color={COLORS.primary} />
                    <Text style={styles.sectionTitle}>Artist Profile</Text>
                </View>

                <View style={styles.card}>
                    <View style={styles.field}>
                        <Text style={[styles.label, errors.includes('act_name') && { color: COLORS.error }]}>Act / Stage Name</Text>
                        <TextInput
                            style={[styles.input, errors.includes('act_name') && styles.inputError]}
                            value={profileData.act_name}
                            onChangeText={t => setProfileData({ ...profileData, act_name: t })}
                            placeholder="e.g. Moonlight Duo"
                            placeholderTextColor={COLORS.textDim}
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.field, { flex: 1, marginRight: 12 }]}>
                            <Text style={[styles.label, errors.includes('category_id') && { color: COLORS.error }]}>Category</Text>
                            <Pressable
                                style={[styles.dropdown, errors.includes('category_id') && styles.inputError]}
                                onPress={() => { setModalType('category'); setModalVisible(true); }}
                            >
                                <Text style={[styles.dropdownText, !profileData.category_id && { color: COLORS.textDim }]}>
                                    {categories.find(c => c.id === profileData.category_id)?.name || 'Select'}
                                </Text>
                                <ChevronDown size={16} color={COLORS.textDim} />
                            </Pressable>
                        </View>
                        <View style={[styles.field, { flex: 1 }]}>
                            <Text style={[styles.label, errors.includes('artist_type') && { color: COLORS.error }]}>Type</Text>
                            <Pressable
                                style={[styles.dropdown, errors.includes('artist_type') && styles.inputError]}
                                onPress={() => { setModalType('type'); setModalVisible(true); }}
                            >
                                <Text style={[styles.dropdownText, !profileData.artist_type && { color: COLORS.textDim }]}>
                                    {profileData.artist_type || 'Select'}
                                </Text>
                                <ChevronDown size={16} color={COLORS.textDim} />
                            </Pressable>
                        </View>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Bio / Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={profileData.bio}
                            onChangeText={t => setProfileData({ ...profileData, bio: t })}
                            multiline
                            placeholder="Tell clients about your act..."
                            placeholderTextColor={COLORS.textDim}
                        />
                    </View>
                </View>

                {/* --- SAVE BUTTON --- */}
                <Pressable
                    style={[styles.saveButton, saving && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color={COLORS.background} />
                    ) : (
                        <>
                            <Save size={20} color={COLORS.background} />
                            <Text style={styles.saveButtonText}>Save My Profile</Text>
                        </>
                    )}
                </Pressable>

                {/* MODAL */}
                <Modal visible={modalVisible} transparent animationType="fade">
                    <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Select {modalType === 'category' ? 'Category' : 'Type'}</Text>
                            <ScrollView>
                                {(modalType === 'category' ? categories : ARTIST_TYPES).map((item: any) => (
                                    <Pressable
                                        key={modalType === 'category' ? item.id : item}
                                        style={styles.modalItem}
                                        onPress={() => {
                                            if (modalType === 'category') setProfileData({ ...profileData, category_id: item.id });
                                            else setProfileData({ ...profileData, artist_type: item });
                                            setModalVisible(false);
                                        }}
                                    >
                                        <Text style={styles.modalItemText}>{modalType === 'category' ? item.name : item}</Text>
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </View>
                    </Pressable>
                </Modal>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { padding: SPACING.l, paddingBottom: 100 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    header: { marginBottom: SPACING.xl },
    title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
    subtitle: { fontSize: 16, color: COLORS.textDim },

    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, textTransform: 'uppercase', letterSpacing: 0.5 },

    card: { backgroundColor: '#141414', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#222', marginBottom: 20 },
    field: { marginBottom: 16 },
    label: { color: COLORS.textDim, fontSize: 13, marginBottom: 8, fontWeight: '600' },
    input: { backgroundColor: '#000', color: COLORS.text, padding: 14, borderRadius: 10, fontSize: 16, borderWidth: 1, borderColor: '#333' },
    inputError: { borderColor: COLORS.error, borderWidth: 1.5 },
    textArea: { height: 120, textAlignVertical: 'top' },
    row: { flexDirection: 'row', gap: 0 },

    dropdown: { backgroundColor: '#000', padding: 14, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
    dropdownText: { color: COLORS.text, fontSize: 16 },

    saveButton: {
        backgroundColor: COLORS.primary,
        padding: 18,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        marginTop: 20,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5
    },
    saveButtonText: { color: COLORS.background, fontSize: 18, fontWeight: '900' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#1A1A1A', borderRadius: 20, maxHeight: '70%', padding: 24, borderWidth: 1, borderColor: '#333' },
    modalTitle: { color: COLORS.text, fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    modalItem: { paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#222' },
    modalItemText: { color: COLORS.text, fontSize: 17, textAlign: 'center' }
});
