
import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { ChevronDown } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';

const ARTIST_TYPES = ['Solo', 'Duo', 'Trio', 'Quartet', 'Band (5+)', 'Group/Crew'];

export default function ArtistProfile() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [act, setAct] = useState({
        name: '',
        category_id: '',
        artist_type: '',
        description: '',
        genre: ''
    });

    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'category' | 'type'>('category');

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        const { data: catData } = await supabase.from('categories').select('*').order('name');
        setCategories(catData || []);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: actData } = await supabase
                .from('acts')
                .select('*')
                .eq('owner_id', user.id)
                .single();
            if (actData) setAct({
                name: actData.name || '',
                category_id: actData.category_id || '',
                artist_type: actData.artist_type || '',
                description: actData.description || '',
                genre: actData.genre || ''
            });
        }
        setLoading(false);
    };

    const [errors, setErrors] = useState<string[]>([]);

    const validate = () => {
        const newErrors: string[] = [];
        if (!act.name) newErrors.push('name');
        if (!act.category_id) newErrors.push('category_id');
        if (!act.artist_type) newErrors.push('artist_type');
        if (!act.description) newErrors.push('description');
        setErrors(newErrors);
        return newErrors.length === 0;
    };

    const handleSave = async () => {
        if (!validate()) {
            return Alert.alert('Incomplete Form', 'Please fill in the required fields highlighted in red.');
        }
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { error } = await supabase
                .from('acts')
                .upsert({
                    owner_id: user.id,
                    ...act
                }, { onConflict: 'owner_id' });

            if (error) Alert.alert('Error', error.message);
            else Alert.alert('Success', 'Artist profile updated');
        }
        setSaving(false);
    };

    if (loading) return (
        <View style={styles.centered}>
            <ActivityIndicator color={COLORS.primary} />
        </View>
    );

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Artist Profile</Text>
            <Text style={styles.subtitle}>Curate how you appear to clients in the marketplace.</Text>

            <View style={styles.card}>
                <View style={styles.field}>
                    <Text style={[styles.label, errors.includes('name') && { color: COLORS.error }]}>Act / Stage Name</Text>
                    <TextInput
                        style={[styles.input, errors.includes('name') && { borderColor: COLORS.error, borderWidth: 1.5 }]}
                        value={act.name}
                        onChangeText={t => {
                            setAct({ ...act, name: t });
                            if (errors.includes('name')) setErrors(errors.filter(e => e !== 'name'));
                        }}
                        placeholder="Moonlight Jazz Trio"
                        placeholderTextColor={COLORS.textDim}
                    />
                </View>

                <View style={styles.field}>
                    <Text style={[styles.label, errors.includes('category_id') && { color: COLORS.error }]}>Primary Category</Text>
                    <Pressable
                        style={[styles.dropdown, errors.includes('category_id') && { borderColor: COLORS.error, borderWidth: 1.5 }]}
                        onPress={() => { setModalType('category'); setModalVisible(true); }}
                    >
                        <Text style={[styles.dropdownText, !act.category_id && { color: COLORS.textDim }]}>
                            {categories.find(c => c.id === act.category_id)?.name || 'Select Category'}
                        </Text>
                        <ChevronDown size={20} color={errors.includes('category_id') ? COLORS.error : COLORS.textDim} />
                    </Pressable>
                </View>

                <View style={styles.field}>
                    <Text style={[styles.label, errors.includes('artist_type') && { color: COLORS.error }]}>Artist Type</Text>
                    <Pressable
                        style={[styles.dropdown, errors.includes('artist_type') && { borderColor: COLORS.error, borderWidth: 1.5 }]}
                        onPress={() => { setModalType('type'); setModalVisible(true); }}
                    >
                        <Text style={[styles.dropdownText, !act.artist_type && { color: COLORS.textDim }]}>
                            {act.artist_type || 'Select Type'}
                        </Text>
                        <ChevronDown size={20} color={errors.includes('artist_type') ? COLORS.error : COLORS.textDim} />
                    </Pressable>
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Genre</Text>
                    <TextInput
                        style={styles.input}
                        value={act.genre}
                        onChangeText={t => setAct({ ...act, genre: t })}
                        placeholder="e.g. Neo-Soul, Tech-House"
                        placeholderTextColor={COLORS.textDim}
                    />
                </View>

                <View style={styles.field}>
                    <Text style={[styles.label, errors.includes('description') && { color: COLORS.error }]}>Bio / Description</Text>
                    <TextInput
                        style={[styles.input, styles.textArea, errors.includes('description') && { borderColor: COLORS.error, borderWidth: 1.5 }]}
                        value={act.description}
                        onChangeText={t => {
                            setAct({ ...act, description: t });
                            if (errors.includes('description')) setErrors(errors.filter(e => e !== 'description'));
                        }}
                        multiline
                        placeholder="Tell clients about your act..."
                        placeholderTextColor={COLORS.textDim}
                    />
                </View>

                <Pressable style={styles.button} onPress={handleSave}>
                    {saving ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.buttonText}>Save Profile</Text>}
                </Pressable>
            </View>

            {/* Selection Modal */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select {modalType === 'category' ? 'Category' : 'Type'}</Text>
                        <ScrollView>
                            {(modalType === 'category' ? categories : ARTIST_TYPES).map((item: any) => (
                                <Pressable
                                    key={modalType === 'category' ? item.id : item}
                                    style={styles.modalItem}
                                    onPress={() => {
                                        if (modalType === 'category') setAct({ ...act, category_id: item.id });
                                        else setAct({ ...act, artist_type: item });
                                        setModalVisible(false);
                                    }}
                                >
                                    <Text style={styles.modalItemText}>{modalType === 'category' ? item.name : item}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>
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
    label: { color: COLORS.textDim, marginBottom: 8, fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold' },
    input: { backgroundColor: '#222', color: COLORS.text, padding: 16, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: '#333' },
    textArea: { height: 120, textAlignVertical: 'top' },
    dropdown: { backgroundColor: '#222', padding: 16, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
    dropdownText: { color: COLORS.text, fontSize: 16 },
    button: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 12 },
    buttonText: { color: COLORS.background, fontWeight: 'bold', fontSize: 16 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#1A1A1A', borderRadius: 16, maxHeight: '60%', padding: 20 },
    modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
    modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#222' },
    modalItemText: { color: COLORS.text, fontSize: 16 }
});
