import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    ChevronLeft,
    ChevronRight,
    Zap
} from 'lucide-react-native';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
    ActivityIndicator,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as z from 'zod';

const { width } = Dimensions.get('window');

const bookingSchema = z.object({
    event_dates: z.array(z.string()).min(1, "Select at least one date"),
    location_text: z.string().min(3, "Location is required"),
    address_details: z.string().optional(),
    expand_search: z.boolean().default(false),
    start_time: z.string().min(1, "Start time is required"),
    apply_to_all_dates: z.boolean().default(true),
    duration_minutes: z.string().min(1, "Duration is required"),
    event_type: z.string().min(1, "Event type is required"),
    guests_count: z.string().min(1, "Guest count is required"),
    budget_amount: z.string().optional(),
    notes: z.string().min(50, "Please provide more details (min 50 characters)"),
    client_email: z.string().email("Valid email is required"),
    client_phone: z.string().optional(),
    consent: z.boolean().refine(v => v === true, "Consent is required"),
});

type BookingFormData = z.infer<typeof bookingSchema>;

const EVENT_TYPES = [
    'Hotels & Restaurants', 'Clubs & Pubs', 'Wedding', 'Festival',
    'Public Event', 'Cruise Ship', 'Corporate', 'Children Birthday',
    'Private Party', 'Bachelor Party', 'Exhibition'
];

const DURATIONS = [
    { label: '15m', value: '15' },
    { label: '30m', value: '30' },
    { label: '45m', value: '45' },
    { label: '1h', value: '60' },
    { label: '1h 30m', value: '90' },
    { label: '2h', value: '120' },
    { label: '3h', value: '180' },
    { label: '4h', value: '240' },
];

export default function BookingWizard() {
    const { actId, packageData, managedByAdmin } = useLocalSearchParams();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { control, handleSubmit, formState: { errors }, watch, setValue } = useForm<BookingFormData>({
        resolver: zodResolver(bookingSchema),
        defaultValues: {
            event_dates: [],
            expand_search: false,
            event_type: '',
            duration_minutes: '60',
            notes: '',
            apply_to_all_dates: true,
            consent: false,
        }
    });

    const selectedDates = watch('event_dates');
    const selectedEventType = watch('event_type');
    const applyToAll = watch('apply_to_all_dates');
    const consent = watch('consent');

    const nextStep = () => setStep(prev => Math.min(prev + 1, 9));
    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

    const onSubmit = async (data: BookingFormData) => {
        try {
            setIsSubmitting(true);

            // 1. Get current user (might be null)
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;

            // 2. Resolve artist_id from actId
            const { data: actData, error: actError } = await supabase
                .from('acts')
                .select('owner_id')
                .eq('id', actId)
                .single();

            if (actError || !actData) throw new Error("Could not find artist details.");

            // 3. Insert booking request
            const { data: request, error: insertError } = await supabase
                .from('booking_requests')
                .insert({
                    artist_id: actData.owner_id,
                    act_id: actId,
                    client_id: userId || null,
                    client_email: data.client_email,
                    client_phone: data.client_phone || null,
                    event_dates: data.event_dates,
                    location_text: data.location_text,
                    expand_search: data.expand_search,
                    start_time: data.start_time,
                    apply_to_all_dates: data.apply_to_all_dates,
                    duration_minutes: parseInt(data.duration_minutes),
                    event_type: data.event_type,
                    guests_count: parseInt(data.guests_count),
                    budget_amount: data.budget_amount ? parseFloat(data.budget_amount) : null,
                    notes: data.notes,
                    package_id: packageData ? JSON.parse(packageData as string) : null,
                    managed_by_admin: managedByAdmin === 'true',
                    status: 'pending'
                })
                .select()
                .single();

            if (insertError) throw insertError;

            // 4. Navigate to confirmation with request ID for optional linking
            router.push({
                pathname: '/booking/confirmation',
                params: { requestId: request.id, email: data.client_email }
            });
        } catch (error: any) {
            console.error('Booking error:', error);
            alert(error.message || "Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>When is your event?</Text>
                        <Text style={styles.stepSubtitle}>Select one or more dates</Text>
                        <View style={styles.inputGroup}>
                            <TextInput
                                style={styles.input}
                                placeholder="YYYY-MM-DD (e.g. 2024-05-20)"
                                placeholderTextColor="#666"
                                onSubmitEditing={(e) => {
                                    const val = e.nativeEvent.text;
                                    if (val && !selectedDates.includes(val)) {
                                        setValue('event_dates', [...selectedDates, val]);
                                    }
                                }}
                            />
                            <View style={styles.dateChips}>
                                {selectedDates.map(d => (
                                    <Pressable
                                        key={d}
                                        style={styles.dateChip}
                                        onPress={() => setValue('event_dates', selectedDates.filter(x => x !== d))}
                                    >
                                        <Text style={styles.dateChipText}>{d} ✕</Text>
                                    </Pressable>
                                ))}
                            </View>
                            {errors.event_dates && <Text style={styles.errorText}>{errors.event_dates.message}</Text>}
                        </View>
                    </View>
                );
            case 2:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Where is the event?</Text>
                        <Text style={styles.stepSubtitle}>Location or Venue Name</Text>
                        <Controller
                            control={control}
                            name="location_text"
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Burj Al Arab, Dubai"
                                    placeholderTextColor="#666"
                                    value={value}
                                    onChangeText={onChange}
                                />
                            )}
                        />
                        <View style={styles.switchRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.switchLabel}>Expand Search?</Text>
                                <Text style={styles.switchSublabel}>Outside city if needed</Text>
                            </View>
                            <Pressable
                                onPress={() => setValue('expand_search', !watch('expand_search'))}
                                style={[styles.toggle, watch('expand_search') && styles.toggleActive]}
                            >
                                <Text style={styles.toggleText}>{watch('expand_search') ? 'YES' : 'NO'}</Text>
                            </Pressable>
                        </View>
                    </View>
                );
            case 3:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Start Time</Text>
                        <Controller
                            control={control}
                            name="start_time"
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. 20:00"
                                    placeholderTextColor="#666"
                                    value={value}
                                    onChangeText={onChange}
                                />
                            )}
                        />
                        <View style={styles.switchRow}>
                            <Text style={styles.switchLabel}>Apply to all dates?</Text>
                            <Pressable
                                onPress={() => setValue('apply_to_all_dates', !applyToAll)}
                                style={[styles.toggle, applyToAll && styles.toggleActive]}
                            >
                                <Text style={styles.toggleText}>{applyToAll ? 'YES' : 'NO'}</Text>
                            </Pressable>
                        </View>
                    </View>
                );
            case 4:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Performance Duration</Text>
                        <View style={styles.grid}>
                            {DURATIONS.map(d => (
                                <Pressable
                                    key={d.value}
                                    style={[styles.gridItem, watch('duration_minutes') === d.value && styles.gridItemActive]}
                                    onPress={() => setValue('duration_minutes', d.value)}
                                >
                                    <Text style={[styles.gridItemText, watch('duration_minutes') === d.value && styles.gridItemTextActive]}>
                                        {d.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                );
            case 5:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Event Type</Text>
                        <ScrollView contentContainerStyle={styles.chipsRow}>
                            {EVENT_TYPES.map(type => (
                                <Pressable
                                    key={type}
                                    style={[styles.chip, selectedEventType === type && styles.chipActive]}
                                    onPress={() => setValue('event_type', type)}
                                >
                                    <Text style={[styles.chipText, selectedEventType === type && styles.chipTextActive]}>
                                        {type}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                );
            case 6:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Guest Count</Text>
                        <Controller
                            control={control}
                            name="guests_count"
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. 150"
                                    placeholderTextColor="#666"
                                    keyboardType="number-pad"
                                    value={value}
                                    onChangeText={onChange}
                                />
                            )}
                        />
                    </View>
                );
            case 7:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Budget (Optional)</Text>
                        <Text style={styles.stepSubtitle}>Skip if you want artists to send quotes</Text>
                        <Controller
                            control={control}
                            name="budget_amount"
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    style={styles.input}
                                    placeholder="Amount in AED"
                                    placeholderTextColor="#666"
                                    keyboardType="numeric"
                                    value={value}
                                    onChangeText={onChange}
                                />
                            )}
                        />
                        <Pressable style={styles.skipBtn} onPress={nextStep}>
                            <Text style={styles.skipBtnText}>Skip / Let artists send quotes</Text>
                        </Pressable>
                    </View>
                );
            case 8:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Extra Information</Text>
                        <Text style={styles.stepSubtitle}>Provide details about the stage, sound, or specific requests.</Text>
                        <Controller
                            control={control}
                            name="notes"
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Minimum 50 characters..."
                                    placeholderTextColor="#666"
                                    multiline
                                    numberOfLines={6}
                                    value={value}
                                    onChangeText={onChange}
                                />
                            )}
                        />
                        <Text style={styles.counterText}>{watch('notes').length} / 50 characters</Text>
                    </View>
                );
            case 9:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Contact Details</Text>
                        <Text style={styles.stepSubtitle}>How should the artist reach you?</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.fieldLabel}>Email Address *</Text>
                            <Controller
                                control={control}
                                name="client_email"
                                render={({ field: { onChange, value } }) => (
                                    <TextInput
                                        style={styles.input}
                                        placeholder="your@email.com"
                                        placeholderTextColor="#666"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        value={value}
                                        onChangeText={onChange}
                                    />
                                )}
                            />
                            {errors.client_email && <Text style={styles.errorText}>{errors.client_email.message}</Text>}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.fieldLabel}>Phone / WhatsApp (Optional)</Text>
                            <Controller
                                control={control}
                                name="client_phone"
                                render={({ field: { onChange, value } }) => (
                                    <TextInput
                                        style={styles.input}
                                        placeholder="+971..."
                                        placeholderTextColor="#666"
                                        keyboardType="phone-pad"
                                        value={value}
                                        onChangeText={onChange}
                                    />
                                )}
                            />
                        </View>

                        <Pressable
                            style={styles.consentRow}
                            onPress={() => setValue('consent', !consent)}
                        >
                            <View style={[styles.checkbox, consent && styles.checkboxActive]} />
                            <Text style={styles.consentText}>I agree to be contacted regarding this request.</Text>
                        </Pressable>
                        {errors.consent && <Text style={styles.errorText}>{errors.consent.message}</Text>}
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <Pressable onPress={() => step === 1 ? router.back() : prevStep()} style={styles.backButton}>
                        <ChevronLeft size={24} color={COLORS.text} />
                    </Pressable>
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: `${(step / 9) * 100}%` }]} />
                    </View>
                    <Text style={styles.stepIndicator}>{step}/9</Text>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    {renderStep()}
                </ScrollView>

                <View style={styles.footer}>
                    {step < 9 ? (
                        <Pressable style={styles.nextButton} onPress={nextStep}>
                            <Text style={styles.nextButtonText}>Next</Text>
                            <ChevronRight size={20} color="#000" />
                        </Pressable>
                    ) : (
                        <Pressable
                            style={[styles.submitButton, isSubmitting && styles.disabled]}
                            onPress={handleSubmit(onSubmit)}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#000" />
                            ) : (
                                <>
                                    <Zap size={20} color="#000" />
                                    <Text style={styles.submitButtonText}>Submit Request</Text>
                                </>
                            )}
                        </Pressable>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.m,
        gap: 16,
    },
    backButton: {
        padding: 8,
    },
    progressContainer: {
        flex: 1,
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: COLORS.primary,
    },
    stepIndicator: {
        color: COLORS.textDim,
        fontWeight: 'bold',
        fontSize: 12,
    },
    content: {
        padding: SPACING.xl,
        flexGrow: 1,
    },
    stepContainer: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: COLORS.text,
        marginBottom: 8,
    },
    stepSubtitle: {
        fontSize: 16,
        color: COLORS.textDim,
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 24,
    },
    fieldLabel: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        backgroundColor: COLORS.surface,
        color: COLORS.text,
        padding: 18,
        borderRadius: 12,
        fontSize: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    textArea: {
        height: 150,
        textAlignVertical: 'top',
    },
    footer: {
        padding: SPACING.xl,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    nextButton: {
        backgroundColor: COLORS.primary,
        padding: 18,
        borderRadius: 100,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    nextButtonText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 18,
    },
    submitButton: {
        backgroundColor: COLORS.primary,
        padding: 18,
        borderRadius: 100,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    submitButtonText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 18,
    },
    disabled: {
        opacity: 0.5,
    },
    dateChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
    },
    dateChip: {
        backgroundColor: 'rgba(204, 255, 0, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    dateChipText: {
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
        backgroundColor: COLORS.surface,
        padding: 16,
        borderRadius: 12,
    },
    switchLabel: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '600',
    },
    switchSublabel: {
        color: COLORS.textDim,
        fontSize: 12,
    },
    toggle: {
        backgroundColor: '#222',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    toggleActive: {
        backgroundColor: COLORS.primary,
    },
    toggleText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    gridItem: {
        width: (width - 64 - 24) / 3,
        backgroundColor: COLORS.surface,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    gridItemActive: {
        borderColor: COLORS.primary,
        backgroundColor: 'rgba(204, 255, 0, 0.05)',
    },
    gridItemText: {
        color: COLORS.textDim,
        fontWeight: '600',
    },
    gridItemTextActive: {
        color: COLORS.primary,
    },
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 100,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    chipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    chipText: {
        color: COLORS.textDim,
        fontSize: 14,
        fontWeight: '600',
    },
    chipTextActive: {
        color: '#000',
    },
    skipBtn: {
        marginTop: 16,
        alignItems: 'center',
    },
    skipBtnText: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    errorText: {
        color: COLORS.error || '#ff4444',
        fontSize: 12,
        marginTop: 4,
    },
    counterText: {
        color: COLORS.textDim,
        fontSize: 12,
        marginTop: 8,
        textAlign: 'right',
    },
    consentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 8,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    checkboxActive: {
        backgroundColor: COLORS.primary,
    },
    consentText: {
        color: COLORS.textDim,
        fontSize: 14,
        flex: 1,
    }
});
