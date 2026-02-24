
import { LogOut, ShieldAlert } from 'lucide-react-native';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

export default function ImpersonationBanner() {
    const { isImpersonating, impersonatedProfile, stopImpersonation } = useAuth();
    const insets = useSafeAreaInsets();

    if (!isImpersonating || !impersonatedProfile) return null;

    return (
        <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? insets.top : 10 }]}>
            <View style={styles.content}>
                <View style={styles.leftSection}>
                    <ShieldAlert size={16} color="#000" />
                    <Text style={styles.text}>
                        Editing as: <Text style={styles.bold}>{impersonatedProfile.name || 'User'}</Text>
                    </Text>
                </View>

                <Pressable onPress={stopImpersonation} style={styles.exitButton}>
                    <Text style={styles.exitText}>Exit</Text>
                    <LogOut size={14} color="#000" />
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.primary,
        width: '100%',
        zIndex: 9999,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)'
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.m,
        paddingBottom: 10,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    text: {
        color: '#000',
        fontSize: 14,
        fontWeight: '500'
    },
    bold: {
        fontWeight: 'bold'
    },
    exitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6
    },
    exitText: {
        color: '#000',
        fontSize: 12,
        fontWeight: 'bold'
    }
});
