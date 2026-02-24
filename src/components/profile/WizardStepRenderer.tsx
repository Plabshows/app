import * as ImagePicker from 'expo-image-picker';
import {
    Camera,
    CreditCard,
    HelpCircle,
    Package,
    Play,
    Plus,
    Trophy,
    User,
    X
} from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

interface StepProps {
    data: any;
    updateData: (updates: any) => void;
    onNext: () => void;
    onBack?: () => void;
}

// ... StepProps interface ...

export const PersonalStep = ({ data, updateData, onNext }: StepProps) => (
    <ScrollView contentContainerStyle={styles.stepContainer}>
        <Text style={styles.stepTitle}>Personal Details</Text>
        <Text style={styles.stepSubtitle}>Basic info for your profile.</Text>

        <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
                style={styles.input}
                value={data.full_name}
                onChangeText={(text) => updateData({ full_name: text })}
                placeholder="Manager or Artist Name"
                placeholderTextColor={COLORS.textDim}
            />
        </View>

        <View style={styles.field}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
                style={styles.input}
                value={data.email}
                onChangeText={(text) => updateData({ email: text })}
                placeholder="email@example.com"
                placeholderTextColor={COLORS.textDim}
                keyboardType="email-address"
            />
        </View>

        <View style={styles.row}>
            <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>City</Text>
                <TextInput
                    style={styles.input}
                    value={data.city}
                    onChangeText={(text) => updateData({ city: text })}
                    placeholder="Dubai"
                    placeholderTextColor={COLORS.textDim}
                />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Country</Text>
                <TextInput
                    style={styles.input}
                    value={data.country}
                    onChangeText={(text) => updateData({ country: text })}
                    placeholder="UAE"
                    placeholderTextColor={COLORS.textDim}
                />
            </View>
        </View>

        <Pressable style={styles.nextButton} onPress={onNext}>
            <Text style={styles.nextButtonText}>Next: Artist Info</Text>
        </Pressable>
    </ScrollView>
);

export const ArtistInfoStep = ({ data, updateData, onNext }: StepProps) => (
    <ScrollView contentContainerStyle={styles.stepContainer}>
        <Text style={styles.stepTitle}>Artist Information</Text>
        <Text style={styles.stepSubtitle}>Tell us about your professional act.</Text>

        <View style={styles.field}>
            <Text style={styles.label}>Stage / Act Name</Text>
            <TextInput
                style={styles.input}
                value={data.act_name}
                onChangeText={(text) => updateData({ act_name: text })}
                placeholder="e.g. Neon Fire Duo"
                placeholderTextColor={COLORS.textDim}
            />
        </View>

        <View style={styles.field}>
            <Text style={styles.label}>Biography</Text>
            <TextInput
                style={[styles.input, styles.textArea]}
                value={data.bio}
                onChangeText={(text) => updateData({ bio: text })}
                multiline
                numberOfLines={4}
                placeholder="Describe your act and style..."
                placeholderTextColor={COLORS.textDim}
            />
        </View>

        <Pressable style={styles.nextButton} onPress={onNext}>
            <Text style={styles.nextButtonText}>Next: Photos</Text>
        </Pressable>
    </ScrollView>
);

export const PlaceholderStep = ({ title, nextTitle, onNext }: any) => (
    <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepSubtitle}>Implementation for this section is in progress.</Text>
        <Pressable style={styles.nextButton} onPress={onNext}>
            <Text style={styles.nextButtonText}>Next: {nextTitle}</Text>
        </Pressable>
    </View>
);

export const PhotoStep = ({ data, updateData, onNext }: StepProps) => {
    const { user } = useAuth();
    const photos = data.photos_url || [];
    const [uploading, setUploading] = useState(false);
    const [previews, setPreviews] = useState<string[]>([]);

    const handleAddPhoto = async () => {
        if (!user) return Alert.alert('Error', 'No user session found');

        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: false,
                quality: 0.8,
            });

            if (result.canceled || !result.assets || result.assets.length === 0) return;

            const asset = result.assets[0];

            // Generate local preview immediately for web
            if (Platform.OS === 'web' && asset.uri) {
                // If it's already a blob/data URI we can use it, 
                // but ImagePicker on web sometimes gives a local URI or blob
                setPreviews(prev => [...prev, asset.uri]);
            }

            setUploading(true);

            // Create unique filename
            const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(7);
            const fileName = `${user.id}/${randomId}-${timestamp}.${ext}`;

            // Fetch file blob (necessary for Supabase upload on many platforms)
            const response = await fetch(asset.uri);
            const blob = await response.blob();

            // Upload to Supabase
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('media')
                .upload(fileName, blob, {
                    contentType: asset.mimeType || `image/${ext}`,
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('media')
                .getPublicUrl(fileName);

            // Add cache buster
            const finalUrl = `${publicUrl}?t=${Date.now()}`;

            // Update main form data
            updateData({ photos_url: [...photos, finalUrl] });

            // Clear local preview if desired (optional, as main state update will trigger re-render)
            setPreviews(prev => prev.filter(p => p !== asset.uri));

        } catch (error: any) {
            console.error('Upload error:', error);
            Alert.alert('Upload Failed', error.message || 'Could not upload image');
        } finally {
            setUploading(false);
        }
    };

    const removePhoto = (index: number) => {
        const updated = [...photos];
        updated.splice(index, 1);
        updateData({ photos_url: updated });
    };

    return (
        <ScrollView contentContainerStyle={styles.stepContainer}>
            <Text style={styles.stepTitle}>Profile Photos</Text>
            <Text style={styles.stepSubtitle}>High-quality images attract 3x more bookings.</Text>

            <View style={styles.mediaGrid}>
                {photos.map((url: string, i: number) => (
                    <View key={i} style={styles.photoWrapper}>
                        <Image source={{ uri: url }} style={styles.mediaImage} />
                        <Pressable style={styles.removeIcon} onPress={() => removePhoto(i)}>
                            <X size={14} color="#FFF" />
                        </Pressable>
                        {i === 0 && <View style={styles.coverTag}><Text style={styles.coverTagText}>COVER</Text></View>}
                    </View>
                ))}

                {/* Show local previews that are currently uploading */}
                {previews.map((url: string, i: number) => (
                    <View key={`preview-${i}`} style={[styles.photoWrapper, { opacity: 0.6 }]}>
                        <Image source={{ uri: url }} style={styles.mediaImage} />
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator color={COLORS.primary} size="small" />
                        </View>
                    </View>
                ))}

                <Pressable
                    style={[styles.mediaSlot, uploading && { opacity: 0.5 }]}
                    onPress={handleAddPhoto}
                    disabled={uploading}
                >
                    {uploading ? (
                        <ActivityIndicator color={COLORS.primary} size="large" />
                    ) : (
                        <>
                            <Camera size={32} color={COLORS.primary} />
                            <Text style={styles.mediaSlotText}>Add Photo</Text>
                        </>
                    )}
                </Pressable>
            </View>

            <Pressable style={styles.nextButton} onPress={onNext} disabled={uploading}>
                <Text style={styles.nextButtonText}>Next: Videos</Text>
            </Pressable>
        </ScrollView>
    );
};

// --- YouTube Helper Functions ---
const getYouTubeID = (url: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

const getYouTubeEmbedUrl = (url: string): string | null => {
    const id = getYouTubeID(url);
    return id ? `https://www.youtube.com/embed/${id}` : null;
};

const getYouTubeThumbnail = (url: string): string | null => {
    const id = getYouTubeID(url);
    return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
};

export const VideoStep = ({ data, updateData, onNext }: StepProps) => {
    const videos = data.videos_url || [];
    const [newUrl, setNewUrl] = React.useState('');

    const isValidYouTube = getYouTubeID(newUrl) !== null;

    const addVideo = () => {
        if (!newUrl.trim()) return;
        // Store the original URL — the public page will convert to embed format
        updateData({ videos_url: [...videos, newUrl.trim()] });
        setNewUrl('');
    };

    const removeVideo = (index: number) => {
        const updated = [...videos];
        updated.splice(index, 1);
        updateData({ videos_url: updated });
    };

    return (
        <ScrollView contentContainerStyle={styles.stepContainer}>
            <Text style={styles.stepTitle}>Showreel & Videos</Text>
            <Text style={styles.stepSubtitle}>Add YouTube links to showcase your talent. Paste any YouTube URL — we'll handle the rest.</Text>

            <View style={styles.field}>
                <Text style={styles.label}>Paste Video Link</Text>
                <View style={[styles.row, { gap: 10 }]}>
                    <TextInput
                        style={[styles.input, { flex: 1 }, isValidYouTube && { borderColor: '#4CAF50', borderWidth: 1 }]}
                        value={newUrl}
                        onChangeText={setNewUrl}
                        placeholder="https://youtube.com/watch?v=..."
                        placeholderTextColor={COLORS.textDim}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    <Pressable
                        style={[styles.miniAddBtn, !newUrl.trim() && { opacity: 0.4 }]}
                        onPress={addVideo}
                        disabled={!newUrl.trim()}
                    >
                        <Plus size={24} color={COLORS.background} />
                    </Pressable>
                </View>
                {newUrl.length > 0 && !isValidYouTube && (
                    <Text style={{ color: '#FF5252', fontSize: 12, marginTop: 4 }}>
                        ⚠ Paste a valid YouTube link (youtube.com/watch?v=... or youtu.be/...)
                    </Text>
                )}
                {isValidYouTube && (
                    <Text style={{ color: '#4CAF50', fontSize: 12, marginTop: 4 }}>
                        ✓ Valid YouTube link detected
                    </Text>
                )}
            </View>

            {videos.length > 0 && (
                <Text style={[styles.label, { marginBottom: 10 }]}>
                    {videos.length} Video{videos.length > 1 ? 's' : ''} Added
                </Text>
            )}

            <View style={styles.list}>
                {videos.map((url: string, i: number) => {
                    const thumb = getYouTubeThumbnail(url);
                    return (
                        <View key={i} style={[styles.videoItem, { flexDirection: 'column', alignItems: 'stretch', padding: 0, overflow: 'hidden' }]}>
                            {thumb ? (
                                <Image
                                    source={{ uri: thumb }}
                                    style={{ width: '100%', height: 120, borderTopLeftRadius: 10, borderTopRightRadius: 10 }}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={{ height: 60, backgroundColor: '#1A1A1A', borderTopLeftRadius: 10, borderTopRightRadius: 10, justifyContent: 'center', alignItems: 'center' }}>
                                    <Play size={24} color={COLORS.primary} />
                                </View>
                            )}
                            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8 }}>
                                <Play size={16} color={COLORS.primary} />
                                <Text style={[styles.videoUrlText, { flex: 1 }]} numberOfLines={1}>{url}</Text>
                                <Pressable
                                    onPress={() => removeVideo(i)}
                                    style={{ padding: 6, backgroundColor: 'rgba(255,82,82,0.15)', borderRadius: 8 }}
                                >
                                    <X size={18} color="#FF5252" />
                                </Pressable>
                            </View>
                        </View>
                    );
                })}
            </View>

            <Pressable style={styles.nextButton} onPress={onNext}>
                <Text style={styles.nextButtonText}>Next: Experience</Text>
            </Pressable>
        </ScrollView>
    );
};

export const ExperienceStep = ({ data, updateData, onNext }: StepProps) => (
    <ScrollView contentContainerStyle={styles.stepContainer}>
        <Text style={styles.stepTitle}>Professional Bio</Text>
        <Text style={styles.stepSubtitle}>Highlight your career achievements.</Text>

        <View style={styles.field}>
            <Text style={styles.label}>Years of Experience</Text>
            <TextInput
                style={styles.input}
                value={data.experience_years?.toString()}
                onChangeText={(text) => updateData({ experience_years: parseInt(text) || 0 })}
                keyboardType="numeric"
                placeholder="e.g. 5"
                placeholderTextColor={COLORS.textDim}
            />
        </View>

        <View style={styles.field}>
            <Text style={styles.label}>Notable Venues / Clients</Text>
            <TextInput
                style={[styles.input, styles.textArea]}
                value={data.notable_venues}
                onChangeText={(text) => updateData({ notable_venues: text })}
                multiline
                placeholder="e.g. Burj Al Arab, Armani Hotel..."
                placeholderTextColor={COLORS.textDim}
            />
        </View>

        <Pressable style={styles.nextButton} onPress={onNext}>
            <Text style={styles.nextButtonText}>Next: Requirements</Text>
        </Pressable>
    </ScrollView>
);

export const RequirementsStep = ({ data, updateData, onNext }: StepProps) => (
    <ScrollView contentContainerStyle={styles.stepContainer}>
        <Text style={styles.stepTitle}>Technical Rider</Text>
        <Text style={styles.stepSubtitle}>What do you need from the client?</Text>

        <View style={styles.field}>
            <Text style={styles.label}>Sound & Lighting</Text>
            <TextInput
                style={[styles.input, styles.textArea]}
                value={data.technical_specs}
                onChangeText={(text) => updateData({ technical_specs: text })}
                multiline
                placeholder="e.g. 2x Wireless mics, Stage monitor..."
                placeholderTextColor={COLORS.textDim}
            />
        </View>

        <View style={styles.field}>
            <Text style={styles.label}>Technical Rider URL (PDF)</Text>
            <TextInput
                style={styles.input}
                value={data.technical_rider_url}
                onChangeText={(text) => updateData({ technical_rider_url: text })}
                placeholder="https://storage.google.com/..."
                placeholderTextColor={COLORS.textDim}
            />
        </View>

        <Pressable style={styles.nextButton} onPress={onNext}>
            <Text style={styles.nextButtonText}>Next: Awards</Text>
        </Pressable>
    </ScrollView>
);

// Add style definitions for new elements
export const AwardsStep = ({ data, updateData, onNext }: StepProps) => {
    const awards = data.awards || [];

    const addAward = () => {
        const newAward = { title: 'New Award', year: new Date().getFullYear().toString(), organization: '' };
        updateData({ awards: [...awards, newAward] });
    };

    const updateAward = (index: number, field: string, value: string) => {
        const updated = [...awards];
        updated[index] = { ...updated[index], [field]: value };
        updateData({ awards: updated });
    };

    const removeAward = (index: number) => {
        const updated = [...awards];
        updated.splice(index, 1);
        updateData({ awards: updated });
    };

    return (
        <ScrollView contentContainerStyle={styles.stepContainer}>
            <Text style={styles.stepTitle}>Awards & Press</Text>
            <Text style={styles.stepSubtitle}>Build trust with your career highlights.</Text>

            {awards.map((award: any, i: number) => (
                <View key={i} style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Trophy size={18} color={COLORS.primary} />
                        <TextInput
                            style={[styles.cardTitleInput, { flex: 1 }]}
                            value={award.title}
                            onChangeText={(t) => updateAward(i, 'title', t)}
                            placeholder="Award Title"
                        />
                        <Pressable onPress={() => removeAward(i)}>
                            <X size={18} color={COLORS.error} />
                        </Pressable>
                    </View>
                    <View style={styles.row}>
                        <TextInput
                            style={[styles.input, { flex: 0.3, marginRight: 8 }]}
                            value={award.year}
                            onChangeText={(t) => updateAward(i, 'year', t)}
                            placeholder="Year"
                            keyboardType="numeric"
                        />
                        <TextInput
                            style={[styles.input, { flex: 0.7 }]}
                            value={award.organization}
                            onChangeText={(t) => updateAward(i, 'organization', t)}
                            placeholder="Organization / Press"
                        />
                    </View>
                </View>
            ))}

            <Pressable style={styles.addItemBtn} onPress={addAward}>
                <Plus size={18} color={COLORS.primary} />
                <Text style={styles.addItemBtnText}>Add Award / Recognition</Text>
            </Pressable>

            <Pressable style={styles.nextButton} onPress={onNext}>
                <Text style={styles.nextButtonText}>Next: Group Members</Text>
            </Pressable>
        </ScrollView>
    );
};

export const MembersStep = ({ data, updateData, onNext }: StepProps) => {
    const members = data.members || [];

    const addMember = () => {
        updateData({ members: [...members, { name: 'New Member', role: '' }] });
    };

    const updateMember = (index: number, field: string, value: string) => {
        const updated = [...members];
        updated[index] = { ...updated[index], [field]: value };
        updateData({ members: updated });
    };

    const removeMember = (index: number) => {
        const updated = [...members];
        updated.splice(index, 1);
        updateData({ members: updated });
    };

    return (
        <ScrollView contentContainerStyle={styles.stepContainer}>
            <Text style={styles.stepTitle}>Group Members</Text>
            <Text style={styles.stepSubtitle}>List the people in your act (for groups/bands).</Text>

            {members.map((member: any, i: number) => (
                <View key={i} style={styles.memberCard}>
                    <User size={24} color={COLORS.textDim} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <TextInput
                            style={styles.memberName}
                            value={member.name}
                            onChangeText={(t) => updateMember(i, 'name', t)}
                            placeholder="Member Name"
                        />
                        <TextInput
                            style={styles.memberRole}
                            value={member.role}
                            onChangeText={(t) => updateMember(i, 'role', t)}
                            placeholder="Role / Instrument"
                        />
                    </View>
                    <Pressable onPress={() => removeMember(i)}>
                        <X size={20} color={COLORS.error} />
                    </Pressable>
                </View>
            ))}

            <Pressable style={styles.addItemBtn} onPress={addMember}>
                <Plus size={18} color={COLORS.primary} />
                <Text style={styles.addItemBtnText}>Add Group Member</Text>
            </Pressable>

            <Pressable style={styles.nextButton} onPress={onNext}>
                <Text style={styles.nextButtonText}>Next: FAQ</Text>
            </Pressable>
        </ScrollView>
    );
};

export const FAQStep = ({ data, updateData, onNext }: StepProps) => {
    const faqs = data.faq || [];

    const addFaq = () => {
        updateData({ faq: [...faqs, { question: '', answer: '' }] });
    };

    const updateFaq = (index: number, field: string, value: string) => {
        const updated = [...faqs];
        updated[index] = { ...updated[index], [field]: value };
        updateData({ faq: updated });
    };

    const removeFaq = (index: number) => {
        const updated = [...faqs];
        updated.splice(index, 1);
        updateData({ faq: updated });
    };

    return (
        <ScrollView contentContainerStyle={styles.stepContainer}>
            <Text style={styles.stepTitle}>Personal FAQ</Text>
            <Text style={styles.stepSubtitle}>Answer common questions from clients.</Text>

            {faqs.map((f: any, i: number) => (
                <View key={i} style={styles.card}>
                    <View style={styles.cardHeader}>
                        <HelpCircle size={18} color={COLORS.primary} />
                        <TextInput
                            style={[styles.cardTitleInput, { flex: 1 }]}
                            value={f.question}
                            onChangeText={(t) => updateFaq(i, 'question', t)}
                            placeholder="Question"
                        />
                        <Pressable onPress={() => removeFaq(i)}>
                            <X size={18} color={COLORS.error} />
                        </Pressable>
                    </View>
                    <TextInput
                        style={[styles.input, styles.textArea, { height: 80 }]}
                        value={f.answer}
                        onChangeText={(t) => updateFaq(i, 'answer', t)}
                        multiline
                        placeholder="Answer..."
                    />
                </View>
            ))}

            <Pressable style={styles.addItemBtn} onPress={addFaq}>
                <Plus size={18} color={COLORS.primary} />
                <Text style={styles.addItemBtnText}>Add New FAQ Item</Text>
            </Pressable>

            <Pressable style={styles.nextButton} onPress={onNext}>
                <Text style={styles.nextButtonText}>Next: Packages</Text>
            </Pressable>
        </ScrollView>
    );
};

export const PackagesStep = ({ data, updateData, onNext }: StepProps) => {
    const packages = data.packages || [];

    const addPackage = () => {
        const newPkg = { name: 'New Package', price: '0', duration: '1 hour', description: '' };
        updateData({ packages: [...packages, newPkg] });
    };

    const updatePkg = (index: number, field: string, value: string) => {
        const updated = [...packages];
        updated[index] = { ...updated[index], [field]: value };
        updateData({ packages: updated });
    };

    const removePkg = (index: number) => {
        const updated = [...packages];
        updated.splice(index, 1);
        updateData({ packages: updated });
    };

    return (
        <ScrollView contentContainerStyle={styles.stepContainer}>
            <Text style={styles.stepTitle}>Show Packages</Text>
            <Text style={styles.stepSubtitle}>Create standard offerings for quick bookings.</Text>

            {packages.map((pkg: any, i: number) => (
                <View key={i} style={styles.packageCard}>
                    <View style={styles.packageHeader}>
                        <Package size={20} color={COLORS.primary} />
                        <TextInput
                            style={styles.packageTitle}
                            value={pkg.name}
                            onChangeText={(t) => updatePkg(i, 'name', t)}
                            placeholder="Package Name"
                        />
                        <Pressable onPress={() => removePkg(i)}>
                            <X size={20} color={COLORS.error} />
                        </Pressable>
                    </View>
                    <View style={styles.row}>
                        <TextInput
                            style={[styles.input, { flex: 1, marginRight: 8 }]}
                            value={pkg.price}
                            onChangeText={(t) => updatePkg(i, 'price', t)}
                            placeholder="Price (AED)"
                            keyboardType="numeric"
                        />
                        <TextInput
                            style={[styles.input, { flex: 1 }]}
                            value={pkg.duration}
                            onChangeText={(t) => updatePkg(i, 'duration', t)}
                            placeholder="Duration"
                        />
                    </View>
                    <TextInput
                        style={[styles.input, styles.textArea, { height: 60, marginTop: 8 }]}
                        value={pkg.description}
                        onChangeText={(t) => updatePkg(i, 'description', t)}
                        multiline
                        placeholder="Package details..."
                    />
                </View>
            ))}

            <Pressable style={styles.addItemBtn} onPress={addPackage}>
                <Plus size={18} color={COLORS.primary} />
                <Text style={styles.addItemBtnText}>Create New Package</Text>
            </Pressable>

            <Pressable style={styles.nextButton} onPress={onNext}>
                <Text style={styles.nextButtonText}>Next: Gig Settings</Text>
            </Pressable>
        </ScrollView>
    );
};

export const GigSettingsStep = ({ data, updateData, onNext }: StepProps) => (
    <ScrollView contentContainerStyle={styles.stepContainer}>
        <Text style={styles.stepTitle}>Gig Settings</Text>
        <Text style={styles.stepSubtitle}>Preferences for your bookings.</Text>

        <View style={styles.field}>
            <Text style={styles.label}>Travel Range (km from city)</Text>
            <TextInput
                style={styles.input}
                value={data.travel_range?.toString()}
                onChangeText={(t) => updateData({ travel_range: parseInt(t) || 0 })}
                keyboardType="numeric"
                placeholder="e.g. 50"
                placeholderTextColor={COLORS.textDim}
            />
        </View>

        <View style={styles.row}>
            <View style={{ flex: 1 }}>
                <Text style={styles.label}>Accept Instant Bookings?</Text>
                <Text style={{ color: COLORS.textDim, fontSize: 12 }}>Allow clients to book without manual approval.</Text>
            </View>
            <Pressable
                style={[styles.toggle, data.instant_booking && styles.toggleActive]}
                onPress={() => updateData({ instant_booking: !data.instant_booking })}
            >
                <View style={[styles.toggleCircle, data.instant_booking && styles.toggleCircleActive]} />
            </Pressable>
        </View>

        <Pressable style={styles.nextButton} onPress={onNext}>
            <Text style={styles.nextButtonText}>Next: Payments</Text>
        </Pressable>
    </ScrollView>
);

export const PaymentsStep = ({ data, updateData, onNext }: StepProps) => (
    <ScrollView contentContainerStyle={styles.stepContainer}>
        <Text style={styles.stepTitle}>Payment Details</Text>
        <Text style={styles.stepSubtitle}>How you want to get paid.</Text>

        <View style={styles.field}>
            <Text style={styles.label}>Bank Name</Text>
            <TextInput
                style={styles.input}
                value={data.payment_bank_name}
                onChangeText={(t) => updateData({ payment_bank_name: t })}
                placeholder="e.g. Emirates NBD"
                placeholderTextColor={COLORS.textDim}
            />
        </View>

        <View style={styles.field}>
            <Text style={styles.label}>IBAN</Text>
            <TextInput
                style={styles.input}
                value={data.payment_iban}
                onChangeText={(t) => updateData({ payment_iban: t })}
                placeholder="AE00 0000..."
                placeholderTextColor={COLORS.textDim}
            />
        </View>

        <View style={styles.infoBox}>
            <CreditCard size={20} color={COLORS.primary} />
            <Text style={styles.infoBoxText}>We use Stripe for secure payments. You can also link your Stripe account later.</Text>
        </View>

        <Pressable style={styles.nextButton} onPress={onNext}>
            <Text style={styles.nextButtonText}>Finish Wizard</Text>
        </Pressable>
    </ScrollView>
);

const styles = StyleSheet.create({
    stepContainer: {
        padding: SPACING.m,
        flexGrow: 1,
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
        marginBottom: SPACING.xl,
    },
    field: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.primary,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    input: {
        backgroundColor: '#111',
        borderWidth: 1,
        borderColor: '#222',
        borderRadius: 12,
        padding: 16,
        color: COLORS.text,
        fontSize: 16,
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    mediaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    mediaSlot: {
        width: '100%',
        height: 180,
        backgroundColor: '#111',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#222',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mediaSlotText: {
        color: COLORS.textDim,
        marginTop: 12,
        fontWeight: '600',
    },
    mediaSlotSmall: {
        width: '30%',
        height: 100,
        backgroundColor: '#111',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#222',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addItemBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 24,
    },
    addItemBtnText: {
        color: COLORS.primary,
        fontWeight: '700',
    },
    miniAddBtn: {
        backgroundColor: COLORS.primary,
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoWrapper: {
        width: '30%',
        height: 100,
        position: 'relative',
    },
    mediaImage: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
    removeIcon: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: COLORS.error,
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    coverTag: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.primary,
        paddingVertical: 2,
        alignItems: 'center',
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
    },
    coverTagText: {
        color: COLORS.background,
        fontSize: 10,
        fontWeight: '900',
    },
    list: {
        marginBottom: 20,
    },
    videoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        gap: 12,
    },
    videoUrlText: {
        flex: 1,
        color: COLORS.text,
        fontSize: 14,
    },
    card: {
        backgroundColor: '#111',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#222',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 10,
    },
    cardTitleInput: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '700',
    },
    memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#222',
    },
    memberName: { color: COLORS.text, fontWeight: '700', fontSize: 16, marginBottom: 2 },
    memberRole: { color: COLORS.textDim, fontSize: 13 },
    packageCard: {
        backgroundColor: '#111',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#222',
    },
    packageHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
    packageTitle: { flex: 1, color: COLORS.text, fontWeight: '800', fontSize: 16 },
    packagePrice: { color: COLORS.primary, fontWeight: '900' },
    packageDesc: { color: COLORS.textDim, fontSize: 14 },
    toggle: {
        width: 56,
        height: 32,
        backgroundColor: '#222',
        borderRadius: 16,
        padding: 4,
    },
    toggleActive: {
        backgroundColor: COLORS.primary + '40',
        borderColor: COLORS.primary,
        borderWidth: 1,
    },
    toggleCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.textDim,
    },
    toggleCircleActive: {
        backgroundColor: COLORS.primary,
        transform: [{ translateX: 24 }],
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#111',
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
        gap: 12,
        marginBottom: 24,
    },
    infoBoxText: { color: COLORS.textDim, fontSize: 13, flex: 1 },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    nextButton: {
        backgroundColor: COLORS.primary,
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: SPACING.xl,
        marginBottom: 40,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    nextButtonText: {
        color: COLORS.background,
        fontSize: 18,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
});
