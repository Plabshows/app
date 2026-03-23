import { COLORS, SPACING } from '@/src/constants/theme';
import { useRouter } from 'expo-router';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react-native';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BookingCancelScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconCircle}>
                    <AlertTriangle size={48} color="#EF4444" />
                </View>

                <Text style={styles.title}>Payment Cancelled</Text>

                <Text style={styles.description}>
                    Your booking process was interrupted and no charges were made.
                    You can try again whenever you're ready.
                </Text>

                <View style={styles.actions}>
                    <Pressable
                        style={styles.primaryButton}
                        onPress={() => router.back()}
                    >
                        <RotateCcw size={20} color="#000" />
                        <Text style={styles.primaryButtonText}>Try Again</Text>
                    </Pressable>

                    <Pressable
                        style={styles.secondaryButton}
                        onPress={() => router.push('/')}
                    >
                        <Home size={20} color={COLORS.text} />
                        <Text style={styles.secondaryButtonText}>Return Home</Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
        maxWidth: 600,
        marginHorizontal: Platform.OS === 'web' ? 'auto' : 0,
        width: '100%',
    },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.xl,
        borderWidth: 2,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: COLORS.text,
        marginBottom: SPACING.m,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        color: COLORS.textDim,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: SPACING.xl,
    },
    actions: {
        width: '100%',
        gap: SPACING.m,
    },
    primaryButton: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 12,
    },
    primaryButtonText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 16,
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#333',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 12,
    },
    secondaryButtonText: {
        color: COLORS.text,
        fontWeight: 'bold',
        fontSize: 16,
    }
});
