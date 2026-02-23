import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    Calendar,
    ChevronLeft,
    Clock,
    CreditCard,
    DollarSign,
    Info,
    MapPin,
    Send,
    User,
    Users,
    XCircle
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RequestDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [request, setRequest] = useState<any>(null);
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
    const [sendingQuote, setSendingQuote] = useState(false);

    // Quote States
    const [baseAmount, setBaseAmount] = useState('');
    const [extrasAmount, setExtrasAmount] = useState('0');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (id) fetchRequest();
    }, [id]);

    const fetchRequest = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('booking_requests')
                .select(`
                    *,
                    client:profiles!client_id(name, email, avatar_url),
                    act:acts!act_id(name, artist_type)
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            setRequest(data);

            // Pre-fill base amount from package if available
            if (data.package_id?.price) {
                setBaseAmount(data.package_id.price.toString());
            }
        } catch (error) {
            console.error('Error fetching request:', error);
            Alert.alert('Error', 'Could not load request details.');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const handleDecline = async () => {
        Alert.alert(
            "Decline Request",
            "Are you sure you want to decline this booking request?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Decline",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('booking_requests')
                                .update({ status: 'declined' })
                                .eq('id', id);
                            if (error) throw error;
                            router.back();
                        } catch (err) {
                            Alert.alert("Error", "Could not decline request.");
                        }
                    }
                }
            ]
        );
    };

    const handleSendQuote = async () => {
        if (!baseAmount || isNaN(parseFloat(baseAmount))) {
            Alert.alert("Error", "Please enter a valid base amount.");
            return;
        }

        try {
            setSendingQuote(true);
            const base = parseFloat(baseAmount);
            const extras = parseFloat(extrasAmount) || 0;
            const tax = (base + extras) * 0.05; // 5% VAT example
            const total = base + extras + tax;

            // 1. Create Quote
            const { data: quote, error: quoteError } = await supabase
                .from('quotes')
                .insert({
                    booking_request_id: id,
                    base_amount: base,
                    extras_amount: extras,
                    tax_amount: tax,
                    total_amount: total,
                    message_to_client: message,
                    status: 'sent'
                })
                .select()
                .single();

            if (quoteError) throw quoteError;

            // 2. Update Request Status
            const { error: reqError } = await supabase
                .from('booking_requests')
                .update({ status: 'quoted' })
                .eq('id', id);

            if (reqError) throw reqError;

            // 3. Send automated message
            await supabase.from('booking_messages').insert({
                booking_request_id: id,
                sender_id: (await supabase.auth.getUser()).data.user?.id,
                sender_role: 'artist',
                message: `Hi! I've sent you a quote for ${total} AED. ${message}`
            });

            setIsQuoteModalOpen(false);
            Alert.alert("Success", "Quote sent to the client!");
            fetchRequest();
        } catch (err: any) {
            console.error('Quote error:', err);
            Alert.alert("Error", err.message || "Failed to send quote.");
        } finally {
            setSendingQuote(false);
        }
    };

    const handleConfirmBooking = async () => {
        try {
            setLoading(true); // Reuse loading state for the action
            const { data, error } = await supabase.functions.invoke('confirm-booking-capture', {
                body: { bookingRequestId: id }
            });

            if (error) throw error;
            Alert.alert("Success", "Payment captured and booking finalized!");
            fetchRequest();
        } catch (err: any) {
            console.error('Capture error:', err);
            Alert.alert("Error", err.message || "Failed to capture payment.");
        } finally {
            setLoading(false);
        }
    };

    if (loading || !request) {
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
                <Text style={styles.headerTitle}>Inquiry Detail</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Client Info */}
                <View style={styles.card}>
                    <View style={styles.clientHeader}>
                        <View style={styles.avatarPlaceholder}>
                            <User size={24} color={COLORS.textDim} />
                        </View>
                        <View>
                            <Text style={styles.clientName}>{request.client?.name || 'Guest User'}</Text>
                            <Text style={styles.clientSubtext}>{request.client?.email || 'No email provided'}</Text>
                        </View>
                    </View>

                    <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Current Status</Text>
                        <View style={[styles.statusBadge, request.status === 'pending' && styles.statusPending]}>
                            <Text style={styles.statusBadgeText}>{request.status.toUpperCase()}</Text>
                        </View>
                    </View>
                </View>

                {/* Event Details */}
                <View style={[styles.card, { marginTop: 16 }]}>
                    <Text style={styles.cardTitle}>Event Details</Text>

                    <View style={styles.detailGrid}>
                        <DetailItem icon={Calendar} label="Date(s)" value={request.event_dates?.join(', ') || 'TBD'} />
                        <DetailItem icon={Clock} label="Start Time" value={request.start_time} />
                        <DetailItem icon={Users} label="Guests" value={`${request.guests_count || 'N/A'}`} />
                        <DetailItem icon={Info} label="Event Type" value={request.event_type} />
                    </View>

                    <View style={styles.locationBox}>
                        <MapPin size={20} color={COLORS.primary} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.locationTitle}>Location</Text>
                            <Text style={styles.locationText}>{request.location_text}</Text>
                        </View>
                    </View>

                    {request.budget_amount && (
                        <View style={styles.budgetBox}>
                            <DollarSign size={20} color={COLORS.primary} />
                            <Text style={styles.budgetText}>Budget: {request.budget_amount} {request.budget_currency}</Text>
                        </View>
                    )}
                </View>

                {/* Notes */}
                <View style={[styles.card, { marginTop: 16 }]}>
                    <Text style={styles.cardTitle}>Client Notes</Text>
                    <Text style={styles.notesText}>{request.notes || 'No extra information provided.'}</Text>
                </View>

                {/* Package Snapshot (if selected) */}
                {request.package_id && (
                    <View style={[styles.card, { marginTop: 16 }]}>
                        <Text style={styles.cardTitle}>Selected Package</Text>
                        <View style={styles.packageBox}>
                            <Text style={styles.packageName}>{request.package_id.name}</Text>
                            <Text style={styles.packagePrice}>{request.package_id.price} AED</Text>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Action Buttons */}
            {request.status === 'pending' && (
                <View style={styles.footer}>
                    <Pressable style={styles.declineBtn} onPress={handleDecline}>
                        <XCircle size={20} color={COLORS.error} />
                        <Text style={styles.declineBtnText}>Decline</Text>
                    </Pressable>
                    <Pressable style={styles.acceptBtn} onPress={() => setIsQuoteModalOpen(true)}>
                        <Send size={20} color="#000" />
                        <Text style={styles.acceptBtnText}>Create Quote</Text>
                    </Pressable>
                </View>
            )}

            {request.status === 'accepted' && (
                <View style={styles.footer}>
                    <Pressable style={styles.acceptBtn} onPress={handleConfirmBooking}>
                        <CreditCard size={20} color="#000" />
                        <Text style={styles.acceptBtnText}>Confirm & Capture Payment</Text>
                    </Pressable>
                </View>
            )}

            {request.status === 'paid' && (
                <View style={styles.footer}>
                    <View style={[styles.acceptBtn, { backgroundColor: '#4CAF50' }]}>
                        <Text style={[styles.acceptBtnText, { color: '#fff' }]}>Booking Finalized (Paid)</Text>
                    </View>
                </View>
            )}

            {/* Quote Modal */}
            <Modal
                visible={isQuoteModalOpen}
                animationType="slide"
                transparent={true}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Build Quote</Text>
                            <Pressable onPress={() => setIsQuoteModalOpen(false)}>
                                <XCircle size={24} color={COLORS.textDim} />
                            </Pressable>
                        </View>

                        <ScrollView style={styles.modalForm}>
                            <Text style={styles.modalLabel}>Base Amount (AED)</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={baseAmount}
                                onChangeText={setBaseAmount}
                                keyboardType="numeric"
                                placeholder="Enter base price"
                                placeholderTextColor="#666"
                            />

                            <Text style={styles.modalLabel}>Optional Extras (Travel, etc.)</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={extrasAmount}
                                onChangeText={setExtrasAmount}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor="#666"
                            />

                            <Text style={styles.modalLabel}>Message to Client</Text>
                            <TextInput
                                style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
                                value={message}
                                onChangeText={setMessage}
                                multiline
                                numberOfLines={4}
                                placeholder="Add a friendly message or clarification..."
                                placeholderTextColor="#666"
                            />

                            <View style={styles.quoteSummary}>
                                <Text style={styles.summaryTitle}>Estimated Total</Text>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Subtotal</Text>
                                    <Text style={styles.summaryValue}>
                                        {(parseFloat(baseAmount || '0') + parseFloat(extrasAmount || '0')).toLocaleString()} AED
                                    </Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>VAT (5%)</Text>
                                    <Text style={styles.summaryValue}>
                                        {((parseFloat(baseAmount || '0') + parseFloat(extrasAmount || '0')) * 0.05).toLocaleString()} AED
                                    </Text>
                                </View>
                                <View style={[styles.summaryRow, { marginTop: 8, borderTopWidth: 1, borderTopColor: '#333', paddingTop: 8 }]}>
                                    <Text style={styles.totalLabel}>Grand Total</Text>
                                    <Text style={styles.totalValue}>
                                        {((parseFloat(baseAmount || '0') + parseFloat(extrasAmount || '0')) * 1.05).toLocaleString()} AED
                                    </Text>
                                </View>
                            </View>
                        </ScrollView>

                        <Pressable
                            style={[styles.sendBtn, sendingQuote && styles.disabled]}
                            onPress={handleSendQuote}
                            disabled={sendingQuote}
                        >
                            {sendingQuote ? (
                                <ActivityIndicator color="#000" />
                            ) : (
                                <Text style={styles.sendBtnText}>Send Quote to Client</Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const DetailItem = ({ icon: Icon, label, value }: any) => (
    <View style={styles.detailItem}>
        <View style={styles.detailIconBox}>
            <Icon size={16} color={COLORS.primary} />
        </View>
        <View>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value}</Text>
        </View>
    </View>
);

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
    card: {
        backgroundColor: '#111',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#222',
    },
    clientHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#222',
        justifyContent: 'center',
        alignItems: 'center',
    },
    clientName: { fontSize: 20, fontWeight: '900', color: COLORS.text },
    clientSubtext: { fontSize: 14, color: COLORS.textDim },
    statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#222' },
    statusLabel: { color: COLORS.textDim, fontSize: 14 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#222' },
    statusPending: { backgroundColor: 'rgba(255, 152, 0, 0.1)' },
    statusBadgeText: { color: '#FF9800', fontWeight: 'bold', fontSize: 12 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 16 },
    detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
    detailItem: { width: '45%', flexDirection: 'row', gap: 12 },
    detailIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(204, 255, 0, 0.1)', justifyContent: 'center', alignItems: 'center' },
    detailLabel: { fontSize: 12, color: COLORS.textDim },
    detailValue: { fontSize: 14, color: COLORS.text, fontWeight: 'bold' },
    locationBox: { flexDirection: 'row', gap: 12, marginTop: 24, padding: 16, backgroundColor: '#1A1A1A', borderRadius: 12 },
    locationTitle: { fontSize: 12, color: COLORS.textDim, marginBottom: 2 },
    locationText: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
    budgetBox: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
    budgetText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 16 },
    notesText: { color: COLORS.textDim, fontSize: 15, lineHeight: 22 },
    packageBox: { backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between' },
    packageName: { color: COLORS.text, fontWeight: 'bold' },
    packagePrice: { color: COLORS.primary, fontWeight: 'bold' },
    footer: {
        padding: SPACING.l,
        flexDirection: 'row',
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#222',
        backgroundColor: COLORS.background
    },
    declineBtn: {
        flex: 1,
        backgroundColor: 'rgba(255, 68, 68, 0.1)',
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 68, 68, 0.2)'
    },
    declineBtnText: { color: COLORS.error, fontWeight: 'bold' },
    acceptBtn: {
        flex: 2,
        backgroundColor: COLORS.primary,
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8
    },
    acceptBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: '#121212',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        maxHeight: '90%',
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
    modalForm: { marginBottom: 24 },
    modalLabel: { color: COLORS.textDim, fontSize: 14, marginBottom: 8, marginTop: 16 },
    modalInput: {
        backgroundColor: '#1A1A1A',
        color: COLORS.text,
        padding: 16,
        borderRadius: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#333'
    },
    quoteSummary: { backgroundColor: '#0A0A0A', padding: 20, borderRadius: 16, marginTop: 24 },
    summaryTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 16 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    summaryLabel: { color: COLORS.textDim },
    summaryValue: { color: COLORS.text, fontWeight: '600' },
    totalLabel: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
    totalValue: { fontSize: 22, fontWeight: '900', color: COLORS.primary },
    sendBtn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 100, alignItems: 'center' },
    sendBtnText: { color: '#000', fontWeight: '900', fontSize: 18 },
    disabled: { opacity: 0.5 }
});
