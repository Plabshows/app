import { COLORS } from '@/src/constants/theme';
import { Zap } from 'lucide-react-native';
import React from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

export default function UpgradeScreen() {
    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <Text style={styles.title}>Go Pro</Text>
                <Text style={styles.subtitle}>Unlock premium features and get booked by top clients.</Text>
            </View>

            <View style={styles.card}>
                <Zap size={48} color={COLORS.primary} style={{ marginBottom: 20 }} />
                <Text style={styles.planTitle}>Pro Artist Membership</Text>
                <Text style={styles.price}>AED 199 / month</Text>

                <View style={styles.features}>
                    <FeatureItem text="Unlimited High-Res Photos" />
                    <FeatureItem text="Featured in Search Results" />
                    <FeatureItem text="Lower Commission Fees" />
                    <FeatureItem text="Advanced Analytics" />
                    <FeatureItem text="Direct Messaging with Clients" />
                </View>

                <Pressable style={styles.button}>
                    <Text style={styles.buttonText}>Upgrade Now</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}

const FeatureItem = ({ text }: { text: string }) => (
    <View style={styles.featureItem}>
        <Text style={styles.featureDot}>•</Text>
        <Text style={styles.featureText}>{text}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: 32 },
    header: { marginBottom: 40 },
    title: { fontSize: 32, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
    subtitle: { fontSize: 16, color: COLORS.textDim, fontWeight: '500' },
    card: { backgroundColor: '#111', borderRadius: 24, padding: 32, borderWidth: 1, borderColor: COLORS.primary + '33' },
    planTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
    price: { fontSize: 20, color: COLORS.primary, fontWeight: '700', marginBottom: 24 },
    features: { marginBottom: 32 },
    featureItem: { flexDirection: 'row', marginBottom: 12, gap: 12 },
    featureDot: { color: COLORS.primary, fontSize: 18 },
    featureText: { color: COLORS.text, fontSize: 16 },
    button: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 12, alignItems: 'center' },
    buttonText: { color: COLORS.background, fontWeight: 'bold', fontSize: 16 }
});
