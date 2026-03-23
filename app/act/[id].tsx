import { COLORS } from '@/src/constants/theme';
import { useAuth } from '@/src/context/AuthContext';
import { ActDetailData, useAct } from '@/src/hooks/useAct';
import { supabase } from '@/src/lib/supabase';
import { ResizeMode, Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { ArrowLeft, CheckCircle2, Clock, FileText, Info, MapPin, MessageSquare, Package, Plus, Save, ShieldCheck, Star, Video as VideoIcon, Zap, ChevronDown, ChevronLeft, ChevronRight, Mail, Instagram, Globe, Trash2, X, Check } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const TABS = [
    { id: 'biography', label: 'Biography', icon: Info },
    { id: 'media', label: 'Media', icon: VideoIcon },
    { id: 'requirements', label: 'Requirements', icon: FileText },
    { id: 'packages', label: 'Packages', icon: Package },
    { id: 'reviews', label: 'Reviews', icon: MessageSquare },
];

export default function ActDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user, profile, realProfile, realUser } = useAuth();
    const { act, loading, error, refetch } = useAct(id);
    const insets = useSafeAreaInsets();

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

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editedData, setEditedData] = useState<any>(null);

    // Permissions check — use realProfile/realUser to ensure admins retain rights when impersonating
    const adminSource = realProfile || profile;
    const userSource = realUser || user;

    const isSuperAdmin =
        adminSource?.role === 'admin' ||
        adminSource?.role === 'superadmin' ||
        adminSource?.is_admin === true ||
        userSource?.app_metadata?.role === 'superadmin' ||
        userSource?.app_metadata?.role === 'admin';
    const isOwner = user?.id === act?.owner_id; // act's owner matches current user (effective user)
    const canEdit = isSuperAdmin || isOwner;

    const [activeSection, setActiveSection] = useState('biography');
    const [categories, setCategories] = useState<any[]>([]);
    const [categoryModalVisible, setCategoryModalVisible] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState<any>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    useEffect(() => {
        const fetchCategories = async () => {
            const { data } = await supabase.from('categories').select('*').order('name');
            setCategories(data || []);
        };
        fetchCategories();
    }, []);

    useEffect(() => {
        if (act && !editedData) {
            setEditedData({
                name: act.name,
                description: act.description,
                location: act.location,
                category: act.category,
                category_id: act.category_id,
                price_guide: act.price_guide,
                video_url: act.video_url,
                videos_url: act.videos_url || [],
                artistName: act.artistName,
                avatar_url: act.avatar_url,
                banner_url: act.banner_url,
                is_verified: act.is_verified,
                is_published: act.is_published,
                photos_url: act.photos_url || [],
                video_gallery: act.video_gallery || [],
                social_links: act.social_links || { instagram: '', tiktok: '', website: '' },
                category_ids: act.category_ids || (act.category_id ? [act.category_id] : []),
                categories: act.categories || (act.category ? [act.category] : [])
            });
        }
    }, [act]);

    const handleSave = async () => {
        if (!act || !editedData) {
            console.warn('[handleSave] Missing act or editedData', { act: !!act, editedData: !!editedData });
            return;
        }

        try {
            setIsSaving(true);
            const targetId = act.owner_id || id;
            console.log('[handleSave] Saving profile for ID:', targetId);

            // Sync profiles table (the reading source for useAct)
            const { error: profError } = await supabase.from('profiles').update({
                name: editedData.artistName,
                city: (editedData.location || '').trim().replace(/,$/, '').trim(),
                avatar_url: editedData.avatar_url,
                banner_url: editedData.banner_url,
                category_id: editedData.category_id,
                description: editedData.description,
                video_url: editedData.video_url,
                video_urls: editedData.videos_url,
                social_links: editedData.social_links,
                is_published: editedData.is_published,
                price_guide: editedData.price_guide,
                photos_url: editedData.photos_url || [],
                video_gallery: editedData.video_gallery || [],
                category_ids: editedData.category_ids || [],
                categories: editedData.categories || []
            }).eq('id', targetId);

            if (profError) {
                console.error('[handleSave] Profiles update error:', profError);
                throw profError;
            }

            // Upsert acts table
            const { error: actError } = await supabase.from('acts').upsert({
                owner_id: targetId,
                name: editedData.artistName,
                description: editedData.description,
                category: editedData.category,
                category_id: editedData.category_id,
                price_guide: editedData.price_guide,
                video_url: editedData.video_url,
                videos_url: editedData.videos_url,
                image_url: editedData.banner_url,
                is_published: editedData.is_published,
                photos_url: editedData.photos_url || [],
                video_gallery: editedData.video_gallery || [],
                category_ids: editedData.category_ids || [],
                categories: editedData.categories || [],
                social_links: editedData.social_links
            }, { onConflict: 'owner_id' });

            if (actError) {
                console.error('[handleSave] Acts upsert error:', actError);
                throw actError;
            }

            console.log('[handleSave] Success!');
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: '¡Perfil actualizado correctamente!'
            });
            
            setIsEditing(false);
            setEditedData(null);
            await refetch();
        } catch (error: any) {
            console.error('[handleSave] Error saving profile:', error);
            const msg = error.message || 'Could not save changes.';
            if (Platform.OS === 'web') {
                Toast.show({ type: 'error', text1: 'Error', text2: msg });
                alert(`Error: ${msg}`);
            } else {
                Alert.alert('Error', msg);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        const confirmCancel = () => {
            setIsEditing(false);
            setEditedData(null);
        };

        if (Platform.OS === 'web') {
            if (window.confirm('¿Estás seguro de que quieres descartar los cambios?')) {
                confirmCancel();
            }
        } else {
            Alert.alert(
                'Confirmar',
                '¿Estás seguro de que quieres descartar los cambios?',
                [
                    { text: 'No', style: 'cancel' },
                    { text: 'Sí, descartar', onPress: confirmCancel }
                ]
            );
        }
    };

    const pickImage = async (field: 'avatar_url' | 'banner_url') => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: field === 'avatar_url' ? [1, 1] : [16, 9],
                quality: 0.7,
                base64: true, // Use base64 for web stability
            });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                if (asset.base64) {
                    const blob = base64ToBlob(asset.base64, `image/${asset.uri.split('.').pop() || 'jpg'}`);
                    await uploadImage(blob, asset.uri, field);
                } else {
                    await uploadImage(asset.uri, asset.uri, field);
                }
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Could not open image library.');
        }
    };

    const uploadImage = async (data: string | Blob, uri: string, field: 'avatar_url' | 'banner_url') => {
        try {
            console.log(`[Upload] Starting ${field} upload...`);
            setIsSaving(true);
            let blob: Blob;
            if (data instanceof Blob) {
                blob = data;
            } else {
                const response = await fetch(data);
                blob = await response.blob();
            }
            const fileExt = uri.split('.').pop() || 'jpg';
            const fileName = `${act?.owner_id}/${field}-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
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

            setEditedData((prev: any) => ({ ...prev, [field]: publicUrl }));

            // NOTE: Auto-save removed as per God-mode requirements. 
            // The image URL will be saved permanently when the user clicks 'Save Changes'.
            console.log(`[Upload] Success! URL: ${publicUrl}`);
            Toast.show({
                type: 'success',
                text1: '¡Foto lista!',
                text2: 'Subida correctamente. Haz clic en Save Changes abajo para guardar.'
            });

        } catch (error: any) {
            console.error('[Upload] Error:', error);
            const errorMsg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
            Toast.show({
                type: 'error',
                text1: 'Fallo al subir foto',
                text2: errorMsg
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddPhoto = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                quality: 0.7,
                base64: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                // We use isSaving to show a loading state while uploading files to storage
                setIsSaving(true);
                const uploadCount = result.assets.length;
                console.log(`[Gallery] Starting upload of ${uploadCount} photos...`);

                const uploadedUrls: string[] = [];

                for (const asset of result.assets) {
                    let blob: Blob;
                    const fileExt = asset.uri.split('.').pop() || 'jpg';
                    if (asset.base64) {
                        blob = base64ToBlob(asset.base64, `image/${fileExt}`);
                    } else {
                        const response = await fetch(asset.uri);
                        blob = await response.blob();
                    }
                    
                    const fileName = `${act?.owner_id}/gallery-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                    const filePath = `avatars/${fileName}`;
                    
                    const { error: uploadError } = await supabase.storage
                        .from('media')
                        .upload(filePath, blob, {
                            contentType: `image/${fileExt}`,
                            upsert: true
                        });

                    if (uploadError) {
                        console.error("[Gallery] Upload error:", JSON.stringify(uploadError));
                        throw uploadError;
                    }

                    const { data: { publicUrl } } = supabase.storage
                        .from('media')
                        .getPublicUrl(filePath);

                    console.log(`[Gallery] Uploaded: ${publicUrl}`);
                    uploadedUrls.push(publicUrl);
                }

                // Update local state ONLY. The actual DB persist happens in handleSave.
                setEditedData((prev: any) => {
                    const currentPhotos = [...(prev?.photos_url || photos || [])];
                    return {
                        ...prev,
                        photos_url: [...currentPhotos, ...uploadedUrls]
                    };
                });

                Toast.show({
                    type: 'success',
                    text1: 'Imágenes preparadas',
                    text2: `${uploadCount} fotos añadidas. Pulsa Guardar para confirmar.`
                });
            }
        } catch (error: any) {
            console.error("[Gallery] Interaction error:", error);
            const msg = error.message || 'Error uploading photos';
            if (Platform.OS === 'web') alert(msg);
            else Alert.alert('Error', msg);
        } finally {
            setIsSaving(false);
        }
    };

    // Refs for scroll-to-section
    const scrollViewRef = useRef<ScrollView>(null);
    const sectionRefs = useRef<Record<string, number>>({});
    const mainContentOffsetRef = useRef(0);
    const STICKY_NAV_HEIGHT = 50; // Height of the sticky nav bar in px

    const scrollToSection = useCallback((sectionId: string) => {
        setActiveSection(sectionId);
        const sectionY = sectionRefs.current[sectionId];
        if (sectionY !== undefined && scrollViewRef.current) {
            // Absolute position = mainContent offset + section offset within mainContent - nav height
            const absoluteY = mainContentOffsetRef.current + sectionY - STICKY_NAV_HEIGHT - 10;
            scrollViewRef.current.scrollTo({ y: Math.max(0, absoluteY), animated: true });
        }
    }, []);

    // Placeholder Act for resilience
    const PLACEHOLDER_ACT: ActDetailData = {
        id: 'placeholder',
        name: 'Artist Profile',
        artistName: 'Premium Artist',
        title: 'Talent & Entertainment',
        description: 'This artist is currently finalizing their profile details. Check back soon for more media and booking information.',
        category: 'Talent',
        genre: 'Various',
        artist_type: 'Solo',
        location_base: 'Dubai, UAE',
        experience_years: 5,
        image_url: 'https://euphonious-kelpie-cd0a27.netlify.app/images/default-banner.png',
        video_url: '',
        photos_url: [],
        videos_url: [],
        video_gallery: [],
        packages: [],
        technical_specs: 'Standard performance requirements.',
        technical_rider_url: '',
        is_verified: true,
        is_pro: false,
        avatar_url: 'https://euphonious-kelpie-cd0a27.netlify.app/images/default-avatar.png',
        banner_url: 'https://euphonious-kelpie-cd0a27.netlify.app/images/default-banner.png',
        location: 'Dubai, UAE'
    };

    const displayAct = act || PLACEHOLDER_ACT;

    const handleAddVideoUpload = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsMultipleSelection: false,
                quality: 0.7,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setIsSaving(true);
                const asset = result.assets[0];
                
                // --- DIAGNOSTIC LOGS ---
                const { data: { user } } = await supabase.auth.getUser();
                console.log('Upload Debug:', {
                    uploaderId: user?.id,
                    targetOwnerId: act?.owner_id,
                    uri: asset.uri,
                    size: asset.fileSize || 'unknown',
                    type: asset.type
                });

                let blob: Blob;
                const fileExt = asset.uri.split('.').pop()?.toLowerCase() || 'mp4';
                
                // Use the current user's ID for the path to satisfy RLS if target owner is different (e.g. admin editing)
                // But fallback to owner_id if available.
                const folderId = user?.id || act?.owner_id || 'unknown';
                const fileName = `${folderId}/video-${Date.now()}.${fileExt}`;
                console.log('Generated fileName:', fileName);

                // Use fetch for more reliable blob conversion (works on Web & Mobile)
                try {
                    const response = await fetch(asset.uri);
                    blob = await response.blob();
                    console.log('Blob size check:', blob.size);
                } catch (fetchError) {
                    console.error('Error fetching video asset:', fetchError);
                    throw new Error('No se pudo procesar el archivo. Revisa que el video no esté en iCloud o en una red lenta.');
                }
                
                console.log('Starting Supabase upload...');

                const { error: uploadError, data } = await supabase.storage
                    .from('media')
                    .upload(fileName, blob, { 
                        contentType: `video/${fileExt}`, 
                        upsert: true,
                        cacheControl: '3600'
                    });

                if (uploadError) {
                    console.error('Supabase Storage Upload Error:', uploadError);
                    throw uploadError;
                }

                console.log('Upload successful:', data);
                const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);

                setEditedData((prev: any) => ({
                    ...prev,
                    video_gallery: [...(prev?.video_gallery || []), { 
                        id: Date.now().toString(), 
                        url: publicUrl, 
                        type: 'upload',
                        videoType: 'upload' 
                    }]
                }));

                Toast.show({ type: 'success', text1: 'Video subido correctamente' });
            }
        } catch (error: any) {
            console.error('handleAddVideoUpload catch:', error);
            const msg = error.message || 'Error uploading video';
            if (Platform.OS === 'web') alert(`Error: ${msg}`);
            else Alert.alert('Error', msg);
        } finally {
            setIsSaving(false);
        }
    };

    const getYouTubeID = (url: string) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const videos = useMemo(() => {
        if (isEditing && editedData?.videos_url) return editedData.videos_url;
        return displayAct.videos_url || [];
    }, [isEditing, editedData?.videos_url, displayAct.videos_url]);

    const photos = useMemo(() => {
        if (isEditing && editedData?.photos_url) return editedData.photos_url;
        return displayAct.photos_url || [];
    }, [isEditing, editedData?.photos_url, displayAct.photos_url]);

    const mainYtId = useMemo(() => getYouTubeID(editedData?.video_url || displayAct.video_url || ''), [isEditing, editedData?.video_url, displayAct.video_url]);

    // Helper: skip generic Unsplash placeholder URLs
    const isRealPhoto = (url?: string | null) => url && !url.includes('images.unsplash.com');

    // Standardized Image Hierarchy: Banner (Portada) > Avatar (Perfil) > Photos[0] (Galería)
    const coverImageUrl = (isRealPhoto(displayAct.banner_url) ? displayAct.banner_url : null)
        || (isRealPhoto(displayAct.avatar_url) ? displayAct.avatar_url : null)
        || (Array.isArray(photos) && isRealPhoto(photos[0]) ? photos[0] : null)
        || (displayAct.image_url && isRealPhoto(displayAct.image_url) ? displayAct.image_url : null)
        || 'https://euphonious-kelpie-cd0a27.netlify.app/images/default-banner.png'; // Brand-consistent fallback

    const avatarUrl = (isRealPhoto(displayAct.avatar_url) ? displayAct.avatar_url : null)
        || (isRealPhoto(displayAct.banner_url) ? displayAct.banner_url : null)
        || (Array.isArray(photos) && isRealPhoto(photos[0]) ? photos[0] : null)
        || (displayAct.image_url && isRealPhoto(displayAct.image_url) ? displayAct.image_url : null)
        || 'https://euphonious-kelpie-cd0a27.netlify.app/images/default-avatar.png'; // Brand-consistent fallback

    // Rating logic
    const reviews = displayAct.reviews || [];
    const reviewCount = reviews.length;
    const avgRating = reviewCount > 0
        ? (reviews.reduce((acc, rev) => acc + (rev.rating || 0), 0) / reviewCount).toFixed(1)
        : 'New';

    // Business Logic: 20% Markup
    const MARGIN_MULTIPLIER = 1.20;

    const handleBookPackage = (pkg: any | null) => {
        // @ts-ignore - Dynamic route might not be captured by types yet
        router.push({
            pathname: `/booking/${id}` as any,
            params: {
                packageData: pkg ? JSON.stringify(pkg) : null,
                managedByAdmin: displayAct.profile?.managed_by_admin ? 'true' : 'false'
            }
        });
    };

    const handleGoBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)');
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    const renderHeader = () => (
        <View style={styles.header}>
            <Pressable
                onPress={() => isEditing && pickImage('banner_url')}
                style={styles.coverImageContainer}
            >
                {displayAct.video_url && !mainYtId && !isEditing ? (
                    <Video
                        source={{ uri: displayAct.video_url }}
                        style={styles.coverImage}
                        resizeMode={ResizeMode.COVER}
                        isLooping
                        shouldPlay
                        isMuted
                    />
                ) : (
                    <Image
                        source={{ uri: isEditing ? editedData?.banner_url : coverImageUrl }}
                        style={styles.coverImage}
                    />
                )}
                <View style={[styles.coverOverlay, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
                {isEditing && (
                    <View style={{
                        position: 'absolute',
                        top: 80,
                        right: 20,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: COLORS.primary
                    }}>
                        <Plus size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>EDIT COVER</Text>
                    </View>
                )}

                {/* Back Button */}
                <Pressable
                    style={styles.backButtonAbsolute}
                    onPress={handleGoBack}
                >
                    <ArrowLeft color="#fff" size={24} />
                </Pressable>

                {/* Performance Lab Management Badge */}
                <View style={styles.agencyBadgeAbsolute}>
                    <ShieldCheck size={14} color={COLORS.primary} />
                    <Text style={styles.agencyBadgeText}>MANAGED BY PERFORMANCE LAB</Text>
                </View>

                {/* Admin/Owner Toggle */}
                {canEdit && (
                    <Pressable
                        style={styles.editToggleAbsolute}
                        onPress={() => setIsEditing(!isEditing)}
                    >
                        <Text style={styles.editToggleText}>
                            {isEditing ? '👀 View Profile' : '✏️ Modo Edición'}
                        </Text>
                    </Pressable>
                )}
            </Pressable>

            {/* Profile Info Overlay */}
            <View style={styles.headerContent}>
                <Pressable
                    onPress={() => isEditing && pickImage('avatar_url')}
                    style={styles.avatarContainer}
                >
                    <Image
                        source={{ uri: isEditing ? editedData?.avatar_url : avatarUrl }}
                        style={styles.avatar}
                    />
                    {isEditing && (
                        <View style={[styles.imageEditOverlay, { backgroundColor: 'rgba(204, 255, 0, 0.7)' }]}>
                            <Plus size={12} color="#000" />
                            <Text style={[styles.imageEditLabel, { color: '#000', fontSize: 10, fontWeight: 'bold' }]}>PHOTO</Text>
                        </View>
                    )}
                    {!isEditing && displayAct.is_verified && (
                        <View style={styles.verifiedBadge}>
                            <CheckCircle2 color={COLORS.background} size={14} />
                        </View>
                    )}
                </Pressable>

                <View style={styles.headerInfo}>
                    {isEditing ? (
                        <>
                            <TextInput
                                style={styles.editInput}
                                value={editedData?.artistName}
                                onChangeText={(val) => setEditedData((p: any) => ({ ...p, artistName: val }))}
                                placeholder="Artist Name"
                            />
                            <Pressable 
                                style={[styles.editInput, { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                                onPress={() => setCategoryModalVisible(true)}
                            >
                                <Text style={{ color: (editedData?.categories && editedData.categories.length > 0) ? '#fff' : COLORS.textDim }}>
                                    {editedData?.categories && editedData.categories.length > 0
                                        ? editedData.categories.join(', ')
                                        : 'Select Categories'}
                                </Text>
                                <ChevronDown size={16} color={COLORS.textDim} />
                            </Pressable>
                        </>
                    ) : (
                        <>
                            <View style={styles.nameRow}>
                                <Text style={styles.artistNameHeader}>{displayAct.artistName}</Text>
                            </View>
                            <View style={styles.taglineRow}>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                                    {(displayAct.categories && displayAct.categories.length > 0) ? (
                                        displayAct.categories.map((cat: string, i: number) => (
                                            <View key={i} style={styles.categoryBadge}>
                                                <Text style={styles.categoryTag}>{cat}</Text>
                                            </View>
                                        ))
                                    ) : (
                                        <Text style={styles.categoryTag}>{displayAct.category}</Text>
                                    )}
                                </View>
                                <View style={styles.dot} />
                                <MapPin color={COLORS.primary} size={12} style={{ marginRight: 4 }} />
                                <Text style={styles.locationTag}>{displayAct.location}</Text>
                            </View>
                        </>
                    )}
                </View>

                <View style={styles.ctaRow}>
                    <Pressable style={styles.checkAvailabilityBtn} onPress={() => handleBookPackage(null)}>
                        <Zap size={18} color="#000" />
                        <Text style={styles.checkAvailabilityBtnText}>CHECK AVAILABILITY</Text>
                    </Pressable>
                    <Pressable style={styles.bookNowSecondaryBtn} onPress={() => scrollToSection('packages')}>
                        <Text style={styles.bookNowSecondaryBtnText}>VIEW PACKAGES</Text>
                    </Pressable>
                </View>
            </View>

            {/* Trust Bar inside Act Detail */}
            <View style={styles.inlineTrustBar}>
                <View style={styles.trustItem}>
                    <ShieldCheck size={16} color={COLORS.primary} />
                    <Text style={styles.trustText}>Verified</Text>
                </View>
                <View style={styles.trustDivider} />
                <View style={styles.trustItem}>
                    <Zap size={16} color={COLORS.primary} />
                    <Text style={styles.trustText}>Secure</Text>
                </View>
                <View style={styles.trustDivider} />
                <View style={styles.trustItem}>
                    <Package size={16} color={COLORS.primary} />
                    <Text style={styles.trustText}>Full Service</Text>
                </View>
            </View>
        </View>
    );

    const renderNav = () => (
        <View style={styles.navContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navScrollContent}>
                {TABS.map((tab) => (
                    <Pressable
                        key={tab.id}
                        onPress={() => scrollToSection(tab.id)}
                        style={[styles.navItem, activeSection === tab.id && styles.navItemActive]}
                    >
                        <Text style={[styles.navText, activeSection === tab.id && styles.navTextActive]}>
                            {tab.label}
                        </Text>
                        {activeSection === tab.id && <View style={styles.navIndicator} />}
                    </Pressable>
                ))}
            </ScrollView>
        </View>
    );

    const renderBiography = () => (
        <View style={styles.tabContent}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>About {isEditing ? editedData?.artistName : displayAct.artistName}</Text>
                {isEditing ? (
                    <TextInput
                        style={[styles.editInput, { minHeight: 120, textAlignVertical: 'top' }]}
                        value={editedData?.description}
                        onChangeText={(val) => setEditedData((p: any) => ({ ...p, description: val }))}
                        multiline
                        placeholder="Describe the artist and their show..."
                    />
                ) : (
                    <Text style={styles.bioText}>
                        {displayAct.description || "This artist hasn't provided a biography yet."}
                    </Text>
                )}
            </View>

            {/* Talent Card */}
            <View style={styles.section}>
                <View style={styles.talentCard}>
                    <Text style={styles.talentCardTitle}>Talent Details</Text>
                    {isEditing ? (
                        <View style={styles.detailsGrid}>
                            <View style={{ width: '48%' }}>
                                <Text style={styles.editLabel}>Base Location</Text>
                                <TextInput
                                    style={styles.editInput}
                                    value={editedData?.location}
                                    onChangeText={(val) => setEditedData((p: any) => ({ ...p, location: val }))}
                                />
                            </View>
                            <View style={{ width: '48%' }}>
                                <Text style={styles.editLabel}>Price Guide</Text>
                                <TextInput
                                    style={styles.editInput}
                                    value={editedData?.price_guide}
                                    onChangeText={(val) => setEditedData((p: any) => ({ ...p, price_guide: val }))}
                                />
                            </View>
                            <View style={{ width: '100%' }}>
                                <Text style={styles.editLabel}>Video URL (YouTube/Vimeo)</Text>
                                <TextInput
                                    style={styles.editInput}
                                    value={editedData?.video_url}
                                    onChangeText={(val) => setEditedData((p: any) => ({ ...p, video_url: val }))}
                                />
                            </View>
                        </View>
                    ) : (
                        <View style={styles.detailsGrid}>
                            <DetailItem 
                                label="Art Type" 
                                value={displayAct.categories && displayAct.categories.length > 0 
                                    ? displayAct.categories.join(' • ') 
                                    : displayAct.category} 
                            />
                            <DetailItem label="Specialty" value={displayAct.genre || displayAct.artist_type || 'Performer'} />
                            <DetailItem label="Experience" value={`${displayAct.experience_years || 5}+ Years`} />
                            <DetailItem label="Base" value={displayAct.location_base || displayAct.location || 'Dubai, UAE'} />
                        </View>
                    )}
                </View>

                {/* --- SUPERADMIN STATUS SECTION --- */}
                {isEditing && (
                <View style={[styles.talentCard, { marginTop: 15 }]}>
                    <Text style={styles.talentCardTitle}>Profile Status (Admin Only)</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 10 }}>
                        <Text style={{ color: 'white' }}>Verified (Blue Tick)</Text>
                        <Switch
                            value={editedData?.is_verified}
                            onValueChange={(v) => setEditedData((p: any) => ({ ...p, is_verified: v }))}
                            trackColor={{ false: '#333', true: COLORS.primary }}
                        />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 10 }}>
                        <Text style={{ color: 'white' }}>Profile Published</Text>
                        <Switch
                            value={editedData?.is_published}
                            onValueChange={(v) => setEditedData((p: any) => ({ ...p, is_published: v }))}
                            trackColor={{ false: '#333', true: COLORS.primary }}
                        />
                    </View>
                </View>
                )}

                {/* --- SOCIAL LINKS SECTION --- */}
                <View style={[styles.talentCard, { marginTop: 15 }]}>
                    <Text style={styles.talentCardTitle}>Social Links</Text>
                    {isEditing ? (
                        <View style={{ gap: 10 }}>
                            <Text style={styles.editLabel}>Social Links</Text>
                            <TextInput
                                style={styles.editInput}
                                value={editedData?.social_links?.instagram}
                                onChangeText={(val) => setEditedData((p: any) => ({ ...p, social_links: { ...p.social_links, instagram: val } }))}
                                placeholder="Instagram handle (e.g. artist_name)"
                            />
                            <TextInput
                                style={styles.editInput}
                                value={editedData?.social_links?.tiktok}
                                onChangeText={(val) => setEditedData((p: any) => ({ ...p, social_links: { ...p.social_links, tiktok: val } }))}
                                placeholder="TikTok handle"
                            />
                            <TextInput
                                style={styles.editInput}
                                value={editedData?.social_links?.website}
                                onChangeText={(val) => setEditedData((p: any) => ({ ...p, social_links: { ...p.social_links, website: val } }))}
                                placeholder="Website URL"
                            />
                        </View>
                    ) : (
                        <View style={{ flexDirection: 'row', gap: 15, marginTop: 10 }}>
                            {displayAct.social_links?.instagram ? (
                                <Pressable onPress={() => Linking.openURL(`https://instagram.com/${displayAct.social_links?.instagram}`)}>
                                    <Instagram color={COLORS.primary} size={24} />
                                </Pressable>
                            ) : null}
                            {displayAct.social_links?.website ? (
                                <Pressable onPress={() => Linking.openURL(displayAct.social_links?.website || '')}>
                                    <Globe color={COLORS.primary} size={24} />
                                </Pressable>
                            ) : null}
                        </View>
                    )}
                </View>
            </View>
        </View>
    );

    const renderMedia = () => {
        const hasMedia = photos.length > 0 || videos.length > 0;
        
        // Combine media for a unified gallery experience
        const combinedMedia = [
            ...(editedData?.video_gallery || displayAct.video_gallery || []).map((item: any) => ({ 
                type: 'video', 
                videoType: item.type, // 'upload' | 'external_link'
                url: item.url,
                id: item.id
            })),
            ...videos.map((url: string, index: number) => ({ type: 'video', videoType: 'external_link', url, originalIndex: index })),
            ...photos.map((url: string, index: number) => ({ type: 'photo', url, originalIndex: index }))
        ];

        return (
            <View style={styles.tabContent}>
                {(hasMedia || isEditing) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📸 Media Gallery</Text>
                        <View style={styles.mediaGrid}>
                            {/* --- EDIT BUTTONS --- */}
                            {isEditing && (
                                <>
                                    <Pressable style={[styles.addMediaItem, { aspectRatio: 1, height: undefined }]} onPress={handleAddPhoto}>
                                        <Plus color={COLORS.primary} size={28} />
                                        <Text style={[styles.addMediaText, { fontSize: 8 }]}>+ FOTO</Text>
                                    </Pressable>
                                    
                                    <Pressable style={[styles.addMediaItem, { aspectRatio: 1, height: undefined }]} onPress={handleAddVideoUpload}>
                                        <VideoIcon color={COLORS.primary} size={28} />
                                        <Text style={[styles.addMediaText, { fontSize: 8 }]}>+ SUBIR VIDEO</Text>
                                    </Pressable>

                                    <View style={[styles.addMediaItem, { backgroundColor: '#111', borderStyle: 'dashed', aspectRatio: 1, height: undefined }]}>
                                        <TextInput
                                            style={{ color: '#fff', fontSize: 10, backgroundColor: '#222', padding: 5, borderRadius: 4, width: '90%', marginBottom: 4 }}
                                            placeholder="Pegar YouTube/Vimeo"
                                            placeholderTextColor="#666"
                                            onSubmitEditing={(e) => {
                                                const url = e.nativeEvent.text;
                                                if (url) {
                                                    setEditedData((p: any) => ({ 
                                                        ...p, 
                                                        video_gallery: [
                                                            ...(p?.video_gallery || []),
                                                            { id: Date.now().toString(), url, type: 'external_link' }
                                                        ] 
                                                    }));
                                                    // @ts-ignore
                                                    if (e.target) e.target.value = '';
                                                }
                                            }}
                                        />
                                        <Text style={{ color: COLORS.primary, fontSize: 8, fontWeight: 'bold' }}>+ LINK VIDEO</Text>
                                    </View>
                                </>
                            )}

                            {/* --- COMBINED GRID ITEMS --- */}
                            {combinedMedia.map((item, i) => {
                                const isVideo = item.type === 'video';
                                const ytId = isVideo ? getYouTubeID(item.url) : null;
                                const thumbUrl = isVideo 
                                    ? (ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : null)
                                    : item.url;

                                return (
                                    <View key={`${item.type}-${i}`} style={[styles.mediaItem, { aspectRatio: 1, height: undefined }]}>
                                         <Pressable 
                                            style={{ flex: 1 }} 
                                            onPress={() => {
                                                if (isVideo) {
                                                    setSelectedVideo(item);
                                                } else if (item.url) {
                                                    setSelectedImage(item.url);
                                                }
                                            }}
                                        >
                                            {thumbUrl ? (
                                                <Image 
                                                    source={{ uri: thumbUrl }} 
                                                    style={styles.mediaImage} 
                                                    resizeMode="cover"
                                                />
                                            ) : (
                                                isVideo && item.videoType === 'upload' ? (
                                                    <Video
                                                        source={{ uri: item.url }}
                                                        style={styles.mediaImage}
                                                        resizeMode={ResizeMode.COVER}
                                                        isMuted
                                                        shouldPlay={false}
                                                    />
                                                ) : (
                                                    <View style={[styles.mediaImage, { backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' }]}>
                                                        {isVideo ? <VideoIcon color={COLORS.primary} size={32} /> : <Info color="#333" size={32} />}
                                                    </View>
                                                )
                                            )}
                                            
                                            {isVideo && (
                                                <View style={styles.playOverlay}>
                                                    <View style={{
                                                        backgroundColor: item.videoType === 'upload' ? COLORS.primary : 'rgba(255, 0, 0, 0.9)',
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: 18,
                                                        justifyContent: 'center',
                                                        alignItems: 'center'
                                                    }}>
                                                        <VideoIcon color="#000" size={18} fill="#000" />
                                                    </View>
                                                </View>
                                            )}
                                        </Pressable>

                                        {isEditing && (
                                            <Pressable 
                                                style={styles.deletePhotoBtn}
                                                onPress={() => {
                                                    if (isVideo) {
                                                        const current = editedData?.video_gallery || displayAct.video_gallery || [];
                                                        const next = current.filter((v: any) => v.id !== item.id);
                                                        setEditedData((p: any) => ({ ...p, video_gallery: next }));
                                                        
                                                        // Also check old videos_url if it was from there
                                                        if (item.originalIndex !== undefined) {
                                                            const oldCurrent = editedData?.videos_url || videos;
                                                            const oldNext = oldCurrent.filter((_: any, idx: number) => idx !== item.originalIndex);
                                                            setEditedData((p: any) => ({ ...p, videos_url: oldNext }));
                                                        }
                                                    } else {
                                                        const current = editedData?.photos_url || photos;
                                                        const next = current.filter((_: any, idx: number) => idx !== item.originalIndex);
                                                        setEditedData((p: any) => ({ ...p, photos_url: next }));
                                                    }
                                                }}
                                            >
                                                <Trash2 size={14} color="#fff" />
                                            </Pressable>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* --- EMPTY STATE --- */}
                {!hasMedia && !isEditing && (
                    <View style={styles.section}>
                        <View style={styles.emptyBox}>
                            <Text style={styles.emptyText}>No media uploaded yet.</Text>
                        </View>
                    </View>
                )}
                {/* --- VIDEO PLAYER MODAL --- */}
                <Modal
                    visible={!!selectedVideo}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setSelectedVideo(null)}
                >
                    <View style={styles.modalBackground}>
                        <Pressable style={styles.closeModalBtn} onPress={() => setSelectedVideo(null)}>
                            <X size={32} color="#fff" />
                        </Pressable>
                        
                        <View style={styles.videoModalContent}>
                            {selectedVideo?.videoType === 'external_link' ? (
                                Platform.OS === 'web' ? (
                                    <View style={{ width: '100%', height: '100%', backgroundColor: '#000' }}>
                                        {/* @ts-ignore */}
                                        <iframe
                                            width="100%"
                                            height="100%"
                                            src={`https://www.youtube.com/embed/${getYouTubeID(selectedVideo.url)}?autoplay=1`}
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            style={{ border: 'none' }}
                                        />
                                    </View>
                                ) : (
                                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                                        <Text style={{ color: '#fff', fontSize: 18, marginBottom: 20, textAlign: 'center' }}>
                                            Este video debe abrirse en YouTube
                                        </Text>
                                        <Pressable 
                                            style={[styles.editBarSave, { width: 220, alignSelf: 'center' }]} 
                                            onPress={() => {
                                                Linking.openURL(selectedVideo.url);
                                                setSelectedVideo(null);
                                            }}
                                        >
                                            <Text style={styles.saveButtonText}>ABRIR EN YOUTUBE</Text>
                                        </Pressable>
                                    </View>
                                )
                            ) : (
                                <Video
                                    source={{ uri: selectedVideo?.url }}
                                    style={{ width: '100%', height: '100%' }}
                                    useNativeControls
                                    resizeMode={ResizeMode.CONTAIN}
                                    shouldPlay
                                />
                            )}
                        </View>
                    </View>
                </Modal>
            </View>
        );
    };

    const renderRequirements = () => (
        <View style={styles.tabContent}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Technical Requirements</Text>
                <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Tech Rider & Specs</Text>
                    <Text style={styles.infoValue}>{displayAct.technical_specs || "Standard performance requirements. No special technical needs listed."}</Text>
                </View>
                {displayAct.technical_rider_url && (
                    <Pressable style={styles.downloadBtn} onPress={() => Linking.openURL(displayAct.technical_rider_url)}>
                        <FileText color={COLORS.primary} size={20} />
                        <Text style={styles.downloadBtnText}>View Tech Rider (PDF)</Text>
                    </Pressable>
                )}
            </View>
        </View>
    );

    const renderPackages = () => (
        <View style={styles.tabContent}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Booking Packages</Text>
                <Text style={styles.sectionSubtitle}>Select a package to view booking details and availability.</Text>

                {displayAct.packages && displayAct.packages.length > 0 ? (
                    displayAct.packages.map((pkg: any, i: number) => (
                        <View key={i} style={styles.packageCard}>
                            <View style={styles.packageHeader}>
                                <Text style={styles.packageName}>{pkg.name}</Text>
                                <Text style={styles.packagePrice}>
                                    {Math.round(parseInt(pkg.price || '0', 10) * MARGIN_MULTIPLIER).toLocaleString()} AED
                                </Text>
                            </View>

                            <View style={styles.packageMetaRow}>
                                <View style={styles.packageMeta}>
                                    <Clock size={14} color={COLORS.primary} />
                                    <Text style={styles.packageMetaText}>{pkg.duration || '60 mins'}</Text>
                                </View>
                                {pkg.sets && (
                                    <View style={[styles.packageMeta, { marginLeft: 16 }]}>
                                        <Star size={14} color={COLORS.primary} />
                                        <Text style={styles.packageMetaText}>{pkg.sets} Sets</Text>
                                    </View>
                                )}
                            </View>

                            <Text style={styles.packageDesc}>{pkg.description}</Text>

                            {pkg.includes && pkg.includes.length > 0 && (
                                <View style={styles.packageFeatures}>
                                    {pkg.includes.map((feat: string, idx: number) => (
                                        <View key={idx} style={styles.featureItem}>
                                            <CheckCircle2 color={COLORS.primary} size={14} />
                                            <Text style={styles.featureText}>{feat}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}

                            <Pressable style={styles.bookNowBtn} onPress={() => handleBookPackage(pkg)}>
                                <Text style={styles.bookNowBtnText}>REQUEST QUOTE & BOOK</Text>
                            </Pressable>
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyBox}>
                        <Info size={40} color={COLORS.textDim} style={{ marginBottom: 12 }} />
                        <Text style={styles.emptyText}>Contact the artist directly for custom booking options.</Text>
                        <Pressable style={styles.inquireBtn}>
                            <Text style={styles.inquireBtnText}>Inquire for Quote</Text>
                        </Pressable>
                    </View>
                )}
            </View>
        </View>
    );

    const renderReviews = () => {
        const actReviews = displayAct.reviews || [];

        return (
            <View style={styles.tabContent}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Artist Reviews</Text>
                    {actReviews.length > 0 ? (
                        actReviews.map((rev, i) => (
                            <View key={rev.id || i} style={styles.reviewCard}>
                                <View style={styles.reviewHeader}>
                                    <Image
                                        source={{ uri: rev.profile?.avatar_url || 'https://euphonious-kelpie-cd0a27.netlify.app/images/default-avatar.png' }}
                                        style={styles.reviewAvatar}
                                    />
                                    <View style={styles.reviewInfo}>
                                        <Text style={styles.reviewerName}>{rev.profile?.name || 'Client'}</Text>
                                        <View style={styles.ratingStars}>
                                            {[...Array(5)].map((_, idx) => (
                                                <Star
                                                    key={idx}
                                                    size={12}
                                                    color={idx < rev.rating ? "#FFD700" : COLORS.gray[500]}
                                                    fill={idx < rev.rating ? "#FFD700" : "transparent"}
                                                />
                                            ))}
                                            <Text style={styles.reviewDate}>
                                                {new Date(rev.created_at).toLocaleDateString()}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                <Text style={styles.reviewComment}>{rev.comment}</Text>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyBox}>
                            <Text style={styles.emptyText}>No reviews yet. Be the first to book and rate this artist!</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    const renderCategoryModal = () => (
        <Modal
            visible={categoryModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setCategoryModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>Select Categories</Text>
                            <Text style={styles.modalSubtitle}>Select all that apply</Text>
                        </View>
                        <Pressable onPress={() => setCategoryModalVisible(false)}>
                            <X size={24} color="#fff" />
                        </Pressable>
                    </View>
                    <ScrollView style={styles.categoryList}>
                        {categories.map((cat) => {
                            const isSelected = editedData?.category_ids?.includes(cat.id);
                            return (
                                <Pressable 
                                    key={cat.id} 
                                    style={[
                                        styles.categoryItem,
                                        isSelected && { backgroundColor: 'rgba(204, 255, 0, 0.1)' }
                                    ]}
                                    onPress={() => {
                                        const currentIds = editedData?.category_ids || [];
                                        const currentNames = editedData?.categories || [];
                                        
                                        let nextIds, nextNames;
                                        if (isSelected) {
                                            nextIds = currentIds.filter((id: string) => id !== cat.id);
                                            nextNames = currentNames.filter((name: string) => name !== cat.name);
                                        } else {
                                            nextIds = [...currentIds, cat.id];
                                            nextNames = [...currentNames, cat.name];
                                        }
                                        
                                        setEditedData((p: any) => ({ 
                                            ...p, 
                                            category_ids: nextIds,
                                            categories: nextNames,
                                            // Keep legacy fields updated with the first selection for safety
                                            category: nextNames[0] || '',
                                            category_id: nextIds[0] || null
                                        }));
                                    }}
                                >
                                    <Text style={[
                                        styles.categoryItemText,
                                        isSelected && { color: COLORS.primary, fontWeight: 'bold' }
                                    ]}>
                                        {cat.name}
                                    </Text>
                                    {isSelected && <Check size={16} color={COLORS.primary} />}
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                    <Pressable 
                        style={[styles.editBarSave, { marginTop: 20, width: '100%' }]} 
                        onPress={() => setCategoryModalVisible(false)}
                    >
                        <Text style={styles.saveButtonText}>CONFIRMAR</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );

    const renderImageModal = () => (
        <Modal
            visible={!!selectedImage}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setSelectedImage(null)}
        >
            <View style={styles.modalBackground}>
                <Pressable style={styles.closeModalBtn} onPress={() => setSelectedImage(null)}>
                    <X size={32} color="#fff" />
                </Pressable>
                <View style={{ width: '90%', height: '80%', justifyContent: 'center', alignItems: 'center' }}>
                    {selectedImage && (
                        <Image 
                            source={{ uri: selectedImage }} 
                            style={{ width: '100%', height: '100%', borderRadius: 12 }} 
                            resizeMode="contain" 
                        />
                    )}
                </View>
            </View>
        </Modal>
    );

    const renderEditBar = () => {
        if (!isEditing) return null;
        return (
            <View style={[styles.editBar, { paddingTop: insets.top }]}>
                <View style={styles.editBarContent}>
                    <Pressable style={styles.editBarCancel} onPress={handleCancel}>
                        <X size={20} color="#fff" />
                        <Text style={styles.editBarCancelText}>Cancelar</Text>
                    </Pressable>
                    
                    <Text style={styles.editBarTitle}>Modo Edición</Text>
                    
                    <Pressable 
                        style={[styles.editBarSave, isSaving && { opacity: 0.7 }]} 
                        onPress={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color="#000" />
                        ) : (
                            <>
                                <Check size={20} color="#000" />
                                <Text style={styles.editBarSaveText}>Guardar</Text>
                            </>
                        )}
                    </Pressable>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {renderEditBar()}
            {renderCategoryModal()}
            {renderImageModal()}
            <ScrollView
                ref={scrollViewRef}
                stickyHeaderIndices={[1]}
                showsVerticalScrollIndicator={false}
                onScroll={(e) => {
                    // Update active section based on scroll position
                    const scrollY = e.nativeEvent.contentOffset.y;
                    const offset = mainContentOffsetRef.current;
                    const sections = TABS.map(t => ({
                        id: t.id,
                        y: offset + (sectionRefs.current[t.id] || 0),
                    }));
                    for (let i = sections.length - 1; i >= 0; i--) {
                        if (scrollY >= sections[i].y - STICKY_NAV_HEIGHT - 60) {
                            setActiveSection(sections[i].id);
                            break;
                        }
                    }
                }}
                scrollEventThrottle={100}
            >
                {renderHeader()}
                {renderNav()}
                <View
                    style={styles.mainContent}
                    onLayout={(e) => { mainContentOffsetRef.current = e.nativeEvent.layout.y; }}
                >
                    {/* --- BIOGRAPHY SECTION --- */}
                    <View onLayout={(e) => { sectionRefs.current['biography'] = e.nativeEvent.layout.y; }}>
                        {renderBiography()}
                    </View>

                    {/* --- Divider --- */}
                    <View style={styles.sectionDivider} />

                    {/* --- MEDIA SECTION --- */}
                    <View onLayout={(e) => { sectionRefs.current['media'] = e.nativeEvent.layout.y; }}>
                        {renderMedia()}
                    </View>

                    <View style={styles.sectionDivider} />

                    {/* --- REQUIREMENTS SECTION --- */}
                    <View onLayout={(e) => { sectionRefs.current['requirements'] = e.nativeEvent.layout.y; }}>
                        {renderRequirements()}
                    </View>

                    <View style={styles.sectionDivider} />

                    {/* --- PACKAGES SECTION --- */}
                    <View onLayout={(e) => { sectionRefs.current['packages'] = e.nativeEvent.layout.y; }}>
                        {renderPackages()}
                    </View>

                    <View style={styles.sectionDivider} />

                    {/* --- REVIEWS SECTION --- */}
                    <View onLayout={(e) => { sectionRefs.current['reviews'] = e.nativeEvent.layout.y; }}>
                        {renderReviews()}
                    </View>

                    {/* Bottom padding for last section */}
                    <View style={{ height: 100 }} />
                </View>
            </ScrollView>

            {/* Removed floating save button as it is now in the top edit bar */}
        </View>
    );
}

function DetailItem({ label, value }: { label: string, value: string }) {
    return (
        <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue} numberOfLines={1}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: COLORS.text,
        fontSize: 16,
        marginBottom: 20,
    },
    backButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    backButtonText: {
        color: COLORS.background,
        fontWeight: 'bold',
    },
    hero: {
        height: 480,
    },
    coverContainer: {
        height: 320,
        width: '100%',
    },
    coverImage: {
        ...StyleSheet.absoluteFillObject,
    },
    heroGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    topBar: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        zIndex: 100,
    },
    roundIconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileHeader: {
        marginTop: -60,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: COLORS.background,
        backgroundColor: COLORS.surface,
        marginBottom: 15,
        position: 'relative',
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 56,
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: COLORS.primary,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.background,
    },
    headerInfo: {
        alignItems: 'center',
        marginBottom: 20,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    artistName: {
        color: COLORS.text,
        fontSize: 28,
        fontWeight: '900',
    },
    proBadge: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    proBadgeText: {
        color: COLORS.background,
        fontSize: 10,
        fontWeight: 'bold',
    },
    locationTag: {
        color: COLORS.textDim,
        fontSize: 14,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.textDim,
        marginHorizontal: 10,
        opacity: 0.5,
    },
    ratingText: {
        color: '#FFD700',
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    header: {
        backgroundColor: COLORS.background,
    },
    coverImageContainer: {
        height: 380,
        width: '100%',
        position: 'relative',
    },
    coverOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    backButtonAbsolute: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 30,
        left: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    headerContent: {
        paddingHorizontal: 20,
        marginTop: -60,
        alignItems: 'center',
    },
    artistNameHeader: {
        color: COLORS.text,
        fontSize: 32,
        fontWeight: '900',
        textAlign: 'center',
    },
    taglineRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    categoryTag: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: 'bold',
    },
    categoryBadge: {
        backgroundColor: 'rgba(204, 255, 0, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(204, 255, 0, 0.3)',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaText: {
        color: COLORS.textDim,
        fontSize: 14,
        marginLeft: 4,
    },
    metaDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: COLORS.textDim,
        marginHorizontal: 8,
    },
    checkAvailabilityBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        flex: 1,
        alignItems: 'center',
    },
    checkAvailabilityBtnText: {
        color: COLORS.background,
        fontSize: 14,
        fontWeight: '800',
    },
    bookNowSecondaryBtn: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        flex: 1,
        alignItems: 'center',
    },
    bookNowSecondaryBtnText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '800',
    },
    ctaRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        marginTop: 20,
    },
    navContainer: {
        backgroundColor: COLORS.background,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
        paddingVertical: 10,
    },
    navScrollContent: {
        paddingHorizontal: 20,
        gap: 25,
    },
    navItem: {
        paddingVertical: 8,
        position: 'relative',
    },
    navItemActive: {
    },
    navText: {
        color: COLORS.textDim,
        fontSize: 15,
        fontWeight: '600',
    },
    navTextActive: {
        color: COLORS.primary,
    },
    navIndicator: {
        position: 'absolute',
        bottom: -10,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: COLORS.primary,
    },
    sectionDivider: {
        height: 1,
        backgroundColor: '#1A1A1A',
        marginVertical: 10,
    },
    mainContent: {
        padding: 20,
    },
    tabContent: {
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        color: COLORS.text,
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    sectionSubtitle: {
        color: COLORS.textDim,
        fontSize: 14,
        marginBottom: 20,
    },
    bioText: {
        color: COLORS.textDim,
        fontSize: 16,
        lineHeight: 24,
    },
    talentCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 15,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    talentCardTitle: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 15,
        opacity: 0.6,
    },
    detailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
    },
    detailItem: {
        width: '45%',
    },
    detailLabel: {
        color: COLORS.textDim,
        fontSize: 12,
        marginBottom: 4,
    },
    detailValue: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: '600',
    },
    mediaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    mediaItem: {
        width: (width - 50) / 2,
        height: 200,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: COLORS.surface,
    },
    mediaImage: {
        width: '100%',
        height: '100%',
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoBox: {
        backgroundColor: COLORS.surface,
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
    },
    infoLabel: {
        color: COLORS.primary,
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    infoValue: {
        color: COLORS.text,
        fontSize: 14,
        lineHeight: 20,
    },
    downloadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 15,
        borderWidth: 1,
        borderColor: COLORS.primary,
        borderRadius: 10,
        justifyContent: 'center',
    },
    downloadBtnText: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    packageCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 15,
        padding: 20,
        marginBottom: 15,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
    },
    packageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    packageName: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
    },
    packagePrice: {
        color: COLORS.primary,
        fontSize: 20,
        fontWeight: '900',
    },
    packageMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    packageMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    packageMetaText: {
        color: COLORS.textDim,
        fontSize: 13,
    },
    packageDesc: {
        color: COLORS.textDim,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 15,
    },
    packageFeatures: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 8,
        padding: 12,
        marginBottom: 15,
        gap: 8,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    featureText: {
        color: COLORS.text,
        fontSize: 13,
    },
    bookNowBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    bookNowBtnText: {
        color: COLORS.background,
        fontWeight: 'bold',
    },
    emptyBox: {
        backgroundColor: COLORS.surface,
        padding: 40,
        borderRadius: 15,
        alignItems: 'center',
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#333',
    },
    emptyText: {
        color: COLORS.textDim,
        textAlign: 'center',
        fontSize: 14,
        marginBottom: 20,
    },
    inquireBtn: {
        borderWidth: 1,
        borderColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    inquireBtnText: {
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    reviewCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 15,
        padding: 20,
        marginBottom: 15,
    },
    reviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    reviewAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    reviewInfo: {
        flex: 1,
    },
    reviewerName: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    ratingStars: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    reviewDate: {
        color: COLORS.textDim,
        fontSize: 12,
        marginLeft: 8,
    },
    reviewComment: {
        color: COLORS.textDim,
        fontSize: 14,
        lineHeight: 20,
    },
    // --- Video Embed Styles ---
    videoEmbedContainer: {
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 15,
        backgroundColor: COLORS.surface,
    },
    videoThumbCard: {
        width: '100%',
        height: 220,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 15,
        position: 'relative',
    },
    videoThumbImage: {
        width: '100%',
        height: '100%',
    },
    playButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    editToggleAbsolute: {
        position: 'absolute',
        top: 50,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.8)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.primary,
        zIndex: 1000,
    },
    editToggleText: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: 14,
    },
    saveButtonAbsolute: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        zIndex: 10000,
    },
    saveButtonText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 16,
    },
    // --- Edit Bar Styles ---
    editBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#000',
        zIndex: 10000,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.primary,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    editBarContent: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    editBarTitle: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    editBarCancel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    editBarCancelText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 12,
    },
    editBarSave: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
    },
    editBarSaveText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 12,
    },
    editInput: {
        backgroundColor: 'rgba(255,184,0,0.05)',
        color: '#FFF',
        borderWidth: 1,
        borderColor: COLORS.primary,
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        marginTop: 5,
    },
    editLabel: {
        color: COLORS.primary,
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginTop: 10,
    },
    bannerWrapper: {
        width: '100%',
        height: 250,
    },
    avatarWrapper: {
        position: 'absolute',
        bottom: -50,
        left: 20,
        zIndex: 10,
    },
    imageEditOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 1000, // For avatar, we'll need to handle banner separately if needed
    },
    imageEditLabel: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    addMediaItem: {
        width: (width - 50) / 2,
        height: 200,
        borderRadius: 10,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,184,0,0.05)',
    },
    addMediaText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 10,
    },
    agencyBadgeAbsolute: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 54 : 34,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(204, 255, 0, 0.4)',
    },
    agencyBadgeText: {
        color: COLORS.primary,
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    inlineTrustBar: {
        flexDirection: 'row',
        backgroundColor: '#0A0A0A',
        paddingVertical: 12,
        marginTop: 20,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#1A1A1A',
        justifyContent: 'space-around',
    },
    trustItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    trustText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    trustDivider: {
        width: 1,
        height: 12,
        backgroundColor: '#222',
        alignSelf: 'center',
    },
    deletePhotoBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(255,59,48,0.9)',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxHeight: '70%',
        backgroundColor: '#111',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#222',
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
    },
    modalTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalSubtitle: {
        color: COLORS.textDim,
        fontSize: 14,
        marginTop: 4,
    },
    categoryList: {
        padding: 10,
    },
    categoryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderRadius: 10,
        marginBottom: 5,
    },
    categoryItemText: {
        color: '#ccc',
        fontSize: 16,
    },
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoModalContent: {
        width: '95%',
        aspectRatio: 16/9,
        backgroundColor: '#000',
        borderRadius: 12,
        overflow: 'hidden',
    },
    closeModalBtn: {
        position: 'absolute',
        top: 40,
        right: 20,
        padding: 10,
        zIndex: 100,
    },
});
