import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircle, Lock, Mail, User, UserPlus } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignupScreen() {
    const { redirectTo, linkRequestId, emailHint } = useLocalSearchParams();
    const router = useRouter();
    const [email, setEmail] = useState((emailHint as string) || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [artistName, setArtistName] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSignup = async () => {
        setErrorMsg('');
        if (!email || !password || !confirmPassword || (!linkRequestId && !artistName)) {
            setErrorMsg('Please fill in all fields.');
            return;
        }

        if (password !== confirmPassword) {
            setErrorMsg('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            const { data: { user, session }, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (signUpError) throw signUpError;
            if (!user) throw new Error('No user data returned.');

            if (session) {
                const isClient = !!linkRequestId;
                const role = isClient ? 'client' : 'artist';
                const name = isClient ? email.split('@')[0] : artistName;

                // Create Profile
                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: user.id,
                        name: name,
                        role: role,
                        email: email
                    }, { onConflict: 'id' });

                if (linkRequestId) {
                    // Link the guest booking request
                    await supabase
                        .from('booking_requests')
                        .update({ client_id: user.id })
                        .eq('id', linkRequestId);
                }

                if (!isClient) {
                    // Initialize Act only for artists
                    await supabase
                        .from('acts')
                        .insert({
                            owner_id: user.id,
                            name: artistName,
                            category: 'Specialty Act',
                            artist_type: 'Solo',
                            description: `Artist profile for ${artistName}`,
                            is_published: false
                        });
                }

                if (redirectTo) {
                    // @ts-ignore
                    router.replace(redirectTo as any);
                } else {
                    router.replace(isClient ? '/(tabs)/bookings' : '/artist-dashboard');
                }
            } else {
                const confirmMsg = 'Account created! Please check your email to confirm before logging in.';
                setErrorMsg(confirmMsg);
                if (Platform.OS === 'web') window.alert(confirmMsg);
                else Alert.alert('Verification Required', confirmMsg);
                router.push('/login');
            }

        } catch (error: any) {
            setErrorMsg(error.message);
        } finally {
            setLoading(false);
        }
    };
    const handleOAuthLogin = async (provider: 'google' | 'apple') => {
        setErrorMsg('');
        setLoading(true);
        try {
            const redirectUrl = Platform.OS === 'web'
                ? (redirectTo ? `${window.location.origin}${redirectTo}` : window.location.origin)
                : undefined;

            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: redirectUrl
                }
            });

            if (error) throw error;
        } catch (error: any) {
            setErrorMsg(error.message || 'Log in canceled or failed');
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

                        {/* Social Login Buttons */}
                        <View style={styles.socialContainer}>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.socialButton,
                                    styles.googleButton,
                                    pressed && { opacity: 0.8 }
                                ]}
                                onPress={() => handleOAuthLogin('google')}
                                disabled={loading}
                            >
                                <View style={styles.socialIconPlaceholder}>
                                    <View style={[styles.googleDot, { backgroundColor: '#EA4335' }]} />
                                    <View style={[styles.googleDot, { backgroundColor: '#4285F4' }]} />
                                    <View style={[styles.googleDot, { backgroundColor: '#FBBC05' }]} />
                                    <View style={[styles.googleDot, { backgroundColor: '#34A853' }]} />
                                </View>
                                <Text style={styles.socialButtonText}>Continue with Google</Text>
                            </Pressable>

                            <Pressable
                                style={({ pressed }) => [
                                    styles.socialButton,
                                    styles.appleButton,
                                    pressed && { opacity: 0.8 }
                                ]}
                                onPress={() => handleOAuthLogin('apple')}
                                disabled={loading}
                            >
                                <Mail size={20} color="white" style={styles.socialIcon} />
                                <Text style={[styles.socialButtonText, { color: 'white' }]}>Continue with Apple</Text>
                            </Pressable>
                        </View>

                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>OR</Text>
                            <View style={styles.dividerLine} />
                        </View>

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
    loginLinkHighlight: { color: COLORS.primary, fontWeight: 'bold' },
    socialContainer: { marginBottom: 30 },
    socialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#333',
    },
    googleButton: { backgroundColor: 'white' },
    appleButton: { backgroundColor: 'black' },
    socialIcon: { marginRight: 12 },
    socialButtonText: { fontSize: 16, fontWeight: 'bold', color: '#000' },
    socialIconPlaceholder: {
        flexDirection: 'row',
        marginRight: 12,
        width: 20,
        justifyContent: 'space-between',
    },
    googleDot: { width: 4, height: 4, borderRadius: 2 },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#333',
    },
    dividerText: {
        color: COLORS.textDim,
        paddingHorizontal: 16,
        fontSize: 12,
        fontWeight: 'bold',
    },
});
