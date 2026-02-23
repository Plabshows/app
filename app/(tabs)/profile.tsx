import { useRouter } from 'expo-router';
import {
    Calendar,
    Camera,
    ChevronRight, Clock, CreditCard,
    FileText, Globe, HelpCircle, LogOut, MessageCircle,
    Shield, Star, User, Zap
} from 'lucide-react-native';
import React from 'react';
import {
    ActivityIndicator, Image, Pressable, ScrollView,
    StyleSheet, Text, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';

export default function ProfileScreen() {
    const router = useRouter();
    const { user, session, profile, artistAct, loading, signOut } = useAuth();

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator color={COLORS.orange} size="large" />
            </View>
        );
    }

    if (!session) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContainer}>
                    <View style={styles.iconCircle}>
                        <User size={60} color={COLORS.orange} />
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

    const MenuItem = ({ icon: Icon, title, subtitle, onPress, color = '#111827', rightIcon: RightIcon = ChevronRight }:
        { icon: any, title: string, subtitle?: string, onPress: () => void, color?: string, rightIcon?: any }) => (
        <Pressable style={styles.menuItem} onPress={onPress}>
            <View style={styles.menuItemLeft}>
                <View style={styles.iconWrapper}>
                    <Icon size={20} color={color === COLORS.orange ? COLORS.orange : '#6B7280'} />
                </View>
                <Text style={[styles.menuItemText, { color }]}>{title}</Text>
            </View>
            <View style={styles.menuItemRight}>
                {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
                {RightIcon && <RightIcon size={18} color="#D1D5DB" />}
            </View>
        </Pressable>
    );

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} bounces={true}>
                {/* 2. Cabecera del Perfil (Top Section) */}
                <View style={styles.headerSection}>
                    {/* Cover Photo */}
                    <Image
                        source={{ uri: profile?.cover_url || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000&auto=format&fit=crop' }}
                        style={styles.coverPhoto}
                    />

                    <View style={styles.profileInfoContainer}>
                        {/* Avatar y Datos */}
                        <View style={styles.avatarContainer}>
                            <Image
                                source={{ uri: profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop' }}
                                style={styles.avatar}
                            />
                            <Pressable style={styles.cameraButton}>
                                <Camera size={16} color="#FFFFFF" />
                            </Pressable>
                        </View>

                        <View style={styles.nameSection}>
                            <Text style={styles.nameText}>{profile?.name || 'Artist Name'}</Text>
                            <Text style={styles.locationText}>Dubai, United Arab Emirates</Text>
                            <Text style={styles.categoryText}>Specialty Act</Text>
                        </View>

                        {/* Botón Principal */}
                        <Pressable
                            style={styles.manageButton}
                            onPress={() => router.push('/artist-dashboard/edit-profile' as any)}
                        >
                            <Text style={styles.manageButtonText}>Manage Profile</Text>
                        </Pressable>
                    </View>
                </View>

                {/* 3. Menú de Navegación del Dashboard (Estilo Lista) */}
                <View style={styles.menuSection}>
                    <Text style={styles.sectionHeader}>Dashboard</Text>
                    <MenuItem
                        icon={Calendar}
                        title="Bookings"
                        onPress={() => router.push('/artist-dashboard/my-bookings' as any)}
                    />
                    <MenuItem
                        icon={Clock}
                        title="Calendar"
                        onPress={() => { }}
                    />
                    <MenuItem
                        icon={Star}
                        title="Reviews"
                        onPress={() => { }}
                    />
                    <MenuItem
                        icon={MessageCircle}
                        title="Messages"
                        onPress={() => router.push('/messages' as any)}
                    />
                    <MenuItem
                        icon={CreditCard}
                        title="Billing"
                        onPress={() => router.push('/artist-dashboard/billing' as any)}
                    />
                    <MenuItem
                        icon={Zap}
                        title="Pro Membership"
                        color={COLORS.orange}
                        onPress={() => router.push('/artist-dashboard/pro-membership' as any)}
                    />
                </View>

                <View style={[styles.menuSection, { marginBottom: 120 }]}>
                    <Text style={styles.sectionHeader}>Settings</Text>
                    <MenuItem
                        icon={Globe}
                        title="Localization"
                        onPress={() => { }}
                    />
                    <MenuItem
                        icon={Shield}
                        title="Security"
                        onPress={() => router.push('/artist-dashboard/security' as any)}
                    />
                    <MenuItem
                        icon={FileText}
                        title="Terms & Conditions"
                        onPress={() => { }}
                    />
                    <MenuItem
                        icon={HelpCircle}
                        title="Help"
                        onPress={() => { }}
                    />
                    <MenuItem
                        icon={LogOut}
                        title="Log out"
                        color="#EF4444"
                        onPress={signOut}
                        rightIcon={null}
                    />
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    center: { justifyContent: 'center', alignItems: 'center' },
    scrollContent: { flexGrow: 1 },

    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
    iconCircle: {
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: '#FFF7ED',
        justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.xl
    },
    title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 10, textAlign: 'center' },
    subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 30, lineHeight: 22 },
    primaryButton: {
        backgroundColor: COLORS.orange, paddingHorizontal: 20, paddingVertical: 15, borderRadius: 12, alignItems: 'center'
    },
    buttonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
    secondaryButton: {
        backgroundColor: 'transparent', paddingHorizontal: 20, paddingVertical: 15, borderRadius: 12,
        borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center'
    },
    secondaryButtonText: { color: '#374151', fontWeight: 'bold', fontSize: 16 },
    authButtonContainer: { flexDirection: 'row', width: '100%', marginTop: 10 },

    headerSection: { backgroundColor: '#FFFFFF', marginBottom: SPACING.m },
    coverPhoto: { width: '100%', height: 140, backgroundColor: '#E5E7EB' },
    profileInfoContainer: { paddingHorizontal: SPACING.m, alignItems: 'center' },
    avatarContainer: { marginTop: -50, position: 'relative' },
    avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#FFFFFF' },
    cameraButton: {
        position: 'absolute', bottom: 0, right: 0,
        backgroundColor: COLORS.orange, width: 32, height: 32,
        borderRadius: 16, borderWidth: 3, borderColor: '#FFFFFF',
        justifyContent: 'center', alignItems: 'center'
    },
    nameSection: { alignItems: 'center', marginTop: 12, marginBottom: 20 },
    nameText: { fontSize: 22, fontWeight: '800', color: '#111827' },
    locationText: { fontSize: 14, color: '#6B7280', marginTop: 4 },
    categoryText: { fontSize: 14, color: '#9CA3AF', marginTop: 2 },
    manageButton: {
        backgroundColor: COLORS.orange, width: '100%',
        paddingVertical: 14, borderRadius: 12, alignItems: 'center',
        shadowColor: COLORS.orange, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2, shadowRadius: 8, elevation: 4
    },
    manageButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

    menuSection: { paddingHorizontal: SPACING.m, marginTop: SPACING.l },
    sectionHeader: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },
    menuItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6'
    },
    menuItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    iconWrapper: { marginRight: 16 },
    menuItemText: { fontSize: 16, fontWeight: '500' },
    menuItemRight: { flexDirection: 'row', alignItems: 'center' },
    menuItemSubtitle: { fontSize: 14, color: '#9CA3AF', marginRight: 8 },
});
