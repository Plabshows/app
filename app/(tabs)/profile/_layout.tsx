import { Stack } from 'expo-router';
import React from 'react';

export default function ProfileLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="bookings" />
            <Stack.Screen name="calendar" />
            <Stack.Screen name="reviews" />
            <Stack.Screen name="billing" />
            <Stack.Screen name="pro-membership" />
            <Stack.Screen name="security" />
            <Stack.Screen name="edit-profile" />
        </Stack>
    );
}
