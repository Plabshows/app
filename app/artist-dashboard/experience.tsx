import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { zodResolver } from '@hookform/resolvers/zod';
import { History, Plus, Trash2 } from 'lucide-react-native';
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

const experienceSchema = z.object({
    experience_years: z.string().min(1, 'Years of experience is required'),
    description: z.string().optional(),
    experience_awards: z.array(
        z.object({
            year: z.string().min(1, 'Year is required'),
            title: z.string().min(1, 'Title is required'),
            details: z.string().optional()
        })
    ).optional()
});

type ExperienceFormValues = z.infer<typeof experienceSchema>;

export default function ExperienceSection() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm<ExperienceFormValues>({
        resolver: zodResolver(experienceSchema),
        defaultValues: {
            experience_years: '',
            description: '',
            experience_awards: []
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "experience_awards"
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: act } = await supabase
                .from('acts')
                .select('experience_years, description, experience_awards')
                .eq('owner_id', user.id)
                .single();
            if (act) {
                reset({
                    experience_years: String(act.experience_years || ''),
                    description: act.description || '',
                    experience_awards: act.experience_awards || []
                });
            }
        }
        setLoading(false);
    };

    const onSubmit = async (data: ExperienceFormValues) => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error } = await supabase
                    .from('acts')
                    .upsert({
                        owner_id: user.id,
                        experience_years: parseInt(data.experience_years) || 0,
                        description: data.description,
                        experience_awards: data.experience_awards
                    }, { onConflict: 'owner_id' });

                if (error) throw error;
                Toast.show({
                    type: 'success',
                    text1: 'Experience Updated',
                    text2: 'Your experience and awards have been saved.'
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
            <ActivityIndicator color={COLORS.primary} />
        </View>
    );

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Experience & Awards</Text>
            <Text style={styles.subtitle}>Highlight your professional journey and key milestones.</Text>

            <View style={styles.card}>
                <View style={styles.field}>
                    <Text style={[styles.label, errors.experience_years && { color: COLORS.error }]}>
                        Years of Experience {errors.experience_years && '*'}
                    </Text>
                    <View style={styles.inputWrapper}>
                        <History size={18} color={COLORS.textDim} style={styles.inputIcon} />
                        <Controller
                            control={control}
                            name="experience_years"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    style={[styles.input, errors.experience_years && { borderColor: COLORS.error, borderWidth: 1.5, borderRadius: 8 }]}
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    placeholder="e.g. 5"
                                    keyboardType="numeric"
                                    placeholderTextColor={COLORS.textDim}
                                />
                            )}
                        />
                    </View>
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Detailed Experience / Key Highlights</Text>
                    <Controller
                        control={control}
                        name="description"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                                style={[styles.inputBase, styles.textArea]}
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value}
                                multiline
                                placeholder="Describe your career highlights, major venues, and notable clients..."
                                placeholderTextColor={COLORS.textDim}
                            />
                        )}
                    />
                </View>

                <View style={styles.awardHeader}>
                    <Text style={styles.sectionTitle}>Milestones & Awards</Text>
                    <Pressable style={styles.addBtn} onPress={() => append({ year: '', title: '', details: '' })}>
                        <Plus size={16} color={COLORS.background} />
                        <Text style={styles.addBtnText}>Add</Text>
                    </Pressable>
                </View>

                {fields.map((item, index) => (
                    <View key={item.id} style={styles.awardBox}>
                        <View style={styles.awardRow}>
                            <View style={{ flex: 1, marginRight: 10 }}>
                                <Text style={styles.label}>Year</Text>
                                <Controller
                                    control={control}
                                    name={`experience_awards.${index}.year`}
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <TextInput
                                            style={styles.inputBase}
                                            placeholder="2023"
                                            placeholderTextColor={COLORS.textDim}
                                            value={value}
                                            onChangeText={onChange}
                                            onBlur={onBlur}
                                        />
                                    )}
                                />
                            </View>
                            <View style={{ flex: 2 }}>
                                <Text style={styles.label}>Title / Event</Text>
                                <Controller
                                    control={control}
                                    name={`experience_awards.${index}.title`}
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <TextInput
                                            style={styles.inputBase}
                                            placeholder="Best DJ Award"
                                            placeholderTextColor={COLORS.textDim}
                                            value={value}
                                            onChangeText={onChange}
                                            onBlur={onBlur}
                                        />
                                    )}
                                />
                            </View>
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.label}>Details (Optional)</Text>
                            <Controller
                                control={control}
                                name={`experience_awards.${index}.details`}
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <TextInput
                                        style={styles.inputBase}
                                        placeholder="Performed at Tomorrowland Mainstage"
                                        placeholderTextColor={COLORS.textDim}
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                    />
                                )}
                            />
                        </View>
                        <Pressable style={styles.removeBtn} onPress={() => remove(index)}>
                            <Trash2 size={16} color="#FF5252" />
                            <Text style={styles.removeText}>Remove</Text>
                        </Pressable>
                    </View>
                ))}

                <Pressable style={styles.button} onPress={handleSubmit(onSubmit)} disabled={saving}>
                    {saving ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.buttonText}>Update Experience</Text>}
                </Pressable>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: SPACING.l },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
    subtitle: { fontSize: 14, color: COLORS.textDim, marginBottom: 24 },
    card: { backgroundColor: '#1A1A1A', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#222' },
    field: { marginBottom: 24 },
    label: { color: COLORS.textDim, marginBottom: 8, fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold' },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#222', borderRadius: 8, borderWidth: 1, borderColor: '#333' },
    inputIcon: { marginLeft: 16 },
    input: { flex: 1, color: COLORS.text, padding: 16, fontSize: 16 },
    inputBase: { backgroundColor: '#222', color: COLORS.text, padding: 16, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: '#333' },
    textArea: { height: 120, textAlignVertical: 'top' },
    awardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 10 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
    addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    addBtnText: { color: COLORS.background, fontWeight: 'bold', marginLeft: 4 },
    awardBox: { backgroundColor: '#111', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#222' },
    awardRow: { flexDirection: 'row', marginBottom: 16 },
    removeBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 8 },
    removeText: { color: '#FF5252', marginLeft: 6, fontWeight: 'bold' },
    button: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    buttonText: { color: COLORS.background, fontWeight: 'bold', fontSize: 16 }
});
