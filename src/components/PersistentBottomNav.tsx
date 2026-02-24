import { useRouter, useSegments } from 'expo-router';
import { Bell, Calendar, MessageCircle, User as UserIcon, Users } from 'lucide-react-native';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';

const TABS = [
    { name: 'index', label: 'Artists', icon: Users, path: '/(tabs)' },
    { name: 'bookings', label: 'Bookings', icon: Calendar, path: '/(tabs)/bookings' },
    { name: 'messages', label: 'Messages', icon: MessageCircle, path: '/(tabs)/messages' },
    { name: 'notifications', label: 'Notifications', icon: Bell, path: '/(tabs)/notifications' },
    { name: 'profile', label: 'Profile', icon: UserIcon, path: '/(tabs)/profile' },
];

export default function PersistentBottomNav() {
    const router = useRouter();
    const segments = useSegments();
    const insets = useSafeAreaInsets();

    // Check if we should hide the nav
    // Hide on admin routes, auth routes, and onboarding
    const hideOnRoutes = ['admin', 'login', 'signup', 'artist-onboarding', 'artist-dashboard'];
    const currentSegment = segments[0] as string;

    // Also check for act detail or other specific screens if needed
    // But the requirement is to SHOW it on act details.

    if (hideOnRoutes.includes(currentSegment)) {
        return null;
    }

    // Determine active tab
    // If in (tabs), match the segment. If outside (like act/[id]), might need smarter logic
    // Usually (tabs) is segments[0], and the specific tab is segments[1]
    const activeTab = segments[0] === '(tabs)' ? segments[1] || 'index' : null;

    return (
        <View style={[
            styles.container,
            {
                paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 12) : 12,
                height: Platform.OS === 'ios' ? 88 : 68
            }
        ]}>
            {TABS.map((tab) => {
                const isActive = activeTab === tab.name;
                const Icon = tab.icon;

                return (
                    <TouchableOpacity
                        key={tab.name}
                        style={styles.tab}
                        onPress={() => router.push(tab.path as any)}
                        activeOpacity={0.7}
                    >
                        <Icon
                            size={24}
                            color={isActive ? COLORS.primary : '#6B7280'}
                            strokeWidth={isActive ? 2.5 : 2}
                        />
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
});
