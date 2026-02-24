import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    ArtistInfoStep,
    AwardsStep,
    ExperienceStep,
    FAQStep,
    GigSettingsStep,
    MembersStep,
    PackagesStep,
    PaymentsStep,
    PersonalStep,
    PhotoStep,
    RequirementsStep,
    VideoStep
} from '../../../src/components/profile/WizardStepRenderer';
import { COLORS, SPACING } from '../../../src/constants/theme';
import { useAuth } from '../../../src/context/AuthContext';
import { supabase } from '../../../src/lib/supabase';

const TOTAL_STEPS = 12;
const STEPS_LABELS = [
    'Personal', 'Artist Info', 'Photos', 'Videos',
    'Experience', 'Requirements', 'Awards', 'Members',
    'FAQ', 'Packages', 'Gig Settings', 'Payments'
];

export default function ArtistProfileWizard() {
    const { user, refreshAuth } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Unified Wizard State
    const [formData, setFormData] = useState({
        // Profile
        full_name: '',
        email: '',
        city: '',
        country: '',
        payment_iban: '',
        payment_bank_name: '',

        // Act
        act_name: '',
        bio: '',
        category_id: '',
        photos_url: [] as string[],
        videos_url: [] as string[],
        experience_years: 0,
        notable_venues: '',
        technical_specs: '',
        technical_rider_url: '',
        travel_range: 50,
        instant_booking: false,

        // Sub-tables (Arrays)
        awards: [] as any[],
        members: [] as any[],
        faq: [] as any[],
        packages: [] as any[],
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        if (!user) return;
        try {
            const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            const { data: act } = await supabase.from('acts').select('*').eq('owner_id', user.id).maybeSingle();

            let awardsList: any[] = [];
            let membersList: any[] = [];
            let packagesList: any[] = [];

            if (act) {
                const { data: awards } = await supabase.from('act_awards').select('*').eq('act_id', act.id);
                const { data: members } = await supabase.from('act_members').select('*').eq('act_id', act.id);
                const { data: packages } = await supabase.from('act_packages').select('*').eq('act_id', act.id);
                awardsList = awards || [];
                membersList = members || [];
                packagesList = packages || [];
            }

            setFormData({
                full_name: prof?.name || '',
                email: user.email || '',
                city: prof?.city || '',
                country: prof?.country || '',
                payment_iban: prof?.payment_iban || '',
                payment_bank_name: prof?.payment_bank_name || '',

                act_name: act?.name || '',
                bio: act?.description || '',
                category_id: act?.category_id || '',
                photos_url: act?.photos_url || [],
                videos_url: act?.videos_url || [],
                experience_years: act?.experience_years || 0,
                notable_venues: act?.notable_venues || '',
                technical_specs: act?.technical_specs || '',
                technical_rider_url: act?.technical_rider_url || '',
                travel_range: act?.travel_range || 50,
                instant_booking: act?.instant_booking || false,

                awards: awardsList,
                members: membersList,
                packages: packagesList,
                faq: act?.faqs || [], // Fallback to JSON in acts table
            });
        } catch (err) {
            console.error('Error fetching wizard data:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateData = (updates: any) => {
        setFormData(prev => ({ ...prev, ...updates }));
    };

    const handleNext = () => {
        if (currentStep < TOTAL_STEPS) {
            setCurrentStep(currentStep + 1);
        } else {
            handleFinalSave();
        }
    };

    const handleFinalSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            // 1. Update Profile
            // Auto-assign avatar from first photo if not already set
            const firstPhoto = formData.photos_url?.[0] || null;
            const profileUpdate: any = {
                name: formData.full_name,
                city: formData.city,
                country: formData.country,
                payment_iban: formData.payment_iban,
                payment_bank_name: formData.payment_bank_name,
            };
            if (firstPhoto) {
                profileUpdate.avatar_url = firstPhoto;
            }
            await supabase.from('profiles').update(profileUpdate).eq('id', user.id);

            // 2. Upsert Act
            const { data: act, error: actError } = await supabase.from('acts').upsert({
                owner_id: user.id,
                name: formData.act_name,
                description: formData.bio,
                category_id: formData.category_id || undefined,
                // 🎯 Auto-assign first photo as main image
                image_url: firstPhoto || undefined,
                photos_url: formData.photos_url,
                videos_url: formData.videos_url,
                experience_years: formData.experience_years,
                notable_venues: formData.notable_venues,
                technical_specs: formData.technical_specs,
                technical_rider_url: formData.technical_rider_url,
                travel_range: formData.travel_range,
                instant_booking: formData.instant_booking,
                faqs: formData.faq
            }, { onConflict: 'owner_id' }).select().single();

            if (actError) throw actError;

            // 3. Update Sub-tables (Awards, Members, Packages)
            // Strategy: Clear and Re-insert for simplicity in the wizard
            if (act) {
                await supabase.from('act_awards').delete().eq('act_id', act.id);
                if (formData.awards.length > 0) {
                    await supabase.from('act_awards').insert(
                        formData.awards.map(a => ({ ...a, act_id: act.id, id: undefined }))
                    );
                }

                await supabase.from('act_members').delete().eq('act_id', act.id);
                if (formData.members.length > 0) {
                    await supabase.from('act_members').insert(
                        formData.members.map(m => ({ ...m, act_id: act.id, id: undefined }))
                    );
                }

                await supabase.from('act_packages').delete().eq('act_id', act.id);
                if (formData.packages.length > 0) {
                    await supabase.from('act_packages').insert(
                        formData.packages.map(p => ({ ...p, act_id: act.id, id: undefined }))
                    );
                }
            }

            Alert.alert('Success', 'Profile wizard completed!');
            await refreshAuth();
        } catch (err: any) {
            console.error('Final Save Error:', err);
            Alert.alert('Save Error', err.message || 'Failed to save profile.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <View style={styles.centered}>
            <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
    );

    const renderStep = () => {
        switch (currentStep) {
            case 1: return <PersonalStep data={formData} updateData={updateData} onNext={handleNext} />;
            case 2: return <ArtistInfoStep data={formData} updateData={updateData} onNext={handleNext} />;
            case 3: return <PhotoStep data={formData} updateData={updateData} onNext={handleNext} />;
            case 4: return <VideoStep data={formData} updateData={updateData} onNext={handleNext} />;
            case 5: return <ExperienceStep data={formData} updateData={updateData} onNext={handleNext} />;
            case 6: return <RequirementsStep data={formData} updateData={updateData} onNext={handleNext} />;
            case 7: return <AwardsStep data={formData} updateData={updateData} onNext={handleNext} />;
            case 8: return <MembersStep data={formData} updateData={updateData} onNext={handleNext} />;
            case 9: return <FAQStep data={formData} updateData={updateData} onNext={handleNext} />;
            case 10: return <PackagesStep data={formData} updateData={updateData} onNext={handleNext} />;
            case 11: return <GigSettingsStep data={formData} updateData={updateData} onNext={handleNext} />;
            case 12: return <PaymentsStep data={formData} updateData={updateData} onNext={handleNext} />;
            default: return <PersonalStep data={formData} updateData={updateData} onNext={handleNext} />;
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* --- WIZARD HEADER --- */}
            <View style={styles.header}>
                <Pressable onPress={() => router.push('/profile')} style={styles.backButton}>
                    <ChevronLeft size={24} color={COLORS.text} />
                </Pressable>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Step {currentStep} of {TOTAL_STEPS}</Text>
                    <Text style={styles.headerSubtitle}>{STEPS_LABELS[currentStep - 1]}</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* --- PROGRESS BAR --- */}
            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${(currentStep / TOTAL_STEPS) * 100}%` }]} />
            </View>

            {/* --- STEP TAB INDICATORS (Horizontal Scroll) --- */}
            <View style={styles.tabContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabScrollContent}
                >
                    {STEPS_LABELS.map((label, index) => (
                        <Pressable
                            key={index}
                            style={[styles.tabItem, currentStep === index + 1 && styles.tabItemActive]}
                            onPress={() => setCurrentStep(index + 1)}
                        >
                            <Text style={[styles.tabText, currentStep === index + 1 && styles.tabTextActive]}>
                                {label}
                            </Text>
                        </Pressable>
                    ))}
                </ScrollView>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                {renderStep()}
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.s,
    },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitleContainer: { alignItems: 'center' },
    headerTitle: { fontSize: 12, color: COLORS.textDim, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    headerSubtitle: { fontSize: 18, color: COLORS.text, fontWeight: '900' },

    progressContainer: {
        height: 4,
        backgroundColor: '#1A1A1A',
        width: '100%',
    },
    progressBar: {
        height: '100%',
        backgroundColor: COLORS.primary,
    },

    tabContainer: {
        borderBottomWidth: 1,
        borderBottomColor: '#1A1A1A',
        backgroundColor: '#050505',
    },
    tabScrollContent: {
        paddingHorizontal: SPACING.m,
        height: 60,
        alignItems: 'center',
    },
    tabItem: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginRight: 12,
        borderRadius: 20,
        backgroundColor: '#111',
    },
    tabItemActive: {
        backgroundColor: COLORS.primary,
    },
    tabText: {
        color: COLORS.textDim,
        fontSize: 13,
        fontWeight: '700',
    },
    tabTextActive: {
        color: COLORS.background,
    },
});
