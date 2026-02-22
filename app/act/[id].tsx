import { COLORS } from '@/src/constants/theme';
import { useActs } from '@/src/hooks/useActs';
import { ResizeMode, Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, Clock, MapPin, Share2, Star } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Dimensions, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const { width } = Dimensions.get('window');

// Helper to format videos as string array safely
const getVideosUrl = (act: any): string[] => {
    if (!act.videos_url) return [];
    if (Array.isArray(act.videos_url)) return act.videos_url;
    return [];
};

// Helper to format photos as string array safely
const getPhotosUrl = (act: any): string[] => {
    if (!act.photos_url) return [];
    if (Array.isArray(act.photos_url)) return act.photos_url;
    return [];
};

const getYouTubeID = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

export default function ActDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { acts, loading } = useActs();

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    const act = acts.find(a => a.id === id);

    if (!act) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: 'white' }}>Act not found</Text>
            </View>
        );
    }

    const videos = getVideosUrl(act);
    const photos = getPhotosUrl(act);
    const mainYtId = getYouTubeID(act.video_url || '');

    // Business Logic: 20% Markup
    const MARGIN_MULTIPLIER = 1.20;

    const handleBookPackage = (pkg: any) => {
        const finalPrice = Math.round(parseInt(pkg.price, 10) * MARGIN_MULTIPLIER);
        console.log(`[BOOKING INITIATED] Package ID/Name: ${pkg.name} | Final Price for Client: ${finalPrice} AED`);

        // Pass info to modal or checkout
        router.push({
            pathname: '/modal',
            params: {
                actId: act.id,
                actTitle: act.name || act.title,
                packageSelected: pkg.name,
                finalPrice: finalPrice
            }
        });
    };

    return (
        <ScrollView style={styles.container} bounces={false}>
            {/* HER0 - PREMIUM DESIGN */}
            <View style={styles.hero}>
                {act.video_url && !mainYtId ? (
                    <Video
                        source={{ uri: act.video_url }}
                        style={styles.heroBackground}
                        resizeMode={ResizeMode.COVER}
                        isLooping
                        shouldPlay
                        isMuted
                    />
                ) : (
                    <Image
                        source={{ uri: mainYtId ? `https://img.youtube.com/vi/${mainYtId}/maxresdefault.jpg` : (act.image_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819') }}
                        style={styles.heroBackground}
                    />
                )}

                <LinearGradient
                    colors={['rgba(0,0,0,0.6)', 'transparent', COLORS.background]}
                    locations={[0, 0.5, 1]}
                    style={styles.gradient}
                />

                {/* Header Actions */}
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.iconButton}>
                        <ArrowLeft color="#fff" size={24} />
                    </Pressable>
                    <Pressable style={styles.iconButton}>
                        <Share2 color="#fff" size={24} />
                    </Pressable>
                </View>

                {/* Hero Info */}
                <View style={styles.heroInfo}>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{act.category || 'Artist'}</Text>
                    </View>
                    <Text style={styles.title}>{act.name || act.title}</Text>

                    <View style={styles.locationRow}>
                        <MapPin color={COLORS.textDim} size={16} />
                        <Text style={styles.locationText}>{act.location || 'Dubai, UAE'}</Text>
                        <View style={styles.dot} />
                        <Star color={"#FFD700"} size={16} fill={"#FFD700"} />
                        <Text style={styles.ratingText}>5.0 (24 reviews)</Text>
                    </View>
                </View>
            </View>

            {/* CONTENT */}
            <View style={styles.content}>

                {/* About */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About</Text>
                    <Text style={styles.description}>
                        {act.description || "Incredible performance tailored for premium events. Delivering unforgettable experiences with top-tier professionalism."}
                    </Text>
                </View>

                {/* Multimedia Gallery */}
                {(photos.length > 0 || videos.length > 0) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Gallery</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
                            {videos.map((vid, idx) => {
                                const ytId = getYouTubeID(vid);
                                return (
                                    <Pressable
                                        key={`vid-${idx}`}
                                        style={styles.galleryImageContainer}
                                        onPress={() => Linking.openURL(vid)}
                                    >
                                        {ytId ? (
                                            <Image
                                                source={{ uri: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` }}
                                                style={styles.galleryImage}
                                            />
                                        ) : (
                                            <Video
                                                source={{ uri: vid }}
                                                style={styles.galleryImage}
                                                resizeMode={ResizeMode.COVER}
                                                useNativeControls={false}
                                                shouldPlay
                                                isLooping
                                                isMuted
                                            />
                                        )}
                                        <View style={styles.playOverlay}>
                                            <View style={styles.playBtn}>
                                                <Text style={styles.playBtnText}>▶ PLAY VIDEO</Text>
                                            </View>
                                        </View>
                                    </Pressable>
                                );
                            })}
                            {photos.map((photo, idx) => (
                                <View key={`photo-${idx}`} style={styles.galleryImageContainer}>
                                    <Image source={{ uri: photo }} style={styles.galleryImage} />
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Members or Experience if available */}
                {act.group_members && act.group_members.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Group Members</Text>
                        {act.group_members.map((member, i) => (
                            <View key={i} style={styles.memberRow}>
                                <CheckCircle2 color={COLORS.primary} size={18} />
                                <Text style={styles.memberText}>{member.name} - <Text style={{ color: COLORS.textDim }}>{member.role}</Text></Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Packages - The B2B Margin Engine */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Select a Package</Text>
                    <Text style={styles.sectionSubtitle}>Standard availability includes setup and breakdown.</Text>

                    {act.packages && act.packages.length > 0 ? (
                        act.packages.map((pkg, idx) => {
                            // The Invisible 20% Markup Calculation
                            const numericPrice = parseInt(pkg.price, 10);
                            const finalPrice = Math.round(numericPrice * MARGIN_MULTIPLIER);

                            return (
                                <View key={idx} style={styles.packageCard}>
                                    <View style={styles.packageHeader}>
                                        <Text style={styles.packageName}>{pkg.name}</Text>
                                        <Text style={styles.packagePrice}>
                                            {isNaN(finalPrice) ? 'Contact' : `${finalPrice.toLocaleString()} AED`}
                                        </Text>
                                    </View>

                                    <View style={styles.durationRow}>
                                        <Clock size={16} color={COLORS.textDim} />
                                        <Text style={styles.durationText}>{pkg.duration || 'Flexible'}</Text>
                                    </View>

                                    <Text style={styles.packageDesc}>{pkg.description}</Text>

                                    <Pressable
                                        style={styles.bookBtn}
                                        onPress={() => handleBookPackage(pkg)}
                                    >
                                        <Text style={styles.bookBtnText}>Book Now</Text>
                                    </Pressable>
                                </View>
                            );
                        })
                    ) : (
                        // Fallback generic package
                        <View style={styles.packageCard}>
                            <View style={styles.packageHeader}>
                                <Text style={styles.packageName}>Standard Booking</Text>
                                <Text style={styles.packagePrice}>
                                    {act.price_guide ? `${Math.round(parseInt(act.price_guide.replace(/[^0-9]/g, ''), 10) * MARGIN_MULTIPLIER).toLocaleString()} AED` : 'Consult'}
                                </Text>
                            </View>
                            <Pressable
                                style={styles.bookBtn}
                                onPress={() => handleBookPackage({ name: 'Standard Booking', price: act.price_guide || '0' })}
                            >
                                <Text style={styles.bookBtnText}>Request Booking</Text>
                            </Pressable>
                        </View>
                    )}
                </View>

            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    hero: {
        height: 500,
        width: width,
        position: 'relative',
    },
    heroBackground: {
        ...StyleSheet.absoluteFillObject,
    },
    gradient: {
        ...StyleSheet.absoluteFillObject,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingHorizontal: 20,
        zIndex: 10,
    },
    iconButton: {
        width: 44,
        height: 44,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroInfo: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        zIndex: 10,
    },
    badge: {
        backgroundColor: COLORS.primary,
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 12,
    },
    badgeText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    title: {
        color: '#FFF',
        fontSize: 38,
        fontWeight: '900',
        marginBottom: 10,
        letterSpacing: -0.5,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationText: {
        color: COLORS.text,
        marginLeft: 6,
        fontSize: 14,
        fontWeight: '500',
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.textDim,
        marginHorizontal: 10,
    },
    ratingText: {
        color: COLORS.text,
        marginLeft: 6,
        fontSize: 14,
        fontWeight: '600',
    },
    content: {
        padding: 20,
        paddingBottom: 60,
    },
    section: {
        marginBottom: 35,
    },
    sectionTitle: {
        color: COLORS.text,
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 15,
        letterSpacing: -0.5,
    },
    sectionSubtitle: {
        color: COLORS.textDim,
        fontSize: 14,
        marginBottom: 15,
        marginTop: -10,
    },
    description: {
        color: COLORS.textDim,
        fontSize: 16,
        lineHeight: 26,
    },
    galleryScroll: {
        marginHorizontal: -20,
        paddingHorizontal: 20,
    },
    galleryImageContainer: {
        width: 250,
        height: 300,
        borderRadius: 16,
        overflow: 'hidden',
        marginRight: 15,
        backgroundColor: COLORS.surface,
    },
    galleryImage: {
        width: '100%',
        height: '100%',
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playBtn: {
        backgroundColor: 'rgba(255,0,0,0.85)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    playBtnText: {
        color: '#FFF',
        fontWeight: '900',
        letterSpacing: 1,
        fontSize: 12,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 6,
    },
    memberText: {
        color: COLORS.text,
        marginLeft: 10,
        fontSize: 16,
    },
    packageCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    packageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    packageName: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
    },
    packagePrice: {
        color: COLORS.primary,
        fontSize: 22,
        fontWeight: '900',
    },
    durationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    durationText: {
        color: COLORS.textDim,
        fontSize: 14,
        marginLeft: 6,
    },
    packageDesc: {
        color: COLORS.textDim,
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 20,
    },
    bookBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: 30,
        paddingVertical: 14,
        alignItems: 'center',
    },
    bookBtnText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
