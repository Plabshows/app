import { MessageCircle } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../src/constants/theme';

export default function MessagesScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <MessageCircle size={64} color={COLORS.textDim} strokeWidth={1} style={styles.icon} />
                <Text style={styles.title}>Messages</Text>
                <Text style={styles.subtitle}>Your conversations with clients and artists will appear here.</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { flex: 1, padding: SPACING.m, justifyContent: 'center', alignItems: 'center' },
    icon: { marginBottom: 24, opacity: 0.5 },
    title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 12 },
    subtitle: { fontSize: 16, color: COLORS.textDim, textAlign: 'center', lineHeight: 24 }
});
