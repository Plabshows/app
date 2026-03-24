
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
    ArrowLeft, 
    Calendar, 
    Clock, 
    DollarSign, 
    Info, 
    Mail, 
    MapPin, 
    MessageCircle, 
    Phone, 
    Send, 
    User,
    CheckCircle,
    XCircle,
    CreditCard
} from 'lucide-react-native';
import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../../src/constants/theme';
import { useAuth } from '../../../src/context/AuthContext';
import { supabase } from '../../../src/lib/supabase';
import Toast from 'react-native-toast-message';

type BookingRequest = {
    id: string;
    client_id: string;
    artist_id: string;
    act_id: string;
    client_name: string;
    client_email: string;
    client_phone: string;
    event_dates: string[];
    start_time: string;
    location_text: string;
    event_type: string;
    guests_count: number;
    budget_amount: number;
    notes: string;
    status: string;
    artist_fee: number;
    total_amount: number;
    created_at: string;
    acts: { name: string; title: string };
    profiles: { name: string; email: string; avatar_url: string };
};

type Message = {
    id: string;
    sender_id: string;
    sender_role: string;
    message: string;
    is_read: boolean;
    created_at: string;
};

export default function AdminRequestDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    
    const [loading, setLoading] = useState(true);
    const [request, setRequest] = useState<BookingRequest | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (id) {
            fetchRequestDetails();
            fetchMessages();
            subscribeToMessages();
        }
    }, [id]);

    const fetchRequestDetails = async () => {
        try {
            const { data, error } = await supabase
                .from('booking_requests')
                .select('*, acts(name, title), profiles!booking_requests_client_id_fkey(name, email, avatar_url)')
                .eq('id', id)
                .single();

            if (error) throw error;
            setRequest(data);
        } catch (err) {
            console.error('Error fetching request:', err);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Could not load request details' });
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async () => {
        try {
            const { data, error } = await supabase
                .from('booking_messages')
                .select('*')
                .eq('booking_request_id', id)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(data || []);
            
            // Mark all current messages as read
            if (data && data.length > 0) {
                await supabase
                    .from('booking_messages')
                    .update({ is_read: true })
                    .eq('booking_request_id', id)
                    .eq('is_read', false);
            }
        } catch (err) {
            console.error('Error fetching messages:', err);
        }
    };

    const subscribeToMessages = () => {
        const channel = supabase
            .channel(`booking_messages_${id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'booking_messages',
                filter: `booking_request_id=eq.${id}`
            }, async (payload) => {
                const newMessage = payload.new as Message;
                setMessages(prev => [...prev, newMessage]);
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
                
                // If message is from someone else, mark it as read immediately
                if (newMessage.sender_id !== user?.id) {
                    await supabase
                        .from('booking_messages')
                        .update({ is_read: true })
                        .eq('id', newMessage.id);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !user) return;
        
        setSending(true);
        try {
            const { error } = await supabase
                .from('booking_messages')
                .insert({
                    booking_request_id: id,
                    sender_id: user.id,
                    sender_role: 'admin',
                    message: newMessage.trim()
                });

            if (error) throw error;
            setNewMessage('');
            Keyboard.dismiss();
        } catch (err: any) {
            Toast.show({ type: 'error', text1: 'Error', text2: err.message });
        } finally {
            setSending(false);
        }
    };

    const updateStatus = async (newStatus: string) => {
        setUpdatingStatus(true);
        try {
            const { error } = await supabase
                .from('booking_requests')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;
            setRequest(prev => prev ? { ...prev, status: newStatus } : null);
            Toast.show({ type: 'success', text1: 'Status Updated', text2: `Request is now ${newStatus}` });
        } catch (err: any) {
            Toast.show({ type: 'error', text1: 'Update Failed', text2: err.message });
        } finally {
            setUpdatingStatus(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return COLORS.primary;
            case 'accepted': return '#4CAF50';
            case 'declined': return '#F44336';
            case 'paid': return '#2196F3';
            case 'canceled': return '#9E9E9E';
            default: return '#333';
        }
    };

    if (loading) return (
        <View style={styles.centered}>
            <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
    );

    if (!request) return (
        <View style={styles.centered}>
            <Text style={{ color: COLORS.textDim }}>Request not found</Text>
            <Pressable onPress={() => router.back()} style={styles.backButtonInline}>
                <Text style={{ color: COLORS.primary }}>Go Back</Text>
            </Pressable>
        </View>
    );

    const renderMessage = ({ item, index }: { item: Message; index: number }) => {
        const isMe = item.sender_role === 'admin';
        const prevMsg = index > 0 ? messages[index - 1] : null;
        
        // Date separator logic
        const showDate = !prevMsg || 
            new Date(item.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();
        
        const dateLabel = () => {
            const d = new Date(item.created_at);
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);
            
            if (d.toDateString() === today.toDateString()) return 'Today';
            if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
            return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
        };

        return (
            <View>
                {showDate && (
                    <View style={styles.dateSeparator}>
                        <View style={styles.dateLine} />
                        <Text style={styles.dateText}>{dateLabel()}</Text>
                        <View style={styles.dateLine} />
                    </View>
                )}
                <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
                    <Text style={[styles.messageRole, { color: isMe ? '#000' : COLORS.primary }]}>
                        {item.sender_role.toUpperCase()}
                    </Text>
                    <Text style={[styles.messageText, { color: isMe ? '#000' : '#FFF' }]}>{item.message}</Text>
                    <View style={styles.messageFooter}>
                        <Text style={[styles.messageTime, { color: isMe ? 'rgba(0,0,0,0.45)' : COLORS.textDim }]}>
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        {isMe && (
                            <Text style={[styles.readStatus, { color: item.is_read ? '#000' : 'rgba(0,0,0,0.3)' }]}>
                                {item.is_read ? ' • Read' : ''}
                            </Text>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.iconButton}>
                    <ArrowLeft size={24} color="white" />
                </Pressable>
                <Text style={styles.headerTitle}>Manage Request</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Status Banner */}
                    <View style={[styles.statusBanner, { backgroundColor: getStatusColor(request.status) + '33', borderColor: getStatusColor(request.status) }]}>
                        <Info size={18} color={getStatusColor(request.status)} />
                        <Text style={[styles.statusBannerText, { color: getStatusColor(request.status) }]}>
                            Status: {request.status.toUpperCase()}
                        </Text>
                    </View>

                    {/* Request Info Cards */}
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Talent / Artist</Text>
                        <View style={styles.infoRow}>
                            <User size={18} color={COLORS.primary} />
                            <Text style={styles.infoText}>{request.acts?.name || request.acts?.title || 'Unknown'}</Text>
                        </View>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Client Details</Text>
                        <View style={styles.infoRow}>
                            <User size={18} color={COLORS.textDim} />
                            <Text style={styles.infoText}>{request.client_name}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Mail size={18} color={COLORS.textDim} />
                            <Text style={styles.infoText}>{request.client_email}</Text>
                        </View>
                        {request.client_phone && (
                            <View style={styles.infoRow}>
                                <Phone size={18} color={COLORS.textDim} />
                                <Text style={styles.infoText}>{request.client_phone}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Event Details</Text>
                        <View style={styles.infoRow}>
                            <Calendar size={18} color={COLORS.textDim} />
                            <Text style={styles.infoText}>{request.event_dates?.join(', ') || 'N/A'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Clock size={18} color={COLORS.textDim} />
                            <Text style={styles.infoText}>{request.start_time || 'N/A'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <MapPin size={18} color={COLORS.textDim} />
                            <Text style={styles.infoText}>{request.location_text || 'No location set'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Info size={18} color={COLORS.textDim} />
                            <Text style={styles.infoText}>{request.event_type} • {request.guests_count} guests</Text>
                        </View>
                    </View>

                    {request.notes && (
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Client Notes</Text>
                            <Text style={styles.notesText}>{request.notes}</Text>
                        </View>
                    )}

                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Financials (€)</Text>
                        <View style={styles.priceRow}>
                            <Text style={styles.priceLabel}>Artist Fee</Text>
                            <Text style={styles.priceValue}>{request.artist_fee?.toLocaleString()}</Text>
                        </View>
                        <View style={styles.priceRow}>
                            <Text style={styles.priceLabel}>Platform Fee (20%)</Text>
                            <Text style={styles.priceValue}>{(request.total_amount - request.artist_fee)?.toLocaleString()}</Text>
                        </View>
                        <View style={[styles.priceRow, styles.totalRow]}>
                            <Text style={styles.totalLabel}>Grand Total</Text>
                            <Text style={styles.totalValue}>€{request.total_amount?.toLocaleString()}</Text>
                        </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.actionsContainer}>
                        <Text style={styles.sectionTitle}>Admin Actions</Text>
                        <View style={styles.actionButtons}>
                            <Pressable 
                                style={[styles.actionBtn, { borderColor: '#4CAF50' }]} 
                                onPress={() => updateStatus('accepted')}
                                disabled={updatingStatus}
                            >
                                <CheckCircle size={20} color="#4CAF50" />
                                <Text style={[styles.actionBtnText, { color: '#4CAF50' }]}>Accept</Text>
                            </Pressable>
                            <Pressable 
                                style={[styles.actionBtn, { borderColor: '#F44336' }]} 
                                onPress={() => updateStatus('declined')}
                                disabled={updatingStatus}
                            >
                                <XCircle size={20} color="#F44336" />
                                <Text style={[styles.actionBtnText, { color: '#F44336' }]}>Decline</Text>
                            </Pressable>
                            <Pressable 
                                style={[styles.actionBtn, { borderColor: '#2196F3' }]} 
                                onPress={() => updateStatus('paid')}
                                disabled={updatingStatus}
                            >
                                <CreditCard size={20} color="#2196F3" />
                                <Text style={[styles.actionBtnText, { color: '#2196F3' }]}>Mark Paid</Text>
                            </Pressable>
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
                                <Text style={styles.emptyChat}>No messages yet</Text>
                            ) : (
                                messages.map((msg, index) => (
                                    <View key={msg.id} style={{ marginBottom: 4 }}>
                                        {renderMessage({ item: msg, index })}
                                    </View>
                                ))
                            )}
                        </View>
                    </View>
                </ScrollView>

                {/* Sticky Message Input */}
                <View style={styles.inputArea}>
                    <TextInput
                        style={styles.input}
                        value={newMessage}
                        onChangeText={setNewMessage}
                        placeholder="Type a message to the client..."
                        placeholderTextColor={COLORS.textDim}
                        multiline
                    />
                    <Pressable 
                        style={[styles.sendButton, (!newMessage.trim() || sending) && { opacity: 0.5 }]} 
                        onPress={handleSendMessage}
                        disabled={!newMessage.trim() || sending}
                    >
                        {sending ? <ActivityIndicator size="small" color="black" /> : <Send size={20} color="black" />}
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.m, height: 60, borderBottomWidth: 1, borderBottomColor: '#222' },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    iconButton: { padding: 8 },
    scrollContent: { padding: SPACING.m, paddingBottom: 100 },
    statusBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 20, gap: 10 },
    statusBannerText: { fontWeight: 'bold', fontSize: 14 },
    card: { backgroundColor: '#111', padding: 20, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#222' },
    sectionTitle: { color: COLORS.primary, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
    infoText: { color: 'white', fontSize: 15 },
    notesText: { color: 'white', fontSize: 14, fontStyle: 'italic', lineHeight: 20 },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    priceLabel: { color: COLORS.textDim, fontSize: 14 },
    priceValue: { color: 'white', fontSize: 14, fontWeight: '500' },
    totalRow: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#222' },
    totalLabel: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    totalValue: { color: COLORS.primary, fontSize: 18, fontWeight: 'bold' },
    actionsContainer: { marginBottom: 24, paddingHorizontal: 4 },
    actionButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, gap: 8, backgroundColor: 'rgba(255,255,255,0.05)' },
    actionBtnText: { fontWeight: 'bold', fontSize: 13 },
    chatSection: { marginTop: 20 },
    chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
    chatTitle: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    chatContainer: { paddingBottom: 20 },
    messageBubble: { padding: 12, borderRadius: 12, maxWidth: '85%' },
    myMessage: { alignSelf: 'flex-end', backgroundColor: COLORS.primary, borderBottomRightRadius: 2 },
    theirMessage: { alignSelf: 'flex-start', backgroundColor: '#1A1A1A', borderBottomLeftRadius: 2, borderWidth: 1, borderColor: '#333' },
    messageRole: { fontSize: 10, fontWeight: '900', marginBottom: 4 },
    messageText: { fontSize: 14, lineHeight: 20 },
    messageFooter: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 4, gap: 4 },
    messageTime: { fontSize: 10 },
    readStatus: { fontSize: 10, fontWeight: '600' },
    dateSeparator: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
    dateLine: { flex: 1, height: 1, backgroundColor: '#222' },
    dateText: { color: '#666', fontSize: 11, fontWeight: '700', marginHorizontal: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
    emptyChat: { color: COLORS.textDim, textAlign: 'center', marginTop: 20, fontStyle: 'italic' },
    inputArea: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#000', borderTopWidth: 1, borderTopColor: '#222', gap: 10, paddingBottom: Platform.OS === 'ios' ? 20 : 12 },
    input: { flex: 1, backgroundColor: '#111', color: 'white', padding: 12, borderRadius: 12, maxHeight: 100, fontSize: 14 },
    sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
    backButtonInline: { marginTop: 15, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary }
});
