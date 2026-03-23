import { Star } from 'lucide-react-native';
import React from 'react';
import {
    StyleSheet,
    Text,
    View
} from 'react-native';
import { COLORS } from '../../../src/constants/theme';

export default function ReviewsScreen() {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Star size={64} color={COLORS.textDim} strokeWidth={1} />
                <Text style={styles.title}>Reviews</Text>
                <Text style={styles.subtitle}>
                    View and manage your client feedback and ratings.
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        padding: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginTop: 24,
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textDim,
        textAlign: 'center',
        lineHeight: 24,
    },
});
