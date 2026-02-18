import { COLORS, SPACING } from '@/src/constants/theme';
import { BarChart3, Eye, TrendingUp, Users } from 'lucide-react-native';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

export default function ArtistAnalytics() {
    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Analytics</Text>
                <Text style={styles.subtitle}>Track your performance and profile reach.</Text>
            </View>

            <View style={styles.statsGrid}>
                <StatCard title="Profile Views" value="2,481" trend="+14%" icon={Eye} />
                <StatCard title="Booking Requests" value="12" trend="+3" icon={BarChart3} />
                <StatCard title="Unique Visitors" value="842" trend="+8%" icon={Users} />
                <StatCard title="Profile Score" value="98%" trend="Elite" icon={TrendingUp} />
            </View>

            <View style={styles.chartPlaceholder}>
                <Text style={styles.placeholderText}>Monthly Traffic Visualization</Text>
                <View style={styles.bars}>
                    {[40, 60, 45, 80, 50, 90, 70].map((h, i) => (
                        <View key={i} style={[styles.bar, { height: h }]} />
                    ))}
                </View>
            </View>

            <View style={styles.insights}>
                <Text style={styles.insightsTitle}>Pro Insights</Text>
                <Text style={styles.insightText}>• Your profile views peaked after uploading the new fire show video.</Text>
                <Text style={styles.insightText}>• Clients from "Dubai Marina" are currently searching for your category.</Text>
            </View>
        </ScrollView>
    );
}

function StatCard({ title, value, trend, icon: Icon }: any) {
    return (
        <View style={styles.statCard}>
            <View style={styles.cardHeader}>
                <View style={styles.iconBox}>
                    <Icon size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.trendText}>{trend}</Text>
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statTitle}>{title}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { padding: SPACING.l },
    header: { marginBottom: 32 },
    title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
    subtitle: { fontSize: 14, color: COLORS.textDim },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 32 },
    statCard: { backgroundColor: '#1A1A1A', padding: 20, borderRadius: 20, flex: 1, minWidth: 150, borderWidth: 1, borderColor: '#222' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(204, 255, 0, 0.1)', justifyContent: 'center', alignItems: 'center' },
    trendText: { color: COLORS.primary, fontSize: 12, fontWeight: 'bold' },
    statValue: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
    statTitle: { fontSize: 13, color: COLORS.textDim },
    chartPlaceholder: { height: 200, backgroundColor: '#111', borderRadius: 20, borderWidth: 1, borderColor: '#222', justifyContent: 'flex-end', padding: 20, marginBottom: 32 },
    placeholderText: { position: 'absolute', top: 20, left: 20, color: COLORS.textDim, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
    bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
    bar: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 4, opacity: 0.8 },
    insights: { backgroundColor: 'rgba(204, 255, 0, 0.05)', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: COLORS.primary + '22' },
    insightsTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
    insightText: { color: COLORS.textDim, fontSize: 13, marginBottom: 8, lineHeight: 18 }
});
