import { COLORS } from '@/src/constants/theme';
import { useActs } from '@/src/hooks/useActs';
import { ResizeMode, Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Info, Share2 } from 'lucide-react-native';
import { ActivityIndicator, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const { width } = Dimensions.get('window');

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
        return <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><Text style={{ color: 'white' }}>Act not found</Text></View>;
    }

    return (
        <ScrollView style={styles.container} bounces={false}>
            {/* Hero Section */}
            <View style={styles.hero}>
                <Video
                    source={{ uri: act.video_url || '' }}
                    style={styles.video}
                    resizeMode={ResizeMode.COVER}
                    isLooping
                    shouldPlay
                    isMuted
                />
                <LinearGradient
                    colors={['rgba(0,0,0,0.3)', 'transparent', COLORS.background]}
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

                <View style={styles.titleContainer}>
                    <Text style={styles.category}>{act.category}</Text>
                    <Text style={styles.title}>{act.name || act.title}</Text>
                </View>
            </View>

            {/* Content */}
            <View style={styles.content}>
                <View style={styles.priceRow}>
                    <View>
                        <Text style={styles.priceLabel}>Starting from</Text>
                        <Text style={styles.price}>{act.price_guide || act.price_range || 'Contact'}</Text>
                    </View>
                    <Pressable
                        style={styles.quoteButton}
                        onPress={() => router.push({
                            pathname: '/modal',
                            params: {
                                actId: act.id,
                                actTitle: act.name || act.title,
                                ownerId: (act as any).owner_id
                            }
                        })}
                    >
                        <Text style={styles.quoteButtonText}>Consultar Disponibilidad</Text>
                    </Pressable>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About</Text>
                    <Text style={styles.description}>{act.description}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Technical Specs</Text>
                    <View style={styles.specBox}>
                        <Info color={COLORS.primary} size={20} />
                        <Text style={styles.specText}>{act.technical_specs || act.specs}</Text>
                    </View>
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
        height: 400,
        width: width,
        position: 'relative',
    },
    video: {
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
    },
    iconButton: {
        width: 40,
        height: 40,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
    },
    category: {
        color: COLORS.primary,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 4,
        fontSize: 12,
    },
    title: {
        color: COLORS.text,
        fontSize: 32,
        fontWeight: 'bold',
    },
    content: {
        padding: 20,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    priceLabel: {
        color: COLORS.textDim,
        fontSize: 12,
    },
    price: {
        color: COLORS.text,
        fontSize: 24,
        fontWeight: 'bold',
    },
    quoteButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 30,
    },
    quoteButtonText: {
        color: COLORS.background,
        fontWeight: 'bold',
        fontSize: 16,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    description: {
        color: COLORS.textDim,
        fontSize: 16,
        lineHeight: 24,
    },
    specBox: {
        backgroundColor: COLORS.surface,
        padding: 15,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    specText: {
        color: COLORS.text,
        flex: 1,
    },
});
