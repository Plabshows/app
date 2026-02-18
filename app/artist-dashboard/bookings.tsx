import { COLORS } from '@/src/constants/theme';
import React, { useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

const TABS = ['Confirmed Bookings', 'Pending Inquiries', 'Past Inquiries'];
const FOOTER_LINKS = [
    'Clients', 'Guarantee', 'Help Center', 'Artists',
    'Register', 'Pro Membership', 'Knowledge Base',
    'About', 'Blog', 'Terms', 'About Us', 'Download'
];

export default function BookingsScreen() {
    const [activeTab, setActiveTab] = useState('Confirmed Bookings');

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <Text style={styles.title}>My Bookings</Text>
                <Text style={styles.subtitle}>Here you will be able to view, quote and manage your bookings</Text>
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                {TABS.map((tab) => (
                    <Pressable
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.tabActive]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                            {tab}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {/* Active Tab Header */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{activeTab}</Text>
            </View>

            {/* Empty State */}
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>Sorry there isn’t anything here yet :(</Text>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <View style={styles.footerLinks}>
                    {FOOTER_LINKS.map((link, idx) => (
                        <Pressable key={idx} style={styles.footerLink}>
                            <Text style={styles.footerLinkText}>{link}</Text>
                        </Pressable>
                    ))}
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        padding: 32,
        paddingBottom: 60,
    },
    header: {
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textDim,
        fontWeight: '500',
    },
    tabsContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#222',
        marginBottom: 40,
    },
    tab: {
        paddingVertical: 16,
        paddingHorizontal: 24,
        marginRight: 8,
    },
    tabActive: {
        borderBottomWidth: 2,
        borderBottomColor: COLORS.primary,
    },
    tabText: {
        fontSize: 15,
        color: COLORS.textDim,
        fontWeight: '600',
    },
    tabTextActive: {
        color: COLORS.primary,
        fontWeight: '800',
    },
    sectionHeader: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    emptyContainer: {
        backgroundColor: '#111',
        borderRadius: 24,
        padding: 80,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#222',
        marginVertical: 20,
    },
    emptyTitle: {
        fontSize: 20,
        color: COLORS.textDim,
        textAlign: 'center',
        fontWeight: '500',
    },
    footer: {
        marginTop: 60,
        paddingTop: 40,
        borderTopWidth: 1,
        borderTopColor: '#222',
    },
    footerLinks: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 16,
    },
    footerLink: {
        paddingHorizontal: 8,
    },
    footerLinkText: {
        fontSize: 14,
        color: COLORS.textDim,
        fontWeight: '500',
    },
});
