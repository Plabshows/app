import { Check, ChevronDown, Zap } from 'lucide-react-native';
import React, { useState } from 'react';
import { LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, UIManager, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../../src/constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <View style={styles.faqWrapper}>
            <Pressable
                style={styles.faqHeader}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setIsOpen(!isOpen);
                }}
            >
                <Text style={styles.faqQuestion}>{question}</Text>
                <ChevronDown size={22} color="#6B7280" style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }} />
            </Pressable>
            {isOpen && <Text style={styles.faqAnswer}>{answer}</Text>}
        </View>
    );
};

export default function ProMembershipScreen() {
    const [isYearly, setIsYearly] = useState(true);
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 120 }
                ]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <View style={styles.zapCircle}>
                        <Zap size={32} color={COLORS.primary} fill={COLORS.primary} />
                    </View>
                    <Text style={styles.title}>Pro Membership</Text>
                    <Text style={styles.subtitle}>Supercharge your artist career with exclusive features and more bookings.</Text>
                </View>

                {/* Billing Toggle */}
                <View style={styles.toggleContainer}>
                    <Text style={[styles.toggleLabel, !isYearly && styles.activeLabel]}>Monthly</Text>
                    <Switch
                        value={isYearly}
                        onValueChange={setIsYearly}
                        trackColor={{ false: '#333', true: COLORS.primary }}
                        thumbColor="#FFFFFF"
                    />
                    <View style={styles.yearlyLabelContainer}>
                        <Text style={[styles.toggleLabel, isYearly && styles.activeLabel]}>Yearly</Text>
                        <View style={styles.discountBadge}>
                            <Text style={styles.discountText}>SAVE 20%</Text>
                        </View>
                    </View>
                </View>

                {/* Pricing Cards */}
                <View style={styles.cardsContainer}>
                    <View style={[styles.card, styles.centerCard]}>
                        <Text style={styles.planName}>Annual Pro</Text>
                        <View style={styles.priceRow}>
                            <Text style={styles.currency}>$</Text>
                            <Text style={styles.price}>{isYearly ? '199' : '19'}</Text>
                            <Text style={styles.period}>{isYearly ? '/year' : '/month'}</Text>
                        </View>
                        <Text style={styles.cardDesc}>Perfect for serious performers</Text>

                        <View style={styles.featuresList}>
                            <View style={styles.featureItem}>
                                <Check size={18} color={COLORS.primary} />
                                <Text style={styles.featureText}>Verified Artist Badge</Text>
                            </View>
                            <View style={styles.featureItem}>
                                <Check size={18} color={COLORS.primary} />
                                <Text style={styles.featureText}>Unlimited Lead Responses</Text>
                            </View>
                            <View style={styles.featureItem}>
                                <Check size={18} color={COLORS.primary} />
                                <Text style={styles.featureText}>Priority Search Placement</Text>
                            </View>
                            <View style={styles.featureItem}>
                                <Check size={18} color={COLORS.primary} />
                                <Text style={styles.featureText}>Detailed Profile Analytics</Text>
                            </View>
                        </View>

                        <Pressable style={styles.upgradeButton}>
                            <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
                        </Pressable>
                    </View>
                </View>

                {/* FAQ Section */}
                <View style={styles.faqSection}>
                    <Text style={styles.sectionHeader}>Common Questions</Text>
                    <FAQItem
                        question="Can I cancel my subscription anytime?"
                        answer="Yes, you can cancel your Pro membership at any time from your billing settings. You will continue to have access to Pro features until the end of your current billing period."
                    />
                    <FAQItem
                        question="What is priority search placement?"
                        answer="Pro artists appear at the top of search results in their category, increasing visibility to potential clients by up to 5x."
                    />
                    <FAQItem
                        question="Is there a free trial?"
                        answer="We occasionally offer 14-day free trials to selected artists. Check your notifications for special invites!"
                    />
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    scrollContent: { padding: SPACING.m, paddingTop: 40 },
    header: { alignItems: 'center', marginBottom: SPACING.xl },
    zapCircle: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: 'rgba(204, 255, 0, 0.1)', justifyContent: 'center',
        alignItems: 'center', marginBottom: 16
    },
    title: { fontSize: 28, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
    subtitle: { fontSize: 16, color: COLORS.textDim, textAlign: 'center', marginTop: 8, lineHeight: 24 },
    toggleContainer: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', marginBottom: SPACING.xl
    },
    toggleLabel: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
    activeLabel: { color: COLORS.text },
    yearlyLabelContainer: { flexDirection: 'row', alignItems: 'center' },
    discountBadge: {
        backgroundColor: 'rgba(204, 255, 0, 0.2)', paddingHorizontal: 8,
        paddingVertical: 4, borderRadius: 12, marginLeft: 8
    },
    discountText: { color: COLORS.primary, fontSize: 10, fontWeight: '800' },
    cardsContainer: { marginBottom: SPACING.xl },
    card: {
        backgroundColor: '#111111', borderRadius: 24, padding: 24,
        borderWidth: 1, borderColor: '#222'
    },
    centerCard: { borderColor: COLORS.primary, borderWidth: 2 },
    planName: { fontSize: 18, fontWeight: '700', color: COLORS.primary, marginBottom: 8 },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 },
    currency: { fontSize: 24, fontWeight: '700', color: COLORS.text },
    price: { fontSize: 48, fontWeight: '800', color: COLORS.text },
    period: { fontSize: 18, color: COLORS.textDim, marginLeft: 4 },
    cardDesc: { color: COLORS.textDim, marginBottom: 24 },
    featuresList: { marginBottom: 32 },
    featureItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    featureText: { fontSize: 16, color: COLORS.text, marginLeft: 12 },
    upgradeButton: {
        backgroundColor: COLORS.primary, paddingVertical: 16,
        borderRadius: 16, alignItems: 'center'
    },
    upgradeButtonText: { color: COLORS.background, fontSize: 18, fontWeight: '700' },
    faqSection: { marginTop: SPACING.l },
    sectionHeader: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
    faqWrapper: { borderBottomWidth: 1, borderBottomColor: '#222', paddingVertical: 16 },
    faqHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: 48,
    },
    faqQuestion: { fontSize: 16, fontWeight: '600', color: COLORS.text, flex: 1, paddingRight: 10 },
    faqAnswer: { fontSize: 15, color: COLORS.textDim, marginTop: 12, lineHeight: 22 }
});
