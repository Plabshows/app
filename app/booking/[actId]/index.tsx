import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    Zap,
    Calendar as CalendarIcon,
    X
} from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
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
    View,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as z from 'zod';

const ADMIN_ID = 'cbc605d5-518d-4fab-94e4-3d3cda8cf833';

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
    notes: z.string().min(10, "Please provide more details (min 10 characters)"),
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
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dateInput, setDateInput] = useState('');
    const [showCalendar, setShowCalendar] = useState(false);

    // Color helpers for "red if wrong"
    const getBorderColor = (field: string) => {
        return errors[field as keyof BookingFormData] ? (COLORS.error || '#ff4444') : 'rgba(255,255,255,0.1)';
    };

    const getBgColor = (field: string) => {
        return errors[field as keyof BookingFormData] ? 'rgba(255, 68, 68, 0.05)' : COLORS.surface;
    };

    const { control, handleSubmit, formState: { errors }, watch, setValue, getValues } = useForm<BookingFormData>({
        resolver: zodResolver(bookingSchema),
        defaultValues: {
            event_dates: [],
            location_text: '',
            expand_search: false,
            start_time: '20:00',
            apply_to_all_dates: true,
            duration_minutes: '120',
            event_type: 'Private Party',
            guests_count: '',
            budget_amount: '',
            notes: '',
            client_email: user?.email || '',
            client_phone: '',
            consent: false,
        }
    });

    const selectedDates = watch('event_dates');
    const selectedEventType = watch('event_type');
    const applyToAll = watch('apply_to_all_dates');
    const consent = watch('consent');

    const markedDates = useMemo(() => {
        const marked: any = {};
        selectedDates.forEach(d => {
            marked[d] = { selected: true, selectedColor: COLORS.primary, selectedTextColor: '#000' };
        });
        return marked;
    }, [selectedDates]);

    const nextStep = () => setStep(prev => Math.min(prev + 1, 9));
    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));
    
    React.useEffect(() => {
        if (user?.email && !watch('client_email')) {
            setValue('client_email', user.email);
        }
    }, [user?.email]);

    React.useEffect(() => {
        if (Object.keys(errors).length > 0) {
            console.log('[BookingWizard] Validation Errors:', JSON.stringify(errors, null, 2));
        }
    }, [errors]);

    // Direct submit — reads live form values, runs the same insert that testInsertBooking used
    const submitBooking = async () => {
        // Immediate confirmation the button was pressed
        console.log('[BookingWizard] submitBooking called');
        
        const data = getValues();
        console.log('[BookingWizard] form values:', JSON.stringify({
            event_dates: data.event_dates,
            location_text: data.location_text,
            event_type: data.event_type,
            guests_count: data.guests_count,
            client_email: data.client_email,
            consent: data.consent,
        }));

        if (!data.event_dates || data.event_dates.length === 0) {
            return Alert.alert('\u274c Missing Info', 'Please select at least one date to proceed.');
        }
        if (!data.location_text || data.location_text.length < 2) {
            return Alert.alert('\u274c Missing Info', 'Please tell us where the event will be held.');
        }
        if (!data.event_type) {
            return Alert.alert('\u274c Missing Info', 'What kind of event are you planning?');
        }
        if (!data.guests_count) {
            return Alert.alert('\u274c Missing Info', 'Approximately how many guests are you expecting?');
        }
        if (!data.client_email || !data.client_email.includes('@')) {
            return Alert.alert('\u274c Missing Info', 'We need your email to send you the details.');
        }
        if (!data.consent) {
            return Alert.alert('\u274c Terms', 'Please accept the terms to submit your request.');
        }

        await onSubmit(data);
    };

    const onSubmit = async (data: BookingFormData) => {
        console.log('[BookingWizard] onSubmit triggered with data:', data);
        try {
            setIsSubmitting(true);
            const actIds = typeof actId === 'string' ? actId.split(',') : [actId];

            // 1. Get current user
            const userId = user?.id;

            if (!userId) {
                Toast.show({
                    type: 'error',
                    text1: 'Authentication Required',
                    text2: 'Please log in to submit a booking request.'
                });
                return;
            }

            const results: string[] = [];
            
            for (const currentActId of actIds) {
                try {
                    // 2. Resolve artist_id and act details
                    const { data: actData, error: actFetchError } = await supabase
                        .from('acts')
                        .select('owner_id, name, category, artist_type, image_url')
                        .eq('id', currentActId)
                        .single();

                    // CRITICAL: only use real DB values. If act doesn't exist, send null for act_id
                    // (act_id has a FK constraint → acts.id, so fake UUIDs cause silent insert failures)
                    const actExists = !!actData && !actFetchError;
                    const artistId = actData?.owner_id || ADMIN_ID;
                    const actName = actData?.name || 'General Booking Request';
                    const actCategory = actData?.category || actData?.artist_type || 'Entertainment';
                    const actUrl = actExists ? `https://plabshows.com/act/${currentActId}` : null;

                    console.log('[BookingWizard] act lookup:', { currentActId, actExists, artistId, actName });

                    // 3. Insert booking request
                    const { data: request, error: insertError } = await supabase
                        .from('booking_requests')
                        .insert({
                            artist_id: artistId,
                            act_id: actExists ? currentActId : null,
                            client_id: userId,
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

                    // ✨ Send booking summary to booking chat (non-blocking)
                    supabase.from('booking_messages').insert({
                        booking_request_id: request.id,
                        sender_id: userId,
                        sender_role: 'client',
                        type: 'booking_summary',
                        message: `New Booking Request: ${data.event_type}`,
                        metadata: {
                            act_id: actExists ? currentActId : null,
                            event_type: data.event_type,
                            event_dates: data.event_dates,
                            location_text: data.location_text,
                            duration_minutes: data.duration_minutes,
                            guests_count: data.guests_count,
                            budget_amount: data.budget_amount,
                            notes: data.notes,
                            client_email: data.client_email,
                            client_phone: data.client_phone
                        }
                    }).then(({ error: bmErr }) => {
                        if (bmErr) console.error('[BookingWizard] booking_messages fail (non-blocking):', bmErr.message);
                    });

                    // 🔔 ADMIN ALERT: Notify Superadmin (non-blocking)
                    const summaryMessage = 
                        `📋 NEW BOOKING REQUEST\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n` +
                        `🎤 Act: ${actName} (${actCategory})\n` +
                        `🎭 Event: ${data.event_type}\n` +
                        `📅 Dates: ${data.event_dates.join(', ')}\n` +
                        `📍 Location: ${data.location_text}\n` +
                        `👥 Guests: ${data.guests_count}\n` +
                        `⏱ Duration: ${data.duration_minutes} min\n` +
                        `💰 Budget: ${data.budget_amount ? `€${data.budget_amount}` : 'Quote requested'}\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n` +
                        `📧 Email: ${data.client_email}\n` +
                        `📱 Phone: ${data.client_phone || 'N/A'}\n` +
                        `📝 Notes: ${data.notes}\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n` +
                        `🔗 Act Page: ${actUrl}`;

                    supabase.from('messages').insert({
                        sender_id: userId,
                        receiver_id: ADMIN_ID,
                        content: summaryMessage,
                        type: 'booking_request',
                        booking_id: request.id,
                        status: 'unread',
                        metadata: {
                            act_id: currentActId,
                            act_name: actName,
                            act_category: actCategory,
                            act_url: actUrl,
                            act_image_url: actData?.image_url || null,
                            event_type: data.event_type,
                            event_dates: data.event_dates,
                            location_text: data.location_text,
                            guests_count: data.guests_count,
                            duration_minutes: data.duration_minutes,
                            budget_amount: data.budget_amount || null,
                            client_email: data.client_email,
                            client_phone: data.client_phone || null,
                            booking_id: request.id,
                        }
                    }).then(({ error: msgErr }) => {
                        if (msgErr) console.error('[BookingWizard] messages notify fail (non-blocking):', msgErr.message);
                    });

                    // 4. Send email notification (non-blocking)
                    supabase.functions.invoke('notify-booking-request', {
                        body: {
                            request_id: request.id,
                            artist_name: actName,
                            artist_id: artistId,
                            act_id: currentActId,
                            event_dates: data.event_dates,
                            start_time: data.start_time,
                            apply_to_all_dates: data.apply_to_all_dates,
                            duration_minutes: parseInt(data.duration_minutes),
                            event_type: data.event_type,
                            guests_count: parseInt(data.guests_count),
                            location_text: data.location_text,
                            budget_amount: data.budget_amount ? parseFloat(data.budget_amount) : null,
                            notes: data.notes,
                            client_email: data.client_email,
                            client_phone: data.client_phone || null,
                        }
                    }).catch(err => console.error('[BookingWizard] Email fail:', err));

                    results.push(request.id);
                } catch (actLoopError: any) {
                    const errMsg = actLoopError?.message || String(actLoopError);
                    console.error(`[BookingWizard] Error for act ${currentActId}:`, errMsg);
                    if (results.length === 0) {
                        throw new Error(`Booking failed: ${errMsg}`);
                    }
                }
            }

            if (results.length === 0) throw new Error("Failed to create any booking requests.");

            Toast.show({
                type: 'success',
                text1: 'Request Sent Successfully!',
                text2: `We've created ${results.length} request(s) for your review.`
            });

            // 5. Navigate to confirmation
            setTimeout(() => {
                router.push({
                    pathname: '/booking/confirmation',
                    params: { 
                        requestId: results[0], 
                        count: results.length,
                        email: data.client_email 
                    }
                });
            }, 1500);
        } catch (error: any) {
            Alert.alert("Submission Error", error.message || "Something went wrong.");
            Toast.show({
                type: 'error',
                text1: 'Submission Error',
                text2: error.message || "Something went wrong. Please try again."
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>
                            {actId === 'event' ? 'Create Event Brief' : 'When is your event?'}
                        </Text>
                        <Text style={styles.stepSubtitle}>Select one or more dates</Text>
                        
                        <Pressable 
                            style={[
                                styles.calendarToggle, 
                                { borderColor: getBorderColor('event_dates'), backgroundColor: getBgColor('event_dates') }
                            ]}
                            onPress={() => setShowCalendar(!showCalendar)}
                        >
                            <CalendarIcon size={20} color={COLORS.primary} />
                            <Text style={styles.calendarToggleText}>
                                {selectedDates.length > 0 
                                    ? `${selectedDates.length} date(s) selected` 
                                    : 'Choose dates from calendar'}
                            </Text>
                            <ChevronRight size={20} color={COLORS.textDim} style={{ transform: [{ rotate: showCalendar ? '90deg' : '0deg' }] }} />
                        </Pressable>

                        {showCalendar && (
                            <View style={styles.calendarContainer}>
                                <Calendar
                                    theme={{
                                        calendarBackground: '#111',
                                        textSectionTitleColor: '#fff',
                                        selectedDayBackgroundColor: COLORS.primary,
                                        selectedDayTextColor: '#000',
                                        todayTextColor: COLORS.primary,
                                        dayTextColor: '#fff',
                                        textDisabledColor: '#444',
                                        monthTextColor: '#fff',
                                        indicatorColor: COLORS.primary,
                                        arrowColor: COLORS.primary,
                                    }}
                                    markedDates={markedDates}
                                    onDayPress={(day) => {
                                        const dateString = day.dateString;
                                        if (selectedDates.includes(dateString)) {
                                            setValue('event_dates', selectedDates.filter(d => d !== dateString));
                                        } else {
                                            setValue('event_dates', [...selectedDates, dateString]);
                                        }
                                    }}
                                />
                            </View>
                        )}

                        <View style={styles.dateChips}>
                            {selectedDates.map(d => (
                                <Pressable
                                    key={d}
                                    style={styles.dateChip}
                                    onPress={() => setValue('event_dates', selectedDates.filter(x => x !== d))}
                                >
                                    <Text style={styles.dateChipText}>{d} <X size={12} color={COLORS.text} /></Text>
                                </Pressable>
                            ))}
                        </View>
                        {errors.event_dates && <Text style={styles.errorText}>{errors.event_dates.message}</Text>}
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
                                    style={[styles.input, { borderColor: getBorderColor('location_text'), backgroundColor: getBgColor('location_text') }]}
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
                                    style={[styles.input, { borderColor: getBorderColor('start_time'), backgroundColor: getBgColor('start_time') }]}
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
                                    style={[styles.input, { borderColor: getBorderColor('guests_count'), backgroundColor: getBgColor('guests_count') }]}
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
                        <Text style={styles.stepSubtitle}>Stage setup, sound requirements, special requests…</Text>
                        <Controller
                            control={control}
                            name="notes"
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    style={[
                                        styles.input, 
                                        styles.textArea,
                                        { borderColor: getBorderColor('notes'), backgroundColor: getBgColor('notes') }
                                    ]}
                                    placeholder="Describe your event, stage setup, special requests…"
                                    placeholderTextColor="#666"
                                    multiline
                                    numberOfLines={6}
                                    value={value}
                                    onChangeText={onChange}
                                />
                            )}
                        />
                        <Text style={styles.counterText}>{watch('notes').length} characters</Text>
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
                                        style={[styles.input, { borderColor: getBorderColor('client_email'), backgroundColor: getBgColor('client_email') }]}
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
                                        style={[styles.input, { borderColor: getBorderColor('client_phone'), backgroundColor: getBgColor('client_phone') }]}
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
                            style={[styles.consentRow, errors.consent && { borderColor: COLORS.error || '#ff4444', borderWidth: 1, padding: 8, borderRadius: 8 }]}
                            onPress={() => setValue('consent', !consent)}
                        >
                            <View style={[styles.checkbox, consent && styles.checkboxActive, errors.consent && { borderColor: COLORS.error || '#ff4444' }]} />
                            <Text style={[styles.consentText, errors.consent && { color: COLORS.error || '#ff4444' }]}>I agree to be contacted regarding this request.</Text>
                        </Pressable>
                        <View style={{ height: 100 }} />
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen 
                options={{ 
                    headerShown: true,
                    headerTitle: actId === 'event' ? 'Create Event Brief' : 'Booking Request',
                    headerStyle: { backgroundColor: COLORS.background },
                    headerTintColor: '#FFF',
                    headerTitleStyle: { fontWeight: '900', fontSize: 17 },
                    headerLeft: () => (
                        <Pressable onPress={() => router.back()} style={{ marginLeft: -10, padding: 10 }}>
                            <ChevronLeft size={24} color="#FFF" />
                        </Pressable>
                    )
                }} 
            />
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <Pressable onPress={() => step === 1 ? router.back() : prevStep()} style={styles.backButton}>
                        <ArrowLeft size={24} color={step === 1 ? 'rgba(255,255,255,0.1)' : '#FFF'} />
                    </Pressable>
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: `${(step / 9) * 100}%` }]} />
                    </View>
                    <Text style={styles.stepIndicator}>{`STEP ${step} OF 9`}</Text>
                </View>

                <ScrollView 
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {renderStep()}
                </ScrollView>

                <View style={styles.footer}>
                    {step < 9 ? (
                        <Pressable style={styles.nextButton} onPress={nextStep}>
                            <Text style={styles.nextButtonText}>Continue</Text>
                            <ChevronRight size={20} color="#000" />
                        </Pressable>
                    ) : (
                        <Pressable 
                            style={[styles.submitButton, isSubmitting && styles.disabled]} 
                            onPress={submitBooking}
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
        fontWeight: '800',
        fontSize: 13,
        fontVariant: ['tabular-nums'],
    },
    content: {
        padding: SPACING.xl,
        flexGrow: 1,
    },
    stepContainer: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: COLORS.text,
        marginBottom: 10,
        letterSpacing: -0.5,
        lineHeight: 38,
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
        paddingTop: SPACING.l,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
        backgroundColor: COLORS.background,
        paddingBottom: Platform.OS === 'ios' ? 100 : 80, // High enough to clear any bottom tab or safe area
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
        fontSize: 14,
        flexDirection: 'row',
        alignItems: 'center',
    },
    calendarToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        gap: 12,
        marginBottom: 16,
    },
    calendarToggleText: {
        flex: 1,
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '500',
    },
    calendarContainer: {
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 16,
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
