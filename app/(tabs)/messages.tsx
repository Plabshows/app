import AuthGate from '@/src/components/AuthGate';
import { useAuth } from '@/src/context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { 
    Info, 
    Send, 
    Shield, 
    Check, 
    CheckCheck, 
    MessageCircle, 
    Calendar, 
    MapPin, 
    Users, 
    Zap, 
    ExternalLink, 
    CheckCircle, 
    XCircle, 
    CreditCard 
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../src/constants/theme';
import { supabase } from '../../src/lib/supabase';
import { useRouter } from 'expo-router';

const ADMIN_ID = 'cbc605d5-518d-4fab-94e4-3d3cda8cf833';

type Message = {
    id: string;
    sender_id: string;
    receiver_id: string | null;
    content: string;
    type?: 'text' | 'booking_summary' | 'booking_status';
    metadata?: any;
    status: 'unread' | 'read' | 'resolved';
    created_at: string;
};

function SupportChat() {
    const { user } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (!user) return;
        fetchMessages();

        const channel = supabase
            .channel(`support_unified_${user.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
            }, (payload) => {
                const msg = payload.new as Message;
                if (msg.sender_id === user.id || msg.receiver_id === user.id) {
                    setMessages(prev => {
                        if (prev.find(m => m.id === msg.id)) return prev;
                        return [...prev, msg];
                    });
                    
                    if (msg.receiver_id === user.id) {
                        supabase.from('messages')
                            .update({ status: 'read' })
                            .eq('id', msg.id)
                            .then(() => {});
                    }
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'messages',
            }, (payload) => {
                const updated = payload.new as Message;
                setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel).catch(console.error);
        };
    }, [user]);

    const fetchMessages = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            setMessages(data || []);
            
            const unreadIds = (data || [])
                .filter(m => m.receiver_id === user.id && m.status === 'unread')
                .map(m => m.id);
            
            if (unreadIds.length > 0) {
                await supabase.from('messages')
                    .update({ status: 'read' })
                    .in('id', unreadIds);
            }
        } catch (err) {
            console.error('fetchMessages Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!newMessage.trim() || !user || sending) return;
        
        const content = newMessage.trim();
        setNewMessage('');
        Keyboard.dismiss();

        const optimisticId = Math.random().toString();
        const optimisticMsg: Message = {
            id: optimisticId,
            sender_id: user.id,
            receiver_id: ADMIN_ID,
            content,
            type: 'text',
            status: 'unread',
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setSending(true);

        try {
            const { error } = await supabase.from('messages').insert({
                sender_id: user.id,
                receiver_id: ADMIN_ID,
                content,
                type: 'text',
                status: 'unread',
            });
            if (error) throw error;
        } catch (e: any) {
            setMessages(prev => prev.filter(m => m.id !== optimisticId));
            Alert.alert('Error', e.message || 'Failed to send message');
            setNewMessage(content);
        } finally {
            setSending(false);
        }
    };

    const renderBookingSummaryCard = (item: Message) => {
        const meta = item.metadata;
        if (!meta) return null;

        return (
            <View style={styles.bookingCard}>
                <View style={styles.bookingCardHeader}>
                    <View style={styles.bookingLabel}>
                        <Zap size={14} color="#000" />
                        <Text style={styles.bookingLabelText}>CONFIRMED REQUEST</Text>
                    </View>
                    <Text style={styles.bookingRef}>Ref: #{item.id.slice(0, 8)}</Text>
                </View>

                <Text style={styles.bookingTitle}>{meta.event_type || 'Booking Request'}</Text>
                
                <View style={styles.bookingStats}>
                    <View style={styles.statItem}>
                        <Calendar size={14} color={COLORS.primary} />
                        <Text style={styles.statText}>{meta.event_dates?.[0] || 'TBD'}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <MapPin size={14} color={COLORS.primary} />
                        <Text style={styles.statText} numberOfLines={1}>{meta.location_text || 'TBD'}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Users size={14} color={COLORS.primary} />
                        <Text style={styles.statText}>{meta.guests_count || 0} Guests</Text>
                    </View>
                </View>

                <View style={styles.bookingBudget}>
                    <Text style={styles.budgetText}>Budget: <Text style={styles.budgetAmount}>AED {meta.budget_amount || 'TBD'}</Text></Text>
                </View>

                {meta.notes && (
                    <Text style={styles.bookingNotes} numberOfLines={2}>
                        "{meta.notes}"
                    </Text>
                )}

                <Pressable 
                    onPress={() => router.push('/(tabs)/bookings')}
                    style={styles.manageBtn}
                >
                    <Text style={styles.manageBtnText}>Manage Booking</Text>
                    <ExternalLink size={14} color="#000" />
                </Pressable>
            </View>
        );
    };

    const renderStatusUpdateCard = (item: Message) => {
        const meta = item.metadata;
        if (!meta) return null;

        const getStatusStyles = (status: string) => {
            switch (status?.toLowerCase()) {
                case 'accepted': return { color: '#4CAF50', icon: <CheckCircle size={16} color="#4CAF50" /> };
                case 'declined': return { color: '#F44336', icon: <XCircle size={16} color="#F44336" /> };
                case 'paid': return { color: '#2196F3', icon: <CreditCard size={16} color="#2196F3" /> };
                default: return { color: COLORS.primary, icon: <Info size={16} color={COLORS.primary} /> };
            }
        };

        const { color, icon } = getStatusStyles(meta.status || '');

        return (
            <View style={[styles.statusCard, { borderColor: color }]}>
                <View style={styles.statusHeader}>
                    {icon}
                    <Text style={[styles.statusTitle, { color }]}>
                        BOOKING {meta.status?.toUpperCase() || 'UPDATE'}
                    </Text>
                </View>
                <Text style={styles.statusContent}>{item.content}</Text>
                <Pressable 
                    onPress={() => router.push('/(tabs)/bookings')}
                    style={styles.statusAction}
                >
                    <Text style={styles.statusActionText}>View Details</Text>
                </Pressable>
            </View>
        );
    };

    const renderMessage = ({ item, index }: { item: Message; index: number }) => {
        const isMe = item.sender_id === user?.id;
        const prevMsg = index > 0 ? messages[index - 1] : null;
        const showDate = !prevMsg || 
            new Date(item.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();

        const formatTime = (dateStr: string) => {
            return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        };

        const formatDate = (dateStr: string) => {
            const d = new Date(dateStr);
            const now = new Date();
            if (d.toDateString() === now.toDateString()) return 'Today';
            const yesterday = new Date();
            yesterday.setDate(now.getDate() - 1);
            if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
            return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
        };

        return (
            <View style={styles.messageContainer}>
                {showDate && (
                    <View style={styles.dateHeader}>
                        <View style={styles.dateLine} />
                        <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                        <View style={styles.dateLine} />
                    </View>
                )}
                
                <View style={[styles.bubbleWrapper, isMe ? styles.myWrapper : styles.theirWrapper]}>
                    {item.type === 'booking_summary' ? (
                        renderBookingSummaryCard(item)
                    ) : item.type === 'booking_status' ? (
                        renderStatusUpdateCard(item)
                    ) : isMe ? (
                        <LinearGradient
                            colors={[COLORS.primary, '#9BEC00']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[styles.bubble, styles.myBubble]}
                        >
                            <Text style={styles.myText}>{item.content}</Text>
                            <View style={styles.metaRow}>
                                <Text style={styles.myTime}>{formatTime(item.created_at)}</Text>
                                {item.status === 'read' ? (
                                    <CheckCheck size={12} color="rgba(0,0,0,0.5)" />
                                ) : (
                                    <Check size={12} color="rgba(0,0,0,0.5)" />
                                )}
                            </View>
                        </LinearGradient>
                    ) : (
                        <View style={[styles.bubble, styles.theirBubble]}>
                            <View style={styles.conciergeLabel}>
                                <Shield size={10} color={COLORS.primary} />
                                <Text style={styles.conciergeText}>CONCIERGE SUPPORT</Text>
                            </View>
                            <Text style={styles.theirText}>{item.content}</Text>
                            <Text style={styles.theirTime}>{formatTime(item.created_at)}</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={item => item.id}
                contentContainerStyle={[styles.listContent, { paddingBottom: 40 }]}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                ListHeaderComponent={() => (
                    <View style={styles.summaryCard}>
                        <LinearGradient
                            colors={['rgba(155,236,0,0.1)', 'transparent']}
                            style={styles.summaryGradient}
                        />
                        <Info size={16} color={COLORS.primary} />
                        <Text style={styles.summaryText}>
                            Chat directly with our Concierge team. We typically respond within a few hours.
                        </Text>
                    </View>
                )}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconCircle}>
                            <MessageCircle size={40} color={COLORS.primary} />
                        </View>
                        <Text style={styles.emptyTitle}>No messages yet</Text>
                        <Text style={styles.emptySubtitle}>Send us a message and we'll get back to you shortly.</Text>
                    </View>
                )}
            />

            <View style={[
                styles.inputArea,
                { paddingBottom: Math.max(insets.bottom, 16) + 65 }
            ]}>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Type a message..."
                        placeholderTextColor="#666"
                        value={newMessage}
                        onChangeText={setNewMessage}
                        multiline
                        maxLength={1000}
                        onSubmitEditing={Platform.OS === 'web' ? handleSend : undefined}
                    />
                    <Pressable
                        onPress={handleSend}
                        disabled={!newMessage.trim() || sending}
                        style={[
                            styles.sendButton,
                            (!newMessage.trim() || sending) && styles.sendButtonDisabled
                        ]}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color="#000" />
                        ) : (
                            <Send size={20} color="#000" />
                        )}
                    </Pressable>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

export default function MessagesScreen() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <View style={[styles.centered, { backgroundColor: COLORS.background }]}>
                <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
        );
    }

    if (!user) {
        return (
            <AuthGate
                title="Unified Support"
                subtitle="Sign in to chat with our Concierge and manage all your platform notifications in one place."
            />
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <LinearGradient
                colors={['#111', '#050505']}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <View style={styles.adminAvatar}>
                        <Shield size={24} color={COLORS.primary} />
                        <View style={styles.activeDot} />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>Concierge Support</Text>
                        <Text style={styles.headerSubtitle}>Team Online</Text>
                    </View>
                </View>
            </LinearGradient>

            <SupportChat />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
    },
    headerContent: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    adminAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#1A1A1A',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: COLORS.primary,
    },
    activeDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#10B981',
        borderWidth: 2,
        borderColor: '#111',
    },
    headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },
    headerSubtitle: { color: COLORS.primary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

    listContent: { padding: 16 },
    summaryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        gap: 12,
        borderWidth: 1,
        borderColor: '#222',
        overflow: 'hidden',
    },
    summaryGradient: { ...StyleSheet.absoluteFillObject },
    summaryText: { color: COLORS.textDim, fontSize: 13, flex: 1, lineHeight: 20 },

    messageContainer: { marginBottom: 16 },
    dateHeader: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, opacity: 0.3 },
    dateLine: { flex: 1, height: 1, backgroundColor: '#FFF' },
    dateText: { color: '#FFF', fontSize: 11, fontWeight: '800', marginHorizontal: 16, letterSpacing: 1 },

    bubbleWrapper: { maxWidth: '85%' },
    myWrapper: { alignSelf: 'flex-end' },
    theirWrapper: { alignSelf: 'flex-start' },
    bubble: { padding: 14, borderRadius: 20 },
    myBubble: { borderBottomRightRadius: 4, elevation: 4 },
    theirBubble: { backgroundColor: '#1A1A1A', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#2A2A2A' },
    
    myText: { color: '#000', fontSize: 15, fontWeight: '500', lineHeight: 22 },
    theirText: { color: '#FFF', fontSize: 15, lineHeight: 22 },
    
    conciergeLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    conciergeText: { color: COLORS.primary, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
    
    metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 },
    myTime: { fontSize: 10, color: 'rgba(0,0,0,0.4)', fontWeight: '600' },
    theirTime: { fontSize: 10, color: '#666', marginTop: 4, textAlign: 'right' },

    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
    emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#222' },
    emptyTitle: { color: '#FFF', fontSize: 20, fontWeight: '800', marginBottom: 8 },
    emptySubtitle: { color: COLORS.textDim, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },

    inputArea: { padding: 16, borderTopWidth: 1, borderTopColor: '#222', backgroundColor: '#050505' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 28, paddingHorizontal: 6, paddingVertical: 6, borderWidth: 1, borderColor: '#2A2A2A' },
    textInput: { flex: 1, color: '#FFF', fontSize: 15, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 120 },
    sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    sendButtonDisabled: { opacity: 0.5 },

    // Booking Card Styles
    bookingCard: {
        backgroundColor: '#111',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        width: '100%',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    bookingCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    bookingLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        gap: 6,
    },
    bookingLabelText: {
        color: '#000',
        fontSize: 10,
        fontWeight: '900',
    },
    bookingRef: {
        color: COLORS.textDim,
        fontSize: 10,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    bookingTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 12,
    },
    bookingStats: {
        gap: 8,
        marginBottom: 16,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statText: {
        color: COLORS.textDim,
        fontSize: 13,
        fontWeight: '500',
    },
    bookingBudget: {
        backgroundColor: '#1A1A1A',
        padding: 10,
        borderRadius: 8,
        marginBottom: 12,
    },
    budgetText: {
        color: COLORS.textDim,
        fontSize: 12,
    },
    budgetAmount: {
        color: COLORS.primary,
        fontWeight: '800',
        fontSize: 14,
    },
    bookingNotes: {
        color: '#666',
        fontSize: 12,
        fontStyle: 'italic',
        lineHeight: 18,
        marginBottom: 16,
    },
    manageBtn: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 8,
    },
    manageBtnText: {
        color: '#000',
        fontSize: 14,
        fontWeight: '800',
    },

    // Status Card Styles
    statusCard: {
        backgroundColor: '#111',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        width: '100%',
    },
    statusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    statusTitle: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
    },
    statusContent: {
        color: '#FFF',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 10,
    },
    statusAction: {
        alignSelf: 'flex-start',
        paddingVertical: 4,
        paddingHorizontal: 8,
        backgroundColor: '#222',
        borderRadius: 4,
    },
    statusActionText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
    },
});
