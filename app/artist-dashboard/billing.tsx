import { ChevronRight, CreditCard, Download, FileText, Plus } from 'lucide-react-native';
import React from 'react';
import {
    Pressable,
    ScrollView, StyleSheet, Text, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../src/constants/theme';

const MOCK_INVOICES = [
    { id: '1', date: 'Mar 1, 2024', amount: '$199.00', status: 'Paid', plan: 'Annual Pro' },
    { id: '2', date: 'Feb 1, 2024', amount: '$19.00', status: 'Paid', plan: 'Monthly Pro (Trial)' },
];

export default function BillingScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>Billing</Text>

                {/* Active Plan */}
                <View style={styles.planCard}>
                    <View>
                        <Text style={styles.planLabel}>Current Plan</Text>
                        <Text style={styles.planTitle}>Annual Pro Membership</Text>
                        <Text style={styles.planPrice}>$199.00 / year • Renews Mar 2025</Text>
                    </View>
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusBadgeText}>ACTIVE</Text>
                    </View>
                </View>

                {/* Payment Methods */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Payment Methods</Text>
                        <Pressable style={styles.addButton}>
                            <Plus size={18} color={COLORS.orange} />
                            <Text style={styles.addButtonText}>Add</Text>
                        </Pressable>
                    </View>

                    <View style={styles.cardItem}>
                        <View style={styles.cardInfo}>
                            <View style={styles.cardIconBox}>
                                <CreditCard size={20} color="#374151" />
                            </View>
                            <View>
                                <Text style={styles.cardName}>Visa ending in 4242</Text>
                                <Text style={styles.cardExpiry}>Expires 12/26 • Default</Text>
                            </View>
                        </View>
                        <Pressable>
                            <Text style={styles.editLink}>Edit</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Billing History */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Billing History</Text>
                    {MOCK_INVOICES.map(invoice => (
                        <View key={invoice.id} style={styles.invoiceItem}>
                            <View style={styles.invoiceLeft}>
                                <View style={styles.invoiceIconBox}>
                                    <FileText size={18} color="#6B7280" />
                                </View>
                                <View>
                                    <Text style={styles.invoiceDate}>{invoice.date}</Text>
                                    <Text style={styles.invoicePlan}>{invoice.plan}</Text>
                                </View>
                            </View>
                            <View style={styles.invoiceRight}>
                                <Text style={styles.invoiceAmount}>{invoice.amount}</Text>
                                <Pressable style={styles.downloadButton}>
                                    <Download size={16} color={COLORS.orange} />
                                </Pressable>
                            </View>
                        </View>
                    ))}
                </View>

                <Pressable style={styles.customerPortalButton}>
                    <Text style={styles.customerPortalText}>Go to Stripe Customer Portal</Text>
                    <ChevronRight size={18} color="#6B7280" />
                </Pressable>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    scrollContent: { padding: SPACING.m },
    title: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 24 },

    planCard: {
        backgroundColor: '#111827', borderRadius: 20, padding: 24,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2, shadowRadius: 20, elevation: 8
    },
    planLabel: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 13, fontWeight: '600', marginBottom: 4 },
    planTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginBottom: 4 },
    planPrice: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 14 },
    statusBadge: {
        backgroundColor: '#DCFCE7', paddingHorizontal: 10,
        paddingVertical: 4, borderRadius: 12
    },
    statusBadgeText: { color: '#166534', fontSize: 10, fontWeight: '800' },

    section: { marginBottom: 32 },
    sectionHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 16
    },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
    addButton: { flexDirection: 'row', alignItems: 'center' },
    addButtonText: { color: COLORS.orange, fontWeight: '600', marginLeft: 4 },

    cardItem: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', backgroundColor: '#F9FAFB',
        padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6'
    },
    cardInfo: { flexDirection: 'row', alignItems: 'center' },
    cardIconBox: {
        width: 40, height: 40, borderRadius: 8,
        backgroundColor: '#FFFFFF', justifyContent: 'center',
        alignItems: 'center', marginRight: 12,
        borderWidth: 1, borderColor: '#E5E7EB'
    },
    cardName: { fontSize: 16, fontWeight: '600', color: '#111827' },
    cardExpiry: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    editLink: { color: COLORS.orange, fontWeight: '600' },

    invoiceItem: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: '#F3F4F6'
    },
    invoiceLeft: { flexDirection: 'row', alignItems: 'center' },
    invoiceIconBox: {
        width: 36, height: 36, borderRadius: 8,
        backgroundColor: '#F3F4F6', justifyContent: 'center',
        alignItems: 'center', marginRight: 12
    },
    invoiceDate: { fontSize: 15, fontWeight: '600', color: '#374151' },
    invoicePlan: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
    invoiceRight: { flexDirection: 'row', alignItems: 'center' },
    invoiceAmount: { fontSize: 15, fontWeight: '700', color: '#111827', marginRight: 16 },
    downloadButton: {
        width: 32, height: 32, borderRadius: 8,
        backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center'
    },

    customerPortalButton: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', backgroundColor: '#F9FAFB',
        padding: 16, borderRadius: 16, marginTop: 10
    },
    customerPortalText: { fontSize: 15, color: '#374151', fontWeight: '500' }
});
