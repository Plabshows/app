
import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { Clock, DollarSign, Package, Plus, Trash2 } from 'lucide-react-native';
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

export default function PackagesSection() {
    const [loading, setLoading] = useState(true);
    const [packages, setPackages] = useState<any[]>([]);
    const [newPackage, setNewPackage] = useState({ name: '', price: '', description: '', duration: '' });
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        fetchPackages();
    }, []);

    const fetchPackages = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: act } = await supabase.from('acts').select('id').eq('owner_id', user.id).single();
            if (act) {
                const { data } = await supabase
                    .from('act_packages')
                    .select('*')
                    .eq('act_id', act.id);
                setPackages(data || []);
            }
        }
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!newPackage.name || !newPackage.price) return;
        setAdding(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: act } = await supabase.from('acts').select('id').eq('owner_id', user.id).single();
            if (act) {
                const { error } = await supabase.from('act_packages').insert({
                    act_id: act.id,
                    ...newPackage,
                    includes: [] // Default empty for now
                });
                if (!error) {
                    setNewPackage({ name: '', price: '', description: '', duration: '' });
                    fetchPackages();
                }
            }
        }
        setAdding(false);
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('act_packages').delete().eq('id', id);
        if (!error) fetchPackages();
    };

    if (loading) return (
        <View style={styles.centered}>
            <ActivityIndicator color={COLORS.primary} />
        </View>
    );

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Booking Packages</Text>
            <Text style={styles.subtitle}>Define clear service levels and pricing tiers for your clients.</Text>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Create New Package</Text>
                <View style={styles.field}>
                    <Text style={styles.label}>Package Name</Text>
                    <TextInput
                        style={styles.input}
                        value={newPackage.name}
                        onChangeText={t => setNewPackage({ ...newPackage, name: t })}
                        placeholder="e.g. Standard 1-Hour Show"
                        placeholderTextColor={COLORS.textDim}
                    />
                </View>
                <View style={styles.row}>
                    <View style={[styles.field, { flex: 1, marginRight: 12 }]}>
                        <Text style={styles.label}>Starting Price</Text>
                        <View style={styles.inputWithIcon}>
                            <DollarSign size={16} color={COLORS.textDim} style={styles.icon} />
                            <TextInput
                                style={[styles.input, { paddingLeft: 40 }]}
                                value={newPackage.price}
                                onChangeText={t => setNewPackage({ ...newPackage, price: t })}
                                placeholder="2500"
                                keyboardType="numeric"
                                placeholderTextColor={COLORS.textDim}
                            />
                        </View>
                    </View>
                    <View style={[styles.field, { flex: 1 }]}>
                        <Text style={styles.label}>Duration</Text>
                        <View style={styles.inputWithIcon}>
                            <Clock size={16} color={COLORS.textDim} style={styles.icon} />
                            <TextInput
                                style={[styles.input, { paddingLeft: 40 }]}
                                value={newPackage.duration}
                                onChangeText={t => setNewPackage({ ...newPackage, duration: t })}
                                placeholder="60 mins"
                                placeholderTextColor={COLORS.textDim}
                            />
                        </View>
                    </View>
                </View>
                <View style={styles.field}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={newPackage.description}
                        onChangeText={t => setNewPackage({ ...newPackage, description: t })}
                        multiline
                        placeholder="What's included in this package?"
                        placeholderTextColor={COLORS.textDim}
                    />
                </View>
                <Pressable style={styles.addButton} onPress={handleAdd} disabled={adding}>
                    {adding ? <ActivityIndicator color={COLORS.background} /> : (
                        <>
                            <Plus size={20} color={COLORS.background} />
                            <Text style={styles.addButtonText}>Create Package</Text>
                        </>
                    )}
                </Pressable>
            </View>

            <View style={styles.grid}>
                {packages.map((pkg) => (
                    <View key={pkg.id} style={styles.packageCard}>
                        <View style={styles.pkgHeader}>
                            <View style={styles.pkgIcon}>
                                <Package size={20} color={COLORS.primary} />
                            </View>
                            <Pressable onPress={() => handleDelete(pkg.id)}>
                                <Trash2 size={18} color="#FF5252" />
                            </Pressable>
                        </View>
                        <Text style={styles.pkgName}>{pkg.name}</Text>
                        <Text style={styles.pkgPrice}>{pkg.price} AED</Text>
                        <View style={styles.pkgMeta}>
                            <Clock size={14} color={COLORS.textDim} />
                            <Text style={styles.pkgDuration}>{pkg.duration}</Text>
                        </View>
                        <Text style={styles.pkgDesc} numberOfLines={3}>{pkg.description}</Text>
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
    card: { backgroundColor: '#1A1A1A', padding: 20, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: COLORS.primary, marginBottom: 32 },
    cardTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
    row: { flexDirection: 'row' },
    field: { marginBottom: 16 },
    label: { color: COLORS.textDim, marginBottom: 8, fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold' },
    input: { backgroundColor: '#222', color: COLORS.text, padding: 12, borderRadius: 8, fontSize: 14, borderWidth: 1, borderColor: '#333' },
    inputWithIcon: { position: 'relative' },
    icon: { position: 'absolute', left: 14, top: 12, zIndex: 1 },
    textArea: { height: 80, textAlignVertical: 'top' },
    addButton: { backgroundColor: COLORS.primary, padding: 14, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
    addButtonText: { color: COLORS.background, fontWeight: 'bold' },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    packageCard: { backgroundColor: '#1A1A1A', padding: 20, borderRadius: 16, width: 280, borderWidth: 1, borderColor: '#222' },
    pkgHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    pkgIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(204, 255, 0, 0.05)', justifyContent: 'center', alignItems: 'center' },
    pkgName: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
    pkgPrice: { color: COLORS.primary, fontSize: 20, fontWeight: '900', marginBottom: 12 },
    pkgMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    pkgDuration: { color: COLORS.textDim, fontSize: 13 },
    pkgDesc: { color: COLORS.textDim, fontSize: 13, lineHeight: 18 }
});
