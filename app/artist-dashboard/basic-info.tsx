import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
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

const basicInfoSchema = z.object({
    name: z.string().min(1, 'Full name is required'),
    city: z.string().min(1, 'City is required'),
    country: z.string().min(1, 'Country is required')
});

type BasicInfoFormValues = z.infer<typeof basicInfoSchema>;

export default function BasicInfo() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [email, setEmail] = useState('');

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm<BasicInfoFormValues>({
        resolver: zodResolver(basicInfoSchema),
        defaultValues: {
            name: '',
            city: '',
            country: ''
        }
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            if (data) {
                reset({
                    name: data.name || '',
                    city: data.city || '',
                    country: data.country || ''
                });
                setEmail(data.email || user.email || '');
            }
        }
        setLoading(false);
    };

    const onSubmit = async (data: BasicInfoFormValues) => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        name: data.name,
                        city: data.city,
                        country: data.country
                    })
                    .eq('id', user.id);

                if (error) throw error;
                Toast.show({
                    type: 'success',
                    text1: 'Profile Updated',
                    text2: 'Your basic information has been saved successfully.'
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
            <Text style={styles.title}>Basic Information</Text>
            <Text style={styles.subtitle}>Manage your personal contact details and location.</Text>

            <View style={styles.card}>
                <View style={styles.field}>
                    <Text style={[styles.label, errors.name && { color: COLORS.error }]}>
                        Full Name {errors.name && `(${errors.name.message})`}
                    </Text>
                    <Controller
                        control={control}
                        name="name"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                                style={[styles.input, errors.name && { borderColor: COLORS.error, borderWidth: 1.5 }]}
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value}
                                placeholder="John Doe"
                                placeholderTextColor={COLORS.textDim}
                            />
                        )}
                    />
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Email Address (Read Only)</Text>
                    <TextInput
                        style={[styles.input, styles.disabled]}
                        value={email}
                        editable={false}
                        placeholderTextColor={COLORS.textDim}
                    />
                </View>

                <View style={styles.row}>
                    <View style={[styles.field, { flex: 1, marginRight: 12 }]}>
                        <Text style={[styles.label, errors.city && { color: COLORS.error }]}>
                            City {errors.city && `*`}
                        </Text>
                        <Controller
                            control={control}
                            name="city"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    style={[styles.input, errors.city && { borderColor: COLORS.error, borderWidth: 1.5 }]}
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    placeholder="Dubai"
                                    placeholderTextColor={COLORS.textDim}
                                />
                            )}
                        />
                    </View>
                    <View style={[styles.field, { flex: 1 }]}>
                        <Text style={[styles.label, errors.country && { color: COLORS.error }]}>
                            Country {errors.country && `*`}
                        </Text>
                        <Controller
                            control={control}
                            name="country"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    style={[styles.input, errors.country && { borderColor: COLORS.error, borderWidth: 1.5 }]}
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    placeholder="UAE"
                                    placeholderTextColor={COLORS.textDim}
                                />
                            )}
                        />
                    </View>
                </View>

                <Pressable style={styles.button} onPress={handleSubmit(onSubmit)} disabled={saving}>
                    {saving ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.buttonText}>Save Changes</Text>}
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
    field: { marginBottom: 20 },
    row: { flexDirection: 'row' },
    label: { color: COLORS.textDim, marginBottom: 8, fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold' },
    input: { backgroundColor: '#222', color: COLORS.text, padding: 16, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: '#333' },
    disabled: { opacity: 0.5, backgroundColor: '#111' },
    button: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 12 },
    buttonText: { color: COLORS.background, fontWeight: 'bold', fontSize: 16 }
});
