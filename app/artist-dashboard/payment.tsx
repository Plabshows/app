
import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { Info, Landmark, ShieldCheck } from 'lucide-react-native';
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

export default function PaymentSection() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [paymentInfo, setPaymentInfo] = useState({
        payment_iban: '',
        payment_bank_name: ''
    });

    useEffect(() => {
        fetchPaymentInfo();
    }, []);

    const fetchPaymentInfo = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('profiles').select('payment_iban, payment_bank_name').eq('id', user.id).single();
            setPaymentInfo({
                payment_iban: data?.payment_iban || '',
                payment_bank_name: data?.payment_bank_name || ''
            });
        }
        setLoading(false);
    };

    const [errors, setErrors] = useState<string[]>([]);

    const validate = () => {
        const newErrors: string[] = [];
        if (!paymentInfo.payment_bank_name) newErrors.push('payment_bank_name');
        if (!paymentInfo.payment_iban) newErrors.push('payment_iban');
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
            const { error } = await supabase.from('profiles').update(paymentInfo).eq('id', user.id);
            if (error) Alert.alert('Error', error.message);
            else Alert.alert('Success', 'Payment information updated');
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
            <Text style={styles.title}>Payment Information</Text>
            <Text style={styles.subtitle}>Enter your bank details to receive payments for your performances.</Text>

            <View style={styles.card}>
                <View style={styles.header}>
                    <Landmark size={24} color={COLORS.primary} />
                    <Text style={styles.headerTitle}>Bank Account Details</Text>
                </View>

                <View style={styles.field}>
                    <Text style={[styles.label, errors.includes('payment_bank_name') && { color: COLORS.error }]}>Bank Name</Text>
                    <TextInput
                        style={[styles.input, errors.includes('payment_bank_name') && { borderColor: COLORS.error, borderWidth: 1.5 }]}
                        value={paymentInfo.payment_bank_name}
                        onChangeText={t => {
                            setPaymentInfo({ ...paymentInfo, payment_bank_name: t });
                            if (errors.includes('payment_bank_name')) setErrors(errors.filter(e => e !== 'payment_bank_name'));
                        }}
                        placeholder="e.g. Emirates NBD"
                        placeholderTextColor={COLORS.textDim}
                    />
                </View>

                <View style={styles.field}>
                    <Text style={[styles.label, errors.includes('payment_iban') && { color: COLORS.error }]}>IBAN</Text>
                    <TextInput
                        style={[styles.input, errors.includes('payment_iban') && { borderColor: COLORS.error, borderWidth: 1.5 }]}
                        value={paymentInfo.payment_iban}
                        onChangeText={t => {
                            setPaymentInfo({ ...paymentInfo, payment_iban: t });
                            if (errors.includes('payment_iban')) setErrors(errors.filter(e => e !== 'payment_iban'));
                        }}
                        placeholder="AE00 0000 0000 0000 0000 000"
                        placeholderTextColor={COLORS.textDim}
                    />
                </View>

                <Pressable style={styles.button} onPress={handleSave}>
                    {saving ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.buttonText}>Save Payment Info</Text>}
                </Pressable>

                <View style={styles.secureBadge}>
                    <ShieldCheck size={16} color="#4CAF50" />
                    <Text style={styles.secureText}>Your data is encrypted and stored securely.</Text>
                </View>
            </View>

            <View style={styles.note}>
                <Info size={18} color={COLORS.primary} />
                <Text style={styles.noteText}>
                    Payments are typically processed within 7-14 business days after a performance is completed.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: SPACING.l },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
    subtitle: { fontSize: 14, color: COLORS.textDim, marginBottom: 32 },
    card: { backgroundColor: '#1A1A1A', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#222' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 28 },
    headerTitle: { fontSize: 18, color: COLORS.text, fontWeight: 'bold' },
    field: { marginBottom: 24 },
    label: { color: COLORS.textDim, marginBottom: 8, fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold' },
    input: { backgroundColor: '#222', color: COLORS.text, padding: 16, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: '#333' },
    button: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
    buttonText: { color: COLORS.background, fontWeight: 'bold', fontSize: 16 },
    secureBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24 },
    secureText: { color: '#4CAF50', fontSize: 12, fontWeight: 'bold' },
    note: { marginTop: 32, padding: 20, backgroundColor: 'rgba(204, 255, 0, 0.05)', borderRadius: 12, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    noteText: { flex: 1, color: COLORS.text, fontSize: 13, lineHeight: 18 }
});
