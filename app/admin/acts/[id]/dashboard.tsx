
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ChevronDown, Star, User, Image as ImageIcon, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import Toast from 'react-native-toast-message';
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
    Switch,
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
        is_verified: false,
        is_published: false,
        is_public: false,
        act_is_published: false
    });

    const [modalVisible, setModalVisible] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'photos' | 'videos'>('info');
    const [isEditingBasic, setIsEditingBasic] = useState(false);
    const [isEditingBio, setIsEditingBio] = useState(false);
    const [isEditingCategories, setIsEditingCategories] = useState(false);
    const [isEditingSocials, setIsEditingSocials] = useState(false);
    const [newSocialLink, setNewSocialLink] = useState('');
    const [modalType, setModalType] = useState<'category' | 'type'>('category');
    const [errors, setErrors] = useState<string[]>([]);

    // Image/Upload State
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
    const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);

    // Gallery State
    const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
    const [isUploadingGallery, setIsUploadingGallery] = useState(false);

    // Helper to convert base64 to Blob for reliable web uploads
    const base64ToBlob = (base64: string, contentType: string) => {
        try {
            console.log(`[Base64] Decoding ${base64.substring(0, 30)}...`);
            // Strip data URI prefix if present
            const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
            const byteCharacters = atob(cleanBase64);
            const byteArrays = [];
            for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                const slice = byteCharacters.slice(offset, offset + 512);
                const byteNumbers = new Array(slice.length);
                for (let i = 0; i < slice.length; i++) {
                    byteNumbers[i] = slice.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                byteArrays.push(byteArray);
            }
            return new Blob(byteArrays, { type: contentType });
        } catch (e) {
            console.error("[Base64] Decode error:", e);
            throw e;
        }
    };

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
                is_verified: prof?.is_verified || false,
                is_published: prof?.is_published || false,
                is_public: prof?.is_public || false,
                act_is_published: act?.is_published || false
            });

            const photos = Array.isArray(act?.photos_url) ? act.photos_url : [];
            setGalleryPhotos(photos);
            const photo = act?.image_url || (photos.length > 0 ? photos[0] : null);
            setExistingPhotoUrl(photo);
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
            base64: true, // IMPORTANT: Fix for web hanging issue
        });

        if (!result.canceled) {
            setSelectedImage(result.assets[0].uri);
            if (result.assets[0].base64) {
                setSelectedImageBase64(result.assets[0].base64);
            }
        }
    };

    const pickGalleryImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
            base64: true,
        });

        if (!result.canceled && result.assets) {
            setIsUploadingGallery(true);
            try {
                const newUploads: string[] = [];
                for (const asset of result.assets) {
                    const fileExt = asset.uri.split('.').pop() || 'jpg';
                    const filePath = `${targetUserId}/${Date.now()}_gallery_${Math.random()}.${fileExt}`;
                    
                    let blob: Blob;
                    if (asset.base64) {
                        blob = base64ToBlob(asset.base64, `image/${fileExt}`);
                    } else {
                        const response = await fetch(asset.uri);
                        blob = await response.blob();
                    }

                    const { error: uploadError } = await supabase.storage
                        .from('media')
                        .upload(filePath, blob, { contentType: `image/${fileExt}`, upsert: true });

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);
                    newUploads.push(publicUrl);
                }
                setGalleryPhotos(prev => [...prev, ...newUploads]);
                Toast.show({ type: 'success', text1: 'Gallery Upload', text2: `Added ${newUploads.length} photo(s)` });
            } catch (err: any) {
                console.error('Gallery Upload Error:', err);
                Toast.show({ type: 'error', text1: 'Upload Failed', text2: err.message });
            } finally {
                setIsUploadingGallery(false);
            }
        }
    };

    const removeGalleryPhoto = (index: number) => {
        setGalleryPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const moveGalleryPhoto = (index: number, direction: 'left' | 'right') => {
        setGalleryPhotos(prev => {
            const arr = [...prev];
            if (direction === 'left' && index > 0) {
                [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
            } else if (direction === 'right' && index < arr.length - 1) {
                [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];
            }
            return arr;
        });
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

        console.log(`[AdminSave] Starting handleSave for user ${targetUserId}...`);
        setSaving(true);
        try {
            let finalPhotoUrl = existingPhotoUrl;
            console.log(`[AdminSave] Initial finalPhotoUrl: ${finalPhotoUrl}`);

            if (selectedImage) {
                setIsUploading(true);
                const fileExt = selectedImage.split('.').pop() || 'jpg';
                const filePath = `${targetUserId}/${Date.now()}_admin_upload.${fileExt}`;

                console.log(`[Upload] Starting image upload for user ${targetUserId}...`);
                let blob: Blob;
                if (selectedImageBase64) {
                    blob = base64ToBlob(selectedImageBase64, `image/${fileExt}`);
                } else {
                    const response = await fetch(selectedImage);
                    blob = await response.blob();
                }

                console.log(`[Upload] Blob created: ${blob.size} bytes. Uploading to Storage...`);
                const { error: uploadError } = await supabase.storage
                    .from('media')
                    .upload(filePath, blob, {
                        contentType: `image/${fileExt}`,
                        upsert: true
                    });

                if (uploadError) {
                    console.error("Storage upload error detailed:", JSON.stringify(uploadError));
                    throw new Error(uploadError.message || JSON.stringify(uploadError));
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('media')
                    .getPublicUrl(filePath);

                finalPhotoUrl = publicUrl;
                setIsUploading(false);
            }

            const { data: currentAct } = await supabase
                .from('acts')
                .select('image_url, photos_url')
                .eq('owner_id', targetUserId)
                .maybeSingle();

            const existingPhotos: string[] = Array.isArray(currentAct?.photos_url) ? currentAct.photos_url : [];
            let updatedPhotos = [...galleryPhotos]; // Use the explicitly managed gallery
            // Ensure the main photo proxy is included if newly uploaded and not present
            if (finalPhotoUrl && !updatedPhotos.includes(finalPhotoUrl)) {
                updatedPhotos.unshift(finalPhotoUrl);
            }

            const coverImageUrl = finalPhotoUrl || currentAct?.image_url;

            // 1. Update Profile
            console.log(`[AdminSave] Step 1: Updating profiles for ID ${targetUserId}...`);
            const { data: updatedProfile, error: profError } = await supabase.from('profiles').update({
                name: profileData.full_name,
                city: profileData.city,
                country: profileData.country,
                avatar_url: coverImageUrl,
                is_verified: profileData.is_verified,
                is_published: profileData.is_published,
                is_public: profileData.is_public
            }).eq('id', targetUserId).select();

            console.log(`[AdminSave] Profile update result:`, { updatedProfile, profError });

            if (profError) throw profError;
            if (!updatedProfile || updatedProfile.length === 0) {
                throw new Error("RLS: No se guardó profiles. Revisa permisos (0 filas).");
            }

            // 2. Update Act (Partial Update to avoid unique constraint issues)
            console.log(`[AdminSave] Step 2: Updating acts for owner_id ${targetUserId}...`);
            
            // Build act payload dynamically to omit 'name' if it's unchanged
            const actPayload: any = {
                category_id: profileData.category_id || null,
                artist_type: profileData.artist_type,
                genre: profileData.genre,
                description: profileData.bio,
                price_guide: profileData.price_guide,
                video_url: profileData.video_url,
                image_url: coverImageUrl,
                photos_url: updatedPhotos,
                is_published: profileData.act_is_published
            };

            // Only include name if it has actually changed to avoid acts_name_key duplicate error
            const { data: latestActCheck } = await supabase.from('acts').select('name').eq('owner_id', targetUserId).maybeSingle();
            if (profileData.act_name && profileData.act_name !== latestActCheck?.name) {
                actPayload.name = profileData.act_name;
            }

            let actUpdateResult;
            if (latestActCheck) {
                console.log(`[AdminSave] Updating existing act for ${targetUserId}`);
                actUpdateResult = await supabase.from('acts').update(actPayload).eq('owner_id', targetUserId).select();
            } else {
                console.log(`[AdminSave] Inserting new act for ${targetUserId}`);
                actPayload.owner_id = targetUserId;
                actPayload.name = profileData.act_name; // Must include name for new inserts
                actUpdateResult = await supabase.from('acts').insert(actPayload).select();
            }

            const { data: updatedAct, error: actError } = actUpdateResult;
            console.log(`[AdminSave] Act update result:`, { updatedAct, actError });

            if (actError) throw actError;
            if (!updatedAct || updatedAct.length === 0) {
                throw new Error("RLS: No se guardó acts. Revisa permisos (0 filas).");
            }

            // 3. Audit Log
            if (currentAdmin) {
                console.log(`[AdminSave] Step 3: Logging admin action...`);
                await logAdminAction(currentAdmin.id, targetUserId as string, 'edit_user', { detail: 'Admin modified profile/act' });
                console.log(`[AdminSave] Admin action logged.`);
            }

            await fetchData();
            Toast.show({ type: 'success', text1: 'Admin Save', text2: 'Perfil actualizado correctamente.' });
            setSelectedImage(null);
            setExistingPhotoUrl(finalPhotoUrl);
        } catch (err: any) {
            const errorMsg = err?.message || (typeof err === 'string' ? err : JSON.stringify(err));
            Toast.show({ type: 'error', text1: 'Admin Save Error', text2: errorMsg });
            console.error('Admin Save Error:', err);
        } finally {
            setSaving(false);
            setIsUploading(false);
        }
    };

    const handleDeleteUser = () => {
        Alert.alert(
            "Delete Profile",
            "Are you sure you want to permanently delete this user's profile and act data? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "DELETE", style: "destructive", onPress: confirmDeleteUser }
            ]
        );
    };

    const confirmDeleteUser = async () => {
        setSaving(true);
        try {
            const { error: actErr } = await supabase.from('acts').delete().eq('owner_id', targetUserId);
            const { error: profErr } = await supabase.from('profiles').delete().eq('id', targetUserId);
            
            if (actErr) throw actErr;
            if (profErr) throw profErr;

            Toast.show({ type: 'success', text1: 'Profile Deleted', text2: 'The user and act have been removed.' });
            router.back();
        } catch(e: any) {
            Toast.show({ type: 'error', text1: 'Delete Failed', text2: e.message });
            console.error('Delete User Error:', e);
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
                        <Text style={styles.label}>Base Net Fee (€)</Text>
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

                {/* --- GALLERY SECTION --- */}
                <View style={styles.sectionHeader}>
                    <ImageIcon size={18} color={COLORS.primary} />
                    <Text style={styles.sectionTitle}>Gallery / Materials</Text>
                </View>

                <View style={styles.card}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 10 }}>
                        {galleryPhotos.map((photo, index) => (
                            <View key={index} style={styles.galleryItem}>
                                <Image source={{ uri: photo }} style={styles.galleryImage} />
                                <View style={styles.galleryControls}>
                                    <Pressable onPress={() => moveGalleryPhoto(index, 'left')} disabled={index === 0}>
                                        <ChevronLeft size={20} color={index === 0 ? '#555' : 'white'} />
                                    </Pressable>
                                    <Pressable onPress={() => removeGalleryPhoto(index)}>
                                        <Trash2 size={18} color={COLORS.error} />
                                    </Pressable>
                                    <Pressable onPress={() => moveGalleryPhoto(index, 'right')} disabled={index === galleryPhotos.length - 1}>
                                        <ChevronRight size={20} color={index === galleryPhotos.length - 1 ? '#555' : 'white'} />
                                    </Pressable>
                                </View>
                            </View>
                        ))}
                        <Pressable style={styles.addGalleryButton} onPress={pickGalleryImage} disabled={isUploadingGallery}>
                            {isUploadingGallery ? <ActivityIndicator color={COLORS.primary} /> : <Plus size={32} color={COLORS.primary} />}
                            <Text style={{ color: COLORS.primary, marginTop: 8 }}>Add Photos</Text>
                        </Pressable>
                    </ScrollView>
                </View>

                {/* --- STATUS & APPROVAL SECTION --- */}
                <View style={styles.sectionHeader}>
                    <Star size={18} color={COLORS.primary} />
                    <Text style={styles.sectionTitle}>Status & Visibility</Text>
                </View>
                <View style={styles.card}>
                    <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>Verified User (Blue Tick)</Text>
                        <Switch
                            value={profileData.is_verified}
                            onValueChange={v => setProfileData({ ...profileData, is_verified: v })}
                            trackColor={{ false: '#333', true: COLORS.primary }}
                        />
                    </View>
                    <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>Profile is Public</Text>
                        <Switch
                            value={profileData.is_public}
                            onValueChange={v => setProfileData({ ...profileData, is_public: v })}
                            trackColor={{ false: '#333', true: COLORS.primary }}
                        />
                    </View>
                    <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>Act is Published</Text>
                        <Switch
                            value={profileData.act_is_published}
                            onValueChange={v => setProfileData({ ...profileData, act_is_published: v })}
                            trackColor={{ false: '#333', true: COLORS.primary }}
                        />
                    </View>
                </View>

                <Pressable
                    style={[styles.saveButton, (saving || isUploading) && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={saving || isUploading}
                >
                    {saving ? <ActivityIndicator color="black" /> : <Text style={styles.saveButtonText}>SAVE AS ADMIN</Text>}
                </Pressable>

                <Pressable
                    style={styles.deleteButton}
                    onPress={handleDeleteUser}
                    disabled={saving || isUploading}
                >
                    <Text style={styles.deleteButtonText}>DELETE PROFILE</Text>
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
    galleryItem: { width: 140, height: 180, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000', borderWidth: 1, borderColor: '#333' },
    galleryImage: { width: '100%', height: 140 },
    galleryControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, height: 40, backgroundColor: '#111' },
    addGalleryButton: { width: 140, height: 180, borderRadius: 12, borderWidth: 2, borderColor: '#333', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#222' },
    switchLabel: { color: 'white', fontSize: 14, fontWeight: '500' },
    saveButton: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    saveButtonText: { color: 'black', fontWeight: 'bold', fontSize: 16 },
    deleteButton: { backgroundColor: 'transparent', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: COLORS.error },
    deleteButtonText: { color: COLORS.error, fontWeight: 'bold', fontSize: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 40 },
    modalContent: { backgroundColor: '#111', borderRadius: 20, padding: 20, maxHeight: '60%', borderWidth: 1, borderColor: '#333' },
    modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#222' },
    modalItemText: { color: 'white', textAlign: 'center', fontSize: 16 }
});
