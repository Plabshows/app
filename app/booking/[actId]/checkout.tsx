import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, ChevronLeft, CreditCard, Lock, ShieldCheck } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ActData = {
    id: string;
    name: string;
    artist_type: string;
    price_guide: string;
};

export default function CheckoutScreen() {
    const { actId } = useLocalSearchParams();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [act, setAct] = useState<ActData | null>(null);

    // Front-end calculated display info ONLY.
    // The actual charge is ALWAYS calculated securely in the edge function.
    const [displayPricing, setDisplayPricing] = useState({
        base: 0,
        fee: 0,
        total: 0
    });

    useEffect(() => {
        if (actId) fetchActDetails();
    }, [actId]);

    const fetchActDetails = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('acts')
                .select('id, name, artist_type, price_guide')
                .eq('id', actId)
                .single();

            if (error) throw error;
            if (data) {
                setAct(data);

                // UX Math only (Visual)
                const numericPrice = parseInt(String(data.price_guide).replace(/[^0-9]/g, '')) || 1000;
                const markup = Math.round(numericPrice * 0.20);

                setDisplayPricing({
                    base: numericPrice,
                    fee: markup,
                    total: numericPrice + markup
                });
            }
        } catch (error) {
            console.error('Error fetching act details:', error);
            Alert.alert('Error', 'Could not load booking details.');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const handleCheckout = async () => {
        try {
            setActionLoading(true);

            // POST to the Edge Function which contains the 120% markup logic
            const { data, error } = await supabase.functions.invoke('create-checkout-session', {
                body: {
                    actId: actId,
                    date: new Date().toISOString().split('T')[0] // Mocking tomorrow/today
                }
            });

            if (error) throw new Error(error.message || 'Failed to initialize payment.');
            if (data?.error) throw new Error(data.error);

            if (data?.url) {
                if (Platform.OS === 'web') {
                    window.location.href = data.url;
                } else {
                    // In a real mobile app, you might use expo-web-browser or deep links here
                    alert('Checkout URL generated: ' + data.url);
                }
            }
        } catch (error: any) {
            console.error('Checkout error:', error);
            Alert.alert('Payment Error', error.message || 'There was an issue opening the secure checkout.');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading || !act) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={24} color={COLORS.text} />
                </Pressable>
                <Text style={styles.headerTitle}>Secure Checkout</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.twoColumnLayout}>
                    {/* Left Column: Summary */}
                    <View style={styles.mainColumn}>
                        <Text style={styles.sectionTitle}>Booking Details</Text>

                        <View style={styles.card}>
                            <View style={styles.actInfo}>
                                <Text style={styles.actName}>{act.name}</Text>
                                <Text style={styles.actType}>{act.artist_type}</Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Calendar size={20} color={COLORS.textDim} />
                                <Text style={styles.detailText}>To Be Decided (Flexible Date)</Text>
                            </View>
                        </View>

                        <View style={styles.trustBox}>
                            <ShieldCheck size={24} color="#10B981" />
                            <View style={styles.trustTextContainer}>
                                <Text style={styles.trustTitle}>Performrs Guarantee</Text>
                                <Text style={styles.trustText}>
                                    Your funds are held securely until the performance is completed.
                                    100% refund if the artist cancels.
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Right Column: Pricing & Pay */}
                    <View style={styles.sideColumn}>
                        <View style={styles.receiptCard}>
                            <Text style={styles.receiptTitle}>Payment Summary</Text>

                            <View style={styles.priceRow}>
                                <Text style={styles.priceLabel}>Booking Total</Text>
                                <Text style={styles.priceValue}>{displayPricing.total.toLocaleString()} AED</Text>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Total Due Today</Text>
                                <Text style={styles.totalValue}>{displayPricing.total.toLocaleString()} AED</Text>
                            </View>

                            <Pressable
                                style={[styles.payButton, actionLoading && styles.payButtonDisabled]}
                                onPress={handleCheckout}
                                disabled={actionLoading}
                            >
                                {actionLoading ? (
                                    <ActivityIndicator size="small" color="#000" />
                                ) : (
                                    <>
                                        <Lock size={18} color="#000" />
                                        <Text style={styles.payButtonText}>Pay {displayPricing.total.toLocaleString()} AED</Text>
                                    </>
                                )}
                            </Pressable>

                            <View style={styles.secureFooter}>
                                <CreditCard size={14} color={COLORS.textDim} />
                                <Text style={styles.secureText}>Powered securely by Stripe</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.l,
        paddingVertical: SPACING.m,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
        backgroundColor: '#0A0A0A'
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    content: {
        padding: SPACING.xl,
        maxWidth: 1200,
        marginHorizontal: Platform.OS === 'web' ? 'auto' : 0,
        width: '100%',
    },
    twoColumnLayout: {
        flexDirection: Platform.OS === 'web' ? 'row' : 'column',
        gap: SPACING.xl,
    },
    mainColumn: {
        flex: 1,
        minWidth: Platform.OS === 'web' ? 400 : '100%',
    },
    sideColumn: {
        width: Platform.OS === 'web' ? 400 : '100%',
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.text,
        marginBottom: SPACING.l,
    },
    card: {
        backgroundColor: '#111',
        borderRadius: 16,
        padding: SPACING.xl,
        borderWidth: 1,
        borderColor: '#222',
        marginBottom: SPACING.xl,
    },
    actInfo: {
        marginBottom: SPACING.l,
        paddingBottom: SPACING.l,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
    },
    actName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 4,
    },
    actType: {
        fontSize: 16,
        color: COLORS.primary,
        fontWeight: '600',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    detailText: {
        color: COLORS.textDim,
        fontSize: 16,
    },
    trustBox: {
        flexDirection: 'row',
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        padding: SPACING.l,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
        gap: 16,
    },
    trustTextContainer: {
        flex: 1,
    },
    trustTitle: {
        color: '#10B981',
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 4,
    },
    trustText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        lineHeight: 22,
    },
    receiptCard: {
        backgroundColor: '#1A1A1A',
        borderRadius: 16,
        padding: SPACING.xl,
        borderWidth: 1,
        borderColor: '#333',
    },
    receiptTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: SPACING.xl,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.m,
    },
    feeLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    badge: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 100,
    },
    badgeText: {
        color: COLORS.textDim,
        fontSize: 12,
        fontWeight: 'bold',
    },
    priceLabel: {
        color: COLORS.textDim,
        fontSize: 16,
    },
    priceValue: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#333',
        marginVertical: SPACING.l,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    totalLabel: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
    totalValue: {
        color: COLORS.primary,
        fontSize: 24,
        fontWeight: '900',
    },
    payButton: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: 12,
        gap: 12,
        marginBottom: SPACING.m,
    },
    payButtonDisabled: {
        opacity: 0.7,
    },
    payButtonText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 18,
    },
    secureFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    secureText: {
        color: COLORS.textDim,
        fontSize: 12,
    }
});
