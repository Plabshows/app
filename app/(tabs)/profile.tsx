import { useRouter } from 'expo-router';
import { ChevronRight, LogOut, Settings, User, UserPlus } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';

export default function ProfileScreen() {
    const router = useRouter();
    const { user, session, profile, artistAct, loading, signOut } = useAuth();

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
        );
    }

    // --- RENDER GUEST VIEW ---
    if (!session) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContainer}>
                    <View style={styles.iconCircle}>
                        <User size={60} color={COLORS.primary} />
                    </View>
                    <Text style={styles.title}>Join the Community</Text>
                    <Text style={styles.subtitle}>Sign in to book artists, manage your profile, and more.</Text>

                    <View style={styles.authButtonContainer}>
                        <Pressable
                            style={[styles.primaryButton, { flex: 1, marginRight: 8 }]}
                            onPress={() => router.push('/signup' as any)}
                        >
                            <Text style={styles.buttonText}>Sign Up</Text>
                        </Pressable>

                        <Pressable
                            style={[styles.secondaryButton, { flex: 1, marginLeft: 8 }]}
                            onPress={() => router.push('/login' as any)}
                        >
                            <Text style={styles.secondaryButtonText}>Log In</Text>
                        </Pressable>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    // --- RENDER LOGGED IN VIEW ---
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    <Image
                        source={{ uri: profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop' }}
                        style={styles.avatar}
                    />
                    <View style={styles.headerInfo}>
                        <Text style={styles.name}>{profile?.name || session?.user?.email?.split('@')[0]}</Text>
                        <View style={styles.statusBadge}>
                            <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
                            <Text style={styles.statusText}>{profile?.role === 'artist' ? 'Artist Account' : 'User Account'}</Text>
                        </View>
                        <Text style={styles.email}>{session?.user?.email}</Text>
                    </View>
                </View>

                {/* Section: Admin Hub (Conditional or Forced for Debug) */}
                {(profile?.is_admin || user?.email === 'hizesupremos@gmail.com') && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: '#FF9500' }]}>Control Total (Admin)</Text>
                        <Pressable
                            style={[styles.menuItem, { borderColor: '#FF9500', borderWidth: 2 }]}
                            onPress={() => router.push('/admin' as any)}
                        >
                            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(255, 149, 0, 0.2)' }]}>
                                <Settings size={22} color="#FF9500" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.menuText, { color: '#FF9500' }]}>ENTRAR AL PANEL ADMIN</Text>
                                <Text style={styles.menuSubtext}>Acceso directo sin restricciones</Text>
                            </View>
                            <ChevronRight size={20} color="#FF9500" />
                        </Pressable>
                    </View>
                )}

                {/* Section: Artist Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Artist Management</Text>
                    {artistAct ? (
                        <Pressable
                            style={styles.menuItem}
                            onPress={() => router.push('/artist-dashboard' as any)}
                        >
                            <View style={styles.menuIconBox}>
                                <Settings size={22} color={COLORS.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.menuText}>Update My Act</Text>
                                <Text style={styles.menuSubtext}>{artistAct.name} • {artistAct.category}</Text>
                            </View>
                            <ChevronRight size={20} color={COLORS.textDim} />
                        </Pressable>
                    ) : (
                        <Pressable
                            style={styles.menuItem}
                            onPress={() => router.push('/artist-onboarding?mode=signup' as any)}
                        >
                            <View style={styles.menuIconBox}>
                                <UserPlus size={22} color={COLORS.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.menuText}>Become an Artist</Text>
                                <Text style={styles.menuSubtext}>Create your performance profile</Text>
                            </View>
                            <ChevronRight size={20} color={COLORS.textDim} />
                        </Pressable>
                    )}
                </View>

                {/* Section: General */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>General</Text>
                    <Pressable style={styles.menuItem}>
                        <View style={styles.menuIconBox}>
                            <User size={22} color={COLORS.text} />
                        </View>
                        <Text style={styles.menuText}>Personal Information</Text>
                        <ChevronRight size={20} color={COLORS.textDim} />
                    </Pressable>
                    <Pressable style={styles.menuItem}>
                        <View style={styles.menuIconBox}>
                            <Settings size={22} color={COLORS.text} />
                        </View>
                        <Text style={styles.menuText}>App Settings</Text>
                        <ChevronRight size={20} color={COLORS.textDim} />
                    </Pressable>
                </View>

                {/* Logout */}
                <Pressable style={[styles.menuItem, styles.logoutItem]} onPress={signOut}>
                    <View style={[styles.menuIconBox, { backgroundColor: 'rgba(255, 68, 68, 0.1)' }]}>
                        <LogOut size={22} color={COLORS.error} />
                    </View>
                    <Text style={[styles.menuText, { color: COLORS.error }]}>Log Out</Text>
                </Pressable>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: SPACING.m, paddingBottom: SPACING.xl },

    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
    iconCircle: {
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: 'rgba(204, 255, 0, 0.1)',
        justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.xl
    },
    title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 10, textAlign: 'center' },
    subtitle: { fontSize: 16, color: COLORS.textDim, textAlign: 'center', marginBottom: 30, lineHeight: 22 },
    primaryButton: {
        backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 15, borderRadius: 30, alignItems: 'center'
    },
    buttonText: { color: COLORS.background, fontWeight: 'bold', fontSize: 16 },
    secondaryButton: {
        backgroundColor: 'transparent', paddingHorizontal: 20, paddingVertical: 15, borderRadius: 30,
        borderWidth: 2, borderColor: COLORS.primary, alignItems: 'center'
    },
    secondaryButtonText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 16 },
    authButtonContainer: { flexDirection: 'row', width: '100%', marginTop: 10 },

    profileHeader: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#111', padding: SPACING.m, borderRadius: 16, marginBottom: SPACING.xl,
        borderWidth: 1, borderColor: '#222'
    },
    avatar: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: COLORS.primary },
    headerInfo: { marginLeft: SPACING.m, flex: 1 },
    name: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
    email: { fontSize: 14, color: COLORS.textDim },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(204, 255, 0, 0.1)',
        paddingHorizontal: 8, paddingVertical: 2,
        borderRadius: 12, alignSelf: 'flex-start',
        marginBottom: 4, borderWidth: 1, borderColor: 'rgba(204, 255, 0, 0.2)'
    },
    statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6, backgroundColor: COLORS.primary },
    statusText: { color: COLORS.primary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

    section: { marginBottom: SPACING.xl },
    sectionTitle: {
        fontSize: 12, fontWeight: 'bold', color: COLORS.primary,
        textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1
    },

    menuItem: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#111', padding: 12, borderRadius: 12, marginBottom: 10,
        borderWidth: 1, borderColor: '#222'
    },
    menuIconBox: {
        width: 40, height: 40, borderRadius: 8,
        backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', marginRight: 12
    },
    menuText: { fontSize: 16, color: COLORS.text, fontWeight: '600' },
    menuSubtext: { fontSize: 13, color: COLORS.textDim, marginTop: 2 },
    logoutItem: { marginTop: 20, borderColor: 'rgba(255, 68, 68, 0.2)' }
});
