import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { zodResolver } from '@hookform/resolvers/zod';
import { Clock, DollarSign, Package, Plus, Trash2 } from 'lucide-react-native';
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

const packagesSchema = z.object({
    packages: z.array(
        z.object({
            name: z.string().min(1, 'Name is required'),
            price: z.string().min(1, 'Price is required'),
            duration: z.string().min(1, 'Duration is required'),
            description: z.string().min(1, 'Description is required')
        })
    )
});

type PackagesFormValues = z.infer<typeof packagesSchema>;

export default function PackagesSection() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm<PackagesFormValues>({
        resolver: zodResolver(packagesSchema),
        defaultValues: {
            packages: []
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "packages"
    });

    useEffect(() => {
        fetchPackages();
    }, []);

    const fetchPackages = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: act } = await supabase
                .from('acts')
                .select('packages')
                .eq('owner_id', user.id)
                .single();

            if (act) {
                reset({
                    packages: act.packages || []
                });
            }
        }
        setLoading(false);
    };

    const onSubmit = async (data: PackagesFormValues) => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error } = await supabase
                    .from('acts')
                    .update({
                        packages: data.packages
                    })
                    .eq('owner_id', user.id);

                if (error) throw error;
                Toast.show({
                    type: 'success',
                    text1: 'Packages Updated',
                    text2: 'Your booking packages have been saved successfully.'
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
                <Text style={styles.title}>Booking Packages</Text>
                <Text style={styles.subtitle}>Define clear service levels and pricing tiers for your clients.</Text>
            </View>

            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Manage Packages</Text>
                    <Pressable style={styles.addBtn} onPress={() => append({ name: '', price: '', duration: '', description: '' })}>
                        <Plus size={16} color={COLORS.background} />
                        <Text style={styles.addBtnText}>Add Package</Text>
                    </Pressable>
                </View>

                {fields.length === 0 && (
                    <View style={styles.emptyState}>
                        <Package size={48} color={COLORS.textDim} style={{ marginBottom: 12 }} />
                        <Text style={styles.emptyStateText}>No packages created yet.</Text>
                    </View>
                )}

                <View style={styles.grid}>
                    {fields.map((item, index) => (
                        <View key={item.id} style={styles.packageCard}>
                            <View style={styles.pkgHeader}>
                                <View style={styles.pkgIcon}>
                                    <Package size={20} color={COLORS.primary} />
                                </View>
                                <Pressable onPress={() => remove(index)}>
                                    <Trash2 size={18} color="#FF5252" />
                                </Pressable>
                            </View>

                            <View style={styles.fieldBlock}>
                                <Controller
                                    control={control}
                                    name={`packages.${index}.name`}
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <TextInput
                                            style={[styles.inputLine, errors.packages?.[index]?.name && styles.inputError]}
                                            placeholder="Package Name (e.g. Standard)"
                                            placeholderTextColor={COLORS.textDim}
                                            value={value}
                                            onChangeText={onChange}
                                            onBlur={onBlur}
                                        />
                                    )}
                                />
                            </View>

                            <View style={styles.rowBlock}>
                                <View style={[styles.fieldBlock, { flex: 1, marginRight: 8 }]}>
                                    <View style={styles.inputWithIcon}>
                                        <DollarSign size={16} color={COLORS.textDim} style={styles.iconOverlay} />
                                        <Controller
                                            control={control}
                                            name={`packages.${index}.price`}
                                            render={({ field: { onChange, onBlur, value } }) => (
                                                <TextInput
                                                    style={[styles.inputLine, { paddingLeft: 40 }, errors.packages?.[index]?.price && styles.inputError]}
                                                    placeholder="Price"
                                                    keyboardType="numeric"
                                                    placeholderTextColor={COLORS.textDim}
                                                    value={value}
                                                    onChangeText={onChange}
                                                    onBlur={onBlur}
                                                />
                                            )}
                                        />
                                    </View>
                                </View>
                                <View style={[styles.fieldBlock, { flex: 1 }]}>
                                    <View style={styles.inputWithIcon}>
                                        <Clock size={16} color={COLORS.textDim} style={styles.iconOverlay} />
                                        <Controller
                                            control={control}
                                            name={`packages.${index}.duration`}
                                            render={({ field: { onChange, onBlur, value } }) => (
                                                <TextInput
                                                    style={[styles.inputLine, { paddingLeft: 40 }, errors.packages?.[index]?.duration && styles.inputError]}
                                                    placeholder="Duration"
                                                    placeholderTextColor={COLORS.textDim}
                                                    value={value}
                                                    onChangeText={onChange}
                                                    onBlur={onBlur}
                                                />
                                            )}
                                        />
                                    </View>
                                </View>
                            </View>

                            <View style={styles.fieldBlock}>
                                <Controller
                                    control={control}
                                    name={`packages.${index}.description`}
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <TextInput
                                            style={[styles.inputLine, styles.textArea, errors.packages?.[index]?.description && styles.inputError]}
                                            placeholder="Description: What's included?"
                                            placeholderTextColor={COLORS.textDim}
                                            value={value}
                                            onChangeText={onChange}
                                            onBlur={onBlur}
                                            multiline
                                        />
                                    )}
                                />
                            </View>
                        </View>
                    ))}
                </View>

                <Pressable style={styles.saveButton} onPress={handleSubmit(onSubmit)} disabled={saving}>
                    {saving ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.saveButtonText}>Save Packages</Text>}
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

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
    packageCard: { backgroundColor: '#000', padding: 20, borderRadius: 16, width: '100%', borderWidth: 1, borderColor: '#333' },
    pkgHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    pkgIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(204, 255, 0, 0.05)', justifyContent: 'center', alignItems: 'center' },

    fieldBlock: { marginBottom: 12 },
    rowBlock: { flexDirection: 'row' },
    inputLine: { backgroundColor: '#222', color: COLORS.text, padding: 14, borderRadius: 8, fontSize: 15, borderWidth: 1, borderColor: '#333' },
    inputError: { borderColor: COLORS.error, borderWidth: 1.5 },
    textArea: { height: 80, textAlignVertical: 'top' },
    inputWithIcon: { position: 'relative', justifyContent: 'center' },
    iconOverlay: { position: 'absolute', left: 14, zIndex: 1 },

    saveButton: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 12, alignItems: 'center' },
    saveButtonText: { color: COLORS.background, fontWeight: 'bold', fontSize: 16 }
});
