
import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { useRouter } from 'expo-router';
import { Bell, LogOut, Shield } from 'lucide-react-native';
import React from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

export default function SettingsSection() {
    const router = useRouter();

    const handleSignOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) Alert.alert('Error', error.message);
        else router.replace('/');
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>Manage your account preferences and security.</Text>

            <View style={styles.section}>
                <Text style={styles.sectionHeader}>Security</Text>
                <Pressable style={styles.item} onPress={() => Alert.alert('Notice', 'Password reset email will be sent to your registered email.')}>
                    <Shield size={20} color={COLORS.textDim} />
                    <View style={styles.itemContent}>
                        <Text style={styles.itemTitle}>Change Password</Text>
                        <Text style={styles.itemSubtitle}>Update your account password</Text>
                    </View>
                </Pressable>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionHeader}>Notifications</Text>
                <View style={styles.item}>
                    <Bell size={20} color={COLORS.textDim} />
                    <View style={styles.itemContent}>
                        <Text style={styles.itemTitle}>Booking Inquiries</Text>
                        <Text style={styles.itemSubtitle}>Receive emails for new bookings</Text>
                    </View>
                    <View style={styles.toggleActive} />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionHeader}>Account</Text>
                <Pressable style={[styles.item, styles.dangerItem]} onPress={handleSignOut}>
                    <LogOut size={20} color="#FF5252" />
                    <View style={styles.itemContent}>
                        <Text style={[styles.itemTitle, { color: '#FF5252' }]}>Sign Out</Text>
                        <Text style={styles.itemSubtitle}>Log out of your artist account</Text>
                    </View>
                </Pressable>
            </View>

            <View style={styles.footer}>
                <Text style={styles.version}>Performance Lab v1.0.0</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: SPACING.l },
    title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
    subtitle: { fontSize: 14, color: COLORS.textDim, marginBottom: 32 },
    section: { marginBottom: 32 },
    sectionHeader: { color: COLORS.primary, fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
    item: { backgroundColor: '#1A1A1A', padding: 20, borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#222', marginBottom: 12 },
    itemContent: { flex: 1, marginLeft: 16 },
    itemTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
    itemSubtitle: { color: COLORS.textDim, fontSize: 13, marginTop: 2 },
    dangerItem: { borderColor: 'rgba(255, 82, 82, 0.2)' },
    toggleActive: { width: 44, height: 24, borderRadius: 12, backgroundColor: COLORS.primary },
    footer: { marginTop: 40, alignItems: 'center' },
    version: { color: COLORS.textDim, fontSize: 12 }
});
