import { COLORS } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';
import { CheckCircle, Mail, MessageCircle, Send } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Platform, Pressable, ScrollView,
    StyleSheet, Text, TextInput, View
} from 'react-native';
import Toast from 'react-native-toast-message';

export default function MessagesPage() {
    const { profile, user } = useAuth();
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadHistory = useCallback(async () => {
        if (!user?.id) return;
        try {
            // Get or create a support conversation for this client
            const { data: conv } = await supabase
                .from('conversations')
                .select('id')
                .eq('user_id', user.id)
                .eq('type', 'support')
                .maybeSingle();

            if (conv) {
                const { data: msgs } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('conversation_id', conv.id)
                    .order('created_at', { ascending: false })
                    .limit(20);
                setHistory(msgs || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => { loadHistory(); }, [loadHistory]);

    const handleSend = async () => {
        if (!message.trim()) { Toast.show({ type: 'error', text1: 'Please write a message.' }); return; }
        setSending(true);
        try {
            // Get or create support conversation
            let convId: string;
            const { data: existing } = await supabase
                .from('conversations')
                .select('id')
                .eq('user_id', user!.id)
                .eq('type', 'support')
                .maybeSingle();

            if (existing) {
                convId = existing.id;
            } else {
                const { data: newConv, error } = await supabase
                    .from('conversations')
                    .insert({ user_id: user!.id, type: 'support', metadata: {} })
                    .select('id')
                    .single();
                if (error) throw error;
                convId = newConv.id;
            }

            const { error: msgError } = await supabase.from('messages').insert({
                conversation_id: convId,
                sender_id: user!.id,
                content: subject ? `**${subject}**\n\n${message}` : message,
            });
            if (msgError) throw msgError;

            setSent(true);
            setSubject('');
            setMessage('');
            loadHistory();
        } catch (e: any) {
            Toast.show({ type: 'error', text1: 'Error', text2: e.message });
        } finally {
            setSending(false);
        }
    };

    return (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.pageTitle}>Contact Admin</Text>
                <Text style={styles.pageSub}>Our team will get back to you shortly</Text>
            </View>

            {/* Info block */}
            <View style={styles.infoCard}>
                <Mail size={18} color={COLORS.primary} />
                <Text style={styles.infoText}>
                    Need help planning your event? Send us a message and our concierge team will assist you personally.
                </Text>
            </View>

            {/* Form */}
            <View style={styles.formCard}>
                {sent && (
                    <View style={styles.successBanner}>
                        <CheckCircle size={18} color="#10B981" />
                        <Text style={styles.successText}>Message sent! We'll reply soon.</Text>
                    </View>
                )}

                <Text style={styles.fieldLabel}>Subject (optional)</Text>
                <TextInput
                    style={styles.input}
                    value={subject}
                    onChangeText={setSubject}
                    placeholder="e.g. Artist inquiry for my event"
                    placeholderTextColor="#4B5563"
                />

                <Text style={styles.fieldLabel}>Your Message</Text>
                <TextInput
                    style={[styles.input, styles.textarea]}
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Tell us how we can help you..."
                    placeholderTextColor="#4B5563"
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                />

                <Pressable style={[styles.sendBtn, sending && { opacity: 0.6 }]} onPress={handleSend} disabled={sending}>
                    {sending
                        ? <ActivityIndicator color="#000" size="small" />
                        : <><Send size={16} color="#000" /><Text style={styles.sendBtnText}>Send Message</Text></>
                    }
                </Pressable>
            </View>

            {/* History */}
            {!loading && history.length > 0 && (
                <View style={{ marginTop: 32 }}>
                    <Text style={styles.sectionTitle}>Previous Messages</Text>
                    {history.map(msg => (
                        <View key={msg.id} style={styles.msgItem}>
                            <View style={styles.msgMeta}>
                                <MessageCircle size={14} color="#6B7280" />
                                <Text style={styles.msgDate}>{new Date(msg.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                            </View>
                            <Text style={styles.msgContent} numberOfLines={3}>{msg.content}</Text>
                        </View>
                    ))}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scroll: { flex: 1, backgroundColor: '#050505' },
    container: { padding: Platform.OS === 'web' ? 40 : 24, paddingBottom: 120 },
    header: { marginBottom: 24 },
    pageTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
    pageSub: { fontSize: 14, color: '#6B7280' },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
        backgroundColor: 'rgba(204,255,0,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(204,255,0,0.2)',
        borderRadius: 16,
        padding: 18,
        marginBottom: 24,
    },
    infoText: { flex: 1, color: '#9CA3AF', fontSize: 14, lineHeight: 22 },
    formCard: { backgroundColor: '#0F0F0F', borderRadius: 20, borderWidth: 1, borderColor: '#1A1A1A', padding: 24 },
    successBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(16,185,129,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(16,185,129,0.3)',
        borderRadius: 12,
        padding: 14,
        marginBottom: 20,
    },
    successText: { color: '#10B981', fontWeight: '600', fontSize: 14 },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', marginBottom: 10 },
    input: {
        backgroundColor: '#171717',
        borderWidth: 1,
        borderColor: '#222',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        color: '#FFFFFF',
        fontSize: 15,
        marginBottom: 20,
    },
    textarea: { height: 130, textAlignVertical: 'top' },
    sendBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: COLORS.primary,
        paddingVertical: 15,
        borderRadius: 14,
    },
    sendBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: '#4B5563', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 },
    msgItem: {
        backgroundColor: '#0F0F0F',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#1A1A1A',
        padding: 16,
        marginBottom: 12,
    },
    msgMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    msgDate: { color: '#6B7280', fontSize: 12 },
    msgContent: { color: '#9CA3AF', fontSize: 14, lineHeight: 22 },
});
