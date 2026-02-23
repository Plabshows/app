import { Calendar as CalendarIcon, Clock, User } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    FlatList,
    Pressable,
    ScrollView,
    StyleSheet, Text, View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../../src/constants/theme';

const MOCK_BOOKINGS = [
    { id: '1', client: 'Sarah Johnson', event: 'Corporate Gala', date: '2024-04-15', time: '19:00', status: 'confirmed', price: '$800' },
    { id: '2', client: 'Majid Al Futtaim', event: 'Mall Activation', date: '2024-04-20', time: '14:00', status: 'pending', price: '$1,200' },
    { id: '3', client: 'Private Wedding', event: 'Dinner Show', date: '2024-03-10', time: '20:30', status: 'past', price: '$950' },
];

export default function MyBookingsScreen() {
    const [activeTab, setActiveTab] = useState('confirmed');
    const insets = useSafeAreaInsets();

    const filteredBookings = MOCK_BOOKINGS.filter(b => b.status === activeTab);

    const BookingCard = ({ item }: { item: any }) => (
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
        <View style={styles.container}>
            {/* Horizontal Scrollable Tabs */}
            <View style={styles.tabBarContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabBar}
                >
                    {['pending', 'confirmed', 'past', 'canceled'].map((tab) => (
                        <Pressable
                            key={tab}
                            style={[styles.tab, activeTab === tab && styles.activeTab]}
                            onPress={() => setActiveTab(tab)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </Text>
                        </Pressable>
                    ))}
                </ScrollView>
            </View>

            <FlatList
                data={filteredBookings}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <BookingCard item={item} />}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: insets.bottom + 120 }
                ]}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <CalendarIcon size={48} color="#D1D5DB" />
                        <Text style={styles.emptyTitle}>No bookings found</Text>
                        <Text style={styles.emptyText}>You don't have any {activeTab} bookings yet.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    tabBarContainer: {
        borderBottomWidth: 1,
        borderBottomColor: '#1A1A1A',
        paddingTop: 16
    },
    tabBar: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.m,
    },
    tab: {
        paddingVertical: 14,
        marginRight: 24,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
        minWidth: 80,
        alignItems: 'center'
    },
    activeTab: { borderBottomColor: COLORS.primary },
    tabText: { fontSize: 16, fontWeight: '600', color: COLORS.textDim },
    activeTabText: { color: COLORS.primary },

    listContent: { padding: SPACING.m },
    card: {
        backgroundColor: '#111111', borderRadius: 16, padding: 16,
        marginBottom: 16, borderWidth: 1, borderColor: '#1A1A1A',
    },
    cardHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 16
    },
    clientInfo: { flexDirection: 'row', alignItems: 'center' },
    clientAvatar: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#1A1A1A', justifyContent: 'center',
        alignItems: 'center', marginRight: 12
    },
    clientName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
    eventName: { fontSize: 13, color: COLORS.textDim, marginTop: 2 },
    priceText: { fontSize: 16, fontWeight: '700', color: COLORS.primary },

    cardFooter: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', borderTopWidth: 1,
        borderTopColor: '#1A1A1A', paddingTop: 12
    },
    detailsRow: { flexDirection: 'row', alignItems: 'center' },
    detailItem: { flexDirection: 'row', alignItems: 'center' },
    detailText: { fontSize: 13, color: COLORS.textDim, marginLeft: 6 },

    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusBadgeText: { fontSize: 10, fontWeight: '800' },
    confirmedBadge: { backgroundColor: 'rgba(204, 255, 0, 0.15)' },
    confirmedText: { color: COLORS.primary },
    pendingBadge: { backgroundColor: 'rgba(255, 152, 0, 0.15)' },
    pendingText: { color: '#FF9800' },
    pastBadge: { backgroundColor: '#1A1A1A' },
    pastText: { color: COLORS.textDim },

    emptyContainer: {
        flex: 1, alignItems: 'center',
        justifyContent: 'center', marginTop: 100
    },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 16 },
    emptyText: { fontSize: 14, color: COLORS.textDim, marginTop: 8, textAlign: 'center' }
});
