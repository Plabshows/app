import { COLORS, SPACING } from '@/src/constants/theme';
import { Calendar as CalendarIcon, Clock, MapPin, Plus } from 'lucide-react-native';
import React from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

export default function ArtistCalendar() {
    const upcomingEvents = [
        { id: 1, title: 'Corporate Gala', date: 'Oct 24, 2024', time: '20:00', location: 'Burj Al Arab' },
        { id: 2, title: 'Private Wedding', date: 'Nov 02, 2024', time: '19:30', location: 'Atlantis The Royal' },
    ];

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Calendar</Text>
                    <Text style={styles.subtitle}>Manage your upcoming performance schedule.</Text>
                </View>
                <Pressable style={styles.addBtn}>
                    <Plus size={20} color={COLORS.background} />
                </Pressable>
            </View>

            <View style={styles.calendarStrip}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                    <View key={i} style={[styles.dayBox, i === 3 && styles.activeDay]}>
                        <Text style={[styles.dayText, i === 3 && styles.activeDayText]}>{day}</Text>
                        <Text style={[styles.dateText, i === 3 && styles.activeDayText]}>{18 + i}</Text>
                    </View>
                ))}
            </View>

            <Text style={styles.sectionTitle}>Upcoming Performances</Text>
            {upcomingEvents.map(event => (
                <View key={event.id} style={styles.eventCard}>
                    <View style={styles.eventHeader}>
                        <Text style={styles.eventTitle}>{event.title}</Text>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>Confirmed</Text>
                        </View>
                    </View>
                    <View style={styles.eventDetails}>
                        <View style={styles.detailRow}>
                            <CalendarIcon size={14} color={COLORS.primary} />
                            <Text style={styles.detailText}>{event.date}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Clock size={14} color={COLORS.primary} />
                            <Text style={styles.detailText}>{event.time}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <MapPin size={14} color={COLORS.primary} />
                            <Text style={styles.detailText}>{event.location}</Text>
                        </View>
                    </View>
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: SPACING.l },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
    subtitle: { fontSize: 14, color: COLORS.textDim },
    addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    calendarStrip: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
    dayBox: { width: 44, height: 70, borderRadius: 12, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', gap: 4 },
    activeDay: { backgroundColor: COLORS.primary },
    dayText: { fontSize: 12, color: COLORS.textDim, fontWeight: 'bold' },
    dateText: { fontSize: 18, color: COLORS.text, fontWeight: '900' },
    activeDayText: { color: COLORS.background },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 16 },
    eventCard: { backgroundColor: '#111', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#222', marginBottom: 16 },
    eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    eventTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
    statusBadge: { backgroundColor: '#4CAF5022', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { color: '#4CAF50', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
    eventDetails: { gap: 8 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    detailText: { color: COLORS.textDim, fontSize: 14 }
});
