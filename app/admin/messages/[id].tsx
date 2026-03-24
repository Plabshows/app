import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
    ArrowLeft, 
    Send, 
    User,
    Mail,
    Phone,
    Info
} from 'lucide-react-native';
import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View, Keyboard, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../../src/constants/theme';
import { useAuth } from '../../../src/context/AuthContext';
import { supabase } from '../../../src/lib/supabase';
import Toast from 'react-native-toast-message';

type Profile = {
    id: string;
    name: string;
    email: string;
    avatar_url: string;
    role: string;
    phone?: string;
};

type Message = {
    id: string;
    sender_id: string;
    receiver_id: string | null;
    content: string;
    status: 'unread' | 'read' | 'resolved';
    created_at: string;
};

export default function AdminConversationDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    
    const [loading, setLoading] = useState(true);
    const [otherUser, setOtherUser] = useState<Profile | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (id) {
            fetchOtherUserProfile();
            fetchMessages();
            subscribeToMessages();
            markMessagesAsRead();
        }
    }, [id]);

    const fetchOtherUserProfile = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            setOtherUser(data);
        } catch (err) {
            console.error('Error fetching profile:', err);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Could not load user profile' });
        } finally {
            setLoading(false);
        }
    };

    const markMessagesAsRead = async () => {
        if (!user || !id) return;
        
        await supabase
            .from('messages')
            .update({ status: 'read' })
            .eq('sender_id', id)
            .eq('receiver_id', user.id)
            .eq('status', 'unread');
    };

    const handleMarkResolved = async () => {
        if (!id) return;
        
        try {
            const { error } = await supabase
                .from('messages')
                .update({ status: 'resolved' })
                .or(`sender_id.eq.${id},receiver_id.eq.${id}`);

            if (error) throw error;
            Toast.show({ type: 'success', text1: 'Success', text2: 'Thread marked as resolved' });
            fetchMessages();
        } catch (err: any) {
            Alert.alert('Error', err.message);
        }
    };

    const fetchMessages = async () => {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${id},receiver_id.eq.${user?.id}),and(sender_id.eq.${user?.id},receiver_id.eq.${id})`)
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            setMessages(data || []);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 300);
        } catch (err) {
            console.error('Error fetching messages:', err);
        }
    };

    const subscribeToMessages = () => {
        const channel = supabase
            .channel(`messages_detail_${id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
            }, (payload) => {
                const newMsg = payload.new as Message;
                // Check if message belongs to this conversation
                if ((newMsg.sender_id === id && newMsg.receiver_id === user?.id) || 
                    (newMsg.sender_id === user?.id && newMsg.receiver_id === id)) {
                    setMessages(prev => {
                        if (prev.find(m => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });
                    if (newMsg.sender_id === id) markMessagesAsRead();
                    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !user) return;
        
        setSending(true);
        try {
            const { error } = await supabase
                .from('messages')
                .insert({
                    sender_id: user.id,
                    receiver_id: id,
                    content: newMessage.trim(),
                    status: 'read'
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

    if (loading) return (
        <View style={styles.centered}>
            <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
    );

    if (!otherUser) return (
        <View style={styles.centered}>
            <Text style={{ color: COLORS.textDim }}>User not found</Text>
            <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
                <Text style={{ color: COLORS.primary }}>Go Back</Text>
            </Pressable>
        </View>
    );

    const isThreadResolved = messages.some(m => m.status === 'resolved');

    const renderMessage = ({ item, index }: { item: Message; index: number }) => {
        const me = item.sender_id === user?.id;
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
                <View style={[styles.messageBubble, me ? styles.myMessage : styles.theirMessage]}>
                    <Text style={[styles.messageText, { color: me ? '#000' : '#FFF' }]}>{item.content}</Text>
                    <View style={styles.messageFooter}>
                        <Text style={[styles.messageTime, { color: me ? 'rgba(0,0,0,0.45)' : COLORS.textDim }]}>
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        {me && (
                            <Text style={[styles.readStatus, { color: item.status === 'read' ? '#000' : 'rgba(0,0,0,0.3)' }]}>
                                {item.status === 'read' ? ' • Read' : ''}
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
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{otherUser.name || otherUser.email}</Text>
                    <Text style={styles.headerSubtitle}>{otherUser.role?.toUpperCase() || 'USER'}</Text>
                </View>
                {!isThreadResolved && (
                    <Pressable 
                        onPress={handleMarkResolved}
                        style={[styles.statusBadge, { backgroundColor: '#333', borderColor: COLORS.primary, borderWidth: 1 }]}
                    >
                        <Text style={{ color: COLORS.primary, fontSize: 10, fontWeight: 'bold' }}>RESOLVE</Text>
                    </Pressable>
                )}
            </View>

            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.messagesList}
                    ListHeaderComponent={() => (
                        <View style={styles.infoCard}>
                            <Info size={16} color={COLORS.primary} />
                            <Text style={styles.infoText}>Supporting {otherUser.name} ({otherUser.role}).</Text>
                        </View>
                    )}
                />

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Type a message..."
                        placeholderTextColor="#666"
                        value={newMessage}
                        onChangeText={setNewMessage}
                        multiline
                    />
                    <Pressable 
                        style={[styles.sendButton, (!newMessage.trim() || sending) && { opacity: 0.5 }]}
                        onPress={handleSendMessage}
                        disabled={!newMessage.trim() || sending}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color="#000" />
                        ) : (
                            <Send size={20} color="#000" />
                        )}
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        padding: SPACING.m, 
        borderBottomWidth: 1, 
        borderBottomColor: '#222',
        backgroundColor: '#111'
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
    headerSubtitle: { fontSize: 10, color: COLORS.primary, fontWeight: 'bold' },
    iconButton: { padding: 8 },
    messagesList: { padding: SPACING.m, paddingBottom: SPACING.xl },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
        marginBottom: 12,
    },
    myMessage: {
        alignSelf: 'flex-end',
        backgroundColor: COLORS.primary,
        borderBottomRightRadius: 4,
    },
    theirMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#222',
        borderBottomLeftRadius: 4,
    },
    messageText: { fontSize: 16, lineHeight: 22 },
    messageFooter: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 4, gap: 4 },
    messageTime: { fontSize: 10 },
    readStatus: { fontSize: 10, fontWeight: '600' },
    dateSeparator: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, paddingHorizontal: 20 },
    dateLine: { flex: 1, height: 1, backgroundColor: '#222' },
    dateText: { color: '#666', fontSize: 11, fontWeight: '700', marginHorizontal: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
    inputContainer: {
        flexDirection: 'row',
        padding: SPACING.m,
        backgroundColor: '#111',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#222'
    },
    input: {
        flex: 1,
        backgroundColor: '#222',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        color: 'white',
        maxHeight: 100,
        marginRight: 10
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center'
    },
    infoCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.primary + '33',
        marginBottom: 20,
        alignItems: 'center',
        gap: 8
    },
    infoText: { color: COLORS.textDim, fontSize: 12, flex: 1 },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
