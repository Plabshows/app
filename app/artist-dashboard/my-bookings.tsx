import { COLORS } from '@/src/constants/theme';
import { Search } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

const TABS = ['Confirmed Bookings', 'Pending Inquiries', 'Past Inquiries'];

export default function MyBookingsScreen() {
    const [activeTab, setActiveTab] = useState('Pending Inquiries');

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
                <View style={styles.emptyIconBox}>
                    <Search size={48} color={COLORS.textDim} strokeWidth={1} />
                </View>
                <Text style={styles.emptyText}>Sorry there isn't anything here yet :(</Text>
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
        padding: 60,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#222',
        marginTop: 20,
    },
    emptyIconBox: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#1A1A1A',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyText: {
        fontSize: 18,
        color: COLORS.textDim,
        textAlign: 'center',
        fontWeight: '500',
    },
});
