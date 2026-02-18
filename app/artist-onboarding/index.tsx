
import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
    Camera,
    Check,
    ChevronDown,
    ChevronLeft,
    MapPin,
    Music,
    Users,
    X
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- DATA LISTS (Soul Artists Style) ---
const LISTS = {
    categories: ['Musician', 'DJ', 'Magic', 'Dancer', 'Circus', 'Specialty Act', 'Fire & Flow', 'Presenter', 'Comedian', 'Roaming'],
    artistTypes: ['Solo', 'Duo', 'Trio', 'Quartet', 'Band (5+)', 'Group/Crew'],
    genders: ['Male', 'Female', 'Mixed Group'],
    performanceTypes: ['Stage Show', 'Roaming / Walkabout', 'Background / Ambient', 'Main Attraction', 'Installation'],
    genres: ['Pop', 'Jazz', 'Rock', 'Classical', 'Electronic / House', 'Hip Hop / RnB', 'Latin', 'World Music', 'Fusion', 'Other'],
    locations: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ras Al Khaimah', 'Fujairah', 'Ajman', 'Umm Al Quwain', 'International'],
    travelOptions: ['Yes, Worldwide', 'Yes, UAE Only', 'No, Local Only'],
    durations: ['5 min', '10 min', '15 min', '20 min', '30 min', '45 min', '60 min', '90 min', '2 hours', '3 hours', '4 hours +'],
    setupTimes: ['None', '15 mins', '30 mins', '1 hour', '2 hours', '3 hours +'],
};

type Step = 'invite' | 'auth' | 'identity' | 'performance' | 'logistics' | 'media' | 'commercials' | 'success';

export default function ArtistOnboarding() {
    const router = useRouter();
    const { mode } = useLocalSearchParams();

    // State
    const [authMode, setAuthMode] = useState<'login' | 'signup'>((mode as 'login' | 'signup') || 'signup');
    const [currentStep, setCurrentStep] = useState<Step>(mode ? 'auth' : 'invite');
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);
    const [inviteCode, setInviteCode] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Form Data
    const [formData, setFormData] = useState({
        // Identity
        name: '',
        category_id: '',
        artist_type: '',
        gender: '',

        // Performance
        performance_type: '',
        genre: '',
        set_count: '1',
        min_duration: '',
        max_duration: '',
        members_count: '1',

        // Logistics
        location_base: '',
        willing_to_travel: '',
        travel_departure_city: 'Dubai',
        setup_time: '',

        // Commercials
        price_range: '',
        technical_specs: '',
        description: '',

        // Media
        video_url: '',
        photos_url: [] as string[]
    });

    const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);

    useEffect(() => {
        if (mode === 'login') {
            setAuthMode('login');
            setCurrentStep('auth');
        } else if (mode === 'signup') {
            setAuthMode('signup');
            setCurrentStep('auth');
        }
    }, [mode]);

    useEffect(() => {
        checkSession();
        fetchCategories();
    }, []);

    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            // If already logged in, check for act
            const { data: existingAct } = await supabase
                .from('acts')
                .select('id')
                .eq('owner_id', session.user.id)
                .maybeSingle();

            if (existingAct) {
                router.replace('/artist-dashboard/edit-profile');
            } else if (currentStep === 'auth') {
                setCurrentStep('identity');
            }
        }
    };

    const fetchCategories = async () => {
        const { data } = await supabase.from('categories').select('id, name').order('name');
        if (data) setCategories(data);
    };

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalItems, setModalItems] = useState<string[]>([]);
    const [modalTargetField, setModalTargetField] = useState<keyof typeof formData | null>(null);

    // Constants
    const INVITE_CODE = '2222';

    // --- HANDLERS ---

    const openDropdown = (title: string, items: string[], field: keyof typeof formData) => {
        setModalTitle(title);
        setModalItems(items);
        setModalTargetField(field);
        setModalVisible(true);
    };

    const selectItem = (item: string) => {
        if (modalTargetField === 'category_id') {
            const cat = categories.find(c => c.name === item);
            if (cat) setFormData({ ...formData, category_id: cat.id });
        } else if (modalTargetField) {
            setFormData({ ...formData, [modalTargetField]: item });
        }
        setModalVisible(false);
    };

    const handleInviteSubmit = () => {
        if (inviteCode.toUpperCase() === INVITE_CODE) setCurrentStep('auth');
        else Alert.alert('Invalid Code', 'Access denied.');
    };

    const handleAuth = async () => {
        if (!email || !password) return Alert.alert('Error', 'Missing credentials');
        setLoading(true);

        try {
            let currentUser = null;

            if (authMode === 'login') {
                // 1. Explicit Login
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                currentUser = data.user;
            } else {
                // 2. Explicit Signup
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { role: 'artist' } }
                });
                if (error) throw error;
                currentUser = data.user;

                if (!data.session && currentUser) {
                    Alert.alert('Verify Email', 'Please check your inbox to confirm your account.');
                    setLoading(false);
                    return; // Stop here if email verification is required
                }
            }

            // 3. Fetch data if user exists (Returning User flow)
            if (currentUser) {
                const { data: existingAct } = await supabase
                    .from('acts')
                    .select('*, categories(id, name)')
                    .eq('owner_id', currentUser.id)
                    .maybeSingle(); // maybeSingle instead of single to avoid error if no act yet

                if (existingAct) {
                    console.log('Populating data for existing artist:', existingAct.name);
                    setFormData({
                        name: existingAct.name || '',
                        category_id: existingAct.category_id || '',
                        artist_type: existingAct.artist_type || '',
                        gender: existingAct.gender || '',
                        performance_type: existingAct.performance_type || '',
                        genre: existingAct.genre || '',
                        set_count: String(existingAct.set_count || '1'),
                        min_duration: existingAct.min_duration || '',
                        max_duration: existingAct.max_duration || '',
                        members_count: String(existingAct.members_count || '1'),
                        location_base: existingAct.location_base || '',
                        willing_to_travel: existingAct.willing_to_travel ? 'Yes, Worldwide' : 'No, Local Only',
                        travel_departure_city: existingAct.travel_departure_city || 'Dubai',
                        setup_time: existingAct.setup_time || '',
                        price_range: existingAct.price_guide || '',
                        technical_specs: existingAct.technical_specs || '',
                        description: existingAct.description || '',
                        video_url: existingAct.video_url || '',
                        photos_url: existingAct.photos_url || []
                    });

                    // Success - If logging in, go straight to dashboard editor
                    if (authMode === 'login') {
                        return router.replace('/artist-dashboard/edit-profile');
                    }
                } else if (authMode === 'login') {
                    // Logic for login but NO act found? Should rarely happen for valid artists
                    // but we guide them to the first step of onboarding
                    setCurrentStep('identity');
                }

                // For genuine signup or login-with-no-act, go to identity
                setCurrentStep('identity');
            }
        } catch (e: any) {
            console.error('Auth error in handleAuth:', e);
            Alert.alert(authMode === 'login' ? 'Login Error' : 'Signup Error', e.message);
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
        });
        if (!result.canceled) setImages([...images, ...result.assets]);
    };

    const uploadImages = async (userId: string) => {
        const uploadedUrls: string[] = [];
        for (const image of images) {
            const ext = image.uri.split('.').pop();
            const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

            const response = await fetch(image.uri);
            const blob = await response.blob();

            const { data, error } = await supabase.storage
                .from('act-photos')
                .upload(fileName, blob, { contentType: image.mimeType || `image/${ext}` });

            if (!error && data) {
                const { data: { publicUrl } } = supabase.storage.from('act-photos').getPublicUrl(fileName);
                uploadedUrls.push(publicUrl);
            }
        }
        return uploadedUrls;
    };

    const [errors, setErrors] = useState<string[]>([]);

    // --- VALIDATION ---
    const validateStep = (step: Step) => {
        const newErrors: string[] = [];
        if (step === 'identity') {
            if (!formData.name) newErrors.push('name');
            if (!formData.category_id) newErrors.push('category_id');
            if (!formData.artist_type) newErrors.push('artist_type');
        } else if (step === 'performance') {
            if (!formData.performance_type) newErrors.push('performance_type');
            if (!formData.genre) newErrors.push('genre');
        } else if (step === 'logistics') {
            if (!formData.location_base) newErrors.push('location_base');
            if (!formData.willing_to_travel) newErrors.push('willing_to_travel');
        } else if (step === 'media') {
            if (images.length === 0 && formData.photos_url.length === 0) newErrors.push('media');
        } else if (step === 'commercials') {
            if (!formData.description) newErrors.push('description');
        }

        setErrors(newErrors);
        return newErrors.length === 0;
    };

    const nextStep = (next: Step) => {
        if (validateStep(currentStep)) {
            setCurrentStep(next);
        } else {
            Alert.alert('Incomplete Form', 'Please fill in the required fields highlighted in red.');
        }
    };

    const handleSubmit = async () => {
        if (!validateStep('commercials')) {
            return Alert.alert('Incomplete Form', 'Please provide a description for your act.');
        }
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No authenticated user.');

            // Success feedback
            console.log('Submitting profile for user:', user.id);

            const photoUrls = await uploadImages(user.id);

            const { error } = await supabase.from('acts').upsert({
                owner_id: user.id,
                name: formData.name,
                category_id: formData.category_id,
                description: formData.description,

                // Expanded Fields
                artist_type: formData.artist_type,
                gender: formData.gender,
                performance_type: formData.performance_type,
                genre: formData.genre,
                location_base: formData.location_base,
                willing_to_travel: formData.willing_to_travel === 'Yes, Worldwide' || formData.willing_to_travel === 'Yes, UAE Only',
                travel_departure_city: formData.travel_departure_city,
                min_duration: formData.min_duration,
                max_duration: formData.max_duration,
                set_count: parseInt(formData.set_count) || 1,
                setup_time: formData.setup_time,
                members_count: parseInt(formData.members_count) || 1,

                // Media & Specs
                photos_url: photoUrls.length > 0 ? photoUrls : formData.photos_url,
                image_url: photoUrls[0] || formData.photos_url[0] || null,
                video_url: formData.video_url,
                price_guide: formData.price_range,
                technical_specs: formData.technical_specs,
                is_published: false,
            }, { onConflict: 'owner_id' });

            if (error) throw error;

            // Also ensure profile role is set to artist
            await supabase.from('profiles').update({ role: 'artist' }).eq('id', user.id);

            setCurrentStep('success');
        } catch (e: any) {
            Alert.alert('Submission Error', e.message);
        } finally {
            setLoading(false);
        }
    };

    // --- RENDER HELPERS ---

    const DropdownInput = ({ label, value, items, field }: { label: string, value: string, items: string[], field: keyof typeof formData }) => {
        const hasError = errors.includes(field);
        return (
            <View style={{ marginBottom: 20 }}>
                <Text style={[styles.label, hasError && { color: COLORS.error }]}>{label}</Text>
                <Pressable
                    style={[styles.dropdownBox, hasError && { borderColor: COLORS.error, borderWidth: 1.5 }]}
                    onPress={() => openDropdown(label, items, field)}
                >
                    <Text style={[styles.dropdownText, !value && { color: COLORS.textDim }]}>
                        {value || 'Select...'}
                    </Text>
                    <ChevronDown size={20} color={hasError ? COLORS.error : COLORS.textDim} />
                </Pressable>
            </View>
        );
    };

    const StepHeader = ({ title, icon: Icon }: { title: string, icon: any }) => (
        <View style={styles.stepHeader}>
            <View style={styles.iconBox}>
                <Icon size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.stepTitle}>{title}</Text>
        </View>
    );

    // --- STEPS RENDERERS ---

    const renderIdentity = () => (
        <ScrollView contentContainerStyle={styles.scrollStep}>
            <StepHeader title="Identity & Type" icon={Users} />

            <Text style={[styles.label, errors.includes('name') && { color: COLORS.error }]}>Act Name</Text>
            <TextInput
                style={[styles.input, errors.includes('name') && { borderColor: COLORS.error, borderWidth: 1.5 }]}
                value={formData.name}
                onChangeText={t => {
                    setFormData({ ...formData, name: t });
                    if (errors.includes('name')) setErrors(errors.filter(e => e !== 'name'));
                }}
                placeholder="e.g. Luna Fire Trio"
                placeholderTextColor={COLORS.textDim}
            />

            <DropdownInput
                label="Category"
                value={categories.find(c => c.id === formData.category_id)?.name || ''}
                items={categories.map(c => c.name)}
                field="category_id"
            />
            <DropdownInput label="Artist Type" value={formData.artist_type} items={LISTS.artistTypes} field="artist_type" />
            <DropdownInput label="Gender" value={formData.gender} items={LISTS.genders} field="gender" />

            <Pressable style={styles.button} onPress={() => nextStep('performance')}>
                <Text style={styles.buttonText}>Next: Performance</Text>
            </Pressable>
        </ScrollView>
    );

    const renderPerformance = () => (
        <ScrollView contentContainerStyle={styles.scrollStep}>
            <StepHeader title="Performance Details" icon={Music} />

            <DropdownInput label="Performance Style" value={formData.performance_type} items={LISTS.performanceTypes} field="performance_type" />
            <DropdownInput label="Primary Genre" value={formData.genre} items={LISTS.genres} field="genre" />

            {/* ... other fields remains the same ... */}

            <View style={styles.buttonRow}>
                <Pressable style={styles.backButton} onPress={() => setCurrentStep('identity')}>
                    <ChevronLeft size={24} color={COLORS.text} />
                </Pressable>
                <Pressable style={[styles.button, styles.buttonFlex]} onPress={() => nextStep('logistics')}>
                    <Text style={styles.buttonText}>Next: Logistics</Text>
                </Pressable>
            </View>
        </ScrollView>
    );

    const renderLogistics = () => (
        <ScrollView contentContainerStyle={styles.scrollStep}>
            <StepHeader title="Logistics & Location" icon={MapPin} />

            <DropdownInput label="Based In" value={formData.location_base} items={LISTS.locations} field="location_base" />
            <DropdownInput label="Willing to Travel?" value={formData.willing_to_travel} items={LISTS.travelOptions} field="willing_to_travel" />
            <DropdownInput label="Setup Time Required" value={formData.setup_time} items={LISTS.setupTimes} field="setup_time" />

            <View style={styles.buttonRow}>
                <Pressable style={styles.backButton} onPress={() => setCurrentStep('performance')}>
                    <ChevronLeft size={24} color={COLORS.text} />
                </Pressable>
                <Pressable style={[styles.button, styles.buttonFlex]} onPress={() => nextStep('media')}>
                    <Text style={styles.buttonText}>Next: Media</Text>
                </Pressable>
            </View>
        </ScrollView>
    );

    // Reusing previous logic for Media & Commercials but wrapped in new layout
    const renderMedia = () => (
        <ScrollView contentContainerStyle={styles.scrollStep}>
            <StepHeader title="Photos & Video" icon={Camera} />

            <Text style={[styles.subtitle, errors.includes('media') && { color: COLORS.error, fontWeight: 'bold' }]}>
                {errors.includes('media') ? 'At least one photo is required' : 'Upload high-res photos. First photo will be your cover.'}
            </Text>
            <View style={[styles.photoGrid, errors.includes('media') && { borderColor: COLORS.error, borderWidth: 1, borderRadius: 8, padding: 10 }]}>
                {images.map((img, i) => (
                    <View key={i} style={styles.photoContainer}>
                        <Image source={{ uri: img.uri }} style={styles.photoThumbnail} />
                        <Pressable style={styles.removePhoto} onPress={() => {
                            const u = [...images]; u.splice(i, 1); setImages(u);
                        }}>
                            <X size={12} color="#FFF" />
                        </Pressable>
                    </View>
                ))}
                <Pressable style={styles.addPhoto} onPress={pickImage}>
                    <Camera size={24} color={COLORS.primary} />
                    <Text style={styles.addPhotoText}>+ Add</Text>
                </Pressable>
            </View>

            <Text style={styles.label}>YouTube / Vimeo Link</Text>
            <TextInput
                style={styles.input}
                value={formData.video_url}
                onChangeText={t => setFormData({ ...formData, video_url: t })}
                placeholder="https://youtu.be/..."
                placeholderTextColor={COLORS.textDim}
            />

            <View style={styles.buttonRow}>
                <Pressable style={styles.backButton} onPress={() => setCurrentStep('logistics')}>
                    <ChevronLeft size={24} color={COLORS.text} />
                </Pressable>
                <Pressable style={[styles.button, styles.buttonFlex]} onPress={() => nextStep('commercials')}>
                    <Text style={styles.buttonText}>Next: Finalize</Text>
                </Pressable>
            </View>
        </ScrollView>
    );

    const renderCommercials = () => (
        <ScrollView contentContainerStyle={styles.scrollStep}>
            <StepHeader title="Commercials & Specs" icon={Check} />

            <Text style={styles.label}>Price Range</Text>
            <TextInput
                style={styles.input}
                value={formData.price_range}
                onChangeText={t => setFormData({ ...formData, price_range: t })}
                placeholder="e.g. 2500 - 3500 AED"
                placeholderTextColor={COLORS.textDim}
            />

            <Text style={[styles.label, errors.includes('description') && { color: COLORS.error }]}>Description / Bio</Text>
            <TextInput
                style={[styles.input, styles.textArea, errors.includes('description') && { borderColor: COLORS.error, borderWidth: 1.5 }]}
                value={formData.description}
                onChangeText={t => {
                    setFormData({ ...formData, description: t });
                    if (errors.includes('description')) setErrors(errors.filter(e => e !== 'description'));
                }}
                multiline
                placeholder="Short paragraph about the act..."
                placeholderTextColor={COLORS.textDim}
            />

            <Text style={styles.label}>Technical Rider / Specs</Text>
            <TextInput
                style={[styles.input, styles.textAreaLarge]}
                value={formData.technical_specs}
                onChangeText={t => setFormData({ ...formData, technical_specs: t })}
                multiline
                placeholder="- List connectivity requirements&#10;- Stage size&#10;- Sound needs"
                placeholderTextColor={COLORS.textDim}
            />

            <View style={styles.buttonRow}>
                <Pressable style={styles.backButton} onPress={() => setCurrentStep('media')}>
                    <ChevronLeft size={24} color={COLORS.text} />
                </Pressable>
                <Pressable style={[styles.button, styles.buttonFlex]} onPress={handleSubmit}>
                    {loading ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.buttonText}>Submit Profile</Text>}
                </Pressable>
            </View>
        </ScrollView>
    );

    // --- MAIN RENDER ---

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: COLORS.text, letterSpacing: 1 }}>
                        PERFORMANCE LAB
                    </Text>
                    {currentStep !== 'invite' && currentStep !== 'success' && currentStep !== 'auth' && (
                        <Text style={styles.stepIndicator}>
                            Step {['identity', 'performance', 'logistics', 'media', 'commercials'].indexOf(currentStep) + 1}/5
                        </Text>
                    )}
                </View>

                {/* Steps */}
                {currentStep === 'invite' && (
                    <View style={styles.centerContainer}>
                        <Text style={styles.title}>Artist Portal</Text>
                        <Text style={styles.subtitle}>Enter Invitation Code</Text>
                        <TextInput
                            style={styles.input}
                            value={inviteCode}
                            onChangeText={setInviteCode}
                            placeholder="CODE"
                            placeholderTextColor={COLORS.textDim}
                            autoCapitalize="characters"
                        />
                        <Pressable style={styles.button} onPress={handleInviteSubmit}><Text style={styles.buttonText}>Enter</Text></Pressable>
                    </View>
                )}

                {currentStep === 'auth' && (
                    <View style={styles.centerContainer}>
                        <Text style={styles.title}>{authMode === 'signup' ? 'Create Account' : 'Welcome Back'}</Text>
                        <Text style={styles.subtitle}>{authMode === 'signup' ? 'Start your artist journey' : 'Log in to manage your profile'}</Text>

                        {/* Auth Mode Toggle */}
                        <View style={styles.authToggle}>
                            <Pressable
                                style={[styles.toggleBtn, authMode === 'signup' && styles.toggleBtnActive]}
                                onPress={() => setAuthMode('signup')}
                            >
                                <Text style={[styles.toggleText, authMode === 'signup' && styles.toggleTextActive]}>Sign Up</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.toggleBtn, authMode === 'login' && styles.toggleBtnActive]}
                                onPress={() => setAuthMode('login')}
                            >
                                <Text style={[styles.toggleText, authMode === 'login' && styles.toggleTextActive]}>Log In</Text>
                            </Pressable>
                        </View>

                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="Email / Usuario"
                            keyboardType="email-address"
                            placeholderTextColor={COLORS.textDim}
                            autoCapitalize="none"
                        />
                        <TextInput
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Password"
                            secureTextEntry
                            placeholderTextColor={COLORS.textDim}
                        />
                        <Pressable style={styles.button} onPress={handleAuth}>
                            {loading ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.buttonText}>{authMode === 'login' ? 'Entrar' : 'Comenzar'}</Text>}
                        </Pressable>

                        <Pressable style={{ marginTop: 24, alignItems: 'center' }} onPress={() => setAuthMode(authMode === 'signup' ? 'login' : 'signup')}>
                            <Text style={{ color: COLORS.textDim }}>
                                {authMode === 'signup' ? "Already have an account? " : "Don't have an account? "}
                                <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>
                                    {authMode === 'signup' ? "Log In" : "Sign Up"}
                                </Text>
                            </Text>
                        </Pressable>
                    </View>
                )}

                {currentStep === 'identity' && renderIdentity()}
                {currentStep === 'performance' && renderPerformance()}
                {currentStep === 'logistics' && renderLogistics()}
                {currentStep === 'media' && renderMedia()}
                {currentStep === 'commercials' && renderCommercials()}

                {currentStep === 'success' && (
                    <View style={styles.centerContainer}>
                        <Check size={60} color={COLORS.primary} />
                        <Text style={[styles.title, { marginTop: 20 }]}>Profile Submitted</Text>
                        <Text style={styles.subtitle}>Your details are under review.</Text>
                        <Pressable style={[styles.button, { marginTop: 20 }]} onPress={() => router.push('/')}>
                            <Text style={styles.buttonText}>Return to Home</Text>
                        </Pressable>
                    </View>
                )}

                {/* Dropdown Modal */}
                <Modal visible={modalVisible} transparent animationType="fade">
                    <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>{modalTitle}</Text>
                            <ScrollView>
                                {modalTargetField === 'category_id' ? (
                                    categories.map(c => (
                                        <Pressable key={c.id} style={styles.modalItem} onPress={() => {
                                            setFormData({ ...formData, category_id: c.id });
                                            setModalVisible(false);
                                        }}>
                                            <Text style={[styles.modalItemText, formData.category_id === c.id && { color: COLORS.primary }]}>
                                                {c.name}
                                            </Text>
                                            {formData.category_id === c.id && <Check size={16} color={COLORS.primary} />}
                                        </Pressable>
                                    ))
                                ) : (
                                    modalItems.map(item => (
                                        <Pressable key={item} style={styles.modalItem} onPress={() => selectItem(item)}>
                                            <Text style={[styles.modalItemText, formData[modalTargetField!] === item && { color: COLORS.primary }]}>
                                                {item}
                                            </Text>
                                            {formData[modalTargetField!] === item && <Check size={16} color={COLORS.primary} />}
                                        </Pressable>
                                    ))
                                )}
                            </ScrollView>
                        </View>
                    </Pressable>
                </Modal>

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        padding: SPACING.m,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#222'
    },
    stepIndicator: { color: COLORS.primary, fontWeight: 'bold' },
    centerContainer: { flex: 1, justifyContent: 'center', padding: SPACING.l },
    scrollStep: { padding: SPACING.m, paddingBottom: 100 },

    stepHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.l },
    iconBox: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(204, 255, 0, 0.1)',
        justifyContent: 'center', alignItems: 'center', marginRight: 12
    },
    stepTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },

    label: { color: COLORS.textDim, marginBottom: 8, fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold' },
    input: {
        backgroundColor: '#1E1E1E', color: COLORS.text, padding: 16, borderRadius: 8,
        marginBottom: 20, fontSize: 16, borderWidth: 1, borderColor: '#333'
    },
    dropdownBox: {
        backgroundColor: '#1E1E1E', padding: 16, borderRadius: 8,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderWidth: 1, borderColor: '#333'
    },
    dropdownText: { fontSize: 16, color: COLORS.text },

    row: { flexDirection: 'row', marginBottom: 10 },

    button: {
        backgroundColor: COLORS.primary, padding: 16, borderRadius: 8,
        alignItems: 'center', minWidth: 120
    },
    buttonFlex: { flex: 1 },
    buttonText: { color: COLORS.background, fontWeight: 'bold', fontSize: 16 },
    buttonRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
    backButton: {
        backgroundColor: '#1E1E1E', padding: 16, borderRadius: 8, justifyContent: 'center'
    },

    title: { fontSize: 32, fontWeight: 'bold', color: COLORS.text, marginBottom: 10, textAlign: 'center' },
    subtitle: { fontSize: 16, color: COLORS.textDim, marginBottom: 30, textAlign: 'center' },

    textArea: { height: 100, textAlignVertical: 'top' },
    textAreaLarge: { height: 150, textAlignVertical: 'top' },

    authToggle: {
        flexDirection: 'row',
        backgroundColor: '#111',
        borderRadius: 8,
        padding: 4,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#222'
    },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
    toggleBtnActive: { backgroundColor: COLORS.primary },
    toggleText: { color: COLORS.textDim, fontWeight: 'bold' },
    toggleTextActive: { color: COLORS.background },

    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    photoContainer: { width: 100, height: 100, borderRadius: 8, overflow: 'hidden' },
    photoThumbnail: { width: '100%', height: '100%' },
    removePhoto: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', padding: 4, borderRadius: 10 },
    addPhoto: { width: 100, height: 100, borderRadius: 8, borderWidth: 2, borderColor: '#333', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
    addPhotoText: { color: COLORS.textDim, marginTop: 4, fontSize: 12 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#1E1E1E', borderRadius: 12, maxHeight: '60%', padding: 20 },
    modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
    modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#333', flexDirection: 'row', justifyContent: 'space-between' },
    modalItemText: { color: COLORS.textDim, fontSize: 16 }
});
