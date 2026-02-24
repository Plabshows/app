import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
    Calendar,
    Camera,
    Check,
    ChevronRight, Clock, CreditCard,
    FileText, Globe, HelpCircle, Image as ImageIcon, LogOut, MessageCircle,
    Shield, Star, Upload, User, X, Zap
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator, Alert, FlatList, Image, Modal,
    Pressable, ScrollView,
    StyleSheet, Text, View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../../src/constants/theme';
import { useAuth } from '../../../src/context/AuthContext';
import { supabase } from '../../../src/lib/supabase';

type ImageTarget = 'avatar' | 'banner' | null;

export default function ProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, session, profile, artistAct, loading, signOut, refreshAuth } = useAuth();

    // Image upload state
    const [modalVisible, setModalVisible] = useState(false);
    const [imageTarget, setImageTarget] = useState<ImageTarget>(null);
    const [activeTab, setActiveTab] = useState<'upload' | 'gallery'>('upload');
    const [uploading, setUploading] = useState(false);
    const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
    const [loadingGallery, setLoadingGallery] = useState(false);

    // Local state for instant update without full refresh
    const [localAvatar, setLocalAvatar] = useState<string | null>(null);
    const [localBanner, setLocalBanner] = useState<string | null>(null);

    // Derive cover and avatar from real DB data + local overrides
    const coverImage = localBanner
        || profile?.banner_url
        || artistAct?.image_url
        || (Array.isArray(artistAct?.photos_url) && artistAct.photos_url[0])
        || null;
    const avatarImage = localAvatar
        || profile?.avatar_url
        || artistAct?.image_url
        || (Array.isArray(artistAct?.photos_url) && artistAct.photos_url[0])
        || null;
    const displayLocation = [profile?.city, profile?.country].filter(Boolean).join(', ') || 'Location not set';

    // Open image picker modal
    const openImageModal = (target: ImageTarget) => {
        setImageTarget(target);
        setActiveTab('upload');
        setModalVisible(true);
        loadExistingPhotos();
    };

    // Load existing photos from storage
    const loadExistingPhotos = useCallback(async () => {
        if (!user) return;
        setLoadingGallery(true);
        try {
            const { data, error } = await supabase.storage
                .from('act-photos')
                .list(user.id, { limit: 50, sortBy: { column: 'created_at', order: 'desc' } });

            if (data && !error) {
                const urls = data
                    .filter(file => file.name !== '.emptyFolderPlaceholder')
                    .map(file => {
                        const { data: urlData } = supabase.storage
                            .from('act-photos')
                            .getPublicUrl(`${user.id}/${file.name}`);
                        return urlData.publicUrl;
                    });
                setExistingPhotos(urls);
            }
        } catch (err) {
            console.error('Error loading gallery:', err);
        } finally {
            setLoadingGallery(false);
        }
    }, [user]);

    // Pick image from device
    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant camera roll permissions to upload photos.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: imageTarget === 'banner' ? [16, 9] : [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            await uploadAndSave(result.assets[0].uri);
        }
    };

    // Upload image to Supabase Storage and save URL to profile
    const uploadAndSave = async (imageUri: string) => {
        if (!user || !imageTarget) return;
        setUploading(true);

        try {
            // Create unique filename
            const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
            const fileName = `${user.id}/${imageTarget}_${Date.now()}.${fileExt}`;

            // Fetch the image as a blob
            const response = await fetch(imageUri);
            const blob = await response.blob();

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('act-photos')
                .upload(fileName, blob, {
                    contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('act-photos')
                .getPublicUrl(fileName);
            const publicUrl = urlData.publicUrl;

            // Update profile in DB
            const updateField = imageTarget === 'avatar' ? 'avatar_url' : 'banner_url';
            const { error: dbError } = await supabase
                .from('profiles')
                .update({ [updateField]: publicUrl })
                .eq('id', user.id);

            if (dbError) throw dbError;

            // Instant local update
            if (imageTarget === 'avatar') setLocalAvatar(publicUrl);
            else setLocalBanner(publicUrl);

            // Close modal and refresh
            setModalVisible(false);
            Alert.alert('✅ Success', `${imageTarget === 'avatar' ? 'Profile photo' : 'Cover photo'} updated!`);
            await refreshAuth();
        } catch (err: any) {
            console.error('Upload error:', err);
            Alert.alert('Upload Error', err.message || 'Failed to upload image.');
        } finally {
            setUploading(false);
        }
    };

    // Select existing photo from gallery
    const selectExistingPhoto = async (url: string) => {
        if (!user || !imageTarget) return;
        setUploading(true);

        try {
            const updateField = imageTarget === 'avatar' ? 'avatar_url' : 'banner_url';
            const { error } = await supabase
                .from('profiles')
                .update({ [updateField]: url })
                .eq('id', user.id);

            if (error) throw error;

            if (imageTarget === 'avatar') setLocalAvatar(url);
            else setLocalBanner(url);

            setModalVisible(false);
            Alert.alert('✅ Success', `${imageTarget === 'avatar' ? 'Profile photo' : 'Cover photo'} updated!`);
            await refreshAuth();
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to set image.');
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
        );
    }

    if (!session) {
        return (
            <View style={styles.container}>
                <View style={styles.centerContainer}>
                    <View style={styles.iconCircle}>
                        <User size={60} color={COLORS.primary} />
                    </View>
                    <Text style={styles.title}>Join the Community</Text>
                    <Text style={styles.subtitle}>Sign in to book artists, manage your profile, and more.</Text>
                    <View style={styles.authButtonContainer}>
                        <Pressable
                            style={[styles.primaryButton, { flex: 1, marginRight: 8 }]}
                            onPress={() => router.push('/signup' as any)}
                        >
                            <Text style={styles.buttonText}>Sign Up</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.secondaryButton, { flex: 1, marginLeft: 8 }]}
                            onPress={() => router.push('/login' as any)}
                        >
                            <Text style={styles.secondaryButtonText}>Log In</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        );
    }

    const MenuItem = ({ icon: Icon, title, subtitle, onPress, color = COLORS.text, rightIcon: RightIcon = ChevronRight }:
        { icon: any, title: string, subtitle?: string, onPress: () => void, color?: string, rightIcon?: any }) => (
        <Pressable
            style={({ pressed }) => [
                styles.menuItem,
                pressed && { backgroundColor: '#1A1A1A' }
            ]}
            onPress={onPress}
        >
            <View style={styles.menuItemLeft}>
                <View style={styles.iconWrapper}>
                    <Icon size={22} color={color === '#ff4444' ? color : COLORS.primary} />
                </View>
                <Text style={[styles.menuItemText, { color }]}>{title}</Text>
            </View>
            <View style={styles.menuItemRight}>
                {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
                {RightIcon && <RightIcon size={20} color={COLORS.textDim} />}
            </View>
        </Pressable>
    );

    const ProfileHeader = () => (
        <View style={styles.headerSection}>
            {/* Banner with edit button */}
            <View style={{ position: 'relative' }}>
                <Image
                    source={coverImage ? { uri: coverImage } : { uri: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000&auto=format&fit=crop' }}
                    style={styles.coverPhoto}
                />
                <Pressable
                    style={styles.bannerCameraButton}
                    onPress={() => openImageModal('banner')}
                >
                    <Camera size={16} color="#fff" />
                </Pressable>
            </View>

            <View style={styles.profileInfoContainer}>
                {/* Avatar with edit button */}
                <View style={styles.avatarContainer}>
                    <Image
                        source={avatarImage ? { uri: avatarImage } : { uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop' }}
                        style={styles.avatar}
                    />
                    <Pressable
                        style={styles.cameraButton}
                        onPress={() => openImageModal('avatar')}
                    >
                        <Camera size={16} color="#000" />
                    </Pressable>
                </View>

                <View style={styles.nameSection}>
                    <Text style={styles.nameText}>{artistAct?.name || profile?.name || 'Artist Name'}</Text>
                    <Text style={styles.locationText}>
                        {displayLocation} • {artistAct?.artist_type || 'Specialty Act'}
                    </Text>
                    <View style={styles.membershipBadge}>
                        <Zap size={10} color={COLORS.background} fill={COLORS.background} />
                        <Text style={styles.membershipText}>PRO MEMBER</Text>
                    </View>
                </View>

                <Pressable
                    style={styles.manageButton}
                    onPress={() => router.push('/(tabs)/profile/edit-profile' as any)}
                >
                    <Text style={styles.manageButtonText}>Manage Profile</Text>
                </Pressable>
            </View>
        </View>
    );

    const MenuSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
        <View style={styles.menuSection}>
            <Text style={styles.sectionHeader}>{title}</Text>
            {children}
        </View>
    );

    // ---- IMAGE UPLOAD MODAL ----
    const ImageUploadModal = () => (
        <Modal
            visible={modalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => !uploading && setModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContainer, { paddingBottom: insets.bottom + 16 }]}>
                    {/* Modal Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            {imageTarget === 'avatar' ? 'Profile Photo' : 'Cover Photo'}
                        </Text>
                        <Pressable
                            onPress={() => !uploading && setModalVisible(false)}
                            style={styles.modalCloseButton}
                        >
                            <X size={22} color={COLORS.text} />
                        </Pressable>
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabRow}>
                        <Pressable
                            style={[styles.tab, activeTab === 'upload' && styles.activeTab]}
                            onPress={() => setActiveTab('upload')}
                        >
                            <Upload size={16} color={activeTab === 'upload' ? COLORS.background : COLORS.textDim} />
                            <Text style={[styles.tabText, activeTab === 'upload' && styles.activeTabText]}>
                                Upload New
                            </Text>
                        </Pressable>
                        <Pressable
                            style={[styles.tab, activeTab === 'gallery' && styles.activeTab]}
                            onPress={() => setActiveTab('gallery')}
                        >
                            <ImageIcon size={16} color={activeTab === 'gallery' ? COLORS.background : COLORS.textDim} />
                            <Text style={[styles.tabText, activeTab === 'gallery' && styles.activeTabText]}>
                                Choose Existing
                            </Text>
                        </Pressable>
                    </View>

                    {/* Tab Content */}
                    {uploading ? (
                        <View style={styles.uploadingContainer}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                            <Text style={styles.uploadingText}>Uploading...</Text>
                        </View>
                    ) : activeTab === 'upload' ? (
                        <View style={styles.uploadTabContent}>
                            <Pressable style={styles.uploadArea} onPress={pickImage}>
                                <View style={styles.uploadIconCircle}>
                                    <Camera size={32} color={COLORS.primary} />
                                </View>
                                <Text style={styles.uploadTitle}>
                                    {imageTarget === 'avatar' ? 'Choose Profile Photo' : 'Choose Cover Photo'}
                                </Text>
                                <Text style={styles.uploadSubtitle}>
                                    Tap to select from your gallery
                                </Text>
                                <Text style={styles.uploadHint}>
                                    {imageTarget === 'avatar' ? 'Square crop (1:1)' : 'Wide crop (16:9)'}
                                </Text>
                            </Pressable>
                        </View>
                    ) : (
                        <View style={styles.galleryTabContent}>
                            {loadingGallery ? (
                                <View style={styles.uploadingContainer}>
                                    <ActivityIndicator size="large" color={COLORS.primary} />
                                    <Text style={styles.uploadingText}>Loading photos...</Text>
                                </View>
                            ) : existingPhotos.length === 0 ? (
                                <View style={styles.emptyGallery}>
                                    <ImageIcon size={48} color={COLORS.textDim} />
                                    <Text style={styles.emptyGalleryText}>No photos uploaded yet</Text>
                                    <Text style={styles.emptyGalleryHint}>
                                        Upload photos in the wizard first, then choose them here
                                    </Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={existingPhotos}
                                    keyExtractor={(item, i) => `${item}-${i}`}
                                    numColumns={3}
                                    contentContainerStyle={{ gap: 4, padding: 4 }}
                                    columnWrapperStyle={{ gap: 4 }}
                                    renderItem={({ item }) => (
                                        <Pressable
                                            style={styles.galleryItem}
                                            onPress={() => selectExistingPhoto(item)}
                                        >
                                            <Image source={{ uri: item }} style={styles.galleryImage} />
                                            <View style={styles.galleryOverlay}>
                                                <Check size={18} color="#fff" />
                                            </View>
                                        </Pressable>
                                    )}
                                />
                            )}
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 120 }
                ]}
                bounces={true}
                showsVerticalScrollIndicator={false}
            >
                <ProfileHeader />

                <View style={styles.sectionDivider} />

                <View style={styles.contentLayout}>
                    <MenuSection title="Dashboard">
                        <MenuItem
                            icon={Calendar}
                            title="Bookings"
                            onPress={() => router.push('/(tabs)/profile/bookings' as any)}
                        />
                        <MenuItem
                            icon={Clock}
                            title="Calendar"
                            onPress={() => router.push('/(tabs)/profile/calendar' as any)}
                        />
                        <MenuItem
                            icon={Star}
                            title="Reviews"
                            onPress={() => router.push('/(tabs)/profile/reviews' as any)}
                        />
                        <MenuItem
                            icon={MessageCircle}
                            title="Messages"
                            onPress={() => router.push('/messages' as any)}
                        />
                        <MenuItem
                            icon={CreditCard}
                            title="Billing"
                            onPress={() => router.push('/(tabs)/profile/billing' as any)}
                        />
                        <MenuItem
                            icon={Zap}
                            title="Pro Membership"
                            color={COLORS.primary}
                            onPress={() => router.push('/(tabs)/profile/pro-membership' as any)}
                        />
                    </MenuSection>

                    <MenuSection title="Settings">
                        <MenuItem
                            icon={Globe}
                            title="Localization"
                            onPress={() => { }}
                        />
                        <MenuItem
                            icon={Shield}
                            title="Security"
                            onPress={() => router.push('/(tabs)/profile/security' as any)}
                        />
                        <MenuItem
                            icon={FileText}
                            title="Terms & Conditions"
                            onPress={() => { }}
                        />
                        <MenuItem
                            icon={HelpCircle}
                            title="Help"
                            onPress={() => { }}
                        />
                        <MenuItem
                            icon={LogOut}
                            title="Log out"
                            color="#ff4444"
                            onPress={signOut}
                            rightIcon={null}
                        />
                    </MenuSection>
                </View>
            </ScrollView>

            <ImageUploadModal />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { justifyContent: 'center', alignItems: 'center' },
    scrollContent: { flexGrow: 1 },

    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
    iconCircle: {
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: 'rgba(204, 255, 0, 0.1)',
        justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.xl
    },
    title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 10, textAlign: 'center' },
    subtitle: { fontSize: 16, color: COLORS.textDim, textAlign: 'center', marginBottom: 30, lineHeight: 22 },
    primaryButton: {
        backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 15, borderRadius: 12, alignItems: 'center'
    },
    buttonText: { color: COLORS.background, fontWeight: 'bold', fontSize: 16 },
    secondaryButton: {
        backgroundColor: 'transparent', paddingHorizontal: 20, paddingVertical: 15, borderRadius: 12,
        borderWidth: 1, borderColor: '#333', alignItems: 'center'
    },
    secondaryButtonText: { color: COLORS.text, fontWeight: 'bold', fontSize: 16 },
    authButtonContainer: { flexDirection: 'row', width: '100%', marginTop: 10 },

    headerSection: { backgroundColor: COLORS.background, marginBottom: SPACING.m },
    coverPhoto: { width: '100%', height: 160, backgroundColor: '#1A1A1A' },

    // Banner camera button (top-right of cover)
    bannerCameraButton: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },

    profileInfoContainer: { paddingHorizontal: SPACING.m, alignItems: 'center' },

    avatarContainer: { marginTop: -50, position: 'relative' },
    avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: COLORS.background },
    cameraButton: {
        position: 'absolute', bottom: 0, right: 0,
        backgroundColor: COLORS.primary, width: 32, height: 32,
        borderRadius: 16, borderWidth: 3, borderColor: COLORS.background,
        justifyContent: 'center', alignItems: 'center'
    },
    nameSection: { alignItems: 'center', marginTop: 12, marginBottom: 20 },
    nameText: { fontSize: 24, fontWeight: '800', color: COLORS.text },
    locationText: { fontSize: 13, color: COLORS.textDim, marginTop: 4, marginBottom: 8 },
    membershipBadge: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        gap: 4
    },
    membershipText: {
        color: COLORS.background,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5
    },
    manageButton: {
        backgroundColor: COLORS.primary, width: '100%',
        paddingVertical: 18, borderRadius: 12, alignItems: 'center'
    },
    manageButtonText: { color: COLORS.background, fontSize: 16, fontWeight: '900' },

    sectionDivider: { height: 8, backgroundColor: '#000', width: '100%', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#111' },

    contentLayout: { flex: 1, backgroundColor: COLORS.background },

    menuSection: { paddingHorizontal: SPACING.m, marginTop: SPACING.l },
    sectionHeader: {
        fontSize: 12,
        fontWeight: '900',
        color: COLORS.textDim,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        opacity: 0.6
    },
    menuItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        minHeight: 64,
        borderBottomWidth: 1, borderBottomColor: '#1A1A1A',
        paddingVertical: 4
    },
    menuItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    iconWrapper: { marginRight: 16, width: 24, alignItems: 'center' },
    menuItemText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
    menuItemRight: { flexDirection: 'row', alignItems: 'center' },
    menuItemSubtitle: { fontSize: 14, color: COLORS.textDim, marginRight: 8 },

    // ---- MODAL STYLES ----
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#111',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        minHeight: 420,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 12,
    },
    modalTitle: {
        color: COLORS.text,
        fontSize: 20,
        fontWeight: '800',
    },
    modalCloseButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#222',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabRow: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginBottom: 16,
        backgroundColor: '#1A1A1A',
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
    },
    activeTab: {
        backgroundColor: COLORS.primary,
    },
    tabText: {
        color: COLORS.textDim,
        fontSize: 13,
        fontWeight: '700',
    },
    activeTabText: {
        color: COLORS.background,
    },

    // Upload tab
    uploadTabContent: {
        paddingHorizontal: 20,
        flex: 1,
    },
    uploadArea: {
        borderWidth: 2,
        borderColor: '#333',
        borderStyle: 'dashed',
        borderRadius: 16,
        paddingVertical: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0A0A0A',
    },
    uploadIconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(204, 255, 0, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    uploadTitle: {
        color: COLORS.text,
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 6,
    },
    uploadSubtitle: {
        color: COLORS.textDim,
        fontSize: 13,
    },
    uploadHint: {
        color: COLORS.primary,
        fontSize: 11,
        fontWeight: '700',
        marginTop: 10,
        letterSpacing: 0.5,
    },

    // Uploading state
    uploadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 16,
    },
    uploadingText: {
        color: COLORS.textDim,
        fontSize: 14,
        fontWeight: '600',
    },

    // Gallery tab
    galleryTabContent: {
        flex: 1,
        paddingHorizontal: 16,
    },
    galleryItem: {
        flex: 1,
        aspectRatio: 1,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
        maxWidth: '33%',
    },
    galleryImage: {
        width: '100%',
        height: '100%',
    },
    galleryOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0,
    },
    emptyGallery: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    emptyGalleryText: {
        color: COLORS.textDim,
        fontSize: 16,
        fontWeight: '600',
    },
    emptyGalleryHint: {
        color: COLORS.textDim,
        fontSize: 13,
        textAlign: 'center',
        opacity: 0.6,
        paddingHorizontal: 40,
    },
});
