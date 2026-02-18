
import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import React, { useEffect, useState } from 'react';
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

export default function BasicInfo() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState({ name: '', email: '', city: '', country: '' });

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
            if (data) setProfile({
                name: data.name || '',
                email: data.email || user.email || '',
                city: data.city || '',
                country: data.country || ''
            });
        }
        setLoading(false);
    };

    const [errors, setErrors] = useState<string[]>([]);

    const validate = () => {
        const newErrors: string[] = [];
        if (!profile.name) newErrors.push('name');
        if (!profile.city) newErrors.push('city');
        if (!profile.country) newErrors.push('country');
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
                .from('profiles')
                .update({
                    name: profile.name,
                    city: profile.city,
                    country: profile.country
                })
                .eq('id', user.id);

            if (error) Alert.alert('Error', error.message);
            else Alert.alert('Success', 'Profile updated successfully');
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
            <Text style={styles.title}>Basic Information</Text>
            <Text style={styles.subtitle}>Manage your personal contact details and location.</Text>

            <View style={styles.card}>
                <View style={styles.field}>
                    <Text style={[styles.label, errors.includes('name') && { color: COLORS.error }]}>Full Name</Text>
                    <TextInput
                        style={[styles.input, errors.includes('name') && { borderColor: COLORS.error, borderWidth: 1.5 }]}
                        value={profile.name}
                        onChangeText={t => {
                            setProfile({ ...profile, name: t });
                            if (errors.includes('name')) setErrors(errors.filter(e => e !== 'name'));
                        }}
                        placeholder="John Doe"
                        placeholderTextColor={COLORS.textDim}
                    />
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Email Address (Read Only)</Text>
                    <TextInput
                        style={[styles.input, styles.disabled]}
                        value={profile.email}
                        editable={false}
                        placeholderTextColor={COLORS.textDim}
                    />
                </View>

                <View style={styles.row}>
                    <View style={[styles.field, { flex: 1, marginRight: 12 }]}>
                        <Text style={[styles.label, errors.includes('city') && { color: COLORS.error }]}>City</Text>
                        <TextInput
                            style={[styles.input, errors.includes('city') && { borderColor: COLORS.error, borderWidth: 1.5 }]}
                            value={profile.city}
                            onChangeText={t => {
                                setProfile({ ...profile, city: t });
                                if (errors.includes('city')) setErrors(errors.filter(e => e !== 'city'));
                            }}
                            placeholder="Dubai"
                            placeholderTextColor={COLORS.textDim}
                        />
                    </View>
                    <View style={[styles.field, { flex: 1 }]}>
                        <Text style={[styles.label, errors.includes('country') && { color: COLORS.error }]}>Country</Text>
                        <TextInput
                            style={[styles.input, errors.includes('country') && { borderColor: COLORS.error, borderWidth: 1.5 }]}
                            value={profile.country}
                            onChangeText={t => {
                                setProfile({ ...profile, country: t });
                                if (errors.includes('country')) setErrors(errors.filter(e => e !== 'country'));
                            }}
                            placeholder="UAE"
                            placeholderTextColor={COLORS.textDim}
                        />
                    </View>
                </View>

                <Pressable style={styles.button} onPress={handleSave}>
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
