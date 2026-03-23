import { supabase } from '@/src/lib/supabase';
import { COLORS } from '@/src/constants/theme';
import { useAuth } from '@/src/context/AuthContext';
import { Stack, usePathname, useRouter } from 'expo-router';
import {
    Calendar,
    ChevronLeft,
    Heart,
    Home,
    LogOut,
    MessageCircle,
    Send,
    Settings,
    Sparkles,
    X,
    Menu
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Alert,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const NAV_ITEMS = [
    { name: 'index', label: 'Overview', icon: Home, path: '/client-dashboard' },
    { name: 'my-event', label: 'My Event', icon: Calendar, path: '/client-dashboard/my-event' },
    { name: 'favorites', label: 'Favorites', icon: Heart, path: '/client-dashboard/favorites' },
    { name: 'requests', label: 'Requests', icon: Send, path: '/client-dashboard/requests' },
    { name: 'messages', label: 'Messages', icon: MessageCircle, path: '/client-dashboard/messages' },
    { name: 'settings', label: 'Settings', icon: Settings, path: '/client-dashboard/settings' },
];

function SidebarContent({ pathname, onNavigate, onLogout, profile }: any) {
    return (
        <View style={styles.sidebarInner}>
            {/* Brand */}
            <View style={styles.brand}>
                <Sparkles size={20} color={COLORS.primary} />
                <Text style={styles.brandText}>Performance Lab</Text>
            </View>

            {/* User block */}
            <View style={styles.userBlock}>
                <View style={styles.avatar}>
                    {profile?.avatar_url
                        ? <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
                        : <Text style={styles.avatarInitial}>{profile?.name?.[0]?.toUpperCase() || 'C'}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.userName} numberOfLines={1}>{profile?.name || 'Client'}</Text>
                    <Text style={styles.userRole}>Private Client</Text>
                </View>
            </View>

            {/* Nav */}
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.navGroupLabel}>WORKSPACE</Text>
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.path || (pathname.startsWith('/client-dashboard') && item.name === 'index' && pathname === '/client-dashboard');
                    const exactActive = pathname === item.path;
                    const Icon = item.icon;
                    return (
                        <Pressable
                            key={item.name}
                            style={[styles.navItem, exactActive && styles.navItemActive]}
                            onPress={() => onNavigate(item.path)}
                        >
                            <Icon size={18} color={exactActive ? COLORS.primary : '#6B7280'} strokeWidth={exactActive ? 2.5 : 2} />
                            <Text style={[styles.navLabel, exactActive && styles.navLabelActive]}>{item.label}</Text>
                        </Pressable>
                    );
                })}
            </ScrollView>

            {/* Logout */}
            <Pressable style={styles.logoutBtn} onPress={onLogout}>
                <LogOut size={16} color="#6B7280" />
                <Text style={styles.logoutText}>Log Out</Text>
            </Pressable>
        </View>
    );
}

export default function ClientDashboardLayout() {
    const router = useRouter();
    const pathname = usePathname();
    const { profile } = useAuth();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const insets = useSafeAreaInsets();

    const handleLogout = () => {
        Alert.alert('Log Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log Out',
                style: 'destructive',
                onPress: async () => {
                    await supabase.auth.signOut();
                    router.replace('/login');
                }
            }
        ]);
    };

    const handleNavigate = (path: string) => {
        setDrawerOpen(false);
        router.push(path as any);
    };

    const isDesktop = Platform.OS === 'web';

    return (
        <SafeAreaView style={styles.root}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.container}>
                {/* Desktop Sidebar */}
                {isDesktop && (
                    <View style={styles.sidebar}>
                        <SidebarContent
                            pathname={pathname}
                            onNavigate={handleNavigate}
                            onLogout={handleLogout}
                            profile={profile}
                        />
                    </View>
                )}

                {/* Main Content */}
                <View style={styles.main}>
                    {/* Mobile Header */}
                    {!isDesktop && (
                        <View style={[styles.mobileHeader, { paddingTop: Math.max(insets.top, 12) }]}>
                            <Pressable onPress={() => setDrawerOpen(true)} style={styles.menuBtn}>
                                <Menu size={22} color={COLORS.text} />
                            </Pressable>
                            <Text style={styles.mobileHeaderTitle}>
                                {NAV_ITEMS.find(i => i.path === pathname)?.label || 'Dashboard'}
                            </Text>
                            {/* Exit arrow — goes back to home */}
                            <Pressable onPress={() => router.replace('/(tabs)' as any)} style={styles.menuBtn}>
                                <ChevronLeft size={22} color='#6B7280' />
                            </Pressable>
                        </View>
                    )}

                    <Stack
                        screenOptions={{
                            headerShown: false,
                            contentStyle: { backgroundColor: COLORS.background }
                        }}
                    >
                        <Stack.Screen name="index" />
                        <Stack.Screen name="my-event" />
                        <Stack.Screen name="favorites" />
                        <Stack.Screen name="requests" />
                        <Stack.Screen name="messages" />
                        <Stack.Screen name="settings" />
                    </Stack>

                    {/* Mobile Bottom Nav — always visible */}
                    {!isDesktop && (
                        <View style={[styles.mobileNav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
                            {NAV_ITEMS.map((item) => {
                                const isActive = pathname === item.path;
                                const Icon = item.icon;
                                return (
                                    <Pressable key={item.name} style={styles.mobileNavItem} onPress={() => handleNavigate(item.path)}>
                                        <Icon size={20} color={isActive ? COLORS.primary : '#4B5563'} strokeWidth={isActive ? 2.5 : 2} />
                                        <Text style={[styles.mobileNavLabel, isActive && { color: COLORS.primary }]}>
                                            {item.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    )}
                </View>
            </View>

            {/* Mobile Drawer */}
            <Modal visible={drawerOpen} transparent animationType="fade" onRequestClose={() => setDrawerOpen(false)}>
                <Pressable style={styles.drawerOverlay} onPress={() => setDrawerOpen(false)}>
                    <Pressable style={styles.drawer} onPress={e => e.stopPropagation()}>
                        <Pressable style={styles.drawerClose} onPress={() => setDrawerOpen(false)}>
                            <X size={20} color={COLORS.textDim} />
                        </Pressable>
                        <SidebarContent
                            pathname={pathname}
                            onNavigate={handleNavigate}
                            onLogout={handleLogout}
                            profile={profile}
                        />
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#050505' },
    container: { flex: 1, flexDirection: 'row' },
    sidebar: {
        width: 260,
        backgroundColor: '#080808',
        borderRightWidth: 1,
        borderRightColor: '#1A1A1A',
    },
    sidebarInner: {
        flex: 1,
        padding: 24,
        paddingTop: 32,
    },
    brand: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 32,
    },
    brandText: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
        letterSpacing: 0.5,
    },
    userBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#111',
        padding: 14,
        borderRadius: 16,
        marginBottom: 28,
        borderWidth: 1,
        borderColor: '#1E1E1E',
    },
    avatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(204,255,0,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(204,255,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImg: { width: 38, height: 38 },
    avatarInitial: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: 16,
    },
    userName: {
        color: COLORS.text,
        fontWeight: '600',
        fontSize: 14,
    },
    userRole: {
        color: '#6B7280',
        fontSize: 11,
        marginTop: 2,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    navGroupLabel: {
        color: '#374151',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.5,
        marginBottom: 12,
        marginLeft: 4,
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 11,
        paddingHorizontal: 14,
        borderRadius: 12,
        marginBottom: 4,
    },
    navItemActive: {
        backgroundColor: 'rgba(204,255,0,0.08)',
    },
    navLabel: {
        color: '#6B7280',
        fontSize: 14,
        fontWeight: '500',
    },
    navLabelActive: {
        color: COLORS.primary,
        fontWeight: '700',
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderTopWidth: 1,
        borderTopColor: '#1A1A1A',
        marginTop: 8,
    },
    logoutText: {
        color: '#6B7280',
        fontSize: 14,
    },
    main: {
        flex: 1,
        backgroundColor: '#050505',
    },
    mobileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#111',
        backgroundColor: '#080808',
    },
    menuBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mobileHeaderTitle: {
        color: COLORS.text,
        fontSize: 17,
        fontWeight: '700',
    },
    mobileNav: {
        flexDirection: 'row',
        backgroundColor: '#080808',
        borderTopWidth: 1,
        borderTopColor: '#1A1A1A',
        paddingTop: 10,
    },
    mobileNavItem: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    mobileNavLabel: {
        fontSize: 10,
        color: '#4B5563',
        fontWeight: '500',
    },
    drawerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    drawer: {
        width: 280,
        height: '100%',
        backgroundColor: '#080808',
        borderRightWidth: 1,
        borderRightColor: '#1A1A1A',
        padding: 24,
        paddingTop: 40,
    },
    drawerClose: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
        padding: 8,
    },
});
