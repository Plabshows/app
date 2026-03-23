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
    Pressable, ScrollView, TextInput,
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
        return <ClientProfileScreen profile={profile} router={router} signOut={signOut} />;
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

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT PROFILE SCREEN — fully tab-based, no sidebar, no external dashboard
// Tabs: Overview | My Event | Favorites | Requests | Messages | Settings
// ─────────────────────────────────────────────────────────────────────────────
const CLIENT_TABS = ['Overview', 'My Event', 'Favorites', 'Requests', 'Messages', 'Settings'] as const;
type ClientTab = typeof CLIENT_TABS[number];

function ClientProfileScreen({ profile, router, signOut }: { profile: any; router: any; signOut: () => Promise<void> }) {
    const [tab, setTab] = React.useState<ClientTab>('Overview');
    const { refreshAuth } = useAuth();

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
                                style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: tab === t ? COLORS.primary : '#0F0F0F', borderWidth: 1, borderColor: tab === t ? COLORS.primary : '#1A1A1A', marginBottom: 16 }}>
                                <Text style={{ color: tab === t ? '#000' : '#6B7280', fontSize: 13, fontWeight: tab === t ? '800' : '500' }}>{t}</Text>
                            </Pressable>
                        ))}
                    </View>
                </ScrollView>
            </View>

            {/* Tab content */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingTop: 8, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
                {tab === 'Overview' && <ClientOverviewTab profile={profile} router={router} setTab={setTab} />}
                {tab === 'My Event' && <ClientMyEventTab profile={profile} />}
                {tab === 'Favorites' && <ClientFavoritesTab profile={profile} router={router} refreshAuth={refreshAuth} />}
                {tab === 'Requests' && <ClientRequestsTab profile={profile} router={router} />}
                {tab === 'Messages' && <ClientMessagesTab profile={profile} />}
                {tab === 'Settings' && <ClientSettingsTab profile={profile} signOut={signOut} refreshAuth={refreshAuth} />}
            </ScrollView>
        </View>
    );
}

// ── OVERVIEW TAB ─────────────────────────────────────────────────────────────
function ClientOverviewTab({ profile, router, setTab }: { profile: any; router: any; setTab: (t: any) => void }) {
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
                {[{ label: 'Favorites', value: `${favCount}`, emoji: '♥', tab: 'Favorites' },
                  { label: 'Requests', value: `${requests.length}`, emoji: '📨', tab: 'Requests' },
                  { label: 'Event', value: event?.status || 'None', emoji: '📋', tab: 'My Event' }].map(s => (
                    <Pressable key={s.label} onPress={() => setTab(s.tab)} style={{ flex: 1, backgroundColor: '#0F0F0F', borderRadius: 16, borderWidth: 1, borderColor: '#1A1A1A', padding: 14 }}>
                        <Text style={{ fontSize: 18, marginBottom: 6 }}>{s.emoji}</Text>
                        <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800', marginBottom: 2 }}>{s.value}</Text>
                        <Text style={{ color: '#6B7280', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' }}>{s.label}</Text>
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
                    : <Pressable onPress={() => setTab('My Event')} style={{ backgroundColor: '#0F0F0F', borderRadius: 14, borderWidth: 1, borderColor: '#1A1A1A', padding: 16, alignItems: 'center' }}>
                        <Text style={{ color: '#6B7280', fontSize: 14, marginBottom: 6 }}>No event yet</Text>
                        <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '700' }}>+ Create Event Brief</Text>
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

            {/* Explore */}
            <Pressable onPress={() => router.replace('/(tabs)' as any)} style={{ backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, alignItems: 'center' }}>
                <Text style={{ color: '#000', fontWeight: '800', fontSize: 15 }}>🎤  Explore Artists</Text>
            </Pressable>
        </View>
    );
}

// ── MY EVENT TAB ─────────────────────────────────────────────────────────────
const EVENT_TYPES_C = ['Private Party', 'Corporate Event', 'Wedding', 'Festival', 'Brand Activation', 'Gala', 'Birthday', 'Other'];
const BUDGET_RANGES_C = ['Under €5k', '€5k–€15k', '€15k–€30k', '€30k–€50k', '€50k+'];
function ClientMyEventTab({ profile }: { profile: any }) {
    const [event, setEvent] = React.useState<any>(null);
    const [editing, setEditing] = React.useState(false);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [form, setForm] = React.useState({ title: '', event_type: '', location: '', event_date: '', guest_count: '', budget_range: '', notes: '', status: 'draft' });
    const load = React.useCallback(async () => {
        const { data } = await supabase.from('client_events').select('*').eq('client_id', profile.id).maybeSingle();
        setEvent(data);
        if (data) setForm({ title: data.title||'', event_type: data.event_type||'', location: data.location||'', event_date: data.event_date||'', guest_count: data.guest_count?.toString()||'', budget_range: data.budget_range||'', notes: data.notes||'', status: data.status||'draft' });
        setLoading(false);
    }, [profile.id]);
    React.useEffect(() => { load(); }, [load]);
    const save = async () => {
        if (!form.title.trim()) { Alert.alert('Required', 'Add an event title.'); return; }
        setSaving(true);
        const payload = { client_id: profile.id, title: form.title, event_type: form.event_type, location: form.location, event_date: form.event_date||null, guest_count: form.guest_count ? parseInt(form.guest_count) : null, budget_range: form.budget_range, notes: form.notes, status: form.status, updated_at: new Date().toISOString() };
        const { error } = event ? await supabase.from('client_events').update(payload).eq('id', event.id) : await supabase.from('client_events').insert(payload);
        if (!error) { setEditing(false); load(); Alert.alert('Saved ✓', 'Your event brief has been saved.'); }
        else Alert.alert('Error', error.message);
        setSaving(false);
    };
    const fi = (k: string) => (v: string) => setForm((f: any) => ({ ...f, [k]: v }));
    if (loading) return <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />;
    return (
        <View style={{ gap: 16 }}>
            {event && !editing ? (
                <View style={{ backgroundColor: '#0F0F0F', borderRadius: 18, borderWidth: 1, borderColor: '#1A1A1A', padding: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
                        <View><Text style={{ color: '#FFF', fontWeight: '800', fontSize: 18, marginBottom: 4 }}>{event.title}</Text>{event.event_type && <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600' }}>{event.event_type}</Text>}</View>
                        <View style={{ paddingHorizontal: 10, paddingVertical: 4, height: 28, borderRadius: 20, backgroundColor: (event.status === 'ready' ? '#10B981' : '#F59E0B') + '22', borderWidth: 1, borderColor: (event.status === 'ready' ? '#10B981' : '#F59E0B') + '44' }}><Text style={{ color: event.status === 'ready' ? '#10B981' : '#F59E0B', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>{event.status}</Text></View>
                    </View>
                    {[['📍', event.location], ['📅', event.event_date], ['👥', event.guest_count ? `${event.guest_count} guests` : null], ['💰', event.budget_range]].filter(([,v]) => v).map(([icon, val]) => (
                        <Text key={String(val)} style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 6 }}>{icon}  {val}</Text>
                    ))}
                    {event.notes && <Text style={{ color: '#6B7280', fontSize: 13, fontStyle: 'italic', marginTop: 8, lineHeight: 20 }}>"{event.notes}"</Text>}
                    <Pressable onPress={() => setEditing(true)} style={{ marginTop: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(204,255,0,0.3)', backgroundColor: 'rgba(204,255,0,0.05)', alignItems: 'center' }}>
                        <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Edit Event</Text>
                    </Pressable>
                </View>
            ) : !editing ? (
                <Pressable onPress={() => setEditing(true)} style={{ backgroundColor: '#0F0F0F', borderRadius: 18, borderWidth: 1, borderColor: '#1A1A1A', padding: 40, alignItems: 'center' }}>
                    <Text style={{ fontSize: 40, marginBottom: 14 }}>📋</Text>
                    <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 16, marginBottom: 6 }}>No event yet</Text>
                    <Text style={{ color: COLORS.primary, fontWeight: '700' }}>+ Create Event Brief</Text>
                </Pressable>
            ) : (
                <View style={{ backgroundColor: '#0F0F0F', borderRadius: 18, borderWidth: 1, borderColor: '#1A1A1A', padding: 20, gap: 16 }}>
                    {[['Event Title *', 'title', 'e.g. Summer Gala 2025'], ['Location', 'location', 'Ibiza, Dubai, Mykonos...'], ['Date', 'event_date', 'YYYY-MM-DD'], ['Guest Count', 'guest_count', '200']].map(([label, key, placeholder]) => (
                        <View key={key}>
                            <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>{label}</Text>
                            <TextInput style={{ backgroundColor: '#171717', borderWidth: 1, borderColor: '#222', borderRadius: 12, padding: 14, color: '#FFF', fontSize: 15 }} value={(form as any)[key]} onChangeText={fi(key)} placeholder={placeholder} placeholderTextColor="#4B5563" keyboardType={key === 'guest_count' ? 'numeric' : 'default'} />
                        </View>
                    ))}
                    <View><Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginBottom: 8 }}>Event Type</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{EVENT_TYPES_C.map(t => <Pressable key={t} onPress={() => fi('event_type')(t)} style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: form.event_type===t ? COLORS.primary : '#2A2A2A', backgroundColor: form.event_type===t ? 'rgba(204,255,0,0.1)' : '#171717' }}><Text style={{ color: form.event_type===t ? COLORS.primary : '#6B7280', fontSize: 12, fontWeight: form.event_type===t ? '700' : '500' }}>{t}</Text></Pressable>)}</View></View>
                    <View><Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginBottom: 8 }}>Budget</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{BUDGET_RANGES_C.map(b => <Pressable key={b} onPress={() => fi('budget_range')(b)} style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: form.budget_range===b ? COLORS.primary : '#2A2A2A', backgroundColor: form.budget_range===b ? 'rgba(204,255,0,0.1)' : '#171717' }}><Text style={{ color: form.budget_range===b ? COLORS.primary : '#6B7280', fontSize: 12, fontWeight: form.budget_range===b ? '700' : '500' }}>{b}</Text></Pressable>)}</View></View>
                    <View><Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Notes / Creative Brief</Text><TextInput style={{ backgroundColor: '#171717', borderWidth: 1, borderColor: '#222', borderRadius: 12, padding: 14, color: '#FFF', fontSize: 14, height: 100, textAlignVertical: 'top' }} value={form.notes} onChangeText={fi('notes')} placeholder="Describe the vibe, theme..." placeholderTextColor="#4B5563" multiline /></View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        {event && <Pressable onPress={() => setEditing(false)} style={{ flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#222', alignItems: 'center' }}><Text style={{ color: '#6B7280', fontWeight: '600' }}>Cancel</Text></Pressable>}
                        <Pressable onPress={save} disabled={saving} style={{ flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, opacity: saving ? 0.6 : 1 }}>{saving ? <ActivityIndicator color="#000" size="small" /> : <Text style={{ color: '#000', fontWeight: '800', fontSize: 15 }}>Save Event</Text>}</Pressable>
                    </View>
                </View>
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
        if (!ids.length) { setLoading(false); return; }
        supabase.from('acts').select('id,name,category,image_url,location_base,price_guide,fee').in('id', ids)
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
    const parseFee = (fee: any): number => {
        if (!fee) return 0;
        const n = parseFloat(String(fee).replace(/[^0-9.]/g, ''));
        return isNaN(n) ? 0 : n;
    };
    const subtotal = selectedActs.reduce((sum, a) => sum + parseFee(a.fee), 0);
    const platformFee = subtotal * 0.2;
    const total = subtotal + platformFee;
    const fmt = (n: number) => n > 0 ? `€${n.toLocaleString('en-EU', { minimumFractionDigits: 0 })}` : '—';

    // ── submit booking ────────────────────────────────────────────────────────
    const submitBookings = async () => {
        if (!eventDate) { Alert.alert('Required', 'Please enter the event date.'); return; }
        if (!location.trim()) { Alert.alert('Required', 'Please enter the event location.'); return; }
        if (selectedActs.length === 0) return;
        setSubmitting(true);
        try {
            const rows = selectedActs.map(act => ({
                client_id: profile.id,
                act_id: act.id,
                event_dates: [eventDate],
                start_time: eventTime || null,
                location_text: location,
                event_type: partyType || null,
                notes: notes || null,
                status: 'pending',
                platform_fee_pct: 20,
                artist_fee: parseFee(act.fee) || null,
                total_amount: parseFee(act.fee) > 0 ? parseFee(act.fee) * 1.2 : null,
            }));
            const { error } = await supabase.from('booking_requests').insert(rows);
            if (error) throw error;
            // success: reset
            setSuccessIds(selectedActs.map(a => a.id));
            setSelected(new Set());
            setShowCheckout(false);
            setEventDate(''); setEventTime(''); setLocation(''); setPartyType(''); setNotes('');
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not send request.');
        } finally {
            setSubmitting(false);
        }
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
            {selected.size > 0 && !showCheckout && (
                <Pressable onPress={() => setShowCheckout(true)} style={{ backgroundColor: COLORS.primary, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 4 }}>
                    <Text style={{ color: '#000', fontWeight: '900', fontSize: 16 }}>
                        🎤  Request Booking · {selected.size} artist{selected.size > 1 ? 's' : ''}
                    </Text>
                </Pressable>
            )}

            {/* ── INLINE CHECKOUT PANEL ─────────────────────────────────────── */}
            {showCheckout && (
                <View style={{ backgroundColor: '#0A0A0A', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(204,255,0,0.25)', padding: 20, gap: 16, marginTop: 4 }}>
                    {/* Header */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 18 }}>Booking Request</Text>
                        <Pressable onPress={() => setShowCheckout(false)} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: '#6B7280', fontSize: 16 }}>✕</Text>
                        </Pressable>
                    </View>

                    {/* Selected artists summary */}
                    <View style={{ backgroundColor: '#111', borderRadius: 14, padding: 14, gap: 8 }}>
                        <Text style={{ color: '#4B5563', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Artists selected</Text>
                        {selectedActs.map(a => (
                            <View key={a.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ color: '#E5E7EB', fontSize: 14, fontWeight: '600' }}>{a.name}</Text>
                                <Text style={{ color: '#9CA3AF', fontSize: 13 }}>{a.fee ? fmt(parseFee(a.fee)) : a.price_guide || '—'}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Event details */}
                    <Text style={{ color: '#4B5563', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>Event Details</Text>

                    {/* Date */}
                    <View>
                        <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Event Date *</Text>
                        <TextInput
                            style={{ backgroundColor: '#171717', borderWidth: 1, borderColor: '#222', borderRadius: 12, padding: 14, color: '#FFF', fontSize: 15 }}
                            value={eventDate}
                            onChangeText={setEventDate}
                            placeholder="YYYY-MM-DD  (e.g. 2025-08-15)"
                            placeholderTextColor="#4B5563"
                        />
                    </View>

                    {/* Time */}
                    <View>
                        <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Start Time</Text>
                        <TextInput
                            style={{ backgroundColor: '#171717', borderWidth: 1, borderColor: '#222', borderRadius: 12, padding: 14, color: '#FFF', fontSize: 15 }}
                            value={eventTime}
                            onChangeText={setEventTime}
                            placeholder="e.g. 22:00"
                            placeholderTextColor="#4B5563"
                        />
                    </View>

                    {/* Location */}
                    <View>
                        <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Location *</Text>
                        <TextInput
                            style={{ backgroundColor: '#171717', borderWidth: 1, borderColor: '#222', borderRadius: 12, padding: 14, color: '#FFF', fontSize: 15 }}
                            value={location}
                            onChangeText={setLocation}
                            placeholder="Ibiza, Dubai, Mykonos..."
                            placeholderTextColor="#4B5563"
                        />
                    </View>

                    {/* Party type */}
                    <View>
                        <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginBottom: 8 }}>Event Type</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {PARTY_TYPES.map(t => (
                                <Pressable key={t} onPress={() => setPartyType(t === partyType ? '' : t)} style={{ paddingVertical: 7, paddingHorizontal: 13, borderRadius: 20, borderWidth: 1, borderColor: partyType === t ? COLORS.primary : '#2A2A2A', backgroundColor: partyType === t ? 'rgba(204,255,0,0.1)' : '#171717' }}>
                                    <Text style={{ color: partyType === t ? COLORS.primary : '#6B7280', fontSize: 12, fontWeight: partyType === t ? '700' : '500' }}>{t}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    {/* Notes */}
                    <View>
                        <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Additional Notes</Text>
                        <TextInput
                            style={{ backgroundColor: '#171717', borderWidth: 1, borderColor: '#222', borderRadius: 12, padding: 14, color: '#FFF', fontSize: 14, height: 90, textAlignVertical: 'top' }}
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Set, duration, special requests..."
                            placeholderTextColor="#4B5563"
                            multiline
                        />
                    </View>

                    {/* ── Price breakdown ──────────────────────────────────── */}
                    {subtotal > 0 && (
                        <View style={{ backgroundColor: '#111', borderRadius: 16, padding: 16, gap: 10 }}>
                            <Text style={{ color: '#4B5563', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Price Breakdown</Text>
                            {selectedActs.map(a => parseFee(a.fee) > 0 && (
                                <View key={a.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ color: '#9CA3AF', fontSize: 13 }}>{a.name}</Text>
                                    <Text style={{ color: '#9CA3AF', fontSize: 13 }}>{fmt(parseFee(a.fee))}</Text>
                                </View>
                            ))}
                            <View style={{ height: 1, backgroundColor: '#1A1A1A', marginVertical: 4 }} />
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ color: '#6B7280', fontSize: 13 }}>Artist subtotal</Text>
                                <Text style={{ color: '#6B7280', fontSize: 13 }}>{fmt(subtotal)}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ color: '#6B7280', fontSize: 13 }}>Platform fee (20%)</Text>
                                <Text style={{ color: '#6B7280', fontSize: 13 }}>{fmt(platformFee)}</Text>
                            </View>
                            <View style={{ height: 1, backgroundColor: '#1A1A1A', marginVertical: 2 }} />
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>Total</Text>
                                <Text style={{ color: COLORS.primary, fontSize: 15, fontWeight: '900' }}>{fmt(total)}</Text>
                            </View>
                            <Text style={{ color: '#374151', fontSize: 11, fontStyle: 'italic' }}>No payment today — this is a request. We'll confirm and invoice you.</Text>
                        </View>
                    )}

                    {/* Submit buttons */}
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <Pressable onPress={() => setShowCheckout(false)} style={{ flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: '#222', alignItems: 'center' }}>
                            <Text style={{ color: '#6B7280', fontWeight: '600' }}>Cancel</Text>
                        </Pressable>
                        <Pressable onPress={submitBookings} disabled={submitting} style={{ flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, opacity: submitting ? 0.6 : 1 }}>
                            {submitting ? <ActivityIndicator color="#000" size="small" /> : <Text style={{ color: '#000', fontWeight: '900', fontSize: 15 }}>Confirm Request</Text>}
                        </Pressable>
                    </View>
                </View>
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
                        <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 8 }}>📅 {r.event_dates?.[0] ? new Date(r.event_dates[0]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}  ·  Sent {new Date(r.created_at).toLocaleDateString('en-GB')}</Text>
                        {isOpen && (
                            <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#1A1A1A', gap: 6 }}>
                                {r.location_text && <Text style={{ color: '#9CA3AF', fontSize: 13 }}>📍 {r.location_text}</Text>}
                                {r.event_type && <Text style={{ color: '#9CA3AF', fontSize: 13 }}>🎉 {r.event_type}</Text>}
                                {r.guests_count && <Text style={{ color: '#9CA3AF', fontSize: 13 }}>👥 {r.guests_count} guests</Text>}
                                {r.budget_amount && <Text style={{ color: '#9CA3AF', fontSize: 13 }}>💰 {r.budget_currency} {r.budget_amount}</Text>}
                                {r.notes && <Text style={{ color: '#6B7280', fontSize: 13, fontStyle: 'italic', lineHeight: 20, marginTop: 4 }}>"{r.notes}"</Text>}
                                <Pressable onPress={() => router.push(`/act/${r.act_id}` as any)} style={{ marginTop: 8, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#222', alignItems: 'center' }}>
                                    <Text style={{ color: '#9CA3AF', fontSize: 13, fontWeight: '600' }}>View Artist Profile</Text>
                                </Pressable>
                            </View>
                        )}
                    </Pressable>
                );
            })}
        </View>
    );
}

// ── MESSAGES TAB ─────────────────────────────────────────────────────────────
function ClientMessagesTab({ profile }: { profile: any }) {
    const { user } = useAuth();
    const [subject, setSubject] = React.useState('');
    const [message, setMessage] = React.useState('');
    const [sending, setSending] = React.useState(false);
    const [history, setHistory] = React.useState<any[]>([]);
    const [sent, setSent] = React.useState(false);
    const loadHistory = React.useCallback(async () => {
        if (!user?.id) return;
        const { data: conv } = await supabase.from('conversations').select('id').eq('user_id', user.id).eq('type', 'support').maybeSingle();
        if (conv) { const { data: msgs } = await supabase.from('messages').select('*').eq('conversation_id', conv.id).order('created_at', { ascending: false }).limit(20); setHistory(msgs || []); }
    }, [user?.id]);
    React.useEffect(() => { loadHistory(); }, [loadHistory]);
    const send = async () => {
        if (!message.trim()) { Alert.alert('Error', 'Please write a message.'); return; }
        setSending(true);
        try {
            let convId: string;
            const { data: ex } = await supabase.from('conversations').select('id').eq('user_id', user!.id).eq('type', 'support').maybeSingle();
            if (ex) { convId = ex.id; } else { const { data: nc, error } = await supabase.from('conversations').insert({ user_id: user!.id, type: 'support', metadata: {} }).select('id').single(); if (error) throw error; convId = nc.id; }
            const { error } = await supabase.from('messages').insert({ conversation_id: convId, sender_id: user!.id, content: subject ? `**${subject}**\n\n${message}` : message });
            if (error) throw error;
            setSent(true); setSubject(''); setMessage(''); loadHistory();
        } catch (e: any) { Alert.alert('Error', e.message); } finally { setSending(false); }
    };
    return (
        <View style={{ gap: 16 }}>
            <View style={{ backgroundColor: 'rgba(204,255,0,0.05)', borderWidth: 1, borderColor: 'rgba(204,255,0,0.2)', borderRadius: 14, padding: 16, flexDirection: 'row', gap: 12 }}>
                <Text style={{ fontSize: 20 }}>💬</Text>
                <Text style={{ color: '#9CA3AF', fontSize: 13, lineHeight: 20, flex: 1 }}>Send us a message and our concierge team will assist you personally.</Text>
            </View>
            <View style={{ backgroundColor: '#0F0F0F', borderRadius: 18, borderWidth: 1, borderColor: '#1A1A1A', padding: 20, gap: 14 }}>
                {sent && <View style={{ backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' }}><Text style={{ color: '#10B981', fontWeight: '600' }}>✓ Message sent! We'll reply soon.</Text></View>}
                <View><Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Subject (optional)</Text><TextInput style={{ backgroundColor: '#171717', borderWidth: 1, borderColor: '#222', borderRadius: 12, padding: 14, color: '#FFF', fontSize: 14 }} value={subject} onChangeText={setSubject} placeholder="e.g. Artist inquiry for my event" placeholderTextColor="#4B5563" /></View>
                <View><Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Message</Text><TextInput style={{ backgroundColor: '#171717', borderWidth: 1, borderColor: '#222', borderRadius: 12, padding: 14, color: '#FFF', fontSize: 14, height: 120, textAlignVertical: 'top' }} value={message} onChangeText={setMessage} placeholder="Tell us how we can help..." placeholderTextColor="#4B5563" multiline /></View>
                <Pressable onPress={send} disabled={sending} style={{ paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', opacity: sending ? 0.6 : 1 }}>
                    {sending ? <ActivityIndicator color="#000" size="small" /> : <Text style={{ color: '#000', fontWeight: '800', fontSize: 15 }}>Send Message</Text>}
                </Pressable>
            </View>
            {history.length > 0 && (
                <View>
                    <Text style={{ color: '#4B5563', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Previous Messages</Text>
                    {history.map(m => (
                        <View key={m.id} style={{ backgroundColor: '#0F0F0F', borderRadius: 12, borderWidth: 1, borderColor: '#1A1A1A', padding: 14, marginBottom: 8 }}>
                            <Text style={{ color: '#6B7280', fontSize: 11, marginBottom: 6 }}>{new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                            <Text style={{ color: '#9CA3AF', fontSize: 13, lineHeight: 20 }} numberOfLines={3}>{m.content}</Text>
                        </View>
                    ))}
                </View>
            )}
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
