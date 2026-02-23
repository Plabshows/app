import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    Calendar,
    ChevronLeft,
    CreditCard,
    Lock,
    MapPin,
    MessageCircle,
    ShieldCheck
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ClientQuoteView() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState<any>(null);
    const [quote, setQuote] = useState<any>(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (id) fetchQuoteData();
    }, [id]);

    const fetchQuoteData = async () => {
        try {
            setLoading(true);
            // Fetch booking request and its most recent sent quote
            const { data: bookingData, error: bookingError } = await supabase
                .from('booking_requests')
                .select(`
                    *,
                    act:acts!act_id(name, artist_type, owner:profiles!owner_id(name))
                `)
                .eq('id', id)
                .single();

            if (bookingError) throw bookingError;
            setBooking(bookingData);

            const { data: quoteData, error: quoteError } = await supabase
                .from('quotes')
                .select('*')
                .eq('booking_request_id', id)
                .eq('status', 'sent')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (quoteError) throw quoteError;
            setQuote(quoteData);

        } catch (error) {
            console.error('Error fetching quote:', error);
            Alert.alert('Error', 'Could not load the quote.');
        } finally {
            setLoading(false);
        }
    };

    const handleAuthorizePayment = async () => {
        try {
            setProcessing(true);

            // Call Edge Function to create checkout session with manual capture
            const { data, error } = await supabase.functions.invoke('create-authorize-session', {
                body: {
                    bookingRequestId: id,
                    quoteId: quote.id
                }
            });

            if (error) throw error;
            if (data?.url) {
                // Redirect to Stripe Checkout
                Linking.openURL(data.url);
            } else {
                throw new Error('No checkout URL returned');
            }
        } catch (err: any) {
            console.error('Payment error:', err);
            Alert.alert("Payment Error", err.message || "Could not initialize payment.");
        } finally {
            setProcessing(false);
        }
    };

    if (loading || !booking || !quote) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={24} color={COLORS.text} />
                </Pressable>
                <Text style={styles.headerTitle}>Review Quote</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.artistHero}>
                    <Text style={styles.artistName}>{booking.act?.name}</Text>
                    <Text style={styles.artistType}>{booking.act?.artist_type}</Text>
                    <View style={styles.verifiedBadge}>
                        <ShieldCheck size={14} color={COLORS.primary} />
                        <Text style={styles.verifiedText}>Verified Artist</Text>
                    </View>
                </View>

                {/* Quote Breakdown */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Quote Summary</Text>

                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Performance Fee</Text>
                        <Text style={styles.breakdownValue}>{quote.base_amount.toLocaleString()} AED</Text>
                    </View>

                    {quote.extras_amount > 0 && (
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Extras (Travel/Add-ons)</Text>
                            <Text style={styles.breakdownValue}>{quote.extras_amount.toLocaleString()} AED</Text>
                        </View>
                    )}

                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Taxes & Fees</Text>
                        <Text style={styles.breakdownValue}>{quote.tax_amount.toLocaleString()} AED</Text>
                    </View>

                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>{quote.total_amount.toLocaleString()} AED</Text>
                    </View>
                </View>

                {/* Artist Message */}
                {quote.message_to_client && (
                    <View style={[styles.card, { marginTop: 16, backgroundColor: '#1A1A1A' }]}>
                        <View style={styles.messageHeader}>
                            <MessageCircle size={18} color={COLORS.primary} />
                            <Text style={styles.messageTitle}>Message from the Artist</Text>
                        </View>
                        <Text style={styles.messageText}>"{quote.message_to_client}"</Text>
                    </View>
                )}

                {/* Event Summary Snapshot */}
                <View style={[styles.card, { marginTop: 16 }]}>
                    <Text style={styles.cardTitle}>Event Details</Text>
                    <View style={styles.infoRow}>
                        <Calendar size={16} color={COLORS.textDim} />
                        <Text style={styles.infoText}>{booking.event_dates?.join(', ')}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <MapPin size={16} color={COLORS.textDim} />
                        <Text style={styles.infoText}>{booking.location_text}</Text>
                    </View>
                </View>

                {/* Payment Policy Info */}
                <View style={styles.policyBox}>
                    <Lock size={16} color={COLORS.textDim} style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.policyTitle}>Safe Booking Guarantee</Text>
                        <Text style={styles.policyText}>
                            Your funds are held securely. The artist will not be paid until the service is successfully performed.
                            If the artist cancels or fails to confirm, you receive a full refund.
                        </Text>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.footerTotal}>
                    <Text style={styles.footerLabel}>Grand Total</Text>
                    <Text style={styles.footerValue}>{quote.total_amount.toLocaleString()} AED</Text>
                </View>
                <Pressable
                    style={[styles.payBtn, processing && styles.disabled]}
                    onPress={handleAuthorizePayment}
                    disabled={processing}
                >
                    {processing ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <>
                            <CreditCard size={20} color="#000" />
                            <Text style={styles.payBtnText}>Authorize Payment</Text>
                        </>
                    )}
                </Pressable>
                <Text style={styles.holdNote}>Funds will be held, not charged immediately.</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    centered: { justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.m,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
    },
    backButton: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
    content: { padding: SPACING.l },
    artistHero: { alignItems: 'center', marginBottom: 24 },
    artistName: { fontSize: 24, fontWeight: '900', color: COLORS.text, marginBottom: 4 },
    artistType: { fontSize: 14, color: COLORS.primary, fontWeight: '600', marginBottom: 8 },
    verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1A1A1A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    verifiedText: { color: COLORS.textDim, fontSize: 11, fontWeight: 'bold' },
    card: {
        backgroundColor: '#111',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#222',
    },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 16 },
    breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    breakdownLabel: { color: COLORS.textDim, fontSize: 15 },
    breakdownValue: { color: COLORS.text, fontWeight: '600' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#333' },
    totalLabel: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
    totalValue: { fontSize: 22, fontWeight: '900', color: COLORS.primary },
    messageHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    messageTitle: { color: COLORS.primary, fontWeight: 'bold', fontSize: 14 },
    messageText: { color: COLORS.text, fontSize: 15, fontStyle: 'italic', lineHeight: 22 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    infoText: { color: COLORS.textDim, fontSize: 14 },
    policyBox: { flexDirection: 'row', gap: 12, marginTop: 24, padding: 16, backgroundColor: 'rgba(204, 255, 0, 0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(204, 255, 0, 0.1)' },
    policyTitle: { color: COLORS.text, fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
    policyText: { color: COLORS.textDim, fontSize: 12, lineHeight: 18 },
    footer: {
        padding: SPACING.l,
        backgroundColor: '#0A0A0A',
        borderTopWidth: 1,
        borderTopColor: '#222',
        gap: 12
    },
    footerTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    footerLabel: { color: COLORS.textDim, fontSize: 14 },
    footerValue: { color: COLORS.text, fontSize: 20, fontWeight: 'bold' },
    payBtn: {
        backgroundColor: COLORS.primary,
        padding: 18,
        borderRadius: 100,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10
    },
    payBtnText: { color: '#000', fontWeight: '900', fontSize: 18 },
    holdNote: { textAlign: 'center', color: COLORS.textDim, fontSize: 12, marginTop: 4 },
    disabled: { opacity: 0.5 }
});
