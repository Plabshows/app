import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { zodResolver } from '@hookform/resolvers/zod';
import { Globe, Plus, Save, Trash2, Video } from 'lucide-react-native';
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

const videosSchema = z.object({
    videos_url: z.array(
        z.object({
            url: z.string().url('Must be a valid URL')
        })
    ).max(5, 'Maximum of 5 videos allowed')
});

type VideosFormValues = z.infer<typeof videosSchema>;

export default function VideoManagement() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm<VideosFormValues>({
        resolver: zodResolver(videosSchema),
        defaultValues: {
            videos_url: []
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "videos_url"
    });

    useEffect(() => {
        fetchVideos();
    }, []);

    const fetchVideos = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('acts')
                .select('videos_url')
                .eq('owner_id', user.id)
                .single();

            if (data?.videos_url && Array.isArray(data.videos_url)) {
                // If the stored data is just an array of strings, map it to objects for useFieldArray
                const formattedVideos = typeof data.videos_url[0] === 'string'
                    ? data.videos_url.map((url: string) => ({ url }))
                    : data.videos_url;

                reset({ videos_url: formattedVideos });
            } else {
                // Initial state if empty
                reset({ videos_url: [{ url: '' }] });
            }
        }
        setLoading(false);
    };

    const onSubmit = async (data: VideosFormValues) => {
        setSaving(true);
        try {
            // Extract just the strings for the database
            const urlStrings = data.videos_url.map(v => v.url);

            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error } = await supabase
                    .from('acts')
                    .update({
                        videos_url: urlStrings
                    })
                    .eq('owner_id', user.id);

                if (error) throw error;
                Toast.show({
                    type: 'success',
                    text1: 'Videos Updated',
                    text2: 'Your promo videos have been saved.'
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
            <Text style={styles.title}>Videos</Text>
            <Text style={styles.subtitle}>Add links to your best performances on YouTube or Vimeo.</Text>

            <View style={styles.card}>
                <View style={[styles.iconBox, { marginBottom: 24 }]}>
                    <Video size={40} color={COLORS.primary} />
                </View>

                {fields.map((item, index) => (
                    <View key={item.id} style={styles.field}>
                        <View style={styles.fieldHeader}>
                            <Text style={styles.label}>Video Link {index + 1}</Text>
                            {fields.length > 1 && (
                                <Pressable onPress={() => remove(index)} style={styles.removeLink}>
                                    <Trash2 size={16} color="#FF5252" />
                                    <Text style={styles.removeText}>Remove</Text>
                                </Pressable>
                            )}
                        </View>
                        <Controller
                            control={control}
                            name={`videos_url.${index}.url`}
                            render={({ field: { onChange, onBlur, value } }) => (
                                <View style={[styles.inputWrapper, errors.videos_url?.[index]?.url && styles.inputError]}>
                                    <Globe size={18} color={COLORS.textDim} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        placeholderTextColor={COLORS.textDim}
                                    />
                                </View>
                            )}
                        />
                        {errors.videos_url?.[index]?.url && (
                            <Text style={styles.errorText}>{errors.videos_url[index].url.message}</Text>
                        )}
                    </View>
                ))}

                {fields.length < 5 && (
                    <Pressable style={styles.addBtn} onPress={() => append({ url: '' })}>
                        <Plus size={18} color={COLORS.primary} />
                        <Text style={styles.addBtnText}>Add Another Video</Text>
                    </Pressable>
                )}

                <Pressable style={styles.button} onPress={handleSubmit(onSubmit)} disabled={saving}>
                    {saving ? <ActivityIndicator color={COLORS.background} /> : (
                        <>
                            <Save size={20} color={COLORS.background} style={{ marginRight: 8 }} />
                            <Text style={styles.buttonText}>Save Videos</Text>
                        </>
                    )}
                </Pressable>

                <View style={styles.tips}>
                    <Text style={styles.tipsTitle}>Tips for better visibility:</Text>
                    <Text style={styles.tip}>• High-resolution (1080p+) is preferred.</Text>
                    <Text style={styles.tip}>• Promotional showreels (1-3 mins) work best.</Text>
                    <Text style={styles.tip}>• Ensure the video is public or unlisted (not private).</Text>
                </View>
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
    iconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(204, 255, 0, 0.05)', justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },
    field: { marginBottom: 20 },
    fieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    label: { color: COLORS.textDim, fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold' },
    removeLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    removeText: { color: '#FF5252', fontSize: 12, fontWeight: 'bold' },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#222', borderRadius: 8, borderWidth: 1, borderColor: '#333' },
    inputIcon: { marginLeft: 16 },
    input: { flex: 1, color: COLORS.text, padding: 16, fontSize: 16 },
    inputError: { borderColor: COLORS.error, borderWidth: 1.5 },
    errorText: { color: COLORS.error, fontSize: 12, marginTop: 6, marginLeft: 4 },
    addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary, borderStyle: 'dashed', marginBottom: 24 },
    addBtnText: { color: COLORS.primary, fontWeight: 'bold', marginLeft: 8 },
    button: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
    buttonText: { color: COLORS.background, fontWeight: 'bold', fontSize: 16 },
    tips: { marginTop: 32, padding: 16, backgroundColor: '#111', borderRadius: 8 },
    tipsTitle: { color: COLORS.text, fontWeight: 'bold', marginBottom: 8, fontSize: 14 },
    tip: { color: COLORS.textDim, fontSize: 13, marginBottom: 4 }
});
