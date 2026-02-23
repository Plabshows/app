import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, Home, LogIn, MessageSquare } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BookingConfirmationScreen() {
    const { requestId, email } = useLocalSearchParams();
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setIsLoggedIn(!!session);
        });
    }, []);

    const handleTrackRequest = () => {
        router.push({
            pathname: '/login',
            params: {
                redirectTo: '/(tabs)/bookings',
                linkRequestId: requestId,
                emailHint: email
            }
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconCircle}>
                    <CheckCircle2 size={48} color={COLORS.primary} />
                </View>

                <Text style={styles.title}>Request Sent!</Text>

                <Text style={styles.description}>
                    Thanks! We’re checking availability with the artist.
                    {isLoggedIn
                        ? " You’ll receive a message and a quote in your dashboard soon."
                        : " Track your request by creating an account. We’ll notify you as soon as the artist responds."}
                </Text>

                <View style={styles.actions}>
                    {!isLoggedIn && (
                        <Pressable
                            style={styles.primaryButton}
                            onPress={handleTrackRequest}
                        >
                            <LogIn size={20} color="#000" />
                            <Text style={styles.primaryButtonText}>Track My Request</Text>
                        </Pressable>
                    )}

                    {isLoggedIn && (
                        <Pressable
                            style={styles.primaryButton}
                            onPress={() => router.push('/(tabs)/bookings')}
                        >
                            <MessageSquare size={20} color="#000" />
                            <Text style={styles.primaryButtonText}>View My Bookings</Text>
                        </Pressable>
                    )}

                    <Pressable
                        style={styles.secondaryButton}
                        onPress={() => router.replace('/')}
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
        backgroundColor: 'rgba(204, 255, 0, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.xl,
        borderWidth: 2,
        borderColor: 'rgba(204, 255, 0, 0.2)',
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: COLORS.text,
        marginBottom: SPACING.m,
        textAlign: 'center',
    },
    description: {
        fontSize: 18,
        color: COLORS.textDim,
        textAlign: 'center',
        lineHeight: 28,
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
        paddingVertical: 18,
        borderRadius: 12,
        gap: 12,
    },
    primaryButtonText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 18,
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#333',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: 12,
        gap: 12,
    },
    secondaryButtonText: {
        color: COLORS.text,
        fontWeight: 'bold',
        fontSize: 18,
    }
});
