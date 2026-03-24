import { useRouter, useSegments, useLocalSearchParams } from 'expo-router';
import { Bell, Calendar, Heart, MessageCircle, User as UserIcon, Users } from 'lucide-react-native';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

const TABS = [
    { name: 'index', label: 'Artists', icon: Users, path: '/(tabs)' },
    { name: 'bookings', label: 'Bookings', icon: Calendar, path: '/(tabs)/bookings' },
    { name: 'messages', label: 'Messages', icon: MessageCircle, path: '/(tabs)/messages' },
    { name: 'profile', label: 'Profile', icon: UserIcon, path: '/(tabs)/profile' },
];

export default function PersistentBottomNav() {
    const router = useRouter();
    const segments = useSegments();
    const insets = useSafeAreaInsets();
    const { profile, unreadCount } = useAuth();
    const params = useLocalSearchParams<{ tab?: string }>();
    const isClient = profile?.role === 'client';

    // Check if we should hide the nav
    // Hide on admin routes, auth routes, and onboarding
    const hideOnRoutes = ['admin', 'login', 'signup', 'artist-onboarding', 'artist-dashboard', 'client-dashboard'];
    const currentSegment = segments[0] as string;

    // Also check for act detail or other specific screens if needed
    // But the requirement is to SHOW it on act details.

    // Determine active tab
    const activeTab = segments[0] === '(tabs)' ? segments[1] || 'index' : null;

    const tabsToRender = React.useMemo(() => {
        if (!isClient) return TABS;
        const newTabs = [...TABS];
        // Insert Favorites after Artists (index 0)
        newTabs.splice(1, 0, { name: 'favorites', label: 'Favorites', icon: Heart, path: '/(tabs)/favorites' });
        return newTabs;
    }, [isClient]);

    if (hideOnRoutes.includes(currentSegment)) {
        return null;
    }

    return (
        <View style={[
            styles.container,
            {
                paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 12) : 12,
                height: Platform.OS === 'ios' ? 88 : 68
            }
        ]}>
            {tabsToRender.map((tab) => {
                const isActive = (activeTab === tab.name) || 
                                (tab.name === 'favorites' && activeTab === 'profile' && params.tab === 'Favorites') ||
                                (tab.name === 'profile' && activeTab === 'profile' && !params.tab);
                const Icon = tab.icon;

                return (
                    <TouchableOpacity
                        key={tab.name}
                        style={styles.tab}
                        onPress={() => router.push(tab.path as any)}
                        activeOpacity={0.7}
                    >
                        <View>
                            <Icon
                                size={24}
                                color={isActive ? COLORS.primary : '#6B7280'}
                                strokeWidth={isActive ? 2.5 : 2}
                            />
                            {tab.name === 'messages' && unreadCount > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text style={[
                            styles.label,
                            { color: isActive ? COLORS.primary : '#6B7280' }
                        ]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#050505',
        borderTopWidth: 1,
        borderTopColor: '#1A1A1A',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingTop: 8,
    },
    tab: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    label: {
        fontSize: 10,
        fontWeight: '500',
        marginTop: 4,
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -8,
        backgroundColor: COLORS.primary,
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 1.5,
        borderColor: '#050505',
    },
    badgeText: {
        color: '#000',
        fontSize: 9,
        fontWeight: '900',
    },
});
