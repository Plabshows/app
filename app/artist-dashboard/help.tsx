import { COLORS } from '@/src/constants/theme';
import { HelpCircle, MessageSquare } from 'lucide-react-native';
import React from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

export default function HelpScreen() {
    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <Text style={styles.title}>Help & Support</Text>
                <Text style={styles.subtitle}>We're here to help you succeed on the platform.</Text>
            </View>

            <View style={styles.grid}>
                <HelpCard
                    title="Knowledge Base"
                    desc="Read our guide on how to create a profile that gets booked."
                    icon={HelpCircle}
                />
                <HelpCard
                    title="Live Chat"
                    desc="Talk to our artist support team."
                    icon={MessageSquare}
                    primary
                />
            </View>
        </ScrollView>
    );
}

const HelpCard = ({ title, desc, icon: Icon, primary }: any) => (
    <View style={[styles.card, primary && { borderColor: COLORS.primary + '66' }]}>
        <Icon size={32} color={primary ? COLORS.primary : COLORS.textDim} style={{ marginBottom: 16 }} />
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDesc}>{desc}</Text>
        <Pressable style={[styles.cardButton, primary && { backgroundColor: COLORS.primary }]}>
            <Text style={[styles.cardButtonText, primary && { color: COLORS.background }]}>Open</Text>
        </Pressable>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: 32 },
    header: { marginBottom: 40 },
    title: { fontSize: 32, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
    subtitle: { fontSize: 16, color: COLORS.textDim, fontWeight: '500' },
    grid: { flexDirection: 'row', gap: 20, flexWrap: 'wrap' },
    card: {
        backgroundColor: '#111',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#222',
        flex: 1,
        minWidth: 280
    },
    cardTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
    cardDesc: { fontSize: 14, color: COLORS.textDim, marginBottom: 20, lineHeight: 20 },
    cardButton: { backgroundColor: '#222', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    cardButtonText: { color: COLORS.text, fontWeight: 'bold' }
});
