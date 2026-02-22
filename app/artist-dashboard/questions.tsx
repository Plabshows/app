import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { zodResolver } from '@hookform/resolvers/zod';
import { HelpCircle, Plus, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import Toast from 'react-native-toast-message';
import { z } from 'zod';

const faqsSchema = z.object({
    faqs: z.array(
        z.object({
            question: z.string().min(1, 'Question is required'),
            answer: z.string().min(1, 'Answer is required')
        })
    )
});

type FaqsFormValues = z.infer<typeof faqsSchema>;

export default function QuestionsSection() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm<FaqsFormValues>({
        resolver: zodResolver(faqsSchema),
        defaultValues: {
            faqs: []
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "faqs"
    });

    useEffect(() => {
        fetchFaqs();
    }, []);

    const fetchFaqs = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: act } = await supabase
                .from('acts')
                .select('faqs')
                .eq('owner_id', user.id)
                .single();

            if (act) {
                reset({
                    faqs: act.faqs || []
                });
            }
        }
        setLoading(false);
    };

    const onSubmit = async (data: FaqsFormValues) => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error } = await supabase
                    .from('acts')
                    .update({
                        faqs: data.faqs
                    })
                    .eq('owner_id', user.id);

                if (error) throw error;
                Toast.show({
                    type: 'success',
                    text1: 'FAQs Updated',
                    text2: 'Your frequently asked questions have been saved successfully.'
                });
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <View style={styles.centered}>
            <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
    );

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.headerSpacer}>
                <Text style={styles.title}>Questions (FAQ)</Text>
                <Text style={styles.subtitle}>Answer common questions to save time and convert clients faster.</Text>
            </View>

            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Manage FAQs</Text>
                    <Pressable style={styles.addBtn} onPress={() => append({ question: '', answer: '' })}>
                        <Plus size={16} color={COLORS.background} />
                        <Text style={styles.addBtnText}>Add FAQ</Text>
                    </Pressable>
                </View>

                {fields.length === 0 && (
                    <View style={styles.emptyState}>
                        <HelpCircle size={48} color={COLORS.textDim} style={{ marginBottom: 12 }} />
                        <Text style={styles.emptyStateText}>No frequently asked questions added yet.</Text>
                    </View>
                )}

                <View style={styles.list}>
                    {fields.map((item, index) => (
                        <View key={item.id} style={styles.faqItem}>
                            <View style={styles.faqContentRow}>
                                <View style={styles.faqIcon}>
                                    <HelpCircle size={24} color={COLORS.primary} />
                                </View>
                                <View style={styles.faqInputs}>
                                    <Controller
                                        control={control}
                                        name={`faqs.${index}.question`}
                                        render={({ field: { onChange, onBlur, value } }) => (
                                            <TextInput
                                                style={[
                                                    styles.inputLine,
                                                    errors.faqs?.[index]?.question && styles.inputError
                                                ]}
                                                placeholder="Question (e.g. Do you provide your own sound system?)"
                                                placeholderTextColor={COLORS.textDim}
                                                value={value}
                                                onChangeText={onChange}
                                                onBlur={onBlur}
                                            />
                                        )}
                                    />
                                    <Controller
                                        control={control}
                                        name={`faqs.${index}.answer`}
                                        render={({ field: { onChange, onBlur, value } }) => (
                                            <TextInput
                                                style={[
                                                    styles.inputLine,
                                                    styles.textArea,
                                                    { marginTop: 8 },
                                                    errors.faqs?.[index]?.answer && styles.inputError
                                                ]}
                                                placeholder="Answer (e.g. Yes, we provide a professional PA system...)"
                                                placeholderTextColor={COLORS.textDim}
                                                value={value}
                                                onChangeText={onChange}
                                                onBlur={onBlur}
                                                multiline
                                            />
                                        )}
                                    />
                                </View>
                                <Pressable style={styles.removeCircle} onPress={() => remove(index)}>
                                    <Trash2 size={18} color="#FF5252" />
                                </Pressable>
                            </View>
                        </View>
                    ))}
                </View>

                <Pressable style={styles.saveButton} onPress={handleSubmit(onSubmit)} disabled={saving}>
                    {saving ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.saveButtonText}>Save FAQs</Text>}
                </Pressable>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: SPACING.l },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    headerSpacer: { marginBottom: 32 },
    title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
    subtitle: { fontSize: 16, color: COLORS.textDim },
    card: { backgroundColor: '#1A1A1A', padding: 24, borderRadius: 20, borderWidth: 1, borderColor: '#333' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    cardTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
    addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    addBtnText: { color: COLORS.background, fontWeight: 'bold', marginLeft: 6, fontSize: 14 },
    emptyState: { alignItems: 'center', paddingVertical: 40 },
    emptyStateText: { color: COLORS.textDim, fontSize: 16 },
    list: { gap: 16, marginBottom: 24 },
    faqItem: { backgroundColor: '#000', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#333' },
    faqContentRow: { flexDirection: 'row', alignItems: 'flex-start' },
    faqIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(204, 255, 0, 0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 16, marginTop: 4 },
    faqInputs: { flex: 1, marginRight: 16 },
    inputLine: { backgroundColor: '#222', color: COLORS.text, padding: 14, borderRadius: 8, fontSize: 15, borderWidth: 1, borderColor: '#333' },
    textArea: { height: 80, textAlignVertical: 'top' },
    inputError: { borderColor: COLORS.error, borderWidth: 1.5 },
    removeCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 82, 82, 0.1)', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    saveButton: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 12, alignItems: 'center' },
    saveButtonText: { color: COLORS.background, fontWeight: 'bold', fontSize: 16 }
});
