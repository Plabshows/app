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
    ShieldCheck,
    Send
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
    TextInput,
    View,
    Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ClientQuoteView() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState<any>(null);
    const [quote, setQuote] = useState<any>(null);
    const [processing, setProcessing] = useState(false);

    // Chat States
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);
    const flatListRef = React.useRef<any>(null);
    const { user } = require('@/src/context/AuthContext').useAuth(); // Using useAuth for current user ID

    useEffect(() => {
        if (id) {
            fetchQuoteData();
            fetchMessages();
            const unsubscribe = subscribeToMessages();
            return unsubscribe;
        }
    }, [id]);
    
    // Auto-scroll on messages change
    useEffect(() => {
        if (messages.length > 0) {
            // Wait for render
            setTimeout(() => flatListRef.current?.scrollToEnd?.({ animated: true }), 200);
        }
    }, [messages]);

    const fetchMessages = async () => {
        try {
            const { data, error } = await supabase
                .from('booking_messages')
                .select('*')
                .eq('booking_request_id', id)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(data || []);

            // Mark as read
            if (data && data.length > 0 && user) {
                await supabase
                    .from('booking_messages')
                    .update({ is_read: true })
                    .eq('booking_request_id', id)
                    .eq('is_read', false)
                    .neq('sender_id', user.id);
            }
        } catch (err) {
            console.error('Error fetching messages:', err);
        }
    };

    const subscribeToMessages = () => {
        const channel = supabase
            .channel(`booking_messages_client_${id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'booking_messages',
                filter: `booking_request_id=eq.${id}`
            }, async (payload) => {
                const newMsg = payload.new as any;
                setMessages(prev => [...prev, newMsg]);
                
                if (user && newMsg.sender_id !== user.id) {
                    await supabase
                        .from('booking_messages')
                        .update({ is_read: true })
                        .eq('id', newMsg.id);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !user) return;
        
        try {
            setSendingMessage(true);
            const { error } = await supabase
                .from('booking_messages')
                .insert({
                    booking_request_id: id,
                    sender_id: user.id,
                    sender_role: 'client',
                    message: newMessage.trim()
                });

            if (error) throw error;
            setNewMessage('');
            Keyboard.dismiss();
        } catch (err: any) {
            Alert.alert("Error", err.message);
        } finally {
            setSendingMessage(false);
        }
    };

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
                        <Text style={styles.cardMessageText}>"{quote.message_to_client}"</Text>
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

                {/* Chat Section */}
                <View style={styles.chatSection}>
                    <View style={styles.chatHeader}>
                        <MessageCircle size={20} color={COLORS.primary} />
                        <Text style={styles.chatTitle}>Communication History</Text>
                    </View>
                    
                    <View style={styles.chatContainer}>
                        {messages.length === 0 ? (
                            <Text style={styles.emptyChat}>No messages yet. Ask the artist any questions here.</Text>
                        ) : (
                            messages.map((msg, index) => {
                                const isMe = msg.sender_role === 'client';
                                const prevMsg = index > 0 ? messages[index - 1] : null;
                                const showDate = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();
                                
                                const dateLabel = () => {
                                    const d = new Date(msg.created_at);
                                    const today = new Date();
                                    const yesterday = new Date();
                                    yesterday.setDate(today.getDate() - 1);
                                    if (d.toDateString() === today.toDateString()) return 'Today';
                                    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
                                    return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
                                };

                                return (
                                    <View key={msg.id}>
                                        {showDate && (
                                            <View style={styles.dateSeparator}>
                                                <View style={styles.dateLine} />
                                                <Text style={styles.dateText}>{dateLabel()}</Text>
                                                <View style={styles.dateLine} />
                                            </View>
                                        )}
                                        <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
                                            <Text style={[styles.messageRole, { color: isMe ? '#000' : COLORS.primary }]}>
                                                {msg.sender_role.toUpperCase()}
                                            </Text>
                                            <Text style={[msg.sender_role === 'admin' ? styles.adminMessageText : styles.chatMessageText, { color: isMe ? '#000' : '#FFF' }]}>{msg.message}</Text>
                                            <View style={styles.messageFooter}>
                                                <Text style={[styles.messageTime, { color: isMe ? 'rgba(0,0,0,0.45)' : COLORS.textDim }]}>
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </Text>
                                                {isMe && (
                                                    <Text style={[styles.readStatus, { color: msg.is_read ? '#000' : 'rgba(0,0,0,0.3)' }]}>
                                                        {msg.is_read ? ' • Read' : ''}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>
                </View>

                {/* Payment Policy Info */}
                <View style={[styles.policyBox, { marginBottom: 40 }]}>
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

            {/* Sticky Message Input */}
            <View style={styles.inputArea}>
                <TextInput
                    style={styles.input}
                    value={newMessage}
                    onChangeText={setNewMessage}
                    placeholder="Message the artist..."
                    placeholderTextColor={COLORS.textDim}
                    multiline
                />
                <Pressable 
                    style={[styles.sendButton, (!newMessage.trim() || sendingMessage) && { opacity: 0.5 }]} 
                    onPress={handleSendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                >
                    {sendingMessage ? <ActivityIndicator size="small" color="black" /> : <Send size={20} color="black" />}
                </Pressable>
            </View>

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
    cardMessageText: { color: COLORS.text, fontSize: 15, fontStyle: 'italic', lineHeight: 22 },
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
    disabled: { opacity: 0.5 },
    // Chat Styles
    chatSection: { marginTop: 24 },
    chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
    chatTitle: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    chatContainer: { paddingBottom: 20 },
    messageBubble: { padding: 12, borderRadius: 12, maxWidth: '85%', marginBottom: 12 },
    myMessage: { alignSelf: 'flex-end', backgroundColor: COLORS.primary, borderBottomRightRadius: 2 },
    theirMessage: { alignSelf: 'flex-start', backgroundColor: '#1A1A1A', borderBottomLeftRadius: 2, borderWidth: 1, borderColor: '#333' },
    messageRole: { fontSize: 10, fontWeight: '900', marginBottom: 4 },
    chatMessageText: { fontSize: 14, lineHeight: 20 },
    adminMessageText: { fontSize: 14, lineHeight: 20, fontWeight: 'bold', color: COLORS.primary },
    messageFooter: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 4, gap: 4 },
    messageTime: { fontSize: 10 },
    readStatus: { fontSize: 10, fontWeight: '600' },
    dateSeparator: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
    dateLine: { flex: 1, height: 1, backgroundColor: '#222' },
    dateText: { color: '#666', fontSize: 11, fontWeight: '700', marginHorizontal: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
    emptyChat: { color: COLORS.textDim, textAlign: 'center', marginTop: 20, fontStyle: 'italic' },
    inputArea: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#000', borderTopWidth: 1, borderTopColor: '#222', gap: 10, paddingBottom: 30 },
    input: { flex: 1, backgroundColor: '#111', color: 'white', padding: 12, borderRadius: 12, maxHeight: 100, fontSize: 14 },
    sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
});
