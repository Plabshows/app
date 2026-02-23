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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../../src/constants/theme';
import { useAuth } from '../../../src/context/AuthContext';

export default function ProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, session, profile, artistAct, loading, signOut } = useAuth();

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
        );
    }

    if (!session) {
        return (
            <View style={styles.container}>
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
            </View>
        );
    }

    const MenuItem = ({ icon: Icon, title, subtitle, onPress, color = COLORS.text, rightIcon: RightIcon = ChevronRight }:
        { icon: any, title: string, subtitle?: string, onPress: () => void, color?: string, rightIcon?: any }) => (
        <Pressable
            style={({ pressed }) => [
                styles.menuItem,
                pressed && { backgroundColor: '#1A1A1A' }
            ]}
            onPress={onPress}
        >
            <View style={styles.menuItemLeft}>
                <View style={styles.iconWrapper}>
                    {/* Restored brand colors for icons */}
                    <Icon size={22} color={color === '#ff4444' ? color : COLORS.primary} />
                </View>
                <Text style={[styles.menuItemText, { color }]}>{title}</Text>
            </View>
            <View style={styles.menuItemRight}>
                {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
                {RightIcon && <RightIcon size={20} color={COLORS.textDim} />}
            </View>
        </Pressable>
    );

    const ProfileHeader = () => (
        <View style={styles.headerSection}>
            <Image
                source={{ uri: profile?.cover_url || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000&auto=format&fit=crop' }}
                style={styles.coverPhoto}
            />

            <View style={styles.profileInfoContainer}>
                <View style={styles.avatarContainer}>
                    <Image
                        source={{ uri: profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop' }}
                        style={styles.avatar}
                    />
                    <Pressable style={styles.cameraButton}>
                        <Camera size={16} color="#000" />
                    </Pressable>
                </View>

                <View style={styles.nameSection}>
                    <Text style={styles.nameText}>{profile?.name || 'Artist Name'}</Text>
                    <Text style={styles.locationText}>
                        Dubai, UAE • {artistAct?.artist_type || 'Specialty Act'}
                    </Text>
                    {/* Membership Badge */}
                    <View style={styles.membershipBadge}>
                        <Zap size={10} color={COLORS.background} fill={COLORS.background} />
                        <Text style={styles.membershipText}>PRO MEMBER</Text>
                    </View>
                </View>

                <Pressable
                    style={styles.manageButton}
                    onPress={() => router.push('/(tabs)/profile/edit-profile' as any)}
                >
                    <Text style={styles.manageButtonText}>Manage Profile</Text>
                </Pressable>
            </View>
        </View>
    );

    const MenuSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
        <View style={styles.menuSection}>
            <Text style={styles.sectionHeader}>{title}</Text>
            {children}
        </View>
    );

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 120 }
                ]}
                bounces={true}
                showsVerticalScrollIndicator={false}
            >
                <ProfileHeader />

                <View style={styles.sectionDivider} />

                <View style={styles.contentLayout}>
                    <MenuSection title="Dashboard">
                        <MenuItem
                            icon={Calendar}
                            title="Bookings"
                            onPress={() => router.push('/(tabs)/profile/bookings' as any)}
                        />
                        <MenuItem
                            icon={Clock}
                            title="Calendar"
                            onPress={() => router.push('/(tabs)/profile/calendar' as any)}
                        />
                        <MenuItem
                            icon={Star}
                            title="Reviews"
                            onPress={() => router.push('/(tabs)/profile/reviews' as any)}
                        />
                        <MenuItem
                            icon={MessageCircle}
                            title="Messages"
                            onPress={() => router.push('/messages' as any)}
                        />
                        <MenuItem
                            icon={CreditCard}
                            title="Billing"
                            onPress={() => router.push('/(tabs)/profile/billing' as any)}
                        />
                        <MenuItem
                            icon={Zap}
                            title="Pro Membership"
                            color={COLORS.primary}
                            onPress={() => router.push('/(tabs)/profile/pro-membership' as any)}
                        />
                    </MenuSection>

                    <MenuSection title="Settings">
                        <MenuItem
                            icon={Globe}
                            title="Localization"
                            onPress={() => { }}
                        />
                        <MenuItem
                            icon={Shield}
                            title="Security"
                            onPress={() => router.push('/(tabs)/profile/security' as any)}
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
                            color="#ff4444"
                            onPress={signOut}
                            rightIcon={null}
                        />
                    </MenuSection>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { justifyContent: 'center', alignItems: 'center' },
    scrollContent: { flexGrow: 1 },

    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
    iconCircle: {
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: 'rgba(204, 255, 0, 0.1)',
        justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.xl
    },
    title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 10, textAlign: 'center' },
    subtitle: { fontSize: 16, color: COLORS.textDim, textAlign: 'center', marginBottom: 30, lineHeight: 22 },
    primaryButton: {
        backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 15, borderRadius: 12, alignItems: 'center'
    },
    buttonText: { color: COLORS.background, fontWeight: 'bold', fontSize: 16 },
    secondaryButton: {
        backgroundColor: 'transparent', paddingHorizontal: 20, paddingVertical: 15, borderRadius: 12,
        borderWidth: 1, borderColor: '#333', alignItems: 'center'
    },
    secondaryButtonText: { color: COLORS.text, fontWeight: 'bold', fontSize: 16 },
    authButtonContainer: { flexDirection: 'row', width: '100%', marginTop: 10 },

    headerSection: { backgroundColor: COLORS.background, marginBottom: SPACING.m },
    coverPhoto: { width: '100%', height: 160, backgroundColor: '#1A1A1A' },

    profileInfoContainer: { paddingHorizontal: SPACING.m, alignItems: 'center' },

    avatarContainer: { marginTop: -50, position: 'relative' },
    avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: COLORS.background },
    cameraButton: {
        position: 'absolute', bottom: 0, right: 0,
        backgroundColor: COLORS.primary, width: 32, height: 32,
        borderRadius: 16, borderWidth: 3, borderColor: COLORS.background,
        justifyContent: 'center', alignItems: 'center'
    },
    nameSection: { alignItems: 'center', marginTop: 12, marginBottom: 20 },
    nameText: { fontSize: 24, fontWeight: '800', color: COLORS.text },
    locationText: { fontSize: 13, color: COLORS.textDim, marginTop: 4, marginBottom: 8 },
    membershipBadge: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        gap: 4
    },
    membershipText: {
        color: COLORS.background,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5
    },
    manageButton: {
        backgroundColor: COLORS.primary, width: '100%',
        paddingVertical: 18, borderRadius: 12, alignItems: 'center'
    },
    manageButtonText: { color: COLORS.background, fontSize: 16, fontWeight: '900' },

    sectionDivider: { height: 8, backgroundColor: '#000', width: '100%', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#111' },

    contentLayout: { flex: 1, backgroundColor: COLORS.background },

    menuSection: { paddingHorizontal: SPACING.m, marginTop: SPACING.l },
    sectionHeader: {
        fontSize: 12,
        fontWeight: '900',
        color: COLORS.textDim,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        opacity: 0.6
    },
    menuItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        minHeight: 64,
        borderBottomWidth: 1, borderBottomColor: '#1A1A1A',
        paddingVertical: 4
    },
    menuItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    iconWrapper: { marginRight: 16, width: 24, alignItems: 'center' },
    menuItemText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
    menuItemRight: { flexDirection: 'row', alignItems: 'center' },
    menuItemSubtitle: { fontSize: 14, color: COLORS.textDim, marginRight: 8 },
});
