
import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { Plus, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

export default function PhotoManagement() {
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [photos, setPhotos] = useState<string[]>([]);

    useEffect(() => {
        fetchPhotos();
    }, []);

    const fetchPhotos = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('acts')
                .select('photos_url')
                .eq('owner_id', user.id)
                .single();
            setPhotos(data?.photos_url || []);
        }
        setLoading(false);
    };

    const handleAddPhoto = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            setUploading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const newUrls: string[] = [];
                for (const asset of result.assets) {
                    const ext = asset.uri.split('.').pop();
                    const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
                    const response = await fetch(asset.uri);
                    const blob = await response.blob();

                    const { error } = await supabase.storage
                        .from('act-photos')
                        .upload(fileName, blob);

                    if (!error) {
                        const { data: { publicUrl } } = supabase.storage.from('act-photos').getPublicUrl(fileName);
                        newUrls.push(publicUrl);
                    }
                }

                const updatedPhotos = [...photos, ...newUrls];
                await supabase.from('acts').update({ photos_url: updatedPhotos }).eq('owner_id', user.id);
                setPhotos(updatedPhotos);
            } catch (e: any) {
                Alert.alert('Upload Error', e.message);
            } finally {
                setUploading(false);
            }
        }
    };

    const handleRemove = async (index: number) => {
        const updated = [...photos];
        updated.splice(index, 1);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('acts').update({ photos_url: updated }).eq('owner_id', user.id);
            setPhotos(updated);
        }
    };

    if (loading) return (
        <View style={styles.centered}>
            <ActivityIndicator color={COLORS.primary} />
        </View>
    );

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Photos</Text>
            <Text style={styles.subtitle}>Upload high-quality photos. The first one will be your cover image.</Text>

            <View style={styles.grid}>
                {photos.map((url, i) => (
                    <View key={i} style={styles.photoBox}>
                        <Image source={{ uri: url }} style={styles.image} />
                        <Pressable style={styles.removeBtn} onPress={() => handleRemove(i)}>
                            <X size={14} color="#FFF" />
                        </Pressable>
                        {i === 0 && <View style={styles.coverBadge}><Text style={styles.coverText}>COVER</Text></View>}
                    </View>
                ))}
                <Pressable style={styles.addBox} onPress={handleAddPhoto} disabled={uploading}>
                    {uploading ? (
                        <ActivityIndicator color={COLORS.primary} />
                    ) : (
                        <>
                            <Plus size={24} color={COLORS.primary} />
                            <Text style={styles.addText}>Add Photo</Text>
                        </>
                    )}
                </Pressable>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: SPACING.l },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
    subtitle: { fontSize: 14, color: COLORS.textDim, marginBottom: 24 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    photoBox: { width: 150, height: 150, borderRadius: 12, overflow: 'hidden', backgroundColor: '#222' },
    image: { width: '100%', height: '100%' },
    removeBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 12 },
    addBox: { width: 150, height: 150, borderRadius: 12, borderStyle: 'dashed', borderWidth: 2, borderColor: '#333', justifyContent: 'center', alignItems: 'center' },
    addText: { color: COLORS.textDim, fontSize: 12, marginTop: 4 },
    coverBadge: { position: 'absolute', bottom: 8, left: 8, backgroundColor: COLORS.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    coverText: { color: COLORS.background, fontSize: 10, fontWeight: 'bold' }
});
