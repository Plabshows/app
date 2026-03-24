import AuthGate from '@/src/components/AuthGate';
import { useAuth } from '@/src/context/AuthContext';
import { Info, Send, Shield } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../src/constants/theme';
import { supabase } from '../../src/lib/supabase';

const ADMIN_ID = 'cbc605d5-518d-4fab-94e4-3d3cda8cf833';

type Message = {
    id: string;
    sender_id: string;
    receiver_id: string | null;
    content: string;
    status: 'unread' | 'read' | 'resolved';
    created_at: string;
};

function SupportChat() {
    const { user, profile } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (!user) return;
        fetchMessages();

        const channel = supabase
            .channel(`support_tab_${user.id}`)
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
                    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
                    // Mark incoming messages as read
                    if (msg.receiver_id === user.id) {
                        supabase.from('messages').update({ status: 'read' }).eq('id', msg.id).then(() => {});
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

        return () => { supabase.removeChannel(channel).catch(console.error); };
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
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 300);
        } catch (err) {
            console.error('fetchMessages Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!newMessage.trim() || !user || sending) return;
        setSending(true);
        const content = newMessage.trim();
        setNewMessage('');
        Keyboard.dismiss();
        try {
            const { error } = await supabase.from('messages').insert({
                sender_id: user.id,
                receiver_id: ADMIN_ID,
                content,
                status: 'unread',
            });
            if (error) throw error;
        } catch (e: any) {
            Alert.alert('Error', e.message);
            setNewMessage(content); // restore on failure
        } finally {
            setSending(false);
        }
    };

    const renderMessage = ({ item, index }: { item: Message; index: number }) => {
        const me = item.sender_id === user?.id;
        const prevMsg = index > 0 ? messages[index - 1] : null;
        const showDate = !prevMsg ||
            new Date(item.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();

        const formatDate = () => {
            const d = new Date(item.created_at);
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);
            if (d.toDateString() === today.toDateString()) return 'Today';
            if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
            return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
        };

        return (
            <View>
                {showDate && (
                    <View style={styles.dateSep}>
                        <View style={styles.dateLine} />
                        <Text style={styles.dateText}>{formatDate()}</Text>
                        <View style={styles.dateLine} />
                    </View>
                )}
                <View style={[styles.bubble, me ? styles.myBubble : styles.theirBubble]}>
                    {!me && (
                        <View style={styles.adminLabel}>
                            <Shield size={10} color={COLORS.primary} />
                            <Text style={styles.adminLabelText}>Concierge</Text>
                        </View>
                    )}
                    <Text style={[styles.bubbleText, { color: me ? '#000' : '#FFF' }]}>{item.content}</Text>
                    <View style={styles.bubbleMeta}>
                        <Text style={[styles.bubbleTime, { color: me ? 'rgba(0,0,0,0.45)' : '#666' }]}>
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        {me && item.status === 'read' && (
                            <Text style={[styles.bubbleTime, { color: 'rgba(0,0,0,0.5)' }]}> • Read</Text>
                        )}
                    </View>
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
                contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                ListHeaderComponent={() => (
                    <View style={styles.infoCard}>
                        <Info size={14} color={COLORS.primary} />
                        <Text style={styles.infoText}>Chat directly with our Concierge team. We typically respond within a few hours.</Text>
                    </View>
                )}
                ListEmptyComponent={() => (
                    <View style={styles.empty}>
                        <Text style={styles.emptyIcon}>💬</Text>
                        <Text style={styles.emptyTitle}>No messages yet</Text>
                        <Text style={styles.emptySubtitle}>Send us a message and we'll get back to you shortly.</Text>
                    </View>
                )}
            />

            {/* Input */}
            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    placeholder="Message the Concierge team..."
                    placeholderTextColor="#555"
                    value={newMessage}
                    onChangeText={setNewMessage}
                    multiline
                    maxLength={2000}
                    onSubmitEditing={Platform.OS === 'web' ? handleSend : undefined}
                />
                <Pressable
                    onPress={handleSend}
                    disabled={!newMessage.trim() || sending}
                    style={[styles.sendBtn, (!newMessage.trim() || sending) && { opacity: 0.4 }]}
                >
                    {sending
                        ? <ActivityIndicator size="small" color="#000" />
                        : <Send size={18} color="#000" />
                    }
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}

export default function MessagesScreen() {
    const { user, profile, loading } = useAuth();

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
                title="Concierge Chat"
                subtitle="Sign in to chat directly with our support team about bookings, payments, or anything else."
            />
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.avatarCircle}>
                        <Shield size={20} color={COLORS.primary} />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>Concierge Support</Text>
                        <View style={styles.onlineRow}>
                            <View style={styles.onlineDot} />
                            <Text style={styles.onlineText}>Team Online</Text>
                        </View>
                    </View>
                </View>
            </View>

            <SupportChat />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1A1A1A',
        backgroundColor: '#050505',
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatarCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(139,92,246,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    headerTitle: { color: 'white', fontWeight: '700', fontSize: 16 },
    onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' },
    onlineText: { color: '#10B981', fontSize: 11, fontWeight: '600' },

    infoCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(139,92,246,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(139,92,246,0.2)',
        padding: 12,
        borderRadius: 10,
        marginBottom: 20,
        gap: 8,
        alignItems: 'flex-start',
    },
    infoText: { color: COLORS.textDim, fontSize: 12, flex: 1, lineHeight: 18 },

    bubble: {
        maxWidth: '82%',
        padding: 12,
        borderRadius: 18,
        marginBottom: 6,
    },
    myBubble: {
        alignSelf: 'flex-end',
        backgroundColor: COLORS.primary,
        borderBottomRightRadius: 4,
    },
    theirBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#1A1A1A',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#2A2A2A',
    },
    adminLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
    adminLabelText: { color: COLORS.primary, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    bubbleText: { fontSize: 15, lineHeight: 21 },
    bubbleMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, alignSelf: 'flex-end' },
    bubbleTime: { fontSize: 10 },

    dateSep: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
    dateLine: { flex: 1, height: 1, backgroundColor: '#1A1A1A' },
    dateText: { color: '#555', fontSize: 10, fontWeight: '700', marginHorizontal: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

    empty: { alignItems: 'center', justifyContent: 'center', flex: 1, paddingTop: 80 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { color: 'white', fontWeight: '700', fontSize: 18, marginBottom: 8 },
    emptySubtitle: { color: COLORS.textDim, textAlign: 'center', lineHeight: 20, paddingHorizontal: 32 },

    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: '#1A1A1A',
        backgroundColor: '#050505',
    },
    input: {
        flex: 1,
        backgroundColor: '#1A1A1A',
        color: 'white',
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 15,
        maxHeight: 120,
        borderWidth: 1,
        borderColor: '#2A2A2A',
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
