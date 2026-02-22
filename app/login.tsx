import { useRouter } from 'expo-router';
import { AlertCircle, Lock, Mail } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../src/constants/theme';
import { useAuth } from '../src/context/AuthContext';
import { supabase } from '../src/lib/supabase';

export default function LoginScreen() {
    const router = useRouter();
    const { refreshAuth } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(''); // Estado para mensaje de error nativo en UI

    const handleLogin = async () => {
        setErrorMsg(''); // Reset error
        if (!email || !password) {
            setErrorMsg('Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                console.error('[Login] Error real de Supabase auth:', error.message);
                throw error;
            }

            // Fetch profile to check role/admin status
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_admin, role')
                .eq('id', (await supabase.auth.getUser()).data.user?.id)
                .single();

            if (profile?.is_admin) {
                router.push('/admin' as any);
            } else {
                router.push('/artist-dashboard' as any);
            }
        } catch (error: any) {
            setErrorMsg(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <Text style={styles.logoText}>PL</Text>
                        <Text style={styles.title}>Welcome Back</Text>
                        <Text style={styles.subtitle}>Log in to manage your artist profile</Text>
                    </View>

                    <View style={styles.form}>
                        {errorMsg ? (
                            <View style={styles.errorContainer}>
                                <AlertCircle size={20} color="#ff4444" style={styles.errorIcon} />
                                <Text style={styles.errorText}>{errorMsg}</Text>
                            </View>
                        ) : null}

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email</Text>
                            <View style={styles.inputWrapper}>
                                <Mail size={20} color={COLORS.textDim} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your email"
                                    placeholderTextColor={COLORS.textDim}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Password</Text>
                            <View style={styles.inputWrapper}>
                                <Lock size={20} color={COLORS.textDim} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your password"
                                    placeholderTextColor={COLORS.textDim}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                />
                            </View>
                        </View>

                        <Pressable
                            style={({ pressed }) => [
                                styles.loginButton,
                                pressed && { opacity: 0.8 }
                            ]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={COLORS.background} />
                            ) : (
                                <Text style={styles.loginButtonText}>Log In</Text>
                            )}
                        </Pressable>

                        <Pressable
                            style={styles.signupLink}
                            onPress={() => router.push('/signup')}
                        >
                            <Text style={styles.signupLinkText}>
                                Don't have an account? <Text style={styles.signupLinkHighlight}>Sign Up</Text>
                            </Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    scrollContent: { padding: SPACING.xl, justifyContent: 'center', flexGrow: 1 },
    header: { alignItems: 'center', marginBottom: 40 },
    logoText: {
        fontSize: 48, fontWeight: '900', color: COLORS.primary, marginBottom: 20,
        letterSpacing: -2, textShadowColor: COLORS.primary, textShadowRadius: 10
    },
    title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
    subtitle: { fontSize: 16, color: COLORS.textDim, textAlign: 'center' },
    form: { width: '100%' },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 68, 68, 0.1)',
        padding: 14,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 68, 68, 0.3)'
    },
    errorIcon: { marginRight: 10 },
    errorText: { color: '#ff4444', fontSize: 14, fontWeight: '600', flexShrink: 1 },
    inputContainer: { marginBottom: 24 },
    label: { color: COLORS.text, fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#111', borderRadius: 12,
        borderWidth: 1, borderColor: '#222', paddingHorizontal: 16
    },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, color: COLORS.text, paddingVertical: 18, fontSize: 16 },
    loginButton: {
        backgroundColor: COLORS.primary, padding: 18, borderRadius: 12,
        alignItems: 'center', marginTop: 10
    },
    loginButtonText: { color: COLORS.background, fontWeight: 'bold', fontSize: 18 },
    signupLink: { marginTop: 24, alignItems: 'center' },
    signupLinkText: { color: COLORS.textDim, fontSize: 14 },
    signupLinkHighlight: { color: COLORS.primary, fontWeight: 'bold' }
});
