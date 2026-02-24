import { useRouter } from 'expo-router';
import { Lock } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../constants/theme';

interface AuthGateProps {
    title: string;
    subtitle: string;
}

export default function AuthGate({ title, subtitle }: AuthGateProps) {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconCircle}>
                    <Lock size={40} color={COLORS.primary} />
                </View>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>

                <Pressable
                    style={styles.loginButton}
                    onPress={() => router.push('/login')}
                >
                    <Text style={styles.loginButtonText}>Log In to Continue</Text>
                </Pressable>

                <Pressable
                    style={styles.signupButton}
                    onPress={() => router.push('/signup')}
                >
                    <Text style={styles.signupButtonText}>Create an Account</Text>
                </Pressable>
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
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(204, 255, 0, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(204, 255, 0, 0.3)',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textDim,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    loginButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        marginBottom: 16,
    },
    loginButtonText: {
        color: COLORS.background,
        fontSize: 18,
        fontWeight: 'bold',
    },
    signupButton: {
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    signupButtonText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '600',
    },
});
