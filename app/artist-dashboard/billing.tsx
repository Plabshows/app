import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { useFocusEffect } from 'expo-router';
import { AlertCircle, CheckCircle2, CreditCard, ExternalLink, Loader2, ShieldCheck } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

export default function BillingScreen() {
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [stripeStatus, setStripeStatus] = useState({
        accountId: null as string | null,
        onboardingComplete: false
    });

    const fetchStripeStatus = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('stripe_account_id, stripe_onboarding_complete')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            setStripeStatus({
                accountId: profile?.stripe_account_id,
                onboardingComplete: profile?.stripe_onboarding_complete || false
            });
        } catch (error) {
            console.error('Error fetching Stripe status:', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchStripeStatus();
        }, [])
    );

    const handleConnectStripe = async () => {
        try {
            setActionLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No active session");

            const { data, error } = await supabase.functions.invoke('create-connect-account', {
                body: {}
            });

            if (error) {
                console.error("Function error details:", error);
                throw new Error(error.message || 'Failed to connect to payment server');
            }
            if (data?.error) throw new Error(data.error);

            if (data?.url) {
                if (Platform.OS === 'web') {
                    window.location.href = data.url;
                } else {
                    await Linking.openURL(data.url);
                }
            } else {
                throw new Error("Invalid response from server");
            }

        } catch (err: any) {
            console.error(err);
            Alert.alert('Connection failed', err.message || 'Could not initiate bank connection.');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <Text style={styles.title}>Payments & Billing</Text>
                <Text style={styles.subtitle}>Manage your automated payouts and bank connections securely via Stripe.</Text>
            </View>

            {/* STRIPE CONNECTION CARD */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.cardIconWrapper}>
                        <CreditCard size={24} color={COLORS.primary} />
                    </View>
                    <View style={styles.cardTitleContainer}>
                        <Text style={styles.cardTitle}>Payout Connection</Text>
                        <Text style={styles.cardSubtitle}>Receive money directly to your account.</Text>
                    </View>
                </View>

                {stripeStatus.onboardingComplete ? (
                    <View style={styles.statusBoxSuccess}>
                        <CheckCircle2 size={20} color="#10B981" />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.statusTitle}>Bank Account Connected</Text>
                            <Text style={styles.statusText}>
                                Your payouts are automated. When a client pays for a booking, your 80% split drops directly into your local bank.
                            </Text>
                        </View>
                    </View>
                ) : (
                    <View style={styles.statusBoxPending}>
                        <AlertCircle size={20} color="#F59E0B" />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.statusTitlePending}>Action Required</Text>
                            <Text style={styles.statusTextPending}>
                                You must connect your local bank account to start accepting online payments and finalizing bookings.
                            </Text>
                        </View>
                    </View>
                )}

                {!stripeStatus.onboardingComplete && (
                    <Pressable
                        style={[styles.primaryButton, actionLoading && styles.buttonDisabled]}
                        onPress={handleConnectStripe}
                        disabled={actionLoading}
                    >
                        {actionLoading ? (
                            <Loader2 size={20} color="#000" style={styles.spinner} />
                        ) : (
                            <>
                                <ShieldCheck size={20} color="#000" />
                                <Text style={styles.primaryButtonText}>
                                    {stripeStatus.accountId ? 'Resume Bank Connection' : 'Connect Bank via Stripe'}
                                </Text>
                            </>
                        )}
                    </Pressable>
                )}

                {stripeStatus.onboardingComplete && (
                    <Pressable
                        style={styles.secondaryButton}
                        onPress={handleConnectStripe}
                        disabled={actionLoading}
                    >
                        {actionLoading ? (
                            <ActivityIndicator size="small" color={COLORS.primary} />
                        ) : (
                            <>
                                <Text style={styles.secondaryButtonText}>Go to Express Dashboard</Text>
                                <ExternalLink size={16} color={COLORS.primary} />
                            </>
                        )}
                    </Pressable>
                )}
            </View>

            {/* TRANSACTIONS CARD PLACEHOLDER */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Recent Payouts</Text>
                </View>
                <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>No payouts processed yet.</Text>
                    <Text style={styles.emptyStateSub}>Once you complete a booking, funds will appear here.</Text>
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
    centered: {
        justifyContent: 'center',
        alignItems: 'center'
    },
    content: {
        padding: SPACING.xl,
        paddingBottom: 100,
        maxWidth: 800,
        width: '100%',
        marginHorizontal: Platform.OS === 'web' ? 'auto' : 0,
    },
    header: {
        marginBottom: 32,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: COLORS.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textDim,
        lineHeight: 24,
    },
    card: {
        backgroundColor: '#111',
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: '#222',
        marginBottom: 24,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
    },
    cardIconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: 'rgba(212, 255, 0, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTitleContainer: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 14,
        color: COLORS.textDim,
    },
    statusBoxSuccess: {
        flexDirection: 'row',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)',
        gap: 12,
        marginBottom: 24,
    },
    statusTitle: {
        color: '#10B981',
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 4,
    },
    statusText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        lineHeight: 20,
    },
    statusBoxPending: {
        flexDirection: 'row',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
        gap: 12,
        marginBottom: 24,
    },
    statusTitlePending: {
        color: '#F59E0B',
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 4,
    },
    statusTextPending: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        lineHeight: 20,
    },
    primaryButton: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    primaryButtonText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 16,
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        backgroundColor: 'rgba(212, 255, 0, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(212, 255, 0, 0.2)',
        gap: 8,
    },
    secondaryButtonText: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: 16,
    },
    emptyState: {
        paddingVertical: 32,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0A0A0A',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1A1A1A',
        borderStyle: 'dashed',
    },
    emptyStateText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    emptyStateSub: {
        color: COLORS.textDim,
        fontSize: 14,
    },
    spinner: {
        marginRight: 8
    }
});
