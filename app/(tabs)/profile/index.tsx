import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
    ArrowLeft, Bell, Calendar, Camera, Check, ChevronRight, Clock, CreditCard, Edit2,
    FileText, Globe, Heart, HelpCircle, Image as ImageIcon, LayoutDashboard, LogOut, MapPin, MessageCircle, MessageSquare,
    Search, Send, Settings, Shield, Star, Sparkles, Upload, User, X, Zap
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../../src/constants/theme';
import { useAuth } from '../../../src/context/AuthContext';
import { supabase } from '../../../src/lib/supabase';
import { useActs } from '../../../src/hooks/useActs';
import { LinearGradient } from 'expo-linear-gradient';

type ImageTarget = 'avatar' | 'banner' | null;

const fmt = (n: number) => n > 0 ? `€${n.toLocaleString('en-EU', { minimumFractionDigits: 0 })}` : '—';

export default function ProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, session, profile, artistAct, loading, signOut, refreshAuth, unreadCount } = useAuth();

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

    // Helper: skip generic Unsplash placeholder URLs
    const isRealPhoto = (url?: string | null) => url && !url.includes('images.unsplash.com');

    // Derive cover and avatar from real DB data + local overrides (skip Unsplash generics)
    const coverImage = localBanner
        || (isRealPhoto(profile?.banner_url) ? profile.banner_url : null)
        || (isRealPhoto(artistAct?.image_url) ? artistAct.image_url : null)
        || (Array.isArray(artistAct?.photos_url) && isRealPhoto(artistAct.photos_url[0]) ? artistAct.photos_url[0] : null)
        || null;
    const avatarImage = localAvatar
        || (isRealPhoto(profile?.avatar_url) ? profile.avatar_url : null)
        || (isRealPhoto(artistAct?.image_url) ? artistAct.image_url : null)
        || (Array.isArray(artistAct?.photos_url) && isRealPhoto(artistAct.photos_url[0]) ? artistAct.photos_url[0] : null)
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

    // ── CLIENT ROLE: show a tailored client profile ──────────────────────────
    if (profile?.role === 'client') {
        return <ClientProfileScreen profile={profile} router={router} signOut={signOut} unreadCount={unreadCount} />;
    }

    const MenuItem = ({ icon: Icon, title, subtitle, onPress, color = COLORS.text, rightIcon: RightIcon = ChevronRight, badgeCount = 0 }:
        { icon: any, title: string, subtitle?: string, onPress: () => void, color?: string, rightIcon?: any, badgeCount?: number }) => (
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
                {badgeCount > 0 && (
                    <View style={{ backgroundColor: COLORS.primary, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 10, paddingHorizontal: 6 }}>
                        <Text style={{ color: '#000', fontSize: 10, fontWeight: '900' }}>{badgeCount}</Text>
                    </View>
                )}
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
                    source={coverImage ? { uri: coverImage } : { uri: 'https://euphonious-kelpie-cd0a27.netlify.app/images/default-banner.png' }}
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
                        source={avatarImage ? { uri: avatarImage } : { uri: 'https://euphonious-kelpie-cd0a27.netlify.app/images/default-avatar.png' }}
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
                        {displayLocation} • {artistAct?.categories && artistAct.categories.length > 0 
                            ? artistAct.categories.join(' • ') 
                            : artistAct?.artist_type || 'Specialty Act'}
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
                    {(profile?.is_admin || profile?.role === 'admin') && (
                        <MenuSection title="Administration">
                            <MenuItem
                                icon={Shield}
                                title="Admin Hub"
                                subtitle="Manage platform"
                                onPress={() => router.push('/admin' as any)}
                                color={COLORS.primary}
                            />
                        </MenuSection>
                    )}

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
                            onPress={() => router.push('/messages' as any)}
                            badgeCount={unreadCount}
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

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT PROFILE SCREEN — fully tab-based, no sidebar, no external dashboard
// Tabs: Overview | My Event | Favorites | Requests | Messages | Settings
// ─────────────────────────────────────────────────────────────────────────────
const CLIENT_TABS = ['Overview', 'My Event', 'Favorites', 'Booking Requests', 'Support Chat', 'Settings'];
const ARTIST_TABS = ['Overview', 'My Events', 'Calendar', 'Reviews', 'Support Chat', 'Settings'];
type ClientTab = typeof CLIENT_TABS[number];

function ClientProfileScreen({ profile, router, signOut, unreadCount }: { profile: any; router: any; signOut: () => Promise<void>; unreadCount: number }) {
    const params = useLocalSearchParams<{ tab?: string }>();
    const [tab, setTab] = React.useState<ClientTab>((params.tab as ClientTab) || 'Overview');
    const { refreshAuth } = useAuth();

    // Sync state with URL params if they change
    React.useEffect(() => {
        if (params.tab && params.tab !== tab) {
            setTab(params.tab as ClientTab);
        }
    }, [params.tab]);

    return (
        <View style={{ flex: 1, backgroundColor: '#050505' }}>
            {/* Profile header — always visible */}
            <View style={{ padding: 24, paddingBottom: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 14 }}>
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(204,255,0,0.1)', borderWidth: 2, borderColor: 'rgba(204,255,0,0.3)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {profile?.avatar_url
                            ? <Image source={{ uri: profile.avatar_url }} style={{ width: 56, height: 56 }} />
                            : <Text style={{ color: COLORS.primary, fontSize: 20, fontWeight: '800' }}>{profile?.name?.[0]?.toUpperCase() || 'C'}</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '800', marginBottom: 2 }}>{profile?.name || 'Client'}</Text>
                        <Text style={{ color: '#6B7280', fontSize: 12 }}>{profile?.email}</Text>
                        <View style={{ backgroundColor: 'rgba(204,255,0,0.08)', borderWidth: 1, borderColor: 'rgba(204,255,0,0.2)', borderRadius: 20, paddingVertical: 2, paddingHorizontal: 8, alignSelf: 'flex-start', marginTop: 4 }}>
                            <Text style={{ color: COLORS.primary, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 }}>CLIENT</Text>
                        </View>
                    </View>
                    {/* Logout — always visible in header */}
                    <Pressable
                        onPress={() => signOut()}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12 }}
                    >
                        <LogOut size={14} color="#EF4444" />
                        <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>Sign out</Text>
                    </Pressable>
                </View>


                {/* Tab strip */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 0 }}>
                    <View style={{ flexDirection: 'row', gap: 4, paddingBottom: 0 }}>
                        {CLIENT_TABS.map(t => (
                            <Pressable key={t} onPress={() => setTab(t)}
                                style={{ 
                                    paddingVertical: 8, 
                                    paddingHorizontal: 14, 
                                    borderRadius: 20, 
                                    backgroundColor: tab === t ? COLORS.primary : '#0F0F0F', 
                                    borderWidth: 1, 
                                    borderColor: tab === t ? COLORS.primary : '#1A1A1A', 
                                    marginBottom: 16,
                                    flexDirection: 'row',
                                    alignItems: 'center'
                                }}>
                                <Text style={{ color: tab === t ? '#000' : '#6B7280', fontSize: 13, fontWeight: tab === t ? '800' : '500' }}>{t}</Text>
                                {t === 'Support Chat' && unreadCount > 0 && (
                                    <View style={{ 
                                        backgroundColor: tab === t ? '#000' : COLORS.primary, 
                                        borderRadius: 8, 
                                        minWidth: 16, 
                                        height: 16, 
                                        justifyContent: 'center', 
                                        alignItems: 'center', 
                                        marginLeft: 6, 
                                        paddingHorizontal: 4 
                                    }}>
                                        <Text style={{ color: tab === t ? COLORS.primary : '#000', fontSize: 9, fontWeight: '900' }}>{unreadCount}</Text>
                                    </View>
                                )}
                            </Pressable>
                        ))}
                    </View>
                </ScrollView>
            </View>

            {/* Tab content */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingTop: 8, paddingBottom: 180 }} showsVerticalScrollIndicator={false}>
                {tab === 'Overview' && <ClientOverviewTab profile={profile} router={router} setTab={setTab} signOut={signOut} />}
                {tab === 'My Event' && <ClientMyEventTab profile={profile} />}
                {tab === 'Favorites' && <ClientFavoritesTab profile={profile} router={router} refreshAuth={refreshAuth} />}
                {tab === 'Booking Requests' && <ClientRequestsTab profile={profile} router={router} />}
                {tab === 'Support Chat' && <ClientSupportTab profile={profile} />}
                {tab === 'Settings' && <ClientSettingsTab profile={profile} signOut={signOut} refreshAuth={refreshAuth} />}
            </ScrollView>
        </View>
    );
}

// ── OVERVIEW TAB ─────────────────────────────────────────────────────────────
function ClientOverviewTab({ profile, router, setTab, signOut }: { profile: any; router: any; setTab: (t: any) => void; signOut: () => Promise<void> }) {
    const [requests, setRequests] = React.useState<any[]>([]);
    const [event, setEvent] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);
    React.useEffect(() => {
        if (!profile?.id) return;
        Promise.all([
            supabase.from('booking_requests').select('id,status,created_at,acts(name,category)').eq('client_id', profile.id).order('created_at', { ascending: false }).limit(3),
            supabase.from('client_events').select('title,status,event_date,location').eq('client_id', profile.id).maybeSingle(),
        ]).then(([{ data: r }, { data: e }]) => { setRequests(r || []); setEvent(e); setLoading(false); });
    }, [profile?.id]);
    if (loading) return <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />;
    const favCount = (profile?.favorites || []).length;
    const statusColor: any = { pending: '#F59E0B', quoted: '#3B82F6', accepted: '#10B981', declined: '#EF4444', paid: '#8B5CF6', canceled: '#EF4444', expired: '#6B7280' };
    return (
        <View style={{ gap: 24 }}>
            {/* Stats */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
                {[
                    { label: 'Favorites', value: `${favCount}`, icon: Heart, color: '#FF3B30', tab: 'Favorites' as const },
                    { label: 'Requests', value: `${requests.length}`, icon: Send, color: '#007AFF', tab: 'Booking Requests' as const },
                    { label: 'Event', value: event?.status || 'None', icon: FileText, color: COLORS.primary, tab: 'My Event' as const }
                ].map(s => (
                    <Pressable key={s.label} onPress={() => setTab(s.tab)} style={{ flex: 1, backgroundColor: '#0F0F0F', borderRadius: 20, borderWidth: 1, borderColor: '#1A1A1A', padding: 16, alignItems: 'flex-start' }}>
                        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: s.color + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                            <s.icon size={18} color={s.color} />
                        </View>
                        <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '800', marginBottom: 2 }}>{s.value}</Text>
                        <Text style={{ color: '#6B7280', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '700' }}>{s.label}</Text>
                    </Pressable>
                ))}
            </View>

            {/* Event */}
            <View>
                <Text style={{ color: '#4B5563', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>My Event</Text>
                {event
                    ? <Pressable onPress={() => setTab('My Event')} style={{ backgroundColor: '#0F0F0F', borderRadius: 14, borderWidth: 1, borderColor: '#1A1A1A', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View><Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15, marginBottom: 3 }}>{event.title}</Text><Text style={{ color: '#6B7280', fontSize: 13 }}>{event.location || ''}{event.event_date ? ` · ${event.event_date}` : ''}</Text></View>
                        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: (event.status === 'ready' ? '#10B981' : '#F59E0B') + '22', borderColor: (event.status === 'ready' ? '#10B981' : '#F59E0B') + '44', borderWidth: 1 }}><Text style={{ color: event.status === 'ready' ? '#10B981' : '#F59E0B', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>{event.status}</Text></View>
                      </Pressable>
                    : <Pressable onPress={() => router.push('/booking/event' as any)} style={{ backgroundColor: 'rgba(204,255,0,0.04)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(204,255,0,0.15)', padding: 24, alignItems: 'center', gap: 10 }}>
                        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(204,255,0,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                            <Sparkles size={24} color={COLORS.primary} />
                        </View>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 16, marginBottom: 4 }}>No event yet</Text>
                            <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '700' }}>+ Create Event Brief</Text>
                        </View>
                      </Pressable>}
            </View>

            {/* Recent requests */}
            {requests.length > 0 && (
                <View>
                    <Text style={{ color: '#4B5563', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Recent Requests</Text>
                    {requests.map(r => (
                        <View key={r.id} style={{ backgroundColor: '#0F0F0F', borderRadius: 12, borderWidth: 1, borderColor: '#1A1A1A', padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View><Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14, marginBottom: 2 }}>{r.acts?.name || 'Artist'}</Text><Text style={{ color: '#6B7280', fontSize: 12 }}>{new Date(r.created_at).toLocaleDateString('en-GB')}</Text></View>
                            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: (statusColor[r.status] || '#6B7280') + '22', borderWidth: 1, borderColor: (statusColor[r.status] || '#6B7280') + '44' }}>
                                <Text style={{ color: statusColor[r.status] || '#6B7280', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>{r.status}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Account Menu */}
            <View style={{ marginTop: 10 }}>
                <Text style={{ color: '#4B5563', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 15 }}>ACCOUNT</Text>
                
                {[
                    { title: 'Explore Artists', icon: Search, onPress: () => router.replace('/(tabs)') },
                    { title: 'My Favorites', icon: Heart, onPress: () => setTab('Favorites') },
                    { title: 'Contact Admin', icon: MessageSquare, onPress: () => setTab('Support Chat') },
                    { title: 'Settings', icon: Settings, onPress: () => setTab('Settings') },
                    { title: 'Log Out', icon: LogOut, onPress: signOut, color: '#EF4444' },
                ].map((item: any, idx) => (
                    <Pressable 
                        key={idx} 
                        onPress={item.onPress}
                        style={{ 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            backgroundColor: '#0F0F0F', 
                            padding: 16, 
                            borderRadius: 14, 
                            borderWidth: 1, 
                            borderColor: '#1A1A1A',
                            marginBottom: 10,
                            justifyContent: 'space-between'
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: (item.color || COLORS.primary) + '15', alignItems: 'center', justifyContent: 'center' }}>
                                <item.icon size={18} color={item.color || COLORS.primary} />
                            </View>
                            <Text style={{ color: item.color || '#FFF', fontSize: 15, fontWeight: '600' }}>{item.title}</Text>
                        </View>
                        <ChevronRight size={18} color="#4B5563" />
                    </Pressable>
                ))}
            </View>
        </View>
    );
}

function ClientMyEventTab({ profile }: { profile: any }) {
    const [event, setEvent] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);
    const router = useRouter();

    const load = React.useCallback(async () => {
        const { data } = await supabase.from('client_events').select('*').eq('client_id', profile.id).maybeSingle();
        setEvent(data);
        setLoading(false);
    }, [profile.id]);

    React.useEffect(() => { load(); }, [load]);

    if (loading) return <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />;

    return (
        <View style={{ gap: 16 }}>
            {event ? (
                <View style={{ backgroundColor: '#0F0F0F', borderRadius: 20, borderWidth: 1, borderColor: '#1A1A1A', padding: 24 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                        <View>
                            <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 22, marginBottom: 6 }}>{event.title}</Text>
                            {event.event_type && (
                                <View style={{ backgroundColor: 'rgba(204,255,0,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' }}>
                                    <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '700' }}>{event.event_type}</Text>
                                </View>
                            )}
                        </View>
                        <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: (event.status === 'ready' ? '#10B981' : '#F59E0B') + '22', borderWidth: 1, borderColor: (event.status === 'ready' ? '#10B981' : '#F59E0B') + '44', height: 28 }}>
                            <Text style={{ color: event.status === 'ready' ? '#10B981' : '#F59E0B', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>{event.status}</Text>
                        </View>
                    </View>

                    <View style={{ gap: 12, marginBottom: 24 }}>
                        {[
                            { icon: MapPin, val: event.location, label: 'Location' },
                            { icon: Calendar, val: event.event_date, label: 'Date' },
                            { icon: User, val: event.guest_count ? `${event.guest_count} guests` : null, label: 'Guests' },
                            { icon: CreditCard, val: event.budget_range, label: 'Budget' }
                        ].filter(s => s.val).map((item, idx) => (
                            <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#171717', alignItems: 'center', justifyContent: 'center' }}>
                                    <item.icon size={16} color="#6B7280" />
                                </View>
                                <View>
                                    <Text style={{ color: '#6B7280', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</Text>
                                    <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '600' }}>{item.val}</Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    {event.notes && (
                        <View style={{ backgroundColor: '#171717', borderRadius: 12, padding: 16, marginBottom: 24 }}>
                            <Text style={{ color: '#6B7280', fontSize: 13, fontStyle: 'italic', lineHeight: 20 }}>"{event.notes}"</Text>
                        </View>
                    )}

                    <Pressable 
                        onPress={() => router.push('/booking/event' as any)} 
                        style={{ 
                            paddingVertical: 16, 
                            borderRadius: 16, 
                            backgroundColor: COLORS.primary, 
                            alignItems: 'center',
                            shadowColor: COLORS.primary,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.2,
                            shadowRadius: 8,
                            elevation: 4
                        }}
                    >
                        <Text style={{ color: '#000', fontWeight: '900', fontSize: 16 }}>Update Brief via Wizard</Text>
                    </Pressable>
                </View>
            ) : (
                <Pressable 
                    onPress={() => router.push('/booking/event' as any)} 
                    style={{ backgroundColor: '#0F0F0F', borderRadius: 24, borderWidth: 1, borderColor: '#1A1A1A', padding: 60, alignItems: 'center', gap: 16, marginBottom: 120 }}
                >
                    <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(204,255,0,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(204,255,0,0.1)' }}>
                        <Sparkles size={40} color={COLORS.primary} />
                    </View>
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 20, marginBottom: 4 }}>No event yet</Text>
                        <Text style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', lineHeight: 22 }}>Create your event brief to start receiving tailored artist proposals.</Text>
                    </View>
                    <View style={{ backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 100, marginTop: 8 }}>
                        <Text style={{ color: '#000', fontWeight: '900', fontSize: 16 }}>+ Create Event Brief</Text>
                    </View>
                </Pressable>
            )}
        </View>
    );
}

// ── FAVORITES TAB ─────────────────────────────────────────────────────────────
const PARTY_TYPES = ['Private Party', 'Corporate Event', 'Wedding', 'Festival', 'Brand Activation', 'Gala', 'Birthday', 'Other'];

function ClientFavoritesTab({ profile, router, refreshAuth }: { profile: any; router: any; refreshAuth: () => Promise<void> }) {
    // ── artist data ──────────────────────────────────────────────────────────
    const [acts, setActs] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [removing, setRemoving] = React.useState<string | null>(null);

    // ── selection ────────────────────────────────────────────────────────────
    const [selected, setSelected] = React.useState<Set<string>>(new Set());

    // ── checkout state ───────────────────────────────────────────────────────
    const [showCheckout, setShowCheckout] = React.useState(false);
    const [eventDate, setEventDate] = React.useState('');
    const [eventTime, setEventTime] = React.useState('');
    const [location, setLocation] = React.useState('');
    const [partyType, setPartyType] = React.useState('');
    const [notes, setNotes] = React.useState('');
    const [submitting, setSubmitting] = React.useState(false);
    const [successIds, setSuccessIds] = React.useState<string[]>([]);

    // ── load favorites ────────────────────────────────────────────────────────
    React.useEffect(() => {
        const ids = profile?.favorites || [];
        if (!ids.length) { setLoading(false); setActs([]); return; }
        supabase.from('acts').select('id,name,category,image_url,location_base,price_guide,fee,owner_id').in('owner_id', ids)
            .then(({ data }) => { setActs(data || []); setLoading(false); });
    }, [profile?.favorites]);

    // ── remove from favorites ─────────────────────────────────────────────────
    const remove = async (actId: string) => {
        setRemoving(actId);
        const newFavs = (profile?.favorites || []).filter((id: string) => id !== actId);
        await supabase.from('profiles').update({ favorites: newFavs }).eq('id', profile.id);
        await refreshAuth();
        setSelected(prev => { const next = new Set(prev); next.delete(actId); return next; });
        setRemoving(null);
    };

    // ── toggle select ─────────────────────────────────────────────────────────
    const toggleSelect = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    // ── price helpers ─────────────────────────────────────────────────────────
    const selectedActs = acts.filter(a => selected.has(a.id));
    const parseFee = (fee: any, priceGuide?: any): number => {
        const raw = fee ?? priceGuide;
        if (!raw) return 0;
        const n = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
        return isNaN(n) ? 0 : n;
    };
    const subtotal = selectedActs.reduce((sum, a) => sum + parseFee(a.fee, a.price_guide), 0);
    // Since parseFee now returns the marked-up price from the hook, total is the subtotal
    const total = subtotal; 
    const platformFee = 0; // Not shown separately anymore



    // ── submit booking ────────────────────────────────────────────────────────
    const startBooking = () => {
        if (selected.size === 0) {
            Alert.alert('No Selection', 'Please select at least one artist to book.');
            return;
        }
        const ids = Array.from(selected).join(',');
        router.push(`/booking/${ids}` as any);
    };

    if (loading) return <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />;

    if (!acts.length) return (
        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Text style={{ fontSize: 48, marginBottom: 14 }}>♥</Text>
            <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 18, marginBottom: 6 }}>No favorites yet</Text>
            <Text style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>Explore artists and save your shortlist here.</Text>
            <Pressable onPress={() => router.replace('/(tabs)' as any)} style={{ marginTop: 20, backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 }}>
                <Text style={{ color: '#000', fontWeight: '800' }}>Explore Artists</Text>
            </Pressable>
        </View>
    );

    return (
        <View style={{ gap: 12 }}>
            {/* ── success banner ─────────────────────────────────────────── */}
            {successIds.length > 0 && (
                <View style={{ backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', borderRadius: 14, padding: 16 }}>
                    <Text style={{ color: '#10B981', fontWeight: '700', fontSize: 15, marginBottom: 4 }}>✓ Booking request sent!</Text>
                    <Text style={{ color: '#6B7280', fontSize: 13 }}>Your request has been submitted. Our team will be in touch shortly.</Text>
                    <Pressable onPress={() => setSuccessIds([])} style={{ marginTop: 10, alignSelf: 'flex-start' }}>
                        <Text style={{ color: '#4B5563', fontSize: 12 }}>Dismiss</Text>
                    </Pressable>
                </View>
            )}

            {/* ── instructions ──────────────────────────────────────────────── */}
            <View style={{ backgroundColor: 'rgba(204,255,0,0.04)', borderWidth: 1, borderColor: 'rgba(204,255,0,0.12)', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 18 }}>☑️</Text>
                <Text style={{ color: '#6B7280', fontSize: 12, flex: 1, lineHeight: 18 }}>Select artists you'd like to book, then tap <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Request Booking</Text>.</Text>
            </View>

            {/* ── artist cards with checkboxes ──────────────────────────────── */}
            {acts.map(act => {
                const isSelected = selected.has(act.id);
                const isSuccess = successIds.includes(act.id);
                return (
                    <View key={act.id} style={{ backgroundColor: '#0F0F0F', borderRadius: 16, borderWidth: 1.5, borderColor: isSelected ? COLORS.primary : isSuccess ? '#10B981' : '#1A1A1A', overflow: 'hidden' }}>
                        {/* Image + select overlay */}
                        <Pressable onPress={() => toggleSelect(act.id)} style={{ position: 'relative' }}>
                            {act.image_url && <Image source={{ uri: act.image_url }} style={{ width: '100%', height: 130 }} />}
                            {/* Checkbox */}
                            <View style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 8, backgroundColor: isSelected ? COLORS.primary : 'rgba(0,0,0,0.6)', borderWidth: 2, borderColor: isSelected ? COLORS.primary : 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' }}>
                                {isSelected && <Text style={{ color: '#000', fontSize: 14, fontWeight: '900', lineHeight: 16 }}>✓</Text>}
                            </View>
                            {isSuccess && (
                                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(16,185,129,0.3)', alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>✓ Requested</Text>
                                </View>
                            )}
                        </Pressable>

                        <View style={{ padding: 14 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15, marginBottom: 2 }}>{act.name}</Text>
                                    {act.category && <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '600', marginBottom: 2 }}>{act.category}</Text>}
                                    {act.location_base && <Text style={{ color: '#6B7280', fontSize: 12 }}>📍 {act.location_base}</Text>}
                                </View>
                                {(act.fee || act.price_guide) && (
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={{ color: '#9CA3AF', fontSize: 11, marginBottom: 2 }}>Artist fee</Text>
                                        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>{act.fee ? fmt(parseFee(act.fee)) : act.price_guide}</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#1A1A1A', padding: 10, gap: 8 }}>
                            <Pressable onPress={() => toggleSelect(act.id)} style={{ flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: isSelected ? 'rgba(204,255,0,0.12)' : '#171717', borderWidth: 1, borderColor: isSelected ? COLORS.primary : '#222', alignItems: 'center' }}>
                                <Text style={{ color: isSelected ? COLORS.primary : '#6B7280', fontSize: 13, fontWeight: '700' }}>{isSelected ? '✓ Selected' : 'Select'}</Text>
                            </Pressable>
                            <Pressable onPress={() => router.push(`/act/${act.id}` as any)} style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: '#222', alignItems: 'center' }}>
                                <Text style={{ color: '#9CA3AF', fontSize: 13 }}>Profile</Text>
                            </Pressable>
                            <Pressable onPress={() => remove(act.id)} disabled={removing === act.id} style={{ paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.06)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' }}>
                                {removing === act.id ? <ActivityIndicator size={12} color="#EF4444" /> : <Text style={{ color: '#EF4444', fontSize: 13 }}>✕</Text>}
                            </Pressable>
                        </View>
                    </View>
                );
            })}

            {/* ── CTA sticky bar ────────────────────────────────────────────── */}
            {selected.size > 0 && (
                <Pressable 
                    onPress={startBooking} 
                    style={{ 
                        backgroundColor: COLORS.primary, 
                        borderRadius: 16, 
                        padding: 18, 
                        alignItems: 'center', 
                        marginTop: 4,
                        marginBottom: 120
                    }}
                >
                    <Text style={{ color: '#000', fontWeight: '900', fontSize: 16 }}>
                        🎤  Request Booking · {selected.size} artist{selected.size > 1 ? 's' : ''}
                    </Text>
                </Pressable>
            )}
        </View>
    );
}



// ── REQUESTS TAB ─────────────────────────────────────────────────────────────
function ClientRequestsTab({ profile, router }: { profile: any; router: any }) {
    const [requests, setRequests] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [expanded, setExpanded] = React.useState<string | null>(null);
    const statusColor: any = { pending: '#F59E0B', quoted: '#3B82F6', accepted: '#10B981', declined: '#EF4444', paid: '#8B5CF6', canceled: '#EF4444', expired: '#6B7280' };
    React.useEffect(() => {
        supabase.from('booking_requests').select('*,acts(name,category,image_url)').eq('client_id', profile.id).order('created_at', { ascending: false })
            .then(({ data }) => { setRequests(data || []); setLoading(false); });
    }, [profile.id]);
    if (loading) return <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />;
    if (!requests.length) return (
        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Text style={{ fontSize: 48, marginBottom: 14 }}>📨</Text>
            <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 18, marginBottom: 6 }}>No requests yet</Text>
            <Text style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', marginBottom: 24 }}>Inquire about an artist to see your requests here.</Text>
            <Pressable onPress={() => router.replace('/(tabs)' as any)} style={{ backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 }}>
                <Text style={{ color: '#000', fontWeight: '800' }}>Explore Artists</Text>
            </Pressable>
        </View>
    );
    return (
        <View style={{ gap: 10 }}>
            {requests.map(r => {
                const sc = statusColor[r.status] || '#6B7280';
                const isOpen = expanded === r.id;
                return (
                    <Pressable key={r.id} onPress={() => setExpanded(isOpen ? null : r.id)} style={{ backgroundColor: '#0F0F0F', borderRadius: 16, borderWidth: 1, borderColor: '#1A1A1A', padding: 16 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View style={{ flex: 1 }}><Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15, marginBottom: 2 }}>{r.acts?.name || 'Artist'}</Text>{r.acts?.category && <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '600' }}>{r.acts.category}</Text>}</View>
                            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: sc + '22', borderWidth: 1, borderColor: sc + '44' }}><Text style={{ color: sc, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>{r.status}</Text></View>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 }}>
                            <Text style={{ color: '#6B7280', fontSize: 12 }}>📅 {r.event_dates?.[0] ? new Date(r.event_dates[0]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}  ·  Sent {new Date(r.created_at).toLocaleDateString('en-GB')}</Text>
                            {r.total_amount && (
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ color: COLORS.primary, fontWeight: '800', fontSize: 13 }}>{fmt(r.total_amount)}</Text>
                                    <Text style={{ color: '#4B5563', fontSize: 10 }}>Total incl. fee</Text>
                                </View>
                            )}
                        </View>
                        {isOpen && (
                            <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#1A1A1A', gap: 6 }}>
                                {r.location_text && <Text style={{ color: '#9CA3AF', fontSize: 13 }}>📍 {r.location_text}</Text>}
                                {r.event_type && <Text style={{ color: '#9CA3AF', fontSize: 13 }}>🎉 {r.event_type}</Text>}
                                {r.guests_count && <Text style={{ color: '#9CA3AF', fontSize: 13 }}>👥 {r.guests_count} guests</Text>}
                                {r.budget_amount && <Text style={{ color: '#9CA3AF', fontSize: 13 }}>💰 {r.budget_currency} {r.budget_amount}</Text>}
                                {r.notes && <Text style={{ color: '#6B7280', fontSize: 13, fontStyle: 'italic', lineHeight: 20, marginTop: 4 }}>"{r.notes}"</Text>}
                                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                                    <Pressable 
                                        onPress={() => router.push(`/act/${r.act_id}` as any)} 
                                        style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#333', alignItems: 'center' }}
                                    >
                                        <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>View Artist</Text>
                                    </Pressable>
                                </View>
                            </View>
                        )}
                    </Pressable>
                );
            })}
            

        </View>
    );
}


function ClientSupportTab({ profile }: { profile: any }) {
    const router = useRouter();
    return (
        <View style={{ flex: 1, padding: 20, gap: 20 }}>
            <View style={{ 
                backgroundColor: 'rgba(204,255,0,0.05)', 
                borderWidth: 1, 
                borderColor: 'rgba(204,255,0,0.2)', 
                borderRadius: 24, 
                padding: 32,
                alignItems: 'center',
                gap: 20
            }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(204,255,0,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                    <MessageCircle size={40} color={COLORS.primary} />
                </View>
                
                <View style={{ alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: '#FFF', fontSize: 24, fontWeight: '800', textAlign: 'center' }}>Concierge Support</Text>
                    <Text style={{ color: '#6B7280', fontSize: 16, lineHeight: 24, textAlign: 'center', paddingHorizontal: 20 }}>
                        Need help with a booking, payment, or technical issue? Our expert team is here to assist you 24/7.
                    </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' }} />
                    <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>Available Online</Text>
                </View>

                <Pressable 
                    onPress={() => router.push('/(tabs)/messages' as any)}
                    style={{ 
                        backgroundColor: COLORS.primary, 
                        width: '100%', 
                        paddingVertical: 18, 
                        borderRadius: 16, 
                        alignItems: 'center',
                        shadowColor: COLORS.primary,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 5
                    }}
                >
                    <Text style={{ color: '#000', fontWeight: '900', fontSize: 16 }}>CHAT WITH US</Text>
                </Pressable>
            </View>

            <View style={{ gap: 12 }}>
                <Text style={{ color: '#4B5563', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginLeft: 4 }}>RESOURCES</Text>
                {[
                    { icon: FileText, title: 'FAQs & Guidelines', desc: 'Common questions and act rules' },
                    { icon: Shield, title: 'Safety & Trust', desc: 'Secure payments and verification' }
                ].map((item, i) => (
                    <Pressable key={i} style={{ backgroundColor: '#0F0F0F', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: '#1A1A1A' }}>
                        <item.icon size={20} color="#6B7280" />
                        <View style={{ flex: 1, gap: 1 }}>
                            <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '600' }}>{item.title}</Text>
                            <Text style={{ color: '#4B5563', fontSize: 13 }}>{item.desc}</Text>
                        </View>
                        <ChevronRight size={18} color="#374151" />
                    </Pressable>
                ))}
            </View>
        </View>
    );
}

// Unused: function RequestChatModal({ requestId, onClose }: { requestId: string | null; onClose: () => void }) { ... }

// ── MESSAGES TAB ─────────────────────────────────────────────────────────────
function ClientMessagesTab({ profile, unreadCount }: { profile: any; unreadCount: number }) {
    const router = useRouter();
    return (
        <View style={{ gap: 20 }}>
            {/* Main support card */}
            <Pressable 
                onPress={() => router.push('/(tabs)/messages' as any)}
                style={{ 
                    backgroundColor: 'rgba(204,255,0,0.05)', 
                    borderWidth: 1, 
                    borderColor: 'rgba(204,255,0,0.2)', 
                    borderRadius: 20, 
                    padding: 24, 
                    gap: 16 
                }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(204,255,0,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                        <MessageCircle size={28} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '800' }}>Concierge Support</Text>
                        <Text style={{ color: '#6B7280', fontSize: 14, lineHeight: 20 }}>Chat with our team for assistance with bookings, payments or technical issues.</Text>
                    </View>
                </View>

                <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 4 }} />

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
                        <Text style={{ color: '#10B981', fontSize: 13, fontWeight: '700' }}>Team Online</Text>
                    </View>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {unreadCount > 0 && (
                            <View style={{ backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                                <Text style={{ color: '#000', fontSize: 12, fontWeight: '900' }}>{unreadCount} New</Text>
                            </View>
                        )}
                        <ChevronRight size={20} color={COLORS.textDim} />
                    </View>
                </View>
            </Pressable>

            {/* Other help items */}
            <View style={{ gap: 12 }}>
                <Text style={{ color: '#4B5563', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginLeft: 4 }}>RESOURCES</Text>
                {[
                    { icon: FileText, title: 'FAQs & Guidelines', desc: 'Common questions and act rules' },
                    { icon: Shield, title: 'Safety & Trust', desc: 'Secure payments and verification' }
                ].map((item, i) => (
                    <Pressable key={i} style={{ backgroundColor: '#0F0F0F', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: '#1A1A1A' }}>
                        <item.icon size={20} color="#6B7280" />
                        <View style={{ flex: 1, gap: 1 }}>
                            <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '600' }}>{item.title}</Text>
                            <Text style={{ color: '#4B5563', fontSize: 13 }}>{item.desc}</Text>
                        </View>
                        <ChevronRight size={18} color="#374151" />
                    </Pressable>
                ))}
            </View>
        </View>
    );
}

// ── SETTINGS TAB ─────────────────────────────────────────────────────────────
function ClientSettingsTab({ profile, signOut, refreshAuth }: { profile: any; signOut: () => Promise<void>; refreshAuth: () => Promise<void> }) {
    const [form, setForm] = React.useState({ name: profile?.name||'', phone: profile?.phone||'', company: profile?.company||'', preferred_event_type: profile?.preferred_event_type||'', preferred_location: profile?.preferred_location||'' });
    const [saving, setSaving] = React.useState(false);
    const fi = (k: string) => (v: string) => setForm((f: any) => ({ ...f, [k]: v }));
    const save = async () => {
        if (!form.name.trim()) { Alert.alert('Required', 'Name cannot be empty.'); return; }
        setSaving(true);
        const { error } = await supabase.from('profiles').update({ name: form.name, phone: form.phone||null, company: form.company||null, preferred_event_type: form.preferred_event_type||null, preferred_location: form.preferred_location||null }).eq('id', profile.id);
        if (!error) { await refreshAuth(); Alert.alert('Saved ✓', 'Settings updated.'); } else Alert.alert('Error', error.message);
        setSaving(false);
    };
    return (
        <View style={{ gap: 16 }}>
            <View style={{ backgroundColor: '#0F0F0F', borderRadius: 18, borderWidth: 1, borderColor: '#1A1A1A', padding: 20, gap: 14 }}>
                <Text style={{ color: '#4B5563', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Personal Info</Text>
                {[['Full Name *', 'name', 'Your name', 'default'], ['Phone', 'phone', '+34 600 000 000', 'phone-pad'], ['Company', 'company', 'e.g. Luxury Events Co.', 'default']].map(([label, key, ph, kb]) => (
                    <View key={key}><Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>{label}</Text><TextInput style={{ backgroundColor: '#171717', borderWidth: 1, borderColor: '#222', borderRadius: 12, padding: 14, color: '#FFF', fontSize: 14 }} value={(form as any)[key]} onChangeText={fi(key)} placeholder={ph} placeholderTextColor="#4B5563" keyboardType={kb as any} /></View>
                ))}
                <Text style={{ color: '#4B5563', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 4, marginBottom: 4 }}>Preferences</Text>
                {[['Preferred Event Type', 'preferred_event_type', 'e.g. Private Party, Corporate...'], ['Preferred Location', 'preferred_location', 'e.g. Ibiza, Dubai, Mykonos']].map(([label, key, ph]) => (
                    <View key={key}><Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>{label}</Text><TextInput style={{ backgroundColor: '#171717', borderWidth: 1, borderColor: '#222', borderRadius: 12, padding: 14, color: '#FFF', fontSize: 14 }} value={(form as any)[key]} onChangeText={fi(key)} placeholder={ph} placeholderTextColor="#4B5563" /></View>
                ))}
                <Pressable onPress={save} disabled={saving} style={{ paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', opacity: saving ? 0.6 : 1 }}>
                    {saving ? <ActivityIndicator color="#000" size="small" /> : <Text style={{ color: '#000', fontWeight: '800', fontSize: 15 }}>Save Changes</Text>}
                </Pressable>
            </View>
            <View style={{ backgroundColor: '#0F0F0F', borderRadius: 14, borderWidth: 1, borderColor: '#1A1A1A', padding: 16 }}>
                <Text style={{ color: '#6B7280', fontSize: 12, marginBottom: 4 }}>Email</Text>
                <Text style={{ color: '#9CA3AF', fontSize: 14 }}>{profile?.email || '—'}</Text>
                <Text style={{ color: '#374151', fontSize: 11, fontStyle: 'italic', marginTop: 4 }}>To change your email, contact our support team.</Text>
            </View>
            <Pressable onPress={() => Alert.alert('Log Out', 'Are you sure?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Log Out', style: 'destructive', onPress: signOut }])}
                style={{ paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.06)', alignItems: 'center' }}>
                <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 15 }}>Log Out</Text>
            </Pressable>
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
