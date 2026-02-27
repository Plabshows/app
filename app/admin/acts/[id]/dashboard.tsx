
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ChevronDown, Star, User } from 'lucide-react-native';
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
import { COLORS } from '../../../../src/constants/theme';
import { useAuth } from '../../../../src/context/AuthContext';
import { logAdminAction } from '../../../../src/lib/audit';
import { supabase } from '../../../../src/lib/supabase';

const ARTIST_TYPES = ['Solo', 'Duo', 'Trio', 'Quartet', 'Band (5+)', 'Group/Crew'];

export default function AdminManageAct() {
    const { id: targetUserId } = useLocalSearchParams();
    const router = useRouter();
    const { user: currentAdmin } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);

    // Unified State
    const [profileData, setProfileData] = useState({
        full_name: '',
        email: '',
        city: '',
        country: '',
        act_name: '',
        category_id: '',
        artist_type: '',
        genre: '',
        bio: '',
        price_guide: '',
        video_url: '',
        is_public: false
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
    }, [targetUserId]);

    const fetchData = async () => {
        try {
            const { data: catData } = await supabase.from('categories').select('*').order('name');
            setCategories(catData || []);

            if (!targetUserId) return;

            // Fetch Profile
            const { data: prof } = await supabase.from('profiles').select('*').eq('id', targetUserId).single();

            // Fetch Act
            const { data: act } = await supabase.from('acts').select('*').eq('owner_id', targetUserId).maybeSingle();

            setProfileData({
                full_name: prof?.name || '',
                email: prof?.email || '',
                city: prof?.city || '',
                country: prof?.country || '',
                act_name: act?.name || '',
                category_id: act?.category_id || '',
                artist_type: act?.artist_type || '',
                genre: act?.genre || '',
                bio: act?.description || '',
                price_guide: act?.price_guide || '',
                video_url: act?.video_url || '',
                is_public: prof?.is_public || false
            });

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
            return Alert.alert('Incomplete Form', 'Please fill in the required fields.');
        }

        setSaving(true);
        try {
            // Strictly enforce the target user ID to prevent relying on the session user
            const profileId = Array.isArray(targetUserId) ? targetUserId[0] : targetUserId;

            if (!profileId) {
                throw new Error("Invalid Profile ID.");
            }

            let finalPhotoUrl = existingPhotoUrl;

            if (selectedImage) {
                setIsUploading(true);
                const fileExt = selectedImage.split('.').pop();
                const filePath = `${profileId}/${Date.now()}_admin_upload.${fileExt}`;

                const response = await fetch(selectedImage);
                const blob = await response.blob();

                const { error: uploadError } = await supabase.storage
                    .from('media')
                    .upload(filePath, blob, {
                        contentType: `image/${fileExt}`,
                        upsert: true
                    });

                if (uploadError) throw new Error(uploadError.message);

                const { data: { publicUrl } } = supabase.storage
                    .from('media')
                    .getPublicUrl(filePath);

                finalPhotoUrl = publicUrl;
                setIsUploading(false);
            }

            const { data: currentAct, error: actFetchError } = await supabase
                .from('acts')
                .select('image_url, photos_url')
                .eq('owner_id', profileId)
                .maybeSingle();

            if (actFetchError) throw new Error(actFetchError.message);

            const existingPhotos: string[] = Array.isArray(currentAct?.photos_url) ? currentAct.photos_url : [];
            let updatedPhotos = [...existingPhotos];
            if (finalPhotoUrl && !updatedPhotos.includes(finalPhotoUrl)) {
                updatedPhotos.push(finalPhotoUrl);
            }

            const coverImageUrl = finalPhotoUrl || currentAct?.image_url;

            // 1. Update Profile (Strict ID check applied here)
            const { error: profileError } = await supabase.from('profiles').update({
                name: profileData.full_name,
                city: profileData.city,
                country: profileData.country,
                is_public: profileData.is_public,
                avatar_url: coverImageUrl
            }).eq('id', profileId);

            if (profileError) {
                console.error("Admin Profile Update Error:", profileError);
                throw new Error(profileError.message);
            }

            // 2. Upsert Act
            const { error: actError } = await supabase.from('acts').upsert({
                owner_id: profileId,
                name: profileData.act_name,
                category_id: profileData.category_id || null,
                artist_type: profileData.artist_type,
                genre: profileData.genre,
                description: profileData.bio,
                price_guide: profileData.price_guide,
                video_url: profileData.video_url,
                image_url: coverImageUrl,
                photos_url: updatedPhotos
            }, { onConflict: 'owner_id' });

            if (actError) {
                console.error("Admin Act Upsert Error:", actError);
                throw new Error(actError.message);
            }

            // 3. Audit Log
            if (currentAdmin) {
                await logAdminAction(currentAdmin.id, profileId as string, 'edit_user', { detail: 'Admin modified profile/act' });
            }

            Alert.alert('Success ✅', 'Profile updated successfully by Admin.');
            setSelectedImage(null);
            setExistingPhotoUrl(finalPhotoUrl);

            // Refetch data to force UI refresh and clear generic cache issues
            await fetchData();
            if (Platform.OS === 'web') {
                (window as any).location.reload();
            }
        } catch (err: any) {
            console.error('Save error:', err);
            Alert.alert('Error ❌', err.message || 'Could not save changes.');
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
            style={{ flex: 1, backgroundColor: COLORS.background }}
        >
            <View style={styles.actionBar}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="white" />
                </Pressable>
                <Text style={styles.headerTitle}>Admin: Manage Act</Text>
            </View>

            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.adminBanner}>
                    <Text style={styles.adminBannerText}>You are editing this profile as an Administrator.</Text>
                </View>

                {/* --- PERSONAL INFO SECTION --- */}
                <View style={styles.sectionHeader}>
                    <User size={18} color={COLORS.primary} />
                    <Text style={styles.sectionTitle}>User Details</Text>
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

                    <View style={styles.field}>
                        <View style={{ flex: 1, marginBottom: 8 }}>
                            <Text style={styles.label}>Profile Visibility (Admin Override)</Text>
                            <Text style={{ color: COLORS.textDim, fontSize: 13 }}>Show this profile publicly in search and galleries?</Text>
                        </View>
                        <View style={styles.row}>
                            <Pressable
                                style={[
                                    { width: 44, height: 24, borderRadius: 12, padding: 2, justifyContent: 'center' },
                                    profileData.is_public ? { backgroundColor: COLORS.primary } : { backgroundColor: '#333' }
                                ]}
                                onPress={() => setProfileData({ ...profileData, is_public: !profileData.is_public })}
                            >
                                <View style={[
                                    { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.background },
                                    profileData.is_public ? { transform: [{ translateX: 20 }] } : { transform: [{ translateX: 0 }] }
                                ]} />
                            </Pressable>
                            <Text style={[{ marginLeft: 12, fontWeight: 'bold' }, profileData.is_public ? { color: COLORS.primary } : { color: COLORS.textDim }]}>
                                {profileData.is_public ? 'Mostrar perfil online' : 'Ocultar perfil'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* --- ARTIST PROFILE SECTION --- */}
                <View style={styles.sectionHeader}>
                    <Star size={18} color={COLORS.primary} />
                    <Text style={styles.sectionTitle}>Act Profile</Text>
                </View>

                <View style={styles.card}>
                    <View style={styles.field}>
                        <Text style={[styles.label, errors.includes('act_name') && { color: COLORS.error }]}>Act Name</Text>
                        <TextInput
                            style={[styles.input, errors.includes('act_name') && styles.inputError]}
                            value={profileData.act_name}
                            onChangeText={t => setProfileData({ ...profileData, act_name: t })}
                            placeholder="Stage Name"
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
                        <Text style={styles.label}>Base Net Fee (AED)</Text>
                        <TextInput
                            style={styles.input}
                            value={String(profileData.price_guide)}
                            onChangeText={t => setProfileData({ ...profileData, price_guide: t })}
                            placeholder="1000"
                            placeholderTextColor={COLORS.textDim}
                            keyboardType="numeric"
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Video URL (YouTube/Vimeo)</Text>
                        <TextInput
                            style={styles.input}
                            value={profileData.video_url}
                            onChangeText={t => setProfileData({ ...profileData, video_url: t })}
                            placeholder="https://www.youtube.com/watch?v=..."
                            placeholderTextColor={COLORS.textDim}
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Bio</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={profileData.bio}
                            onChangeText={t => setProfileData({ ...profileData, bio: t })}
                            multiline
                            placeholder="Full description..."
                            placeholderTextColor={COLORS.textDim}
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Main Photo</Text>
                        <Pressable style={styles.imagePicker} onPress={pickImage}>
                            {selectedImage || existingPhotoUrl ? (
                                <Image source={{ uri: selectedImage || existingPhotoUrl! }} style={styles.selectedImage} />
                            ) : (
                                <View style={styles.imagePlaceholder}>
                                    <Star size={24} color={COLORS.textDim} />
                                    <Text style={{ color: COLORS.textDim, marginTop: 8 }}>Upload Photo</Text>
                                </View>
                            )}
                        </Pressable>
                    </View>
                </View>

                <Pressable
                    style={[styles.saveButton, (saving || isUploading) && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={saving || isUploading}
                >
                    {saving ? <ActivityIndicator color="black" /> : <Text style={styles.saveButtonText}>SAVE AS ADMIN</Text>}
                </Pressable>
            </ScrollView>

            <Modal visible={modalVisible} transparent animationType="fade">
                <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
                    <View style={styles.modalContent}>
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
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    actionBar: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 40, borderBottomWidth: 1, borderBottomColor: '#222' },
    backButton: { marginRight: 15 },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    adminBanner: { backgroundColor: COLORS.primary + '22', padding: 12, borderRadius: 8, marginBottom: 20, borderWidth: 1, borderColor: COLORS.primary },
    adminBannerText: { color: COLORS.primary, fontSize: 13, textAlign: 'center', fontWeight: 'bold' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, marginBottom: 12 },
    sectionTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase' },
    card: { backgroundColor: '#111', padding: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#222' },
    label: { color: COLORS.textDim, fontSize: 12, marginBottom: 8, fontWeight: 'bold' },
    input: { backgroundColor: '#000', color: 'white', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
    inputError: { borderColor: COLORS.error },
    textArea: { height: 100, textAlignVertical: 'top' },
    row: { flexDirection: 'row', gap: 0 },
    field: { marginBottom: 16 },
    dropdown: { backgroundColor: '#000', padding: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
    dropdownText: { color: 'white' },
    imagePicker: { width: '100%', height: 180, backgroundColor: '#000', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#333' },
    selectedImage: { width: '100%', height: '100%' },
    imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    saveButton: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    saveButtonText: { color: 'black', fontWeight: 'bold', fontSize: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 40 },
    modalContent: { backgroundColor: '#111', borderRadius: 20, padding: 20, maxHeight: '60%', borderWidth: 1, borderColor: '#333' },
    modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#222' },
    modalItemText: { color: 'white', textAlign: 'center', fontSize: 16 }
});
