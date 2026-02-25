import { COLORS } from '@/src/constants/theme';
import { useAuth } from '@/src/context/AuthContext';
import { ActDetailData, useAct } from '@/src/hooks/useAct';
import { supabase } from '@/src/lib/supabase';
import { ResizeMode, Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, Clock, FileText, Info, MapPin, MessageSquare, Package, Plus, Save, ShieldCheck, Star, Video as VideoIcon, Zap } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

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
    const { user, profile } = useAuth();
    const { act, loading, error, refetch } = useAct(id);

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editedData, setEditedData] = useState<any>(null);

    // Permissions check — broad check to catch all superadmin variants
    const isSuperAdmin =
        profile?.role === 'admin' ||
        profile?.role === 'superadmin' ||
        (profile as any)?.is_admin === true ||
        user?.app_metadata?.role === 'superadmin' ||
        user?.app_metadata?.role === 'admin';
    const isOwner = user?.id === act?.id; // profiles are self-owned (id = user id)
    const canEdit = isSuperAdmin || isOwner;

    const [activeSection, setActiveSection] = useState('biography');

    useEffect(() => {
        if (act && !editedData) {
            setEditedData({
                name: act.name,
                description: act.description,
                location: act.location,
                category: act.category,
                price_guide: act.price_guide,
                video_url: act.video_url,
                artistName: act.artistName,
                avatar_url: act.avatar_url,
                banner_url: act.banner_url
            });
        }
    }, [act]);

    const handleSave = async () => {
        if (!act || !editedData) return;
        try {
            setIsSaving(true);

            // GOD-MODE API CALL
            const response = await fetch('/api/admin/update-act', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profileId: act.id,
                    profileData: {
                        name: editedData.artistName,
                        description: editedData.description,
                        city: editedData.location,
                        category_id: act.category_id,
                        genre: editedData.genre,
                        artist_type: editedData.artist_type,
                        price_guide: editedData.price_guide,
                        video_url: editedData.video_url,
                        avatar_url: editedData.avatar_url,
                        banner_url: editedData.banner_url
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update profile via API.');
            }

            Alert.alert('Success', '¡Perfil actualizado correctamente!');
            setIsEditing(false);
            setEditedData(null); // reset so it re-initializes from fresh data
            refetch(); // Refresh data
            if (Platform.OS === 'web') {
                // On web, force a full refresh to reflect saved changes
                (window as any).location.reload();
            }
        } catch (error: any) {
            console.error('Error saving profile:', error);
            Alert.alert('Error', error.message || 'Could not save changes.');
        } finally {
            setIsSaving(false);
        }
    };

    const pickImage = async (field: 'avatar_url' | 'banner_url') => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: field === 'avatar_url' ? [1, 1] : [16, 9],
                quality: 0.7,
            });

            if (!result.canceled && result.assets[0].uri) {
                await uploadImage(result.assets[0].uri, field);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Could not open image library.');
        }
    };

    const uploadImage = async (uri: string, field: 'avatar_url' | 'banner_url') => {
        try {
            setIsSaving(true);
            const response = await fetch(uri);
            const blob = await response.blob();
            const fileExt = uri.split('.').pop();
            const fileName = `${act?.owner_id}/${field}-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('media')
                .upload(filePath, blob, {
                    contentType: `image/${fileExt}`,
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('media')
                .getPublicUrl(filePath);

            setEditedData((prev: any) => ({ ...prev, [field]: publicUrl }));

            // NOTE: Auto-save removed as per God-mode requirements. 
            // The image URL will be saved permanently when the user clicks 'Save Changes'.
            Alert.alert('Image Uploaded', 'New photo uploaded successfully. Remember to click Save Changes to make it permanent.');

        } catch (error: any) {
            console.error('Error uploading image:', error);
            Alert.alert('Upload Failed', error.message);
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
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setIsSaving(true);
                const currentPhotos = [...(act?.photos_url || [])];
                const uploadCount = result.assets.length;
                console.log(`[Gallery] Starting upload of ${uploadCount} photos...`);

                const uploadedUrls: string[] = [];

                for (const asset of result.assets) {
                    const uri = asset.uri;
                    const response = await fetch(uri);
                    const blob = await response.blob();
                    const fileExt = uri.split('.').pop() || 'jpg';
                    const fileName = `${act?.id}/gallery-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                    const filePath = `avatars/${fileName}`;

                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('media')
                        .upload(filePath, blob, {
                            contentType: `image/${fileExt}`,
                            upsert: true
                        });

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                        .from('media')
                        .getPublicUrl(filePath);

                    uploadedUrls.push(publicUrl);
                }

                // Update database: Merge new and old photos
                const finalPhotos = [...currentPhotos, ...uploadedUrls];

                const apiResponse = await fetch('/api/admin/update-act', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        profileId: act?.id,
                        profileData: {
                            gallery_urls: finalPhotos
                        }
                    })
                });

                if (!apiResponse.ok) {
                    const errorData = await apiResponse.json();
                    throw new Error(errorData.error || 'Failed to update gallery via API.');
                }

                Alert.alert('Success', `${uploadCount} photos added to gallery.`);
                refetch();
            }
        } catch (error: any) {
            console.error('Error adding photos:', error);
            Alert.alert('Error', error.message || 'Could not upload photos.');
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

    const getYouTubeID = (url: string) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const videos = useMemo(() => displayAct.videos_url || [], [displayAct]);
    const photos = useMemo(() => displayAct.photos_url || [], [displayAct]);
    const mainYtId = useMemo(() => getYouTubeID(displayAct.video_url || ''), [displayAct]);

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
                        <View style={styles.imageEditOverlay}>
                            <Text style={styles.imageEditLabel}>Change</Text>
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
                            <TextInput
                                style={[styles.editInput, { marginTop: 8 }]}
                                value={editedData?.category}
                                onChangeText={(val) => setEditedData((p: any) => ({ ...p, category: val }))}
                                placeholder="Show Category"
                            />
                        </>
                    ) : (
                        <>
                            <View style={styles.nameRow}>
                                <Text style={styles.artistNameHeader}>{displayAct.artistName}</Text>
                            </View>
                            <View style={styles.taglineRow}>
                                <Text style={styles.categoryTag}>{displayAct.category}</Text>
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
                            <DetailItem label="Art Type" value={displayAct.category} />
                            <DetailItem label="Specialty" value={displayAct.genre || displayAct.artist_type || 'Performer'} />
                            <DetailItem label="Experience" value={`${displayAct.experience_years || 5}+ Years`} />
                            <DetailItem label="Base" value={displayAct.location_base || displayAct.location || 'Dubai, UAE'} />
                        </View>
                    )}
                </View>
            </View>
        </View>
    );

    const renderMedia = () => {
        const hasMedia = photos.length > 0 || videos.length > 0;

        return (
            <View style={styles.tabContent}>
                {/* --- VIDEO SECTION --- */}
                {videos.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>🎥 Videos</Text>
                        {videos.map((vid, i) => {
                            const ytId = getYouTubeID(vid);
                            if (ytId && Platform.OS === 'web') {
                                // Web: Render iframe embed with 16:9 aspect ratio
                                return (
                                    <View key={`vid-${i}`} style={styles.videoEmbedContainer}>
                                        <iframe
                                            src={`https://www.youtube.com/embed/${ytId}`}
                                            style={{
                                                width: '100%',
                                                aspectRatio: '16/9',
                                                border: 'none',
                                                borderRadius: 12,
                                            }}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            title={`Video ${i + 1}`}
                                        />
                                    </View>
                                );
                            }
                            // Native / non-YouTube: Render clickable thumbnail
                            const thumbUrl = ytId
                                ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`
                                : null;
                            return (
                                <Pressable
                                    key={`vid-${i}`}
                                    style={styles.videoThumbCard}
                                    onPress={() => Linking.openURL(vid)}
                                >
                                    {thumbUrl ? (
                                        <Image source={{ uri: thumbUrl }} style={styles.videoThumbImage} />
                                    ) : (
                                        <View style={[styles.videoThumbImage, { backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' }]}>
                                            <VideoIcon color={COLORS.primary} size={32} />
                                        </View>
                                    )}
                                    <View style={styles.playOverlay}>
                                        <View style={styles.playButton}>
                                            <VideoIcon color="#fff" size={28} />
                                        </View>
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>
                )}

                {/* --- PHOTOS SECTION --- */}
                {(photos.length > 0 || isEditing) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📸 Photos</Text>
                        <View style={styles.mediaGrid}>
                            {isEditing && (
                                <Pressable style={styles.addMediaItem} onPress={handleAddPhoto}>
                                    <Plus color={COLORS.primary} size={32} />
                                    <Text style={styles.addMediaText}>Add Photos</Text>
                                </Pressable>
                            )}
                            {photos.map((photo, i) => (
                                <View key={`photo-${i}`} style={styles.mediaItem}>
                                    <Image source={{ uri: photo }} style={styles.mediaImage} />
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* --- EMPTY STATE --- */}
                {!hasMedia && (
                    <View style={styles.section}>
                        <View style={styles.emptyBox}>
                            <Text style={styles.emptyText}>No photos or videos uploaded yet.</Text>
                        </View>
                    </View>
                )}
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

    return (
        <View style={styles.container}>
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

            {/* Save Button Floating */}
            {isEditing && (
                <Pressable
                    style={[styles.saveButtonAbsolute, isSaving && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator color="#000" size="small" />
                    ) : (
                        <>
                            <Save size={20} color="#000" />
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        </>
                    )}
                </Pressable>
            )}
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
    editInput: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        color: '#FFF',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
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
});
