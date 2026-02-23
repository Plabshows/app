import { Calendar as CalendarIcon, Clock, User } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    FlatList,
    Pressable,
    StyleSheet, Text, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../src/constants/theme';

const MOCK_BOOKINGS = [
    { id: '1', client: 'Sarah Johnson', event: 'Corporate Gala', date: '2024-04-15', time: '19:00', status: 'confirmed', price: '$800' },
    { id: '2', client: 'Majid Al Futtaim', event: 'Mall Activation', date: '2024-04-20', time: '14:00', status: 'pending', price: '$1,200' },
    { id: '3', client: 'Private Wedding', event: 'Dinner Show', date: '2024-03-10', time: '20:30', status: 'past', price: '$950' },
];

export default function MyBookingsScreen() {
    const [activeTab, setActiveTab] = useState('confirmed');

    const filteredBookings = MOCK_BOOKINGS.filter(b => b.status === activeTab);

    const BookingCard = ({ item }) => (
        <Pressable style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.clientInfo}>
                    <View style={styles.clientAvatar}>
                        <User size={20} color="#6B7280" />
                    </View>
                    <View>
                        <Text style={styles.clientName}>{item.client}</Text>
                        <Text style={styles.eventName}>{item.event}</Text>
                    </View>
                </View>
                <Text style={styles.priceText}>{item.price}</Text>
            </View>

            <View style={styles.cardFooter}>
                <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                        <CalendarIcon size={14} color="#9CA3AF" />
                        <Text style={styles.detailText}>{item.date}</Text>
                    </View>
                    <View style={[styles.detailItem, { marginLeft: 16 }]}>
                        <Clock size={14} color="#9CA3AF" />
                        <Text style={styles.detailText}>{item.time}</Text>
                    </View>
                </View>
                <View style={[styles.statusBadge,
                item.status === 'confirmed' ? styles.confirmedBadge :
                    item.status === 'pending' ? styles.pendingBadge : styles.pastBadge
                ]}>
                    <Text style={[styles.statusBadgeText,
                    item.status === 'confirmed' ? styles.confirmedText :
                        item.status === 'pending' ? styles.pendingText : styles.pastText
                    ]}>
                        {item.status.toUpperCase()}
                    </Text>
                </View>
            </View>
        </Pressable>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Bookings</Text>
                <Pressable style={styles.calendarToggle}>
                    <CalendarIcon size={20} color={COLORS.orange} />
                    <Text style={styles.calendarToggleText}>Switch to Calendar</Text>
                </Pressable>
            </View>

            {/* Tabs */}
            <View style={styles.tabBar}>
                {['pending', 'confirmed', 'past'].map((tab) => (
                    <Pressable
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.activeTab]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </Text>
                    </Pressable>
                ))}
            </View>

            <FlatList
                data={filteredBookings}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <BookingCard item={item} />}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <CalendarIcon size={48} color="#D1D5DB" />
                        <Text style={styles.emptyTitle}>No bookings found</Text>
                        <Text style={styles.emptyText}>You don't have any {activeTab} bookings yet.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', padding: SPACING.m
    },
    title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
    calendarToggle: { flexDirection: 'row', alignItems: 'center' },
    calendarToggleText: { color: COLORS.orange, marginLeft: 8, fontWeight: '600' },

    tabBar: {
        flexDirection: 'row', paddingHorizontal: SPACING.m,
        borderBottomWidth: 1, borderBottomColor: '#F3F4F6'
    },
    tab: {
        paddingVertical: 12, marginRight: 24,
        borderBottomWidth: 2, borderBottomColor: 'transparent'
    },
    activeTab: { borderBottomColor: COLORS.orange },
    tabText: { fontSize: 16, fontWeight: '600', color: '#9CA3AF' },
    activeTabText: { color: COLORS.orange },

    listContent: { padding: SPACING.m },
    card: {
        backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
        marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
    },
    cardHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 16
    },
    clientInfo: { flexDirection: 'row', alignItems: 'center' },
    clientAvatar: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#F9FAFB', justifyContent: 'center',
        alignItems: 'center', marginRight: 12
    },
    clientName: { fontSize: 16, fontWeight: '700', color: '#111827' },
    eventName: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    priceText: { fontSize: 16, fontWeight: '700', color: COLORS.orange },

    cardFooter: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', borderTopWidth: 1,
        borderTopColor: '#F9FAFB', paddingTop: 12
    },
    detailsRow: { flexDirection: 'row', alignItems: 'center' },
    detailItem: { flexDirection: 'row', alignItems: 'center' },
    detailText: { fontSize: 13, color: '#6B7280', marginLeft: 6 },

    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusBadgeText: { fontSize: 10, fontWeight: '800' },
    confirmedBadge: { backgroundColor: '#DCFCE7' },
    confirmedText: { color: '#166534' },
    pendingBadge: { backgroundColor: '#FEF3C7' },
    pendingText: { color: '#92400E' },
    pastBadge: { backgroundColor: '#F3F4F6' },
    pastText: { color: '#6B7280' },

    emptyContainer: {
        flex: 1, alignItems: 'center',
        justifyContent: 'center', marginTop: 100
    },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16 },
    emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 8, textAlign: 'center' }
});
