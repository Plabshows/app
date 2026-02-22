
import * as ImagePicker from 'expo-image-picker';
import { ChevronDown, Save, Star, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
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
import { COLORS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { supabase } from '../../src/lib/supabase';

const ARTIST_TYPES = ['Solo', 'Duo', 'Trio', 'Quartet', 'Band (5+)', 'Group/Crew'];

export default function UnifiedEditProfile() {
    const { user } = useAuth();
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
        bio: '',
        price_guide: ''
    });

    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'category' | 'type'>('category');
    const [errors, setErrors] = useState<string[]>([]);

    // Image/Upload State
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data: catData } = await supabase.from('categories').select('*').order('name');
            setCategories(catData || []);

            if (!user) {
                console.log('[fetchData] No user found in AuthContext');
                return;
            }

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
                bio: act?.description || '',
                price_guide: act?.price_guide || ''
            });

            // Ensure existingPhotoUrl is a string (the first photo)
            const photo = Array.isArray(act?.photos_url) ? act.photos_url[0] : act?.photos_url;
            setExistingPhotoUrl(photo || null);
        } catch (err) {
            console.error('Error fetching profile data:', err);
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled) {
            setSelectedImage(result.assets[0].uri);
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

        // TAREA 2.1: Estado de Carga
        setSaving(true);
        console.log('[handleSave] Starting save process...');

        try {
            if (!user) throw new Error('No user found');

            let finalPhotoUrl = existingPhotoUrl;

            // TAREA 2.2: Subida de Imagen (Si cambió)
            if (selectedImage) {
                console.log('[handleSave] New image detected, starting upload...');
                setIsUploading(true);

                const fileExt = selectedImage.split('.').pop();
                const filePath = `${user.id}/${Date.now()}_avatar.${fileExt}`;

                try {
                    const response = await fetch(selectedImage);
                    const blob = await response.blob();

                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('media')
                        .upload(filePath, blob, {
                            contentType: `image/${fileExt}`,
                            upsert: true // Crucial per user request
                        });

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                        .from('media')
                        .getPublicUrl(filePath);

                    finalPhotoUrl = publicUrl;
                    console.log('[handleSave] Upload successful, public URL:', finalPhotoUrl);
                } catch (uploadErr: any) {
                    console.error('[handleSave] Upload Error:', uploadErr);
                    throw new Error(`Failed to upload photo: ${uploadErr.message}`);
                } finally {
                    setIsUploading(false);
                }
            }

            // TAREA 2.3: Actualización de Datos (SQL Update)
            console.log('[handleSave] Updating database records...');

            // 1. Profiles Table
            const { error: profError } = await supabase
                .from('profiles')
                .update({
                    name: profileData.full_name,
                    city: profileData.city,
                    country: profileData.country,
                    avatar_url: finalPhotoUrl
                })
                .eq('id', user.id);

            if (profError) throw profError;

            // 2. Acts Table
            const { error: actError } = await supabase
                .from('acts')
                .upsert({
                    owner_id: user.id,
                    name: profileData.act_name,
                    category_id: profileData.category_id || null,
                    artist_type: profileData.artist_type,
                    genre: profileData.genre,
                    description: profileData.bio,
                    price_guide: profileData.price_guide,
                    photos_url: finalPhotoUrl ? [finalPhotoUrl] : []
                }, { onConflict: 'owner_id' });

            if (actError) throw actError;

            // TAREA 2.4: Manejo de Éxito
            console.log('[handleSave] SAVE SUCCESSFUL');
            Alert.alert('Success', 'Your profile has been updated!');
            setSelectedImage(null);
            setExistingPhotoUrl(finalPhotoUrl);
        } catch (err: any) {
            // TAREA 2.4: Manejo de Errores
            console.error('[handleSave] GLOBAL ERROR:', err);
            Alert.alert('Error Saving', err.message || JSON.stringify(err));
        } finally {
            setSaving(false);
            setIsUploading(false);
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
                        <Text style={styles.label}>Base Net Fee (What you earn in AED)</Text>
                        <TextInput
                            style={styles.input}
                            value={profileData.price_guide}
                            onChangeText={t => setProfileData({ ...profileData, price_guide: t })}
                            placeholder="e.g. 1000"
                            placeholderTextColor={COLORS.textDim}
                            keyboardType="numeric"
                        />
                        {(() => {
                            const rawValue = parseInt(String(profileData.price_guide).replace(/[^0-9]/g, ''), 10);
                            if (!isNaN(rawValue) && rawValue > 0) {
                                const platformFee = Math.round(rawValue * 0.20);
                                const publicPrice = rawValue + platformFee;
                                return (
                                    <View style={styles.pricingBox}>
                                        <Text style={styles.pricingText}>✅ Your Net Earning: <Text style={{ fontWeight: 'bold' }}>{rawValue.toLocaleString()} AED</Text></Text>
                                        <Text style={styles.pricingTextDim}>⚖️ Platform Fee (20%): {platformFee.toLocaleString()} AED</Text>
                                        <View style={styles.divider} />
                                        <Text style={styles.pricingTextBold}>👀 Public Profile Price (What clients see & pay): {publicPrice.toLocaleString()} AED</Text>
                                    </View>
                                );
                            }
                            return null;
                        })()}
                        <Text style={styles.helpText}>Enter your desired take-home amount. We automatically add a 20% platform fee to the final public price.</Text>
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

                    {/* --- PHOTO SECTION --- */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Act Photo</Text>
                        <Pressable style={styles.imagePicker} onPress={pickImage}>
                            {selectedImage || existingPhotoUrl ? (
                                <Image
                                    source={{ uri: selectedImage || existingPhotoUrl! }}
                                    style={styles.selectedImage}
                                />
                            ) : (
                                <View style={styles.imagePlaceholder}>
                                    <Star size={24} color={COLORS.textDim} />
                                    <Text style={styles.imagePlaceholderText}>Choose Photo</Text>
                                </View>
                            )}
                        </Pressable>
                    </View>
                </View>

                {/* --- SAVE BUTTON --- */}
                <Pressable
                    style={[styles.saveButton, (saving || isUploading) && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={saving || isUploading}
                >
                    {saving ? (
                        <ActivityIndicator color={COLORS.background} />
                    ) : isUploading ? (
                        <Text style={styles.saveButtonText}>Subiendo foto...</Text>
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
    modalItemText: { color: COLORS.text, fontSize: 17, textAlign: 'center' },

    imagePicker: {
        width: '100%',
        height: 200,
        backgroundColor: '#000',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
        marginTop: 8,
        overflow: 'hidden',
    },
    imagePlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePlaceholderText: {
        color: COLORS.textDim,
        marginTop: 8,
    },
    selectedImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    pricingBox: {
        backgroundColor: '#1A1A1A',
        padding: 15,
        borderRadius: 10,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#333'
    },
    pricingText: {
        color: COLORS.text,
        fontSize: 14,
        marginBottom: 6
    },
    pricingTextDim: {
        color: COLORS.textDim,
        fontSize: 14,
        marginBottom: 8
    },
    pricingTextBold: {
        color: '#10B981',
        fontSize: 15,
        fontWeight: 'bold',
        marginTop: 8
    },
    divider: {
        height: 1,
        backgroundColor: '#333',
        marginVertical: 4
    },
    helpText: {
        color: COLORS.textDim,
        fontSize: 12,
        marginTop: 10,
        fontStyle: 'italic'
    },
});
