import { COLORS } from '@/src/constants/theme';
import { ActDetailData, useAct } from '@/src/hooks/useAct';
import { ResizeMode, Video } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, Clock, FileText, Info, MapPin, MessageSquare, Package, Star, Video as VideoIcon } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
    const { act, loading, error } = useAct(id);
    const [activeTab, setActiveTab] = useState('biography');

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
        image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819',
        video_url: '',
        photos_url: [],
        videos_url: [],
        packages: [],
        technical_specs: 'Standard performance requirements.',
        technical_rider_url: '',
        is_verified: true,
        is_pro: false,
        avatar_url: '',
        banner_url: '',
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

    // Derive the best cover image: banner_url > image_url > first photo > placeholder
    const coverImageUrl = displayAct.banner_url
        || displayAct.image_url
        || photos[0]
        || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000&auto=format&fit=crop';
    const avatarUrl = displayAct.avatar_url
        || displayAct.image_url
        || photos[0]
        || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200';

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
            pathname: `/booking/${id}`,
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
            {/* ... cover image block ... */}
            <View style={styles.coverImageContainer}>
                {displayAct.video_url && !mainYtId ? (
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
                        source={{ uri: coverImageUrl }}
                        style={styles.coverImage}
                    />
                )}
                <View style={[styles.coverOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />

                {/* Back Button */}
                <Pressable
                    style={styles.backButtonAbsolute}
                    onPress={handleGoBack}
                >
                    <ArrowLeft color="#fff" size={24} />
                </Pressable>
            </View>

            {/* Profile Info Overlay */}
            <View style={styles.headerContent}>
                <View style={styles.avatarContainer}>
                    <Image
                        source={{ uri: avatarUrl }}
                        style={styles.avatar}
                    />
                    {displayAct.is_verified && (
                        <View style={styles.verifiedBadge}>
                            <CheckCircle2 color={COLORS.background} size={14} />
                        </View>
                    )}
                </View>

                <View style={styles.headerInfo}>
                    <View style={styles.nameRow}>
                        <Text style={styles.artistNameHeader}>{displayAct.artistName}</Text>
                    </View>
                    <View style={styles.taglineRow}>
                        <Text style={styles.categoryTag}>{displayAct.category}</Text>
                        <View style={styles.dot} />
                        <MapPin color={COLORS.primary} size={12} style={{ marginRight: 4 }} />
                        <Text style={styles.locationTag}>{displayAct.location}</Text>
                    </View>
                </View>

                <View style={styles.ctaRow}>
                    <Pressable style={styles.checkAvailabilityBtn} onPress={() => handleBookPackage(null)}>
                        <Text style={styles.checkAvailabilityBtnText}>Check Availability</Text>
                    </Pressable>
                    <Pressable style={styles.bookNowSecondaryBtn} onPress={() => handleBookPackage(displayAct.packages?.[0] || null)}>
                        <Text style={styles.bookNowSecondaryBtnText}>Book Now</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );

    const renderTabs = () => (
        <View style={styles.tabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScrollContent}>
                {TABS.map((tab) => (
                    <Pressable
                        key={tab.id}
                        onPress={() => setActiveTab(tab.id)}
                        style={[styles.tabItem, activeTab === tab.id && styles.activeTabItem]}
                    >
                        <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
                            {tab.label}
                        </Text>
                        {activeTab === tab.id && <View style={styles.tabIndicator} />}
                    </Pressable>
                ))}
            </ScrollView>
        </View>
    );

    const renderBiography = () => (
        <View style={styles.tabContent}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>About {displayAct.artistName}</Text>
                <Text style={styles.bioText}>
                    {displayAct.description || "This artist hasn't provided a biography yet."}
                </Text>
            </View>

            {/* Talent Card */}
            <View style={styles.talentCard}>
                <Text style={styles.talentCardTitle}>Talent Details</Text>
                <View style={styles.detailsGrid}>
                    <DetailItem label="Art Type" value={displayAct.category} />
                    <DetailItem label="Specialty" value={displayAct.genre || displayAct.artist_type || 'Performer'} />
                    <DetailItem label="Experience" value={`${displayAct.experience_years || 5}+ Years`} />
                    <DetailItem label="Base" value={displayAct.location_base || displayAct.location || 'Dubai, UAE'} />
                </View>
            </View>
        </View>
    );

    const renderMedia = () => (
        <View style={styles.tabContent}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Gallery</Text>
                {photos.length === 0 && videos.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyText}>No photos or videos uploaded yet.</Text>
                    </View>
                ) : (
                    <View style={styles.mediaGrid}>
                        {videos.map((vid, i) => (
                            <Pressable key={`vid-${i}`} style={styles.mediaItem} onPress={() => Linking.openURL(vid)}>
                                <Image source={{ uri: `https://img.youtube.com/vi/${getYouTubeID(vid)}/maxresdefault.jpg` }} style={styles.mediaImage} />
                                <View style={styles.playOverlay}>
                                    <VideoIcon color="#fff" size={24} />
                                </View>
                            </Pressable>
                        ))}
                        {photos.map((photo, i) => (
                            <View key={`photo-${i}`} style={styles.mediaItem}>
                                <Image source={{ uri: photo }} style={styles.mediaImage} />
                            </View>
                        ))}
                    </View>
                )}
            </View>
        </View>
    );

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
                                <Text style={styles.bookNowBtnText}>Select & Book</Text>
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
            <ScrollView stickyHeaderIndices={[1]} showsVerticalScrollIndicator={false}>
                {renderHeader()}
                {renderTabs()}
                <View style={styles.mainContent}>
                    {activeTab === 'biography' && renderBiography()}
                    {activeTab === 'media' && renderMedia()}
                    {activeTab === 'requirements' && renderRequirements()}
                    {activeTab === 'packages' && renderPackages()}
                    {activeTab === 'reviews' && renderReviews()}
                </View>
            </ScrollView>
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
    tabsContainer: {
        backgroundColor: COLORS.background,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
        paddingVertical: 10,
    },
    tabsScrollContent: {
        paddingHorizontal: 20,
        gap: 25,
    },
    tabItem: {
        paddingVertical: 8,
        position: 'relative',
    },
    activeTabItem: {
    },
    tabText: {
        color: COLORS.textDim,
        fontSize: 15,
        fontWeight: '600',
    },
    activeTabText: {
        color: COLORS.primary,
    },
    tabIndicator: {
        position: 'absolute',
        bottom: -10,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: COLORS.primary,
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
});
