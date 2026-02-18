
import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { Plus, Trash2, UserCircle } from 'lucide-react-native';
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

export default function MembersSection() {
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState<any[]>([]);
    const [newMember, setNewMember] = useState({ name: '', role: '' });
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: act } = await supabase.from('acts').select('id').eq('owner_id', user.id).single();
            if (act) {
                const { data } = await supabase
                    .from('act_members')
                    .select('*')
                    .eq('act_id', act.id);
                setMembers(data || []);
            }
        }
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!newMember.name) return;
        setAdding(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: act } = await supabase.from('acts').select('id').eq('owner_id', user.id).single();
            if (act) {
                const { error } = await supabase.from('act_members').insert({
                    act_id: act.id,
                    ...newMember
                });
                if (!error) {
                    setNewMember({ name: '', role: '' });
                    fetchMembers();
                }
            }
        }
        setAdding(false);
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('act_members').delete().eq('id', id);
        if (!error) fetchMembers();
    };

    if (loading) return (
        <View style={styles.centered}>
            <ActivityIndicator color={COLORS.primary} />
        </View>
    );

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Group Members</Text>
            <Text style={styles.subtitle}>Introduce the individuals that make your act unique.</Text>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Add Member</Text>
                <View style={styles.row}>
                    <View style={[styles.field, { flex: 1, marginRight: 12 }]}>
                        <Text style={styles.label}>Name</Text>
                        <TextInput
                            style={styles.input}
                            value={newMember.name}
                            onChangeText={t => setNewMember({ ...newMember, name: t })}
                            placeholder="e.g. Alex Smith"
                            placeholderTextColor={COLORS.textDim}
                        />
                    </View>
                    <View style={[styles.field, { flex: 1 }]}>
                        <Text style={styles.label}>Role</Text>
                        <TextInput
                            style={styles.input}
                            value={newMember.role}
                            onChangeText={t => setNewMember({ ...newMember, role: t })}
                            placeholder="e.g. Lead Guitarist"
                            placeholderTextColor={COLORS.textDim}
                        />
                    </View>
                </View>
                <Pressable style={styles.addButton} onPress={handleAdd} disabled={adding}>
                    {adding ? <ActivityIndicator color={COLORS.background} /> : (
                        <>
                            <Plus size={20} color={COLORS.background} />
                            <Text style={styles.addButtonText}>Add Member</Text>
                        </>
                    )}
                </Pressable>
            </View>

            <View style={styles.list}>
                {members.map((member) => (
                    <View key={member.id} style={styles.memberItem}>
                        <View style={styles.memberAvatar}>
                            <UserCircle size={24} color={COLORS.textDim} />
                        </View>
                        <View style={styles.memberInfo}>
                            <Text style={styles.memberName}>{member.name}</Text>
                            <Text style={styles.memberRole}>{member.role}</Text>
                        </View>
                        <Pressable onPress={() => handleDelete(member.id)}>
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
    row: { flexDirection: 'row' },
    field: { marginBottom: 16 },
    label: { color: COLORS.textDim, marginBottom: 8, fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold' },
    input: { backgroundColor: '#222', color: COLORS.text, padding: 12, borderRadius: 8, fontSize: 14, borderWidth: 1, borderColor: '#333' },
    addButton: { backgroundColor: COLORS.primary, padding: 14, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
    addButtonText: { color: COLORS.background, fontWeight: 'bold' },

    list: { gap: 12 },
    memberItem: { backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
    memberAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    memberInfo: { flex: 1 },
    memberName: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
    memberRole: { color: COLORS.textDim, fontSize: 13, marginTop: 2 }
});
