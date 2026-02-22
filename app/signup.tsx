import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { useRouter } from 'expo-router';
import { AlertCircle, Lock, Mail, User, UserPlus } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignupScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [artistName, setArtistName] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(''); // Estado visual de error

    const handleSignup = async () => {
        setErrorMsg(''); // Reset error
        // Validation with immediate feedback
        if (!email || !password || !confirmPassword || !artistName) {
            console.log('[Signup] Validation failed: Missing fields');
            setErrorMsg('Por favor rellena todos los campos para continuar.');
            return;
        }

        if (password !== confirmPassword) {
            console.log('[Signup] Validation failed: Password mismatch');
            setErrorMsg('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);
        console.log('[Signup] Iniciando proceso de registro...', { email, artistName });

        try {
            // STEP 1: Supabase Auth Signup
            console.log('[Signup] Paso 1: Creando usuario en Supabase Auth...');
            const { data: { user, session }, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (signUpError) {
                console.error('[Signup] Error en Auth.signUp:', signUpError.message);
                throw signUpError;
            }

            if (!user) {
                const noUserError = new Error('No se recibió la información del usuario tras el registro.');
                console.error('[Signup] Error Crítico:', noUserError.message);
                throw noUserError;
            }

            console.log('[Signup] Usuario creado con ID:', user.id, 'Sesión activa:', !!session);

            // STEP 2: Profile & Act Initialization (Frontend logic)
            // We only proceed if we have a session (or if we trust the user won't be blocked by RLS)
            // Note: If session is null, it usually means email confirmation is required.
            if (session) {
                console.log('[Signup] Paso 2: Inicializando Perfil y Acto...');

                // 2a. Update Profile
                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: user.id,
                        name: artistName,
                        role: 'artist',
                        email: email
                    }, { onConflict: 'id' });

                if (profileError) {
                    console.error('[Signup] Error inicializando perfil:', profileError.message);
                    // We log but don't critical-fail here, as the user exists and can edit later
                } else {
                    console.log('[Signup] Perfil creado/actualizado correctamente.');
                }

                // 2b. Initialize Act
                const { error: actError } = await supabase
                    .from('acts')
                    .insert({
                        owner_id: user.id,
                        name: artistName,
                        category: 'Specialty Act',
                        artist_type: 'Solo',
                        description: `Perfil artístico de ${artistName}`,
                        is_published: false
                    });

                if (actError) {
                    console.error('[Signup] Error inicializando acto:', actError.message);
                } else {
                    console.log('[Signup] Acto inicializado correctamente.');
                }

                // STEP 3: Forced Redirection
                console.log('[Signup] Paso 3: Redirigiendo al Dashboard...');
                router.push('/artist-dashboard' as any);
            } else {
                // Handle "Confirm Email" requirement
                console.log('[Signup] Registro exitoso pero requiere verificación de email.');
                const confirmMsg = 'Cuenta creada correctamente. Por favor, revisa tu email y confirma tu cuenta antes de iniciar sesión.';
                setErrorMsg(confirmMsg); // Show in the UI potentially, but also an alert for the web user isn't bad

                if (Platform.OS === 'web') {
                    window.alert(confirmMsg);
                } else {
                    Alert.alert('Verificación Requerida', confirmMsg);
                }

                router.push('/login');
            }

        } catch (error: any) {
            console.error('[Signup] ERROR CRÍTICO EN FLUJO:', error.message);
            setErrorMsg(error.message || 'Error desconocido durante el registro.');
        } finally {
            setLoading(false);
            console.log('[Signup] Proceso finalizado.');
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
                        <View style={styles.iconCircle}>
                            <UserPlus size={40} color={COLORS.primary} />
                        </View>
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Start your artist journey today</Text>
                    </View>

                    <View style={styles.form}>
                        {errorMsg ? (
                            <View style={styles.errorContainer}>
                                <AlertCircle size={20} color="#ff4444" style={styles.errorIcon} />
                                <Text style={styles.errorText}>{errorMsg}</Text>
                            </View>
                        ) : null}

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Artist Name</Text>
                            <View style={styles.inputWrapper}>
                                <User size={20} color={COLORS.textDim} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Luna Fire Trio"
                                    placeholderTextColor={COLORS.textDim}
                                    value={artistName}
                                    onChangeText={setArtistName}
                                />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email Address</Text>
                            <View style={styles.inputWrapper}>
                                <Mail size={20} color={COLORS.textDim} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="artist@example.com"
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
                                    placeholder="••••••••"
                                    placeholderTextColor={COLORS.textDim}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Confirm Password</Text>
                            <View style={styles.inputWrapper}>
                                <Lock size={20} color={COLORS.textDim} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="••••••••"
                                    placeholderTextColor={COLORS.textDim}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry
                                />
                            </View>
                        </View>

                        <Pressable
                            style={({ pressed }) => [
                                styles.signupButton,
                                pressed && { opacity: 0.8 }
                            ]}
                            onPress={handleSignup}
                            disabled={loading}
                        >
                            {loading ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <ActivityIndicator color={COLORS.background} style={{ marginRight: 10 }} />
                                    <Text style={styles.signupButtonText}>Creando cuenta...</Text>
                                </View>
                            ) : (
                                <Text style={styles.signupButtonText}>Sign Up</Text>
                            )}
                        </Pressable>

                        <Pressable
                            style={styles.loginLink}
                            onPress={() => router.push('/login')}
                        >
                            <Text style={styles.loginLinkText}>
                                Already have an account? <Text style={styles.loginLinkHighlight}>Log In</Text>
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
    scrollContent: { padding: SPACING.xl },
    header: { alignItems: 'center', marginBottom: 40, marginTop: 20 },
    iconCircle: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(204, 255, 0, 0.1)',
        justifyContent: 'center', alignItems: 'center', marginBottom: 20,
        borderWidth: 1, borderColor: 'rgba(204, 255, 0, 0.3)'
    },
    title: { fontSize: 32, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
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
    inputContainer: { marginBottom: 20 },
    label: { color: COLORS.text, fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#1A1A1A', borderRadius: 12,
        borderWidth: 1, borderColor: '#333', paddingHorizontal: 16
    },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, color: COLORS.text, paddingVertical: 16, fontSize: 16 },
    signupButton: {
        backgroundColor: COLORS.primary, padding: 18, borderRadius: 12,
        alignItems: 'center', marginTop: 10,
        shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
    },
    signupButtonText: { color: COLORS.background, fontWeight: 'bold', fontSize: 18 },
    loginLink: { marginTop: 24, alignItems: 'center' },
    loginLinkText: { color: COLORS.textDim, fontSize: 14 },
    loginLinkHighlight: { color: COLORS.primary, fontWeight: 'bold' }
});
