import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Lock, Mail } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            // Fetch profile to check role/admin status
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_admin, role')
                .eq('id', (await supabase.auth.getUser()).data.user?.id)
                .single();

            if (profile?.is_admin) {
                router.replace('/admin' as any);
            } else {
                router.replace('/artist-dashboard' as any);
            }
        } catch (error: any) {
            Alert.alert('Login Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickLogin = async () => {
        setLoading(true);
        console.log('[QuickLogin] Iniciando acceso rápido para Manuel Forner...');
        const demoEmail = 'demo@manuelforner.com';
        const demoPassword = 'manuel_demo_123';
        const demoUserId = '00000000-0000-0000-0000-000000000000';

        try {
            // STEP 1: Attempt standard login
            console.log('[QuickLogin] Paso 1: Intentando iniciar sesión...');
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email: demoEmail,
                password: demoPassword,
            });

            if (signInError) {
                console.log('[QuickLogin] Error de auth estándar:', signInError.message);

                // If rate limited or fail, trigger GHOST MODE
                console.log('[QuickLogin] Usando GHOST MODE...');
                await AsyncStorage.setItem('GHOST_AUTH_USER_ID', demoUserId);
                await AsyncStorage.setItem('GHOST_IS_ADMIN', 'false');

                // SYNC AUTH STATE
                await refreshAuth();

                router.replace('/artist-dashboard');
                return;
            }

            // Sync auth state before check
            await refreshAuth();

            // Normal flow if auth works
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', signInData.user?.id)
                .single();

            router.replace(profile?.is_admin ? '/admin' : '/artist-dashboard');

        } catch (error: any) {
            console.error('[QuickLogin] ERROR:', error.message);
            // Even on unexpected error, try ghost mode as last resort
            await AsyncStorage.setItem('GHOST_AUTH_USER_ID', demoUserId);
            await AsyncStorage.setItem('GHOST_IS_ADMIN', 'false');
            await refreshAuth();
            router.replace('/artist-dashboard' as any);
        } finally {
            setLoading(false);
            console.log('[QuickLogin] Fin del proceso de acceso rápido.');
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

                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>OR QUICK ACCESS</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <Pressable
                            style={styles.quickLoginButton}
                            onPress={handleQuickLogin}
                            disabled={loading}
                        >
                            <Text style={styles.quickLoginButtonText}>Login as Manuel Forner (Demo)</Text>
                        </Pressable>

                        {/* Admin Entry Shortcut - THE BACKDOOR */}
                        <Pressable
                            style={styles.adminShortcut}
                            onPress={async () => {
                                console.log('[Backdoor] ACTIVATING GHOST ADMIN MODE...');
                                const adminId = 'admin-ghost-999';
                                await AsyncStorage.setItem('GHOST_AUTH_USER_ID', adminId);
                                await AsyncStorage.setItem('GHOST_IS_ADMIN', 'true');
                                await refreshAuth();
                                router.replace('/admin');
                            }}
                        >
                            <Text style={styles.adminShortcutText}>🛡️ Acceso Administrador (Directo)</Text>
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
    signupLinkHighlight: { color: COLORS.primary, fontWeight: 'bold' },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 32,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#222',
    },
    dividerText: {
        color: COLORS.textDim,
        fontSize: 12,
        fontWeight: 'bold',
        marginHorizontal: 16,
        letterSpacing: 1,
    },
    quickLoginButton: {
        backgroundColor: 'transparent',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.primary,
        borderStyle: 'dashed',
    },
    quickLoginButtonText: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: 16,
    },
    adminShortcut: {
        marginTop: 32,
        alignItems: 'center',
        padding: 12,
        backgroundColor: 'rgba(255, 149, 0, 0.05)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 149, 0, 0.2)',
    },
    adminShortcutText: {
        color: '#FF9500',
        fontWeight: '700',
        fontSize: 14,
    }
});
