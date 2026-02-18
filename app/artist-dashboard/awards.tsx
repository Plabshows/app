
import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { Plus, Trash2, Trophy } from 'lucide-react-native';
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

export default function AwardsSection() {
    const [loading, setLoading] = useState(true);
    const [awards, setAwards] = useState<any[]>([]);
    const [newAward, setNewAward] = useState({ title: '', year: '', organization: '' });
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        fetchAwards();
    }, []);

    const fetchAwards = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: act } = await supabase.from('acts').select('id').eq('owner_id', user.id).single();
            if (act) {
                const { data } = await supabase
                    .from('act_awards')
                    .select('*')
                    .eq('act_id', act.id)
                    .order('year', { ascending: false });
                setAwards(data || []);
            }
        }
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!newAward.title) return;
        setAdding(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: act } = await supabase.from('acts').select('id').eq('owner_id', user.id).single();
            if (act) {
                const { error } = await supabase.from('act_awards').insert({
                    act_id: act.id,
                    ...newAward
                });
                if (!error) {
                    setNewAward({ title: '', year: '', organization: '' });
                    fetchAwards();
                }
            }
        }
        setAdding(false);
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('act_awards').delete().eq('id', id);
        if (!error) fetchAwards();
    };

    if (loading) return (
        <View style={styles.centered}>
            <ActivityIndicator color={COLORS.primary} />
        </View>
    );

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Awards</Text>
            <Text style={styles.subtitle}>List your accolades, competitions won, and industry recognitions.</Text>

            {/* Add New Form */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Add Award / Recognition</Text>
                <View style={styles.field}>
                    <Text style={styles.label}>Award Title</Text>
                    <TextInput
                        style={styles.input}
                        value={newAward.title}
                        onChangeText={t => setNewAward({ ...newAward, title: t })}
                        placeholder="e.g. Artist of the Year"
                        placeholderTextColor={COLORS.textDim}
                    />
                </View>
                <View style={styles.row}>
                    <View style={[styles.field, { flex: 1, marginRight: 12 }]}>
                        <Text style={styles.label}>Year</Text>
                        <TextInput
                            style={styles.input}
                            value={newAward.year}
                            onChangeText={t => setNewAward({ ...newAward, year: t })}
                            placeholder="2024"
                            placeholderTextColor={COLORS.textDim}
                        />
                    </View>
                    <View style={[styles.field, { flex: 1 }]}>
                        <Text style={styles.label}>Organization</Text>
                        <TextInput
                            style={styles.input}
                            value={newAward.organization}
                            onChangeText={t => setNewAward({ ...newAward, organization: t })}
                            placeholder="e.g. UAE Entertainment Awards"
                            placeholderTextColor={COLORS.textDim}
                        />
                    </View>
                </View>
                <Pressable style={styles.addButton} onPress={handleAdd} disabled={adding}>
                    {adding ? <ActivityIndicator color={COLORS.background} /> : (
                        <>
                            <Plus size={20} color={COLORS.background} />
                            <Text style={styles.addButtonText}>Add to List</Text>
                        </>
                    )}
                </Pressable>
            </View>

            {/* Awards List */}
            <View style={styles.list}>
                {awards.map((award) => (
                    <View key={award.id} style={styles.awardItem}>
                        <View style={styles.awardIcon}>
                            <Trophy size={20} color={COLORS.primary} />
                        </View>
                        <View style={styles.awardContent}>
                            <Text style={styles.awardTitle}>{award.title}</Text>
                            <Text style={styles.awardSubtitle}>{award.organization} • {award.year}</Text>
                        </View>
                        <Pressable onPress={() => handleDelete(award.id)}>
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
    card: { backgroundColor: '#1A1A1A', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#222', marginBottom: 24 },
    cardTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
    field: { marginBottom: 16 },
    label: { color: COLORS.textDim, marginBottom: 8, fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold' },
    input: { backgroundColor: '#222', color: COLORS.text, padding: 12, borderRadius: 8, fontSize: 14, borderWidth: 1, borderColor: '#333' },
    row: { flexDirection: 'row' },
    addButton: { backgroundColor: COLORS.primary, padding: 14, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
    addButtonText: { color: COLORS.background, fontWeight: 'bold' },

    list: { gap: 12 },
    awardItem: { backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
    awardIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(204, 255, 0, 0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    awardContent: { flex: 1 },
    awardTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
    awardSubtitle: { color: COLORS.textDim, fontSize: 13 }
});
