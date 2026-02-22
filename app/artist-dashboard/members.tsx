import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, UserCircle } from 'lucide-react-native';
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

const membersSchema = z.object({
    group_members: z.array(
        z.object({
            name: z.string().min(1, 'Name is required'),
            role: z.string().min(1, 'Role is required')
        })
    )
});

type MembersFormValues = z.infer<typeof membersSchema>;

export default function MembersSection() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm<MembersFormValues>({
        resolver: zodResolver(membersSchema),
        defaultValues: {
            group_members: []
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "group_members"
    });

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: act } = await supabase
                .from('acts')
                .select('group_members')
                .eq('owner_id', user.id)
                .single();

            if (act) {
                reset({
                    group_members: act.group_members || []
                });
            }
        }
        setLoading(false);
    };

    const onSubmit = async (data: MembersFormValues) => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error } = await supabase
                    .from('acts')
                    .update({
                        group_members: data.group_members
                    })
                    .eq('owner_id', user.id);

                if (error) throw error;
                Toast.show({
                    type: 'success',
                    text1: 'Members Updated',
                    text2: 'Your group members have been saved successfully.'
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
                <Text style={styles.title}>Group Members</Text>
                <Text style={styles.subtitle}>Introduce the individuals that make your act unique.</Text>
            </View>

            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Manage Members</Text>
                    <Pressable style={styles.addBtn} onPress={() => append({ name: '', role: '' })}>
                        <Plus size={16} color={COLORS.background} />
                        <Text style={styles.addBtnText}>Add New</Text>
                    </Pressable>
                </View>

                {fields.length === 0 && (
                    <View style={styles.emptyState}>
                        <UserCircle size={48} color={COLORS.textDim} style={{ marginBottom: 12 }} />
                        <Text style={styles.emptyStateText}>No members added yet.</Text>
                    </View>
                )}

                <View style={styles.list}>
                    {fields.map((item, index) => (
                        <View key={item.id} style={styles.memberItem}>
                            <View style={styles.memberContentRow}>
                                <View style={styles.memberAvatar}>
                                    <UserCircle size={28} color={COLORS.textDim} />
                                </View>
                                <View style={styles.memberInputs}>
                                    <Controller
                                        control={control}
                                        name={`group_members.${index}.name`}
                                        render={({ field: { onChange, onBlur, value } }) => (
                                            <TextInput
                                                style={[
                                                    styles.inputLine,
                                                    errors.group_members?.[index]?.name && styles.inputError
                                                ]}
                                                placeholder="Name (e.g. Alex Smith)"
                                                placeholderTextColor={COLORS.textDim}
                                                value={value}
                                                onChangeText={onChange}
                                                onBlur={onBlur}
                                            />
                                        )}
                                    />
                                    <Controller
                                        control={control}
                                        name={`group_members.${index}.role`}
                                        render={({ field: { onChange, onBlur, value } }) => (
                                            <TextInput
                                                style={[
                                                    styles.inputLine,
                                                    { marginTop: 8 },
                                                    errors.group_members?.[index]?.role && styles.inputError
                                                ]}
                                                placeholder="Role (e.g. Lead Guitarist)"
                                                placeholderTextColor={COLORS.textDim}
                                                value={value}
                                                onChangeText={onChange}
                                                onBlur={onBlur}
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
                    {saving ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.saveButtonText}>Save Members</Text>}
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
    memberItem: { backgroundColor: '#000', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#333' },
    memberContentRow: { flexDirection: 'row', alignItems: 'flex-start' },
    memberAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center', marginRight: 16, marginTop: 4 },
    memberInputs: { flex: 1, marginRight: 16 },
    inputLine: { backgroundColor: '#222', color: COLORS.text, padding: 14, borderRadius: 8, fontSize: 15, borderWidth: 1, borderColor: '#333' },
    inputError: { borderColor: COLORS.error, borderWidth: 1.5 },
    removeCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 82, 82, 0.1)', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    saveButton: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 12, alignItems: 'center' },
    saveButtonText: { color: COLORS.background, fontWeight: 'bold', fontSize: 16 }
});
