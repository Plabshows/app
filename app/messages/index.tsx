import { useRouter } from 'expo-router';
import { ArrowLeft, Send, Info } from 'lucide-react-native';
import React, { useEffect, useState, useRef } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
    Keyboard,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { supabase } from '../../src/lib/supabase';

type Message = {
    id: string;
    sender_id: string;
    receiver_id: string | null;
    content: string;
    status: 'unread' | 'read' | 'resolved';
    created_at: string;
};

export default function GeneralMessages() {
    const router = useRouter();
    const { user } = useAuth();
    
    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (user) {
            fetchMessages();
            subscribeToMessages();
        }
    }, [user]);

    const ADMIN_ID = 'cbc605d5-518d-4fab-94e4-3d3cda8cf833';

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
        } catch (err) {
            console.error('Fetch Messages Error:', err);
        } finally {
            setLoading(false);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 300);
        }
    };

    const subscribeToMessages = () => {
        if (!user) return;
        const channel = supabase
            .channel(`user_messages_${user.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
            }, (payload) => {
                const newMsg = payload.new as Message;
                if (newMsg.sender_id === user.id || newMsg.receiver_id === user.id) {
                    setMessages(prev => {
                        if (prev.find(m => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });
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
                    receiver_id: ADMIN_ID,
                    content: newMessage.trim(),
                    status: 'unread'
                });
            if (error) throw error;
            setNewMessage('');
            Keyboard.dismiss();
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setSending(false);
        }
    };

    if (loading) return <View style={styles.centered}><ActivityIndicator color={COLORS.primary} size="large" /></View>;

    const isMe = (msg: Message) => msg.sender_id === user?.id;

    const renderMessage = ({ item, index }: { item: Message; index: number }) => {
        const me = isMe(item);
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
                <View style={{ alignItems: 'center' }}>
                    <Text style={styles.headerTitle}>Concierge Support</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' }} />
                        <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '700' }}>ONLINE</Text>
                    </View>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    ListHeaderComponent={() => (
                        <View style={styles.infoCard}>
                            <Info size={16} color={COLORS.primary} />
                            <Text style={styles.infoText}>Explain your issue to our concierge team. We usually reply in a few hours.</Text>
                        </View>
                    )}
                />
                <View style={styles.inputArea}>
                    <TextInput
                        style={styles.input}
                        placeholder="Type here..."
                        placeholderTextColor="#666"
                        value={newMessage}
                        onChangeText={setNewMessage}
                        multiline
                    />
                    <Pressable onPress={handleSendMessage} style={[styles.sendBtn, (!newMessage.trim() || sending) && { opacity: 0.5 }]}>
                         <Send size={20} color="#000" />
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
    headerTitle: { fontSize: 18, color: 'white', fontWeight: 'bold' },
    iconButton: { padding: 8 },
    list: { padding: 16 },
    messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 12 },
    myMessage: { alignSelf: 'flex-end', backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
    theirMessage: { alignSelf: 'flex-start', backgroundColor: '#222', borderBottomLeftRadius: 4 },
    messageText: { fontSize: 15, lineHeight: 20 },
    messageFooter: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 4, gap: 4 },
    messageTime: { fontSize: 10 },
    readStatus: { fontSize: 10, fontWeight: '600' },
    inputArea: { flexDirection: 'row', padding: 12, backgroundColor: '#111', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#222' },
    input: { flex: 1, backgroundColor: '#222', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: 'white', marginRight: 10 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    infoCard: { flexDirection: 'row', backgroundColor: 'rgba(139,92,246,0.1)', padding: 12, borderRadius: 8, marginBottom: 20, gap: 8 },
    infoText: { color: COLORS.textDim, fontSize: 12, flex: 1 },
    dateSeparator: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, paddingHorizontal: 20 },
    dateLine: { flex: 1, height: 1, backgroundColor: '#222' },
    dateText: { color: '#666', fontSize: 11, fontWeight: '700', marginHorizontal: 12, textTransform: 'uppercase', letterSpacing: 0.5 }
});
