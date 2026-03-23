import AuthGate from '@/src/components/AuthGate';
import { useAuth } from '@/src/context/AuthContext';
import { MessageCircle } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../src/constants/theme';

export default function MessagesScreen() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
        );
    }

    if (!user) {
        return (
            <AuthGate
                title="Your Messages"
                subtitle="Sign in to chat with artists and manage your booking inquiries."
            />
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <MessageCircle size={64} color={COLORS.primary} strokeWidth={1} style={styles.icon} />
                <Text style={styles.title}>Messages</Text>
                <Text style={styles.subtitle}>Your conversations with clients and artists will appear here.</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { flex: 1, padding: SPACING.xl, justifyContent: 'center', alignItems: 'center' },
    icon: { marginBottom: 24, opacity: 0.5 },
    title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 12 },
    subtitle: { fontSize: 16, color: COLORS.textDim, textAlign: 'center', lineHeight: 24 }
});
