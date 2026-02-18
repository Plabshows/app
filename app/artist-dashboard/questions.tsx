
import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { HelpCircle, Plus, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';

export default function QuestionsSection() {
    const [loading, setLoading] = useState(true);
    const [faqs, setFaqs] = useState<any[]>([]);
    const [newFaq, setNewFaq] = useState({ question: '', answer: '' });
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        fetchFaqs();
    }, []);

    const fetchFaqs = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: act } = await supabase.from('acts').select('id').eq('owner_id', user.id).single();
            if (act) {
                const { data } = await supabase
                    .from('act_faqs')
                    .select('*')
                    .eq('act_id', act.id);
                setFaqs(data || []);
            }
        }
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!newFaq.question || !newFaq.answer) return;
        setAdding(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: act } = await supabase.from('acts').select('id').eq('owner_id', user.id).single();
            if (act) {
                const { error } = await supabase.from('act_faqs').insert({
                    act_id: act.id,
                    ...newFaq
                });
                if (!error) {
                    setNewFaq({ question: '', answer: '' });
                    fetchFaqs();
                }
            }
        }
        setAdding(false);
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('act_faqs').delete().eq('id', id);
        if (!error) fetchFaqs();
    };

    if (loading) return (
        <View style={styles.centered}>
            <ActivityIndicator color={COLORS.primary} />
        </View>
    );

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Questions (FAQ)</Text>
            <Text style={styles.subtitle}>Answer common questions to save time and convert clients faster.</Text>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Add FAQ</Text>
                <View style={styles.field}>
                    <Text style={styles.label}>Question</Text>
                    <TextInput
                        style={styles.input}
                        value={newFaq.question}
                        onChangeText={t => setNewFaq({ ...newFaq, question: t })}
                        placeholder="e.g. Do you provide your own sound system?"
                        placeholderTextColor={COLORS.textDim}
                    />
                </View>
                <View style={styles.field}>
                    <Text style={styles.label}>Answer</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={newFaq.answer}
                        onChangeText={t => setNewFaq({ ...newFaq, answer: t })}
                        multiline
                        placeholder="e.g. Yes, we provide a professional PA system for up to 200 guests..."
                        placeholderTextColor={COLORS.textDim}
                    />
                </View>
                <Pressable style={styles.addButton} onPress={handleAdd} disabled={adding}>
                    {adding ? <ActivityIndicator color={COLORS.background} /> : (
                        <>
                            <Plus size={20} color={COLORS.background} />
                            <Text style={styles.addButtonText}>Add FAQ</Text>
                        </>
                    )}
                </Pressable>
            </View>

            <View style={styles.list}>
                {faqs.map((faq) => (
                    <View key={faq.id} style={styles.faqItem}>
                        <View style={styles.faqIcon}>
                            <HelpCircle size={20} color={COLORS.primary} />
                        </View>
                        <View style={styles.faqContent}>
                            <Text style={styles.faqQuestion}>{faq.question}</Text>
                            <Text style={styles.faqAnswer}>{faq.answer}</Text>
                        </View>
                        <Pressable onPress={() => handleDelete(faq.id)}>
                            <Trash2 size={20} color="#FF5252" />
                        </Pressable>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: SPACING.l },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
    subtitle: { fontSize: 14, color: COLORS.textDim, marginBottom: 24 },
    card: { backgroundColor: '#1A1A1A', padding: 20, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: COLORS.primary, marginBottom: 24 },
    cardTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
    field: { marginBottom: 16 },
    label: { color: COLORS.textDim, marginBottom: 8, fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold' },
    input: { backgroundColor: '#222', color: COLORS.text, padding: 12, borderRadius: 8, fontSize: 14, borderWidth: 1, borderColor: '#333' },
    textArea: { height: 80, textAlignVertical: 'top' },
    addButton: { backgroundColor: COLORS.primary, padding: 14, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
    addButtonText: { color: COLORS.background, fontWeight: 'bold' },

    list: { gap: 16 },
    faqItem: { backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor: '#222' },
    faqIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(204, 255, 0, 0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 2 },
    faqContent: { flex: 1 },
    faqQuestion: { color: COLORS.text, fontSize: 15, fontWeight: 'bold', marginBottom: 6 },
    faqAnswer: { color: COLORS.textDim, fontSize: 13, lineHeight: 18 }
});
