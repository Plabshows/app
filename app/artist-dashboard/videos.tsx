
import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { Globe, Save, Video } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';

export default function VideoManagement() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [videoUrl, setVideoUrl] = useState('');

    useEffect(() => {
        fetchVideo();
    }, []);

    const fetchVideo = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('acts').select('video_url').eq('owner_id', user.id).single();
            setVideoUrl(data?.video_url || '');
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { error } = await supabase
                .from('acts')
                .upsert({
                    owner_id: user.id,
                    video_url: videoUrl
                }, { onConflict: 'owner_id' });

            if (error) Alert.alert('Error', error.message);
            else Alert.alert('Success', 'Video updated');
        }
        setSaving(false);
    };

    if (loading) return (
        <View style={styles.centered}>
            <ActivityIndicator color={COLORS.primary} />
        </View>
    );

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Videos</Text>
            <Text style={styles.subtitle}>Add links to your best performances on YouTube or Vimeo.</Text>

            <View style={styles.card}>
                <View style={[styles.iconBox, { marginBottom: 20 }]}>
                    <Video size={40} color={COLORS.primary} />
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Featured Video Link</Text>
                    <View style={styles.inputWrapper}>
                        <Globe size={18} color={COLORS.textDim} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={videoUrl}
                            onChangeText={setVideoUrl}
                            placeholder="https://www.youtube.com/watch?v=..."
                            placeholderTextColor={COLORS.textDim}
                        />
                    </View>
                </View>

                <Pressable style={styles.button} onPress={handleSave}>
                    {saving ? <ActivityIndicator color={COLORS.background} /> : (
                        <>
                            <Save size={20} color={COLORS.background} style={{ marginRight: 8 }} />
                            <Text style={styles.buttonText}>Save Video</Text>
                        </>
                    )}
                </Pressable>

                <View style={styles.tips}>
                    <Text style={styles.tipsTitle}>Tips for better visibility:</Text>
                    <Text style={styles.tip}>• High-resolution (1080p+) is preferred.</Text>
                    <Text style={styles.tip}>• Promotional showreels (1-3 mins) work best.</Text>
                    <Text style={styles.tip}>• Ensure the video is public or unlisted (not private).</Text>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: SPACING.l },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
    subtitle: { fontSize: 14, color: COLORS.textDim, marginBottom: 24 },
    card: { backgroundColor: '#1A1A1A', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#222' },
    iconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(204, 255, 0, 0.05)', justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },
    field: { marginBottom: 24 },
    label: { color: COLORS.textDim, marginBottom: 8, fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold' },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#222', borderRadius: 8, borderWidth: 1, borderColor: '#333' },
    inputIcon: { marginLeft: 16 },
    input: { flex: 1, color: COLORS.text, padding: 16, fontSize: 16 },
    button: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
    buttonText: { color: COLORS.background, fontWeight: 'bold', fontSize: 16 },
    tips: { marginTop: 32, padding: 16, backgroundColor: '#111', borderRadius: 8 },
    tipsTitle: { color: COLORS.text, fontWeight: 'bold', marginBottom: 8, fontSize: 14 },
    tip: { color: COLORS.textDim, fontSize: 13, marginBottom: 4 }
});
