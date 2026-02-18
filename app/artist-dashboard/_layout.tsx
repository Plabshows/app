
import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { Stack, usePathname, useRouter } from 'expo-router';
import {
    BarChart3,
    Briefcase,
    Calendar,
    ChevronLeft,
    CreditCard,
    HelpCircle,
    LayoutDashboard,
    LogOut,
    MessageSquare,
    Shield,
    Zap
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MENU_GROUPS = [
    {
        title: 'Manage profile',
        items: [
            { title: 'DASHBOARD', icon: LayoutDashboard, route: '/artist-dashboard' as any },
            { title: 'Bookings', icon: Briefcase, route: '/artist-dashboard/bookings' as any },
            { title: 'Calendar', icon: Calendar, route: '/artist-dashboard/calendar' as any },
            { title: 'Reviews', icon: MessageSquare, route: '/artist-dashboard/reviews' as any },
            { title: 'Analytics', icon: BarChart3, route: '/artist-dashboard/analytics' as any },
            { title: 'Upgrade to Pro', icon: Zap, route: '/artist-dashboard/upgrade' as any },
            { title: 'Help', icon: HelpCircle, route: '/artist-dashboard/help' as any },
        ]
    },
    {
        title: 'SETTINGS',
        items: [
            { title: 'Billing', icon: CreditCard, route: '/artist-dashboard/billing' as any },
            { title: 'Security', icon: Shield, route: '/artist-dashboard/security' as any },
        ]
    }
];

export default function DashboardLayout() {
    const router = useRouter();
    const pathname = usePathname();
    const [loading, setLoading] = useState(true);
    const [artistInfo, setArtistInfo] = useState({
        name: 'Artist Name',
        type: 'Specialty Act',
        membership: 'Free'
    });

    useEffect(() => {
        fetchArtistInfo();
    }, []);

    const fetchArtistInfo = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single();
            const { data: act } = await supabase.from('acts').select('artist_type').eq('owner_id', user.id).maybeSingle();

            setArtistInfo({
                name: profile?.name || user.email?.split('@')[0] || 'Artist',
                type: act?.artist_type || 'Specialty Act',
                membership: 'Free' // Static for now as requested
            });
        } catch (error) {
            console.error('Error fetching sidebar info:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.layout}>
                {/* Sidebar */}
                <View style={[styles.sidebar, Platform.OS === 'web' ? { width: 300 } : { width: 80 }]}>
                    <View style={styles.sidebarHeader}>
                        <Pressable onPress={() => router.push('/')} style={styles.backButton}>
                            <ChevronLeft size={20} color={COLORS.textDim} />
                        </Pressable>
                        {Platform.OS === 'web' && (
                            <View>
                                <Text style={styles.artistName}>{artistInfo.name}</Text>
                                <Text style={styles.artistType}>{artistInfo.type}</Text>
                                <Text style={styles.membershipText}>
                                    Membership: <Text style={{ color: COLORS.primary }}>{artistInfo.membership}</Text>
                                </Text>
                            </View>
                        )}
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                        {MENU_GROUPS.map((group, gIdx) => (
                            <View key={gIdx} style={styles.groupContainer}>
                                {group.title !== '' && Platform.OS === 'web' && (
                                    <Text style={styles.groupHeader}>{group.title}</Text>
                                )}
                                {group.items.map((item) => {
                                    const isActive = pathname === item.route;
                                    return (
                                        <Pressable
                                            key={item.route}
                                            style={[styles.menuItem, isActive && styles.menuItemActive]}
                                            onPress={() => router.push(item.route)}
                                        >
                                            <item.icon size={20} color={isActive ? COLORS.background : COLORS.textDim} />
                                            {Platform.OS === 'web' && (
                                                <Text style={[styles.menuText, isActive && styles.menuTextActive]}>
                                                    {item.title}
                                                </Text>
                                            )}
                                        </Pressable>
                                    );
                                })}
                            </View>
                        ))}
                    </ScrollView>

                    <View style={styles.sidebarFooter}>
                        <Pressable
                            style={styles.logoutButton}
                            onPress={() => {
                                Alert.alert(
                                    'Log Out',
                                    'Are you sure you want to log out?',
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        {
                                            text: 'Log Out',
                                            style: 'destructive',
                                            onPress: async () => {
                                                await supabase.auth.signOut();
                                                router.replace('/login' as any);
                                            }
                                        }
                                    ]
                                );
                            }}
                        >
                            <LogOut size={20} color="#FF4444" />
                            {Platform.OS === 'web' && (
                                <Text style={styles.logoutText}>Log Out</Text>
                            )}
                        </Pressable>
                    </View>
                </View>

                {/* Main Content Area */}
                <View style={styles.content}>
                    <Stack
                        screenOptions={{
                            headerShown: false,
                            contentStyle: { backgroundColor: COLORS.secondary }
                        }}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    layout: { flex: 1, flexDirection: 'row' },
    sidebar: {
        borderRightWidth: 1,
        borderRightColor: '#222',
        backgroundColor: '#000',
        paddingVertical: SPACING.l,
    },
    sidebarHeader: {
        paddingHorizontal: 24,
        marginBottom: 32,
        gap: 16
    },
    backButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#1A1A1A',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16
    },
    artistName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 2
    },
    artistType: {
        fontSize: 13,
        color: COLORS.textDim,
        marginBottom: 8
    },
    membershipText: {
        fontSize: 12,
        color: COLORS.textDim,
        fontWeight: '600'
    },
    groupContainer: {
        marginBottom: 24
    },
    groupHeader: {
        fontSize: 11,
        fontWeight: '900',
        color: COLORS.textDim,
        paddingHorizontal: 24,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        opacity: 0.5
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        gap: 12
    },
    menuItemActive: {
        backgroundColor: COLORS.primary,
    },
    menuText: {
        fontSize: 14,
        color: COLORS.textDim,
        fontWeight: '600'
    },
    menuTextActive: {
        color: COLORS.background,
        fontWeight: '800'
    },
    sidebarFooter: {
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#222',
        marginTop: 'auto',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        gap: 12,
    },
    logoutText: {
        fontSize: 14,
        color: '#FF4444',
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        backgroundColor: COLORS.background
    }
});
