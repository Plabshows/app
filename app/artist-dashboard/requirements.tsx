import { COLORS, SPACING } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import * as DocumentPicker from 'expo-document-picker';
import { CheckCircle, FileText, X, Zap } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';

export default function RequirementsSection() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [specs, setSpecs] = useState('');
    const [riderUrl, setRiderUrl] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('acts').select('technical_specs, technical_rider_url').eq('owner_id', user.id).single();
                setSpecs(data?.technical_specs || '');
                setRiderUrl(data?.technical_rider_url || '');
            }
        } catch (error) {
            console.error('Error fetching requirements:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUploadRider = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            setUploading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const asset = result.assets[0];
            const fileName = `${user.id}/${Date.now()}_rider.pdf`;

            const response = await fetch(asset.uri);
            const blob = await response.blob();

            const { data, error } = await supabase.storage
                .from('technical-riders')
                .upload(fileName, blob, {
                    contentType: 'application/pdf',
                    upsert: true
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('technical-riders')
                .getPublicUrl(fileName);

            setRiderUrl(publicUrl);
            await supabase.from('acts').update({ technical_rider_url: publicUrl }).eq('owner_id', user.id);

            Alert.alert('Success', 'Technical rider uploaded successfully!');
        } catch (error: any) {
            Alert.alert('Upload Error', error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error } = await supabase.from('acts').update({
                    technical_specs: specs,
                    technical_rider_url: riderUrl
                }).eq('owner_id', user.id);

                if (error) throw error;
                Alert.alert('Success', 'Requirements updated');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <View style={styles.centered}>
            <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
    );

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.headerSpacer}>
                <Text style={styles.title}>Requirements & Riders</Text>
                <Text style={styles.subtitle}>Specify exactly what you need from the client to perform at your best.</Text>
            </View>

            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Zap size={24} color={COLORS.primary} />
                    <Text style={styles.cardHeaderText}>Technical Rider</Text>
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Performance Requirements (Text)</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={specs}
                        onChangeText={setSpecs}
                        multiline
                        placeholder="- Stage dimensions (e.g. 4m x 3m)&#10;- Power outlets required&#10;- Audio/PA system needs&#10;- Lighting requirements&#10;- Changing room / Catering"
                        placeholderTextColor={COLORS.textDim}
                    />
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Technical Rider (PDF)</Text>
                    {riderUrl ? (
                        <View style={styles.fileActive}>
                            <View style={styles.fileInfo}>
                                <CheckCircle size={20} color={COLORS.primary} />
                                <Text style={styles.fileName}>Rider uploaded</Text>
                            </View>
                            <View style={styles.fileActions}>
                                <Pressable style={styles.viewBtn} onPress={() => Linking.openURL(riderUrl)}>
                                    <Text style={styles.actionText}>View PDF</Text>
                                </Pressable>
                                <Pressable style={styles.removeBtn} onPress={() => setRiderUrl('')}>
                                    <X size={16} color="#FF5252" />
                                </Pressable>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.uploadBox}>
                            <FileText size={32} color={COLORS.textDim} />
                            <Text style={styles.uploadText}>Upload your technical rider or hospitality PDF.</Text>
                            <Pressable
                                style={[styles.uploadButton, uploading && { opacity: 0.5 }]}
                                onPress={handleUploadRider}
                                disabled={uploading}
                            >
                                {uploading ? (
                                    <ActivityIndicator size="small" color={COLORS.text} />
                                ) : (
                                    <Text style={styles.uploadButtonText}>Select PDF</Text>
                                )}
                            </Pressable>
                        </View>
                    )}
                </View>

                <Pressable style={styles.saveButton} onPress={handleSave}>
                    {saving ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.saveButtonText}>Save Requirements</Text>}
                </Pressable>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: SPACING.l },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    headerSpacer: { marginBottom: 32 },
    title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
    subtitle: { fontSize: 16, color: COLORS.textDim },
    card: { backgroundColor: '#1A1A1A', padding: 24, borderRadius: 20, borderWidth: 1, borderColor: '#333' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
    cardHeaderText: { fontSize: 18, color: COLORS.text, fontWeight: 'bold' },
    field: { marginBottom: 24 },
    label: { color: COLORS.textDim, marginBottom: 12, fontSize: 13, textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: 0.5 },
    input: { backgroundColor: '#000', color: COLORS.text, padding: 16, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#333' },
    textArea: { height: 180, textAlignVertical: 'top' },
    uploadBox: {
        backgroundColor: '#000',
        padding: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#333',
        borderStyle: 'dashed',
        alignItems: 'center',
        gap: 16
    },
    uploadText: { color: COLORS.textDim, fontSize: 14, textAlign: 'center', lineHeight: 20 },
    uploadButton: { backgroundColor: '#222', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
    uploadButtonText: { color: COLORS.text, fontWeight: 'bold', fontSize: 15 },
    fileActive: {
        backgroundColor: '#000',
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.primary + '44'
    },
    fileInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    fileName: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
    fileActions: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    viewBtn: { backgroundColor: COLORS.primary + '15', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    actionText: { color: COLORS.primary, fontSize: 14, fontWeight: 'bold' },
    removeBtn: { padding: 4 },
    saveButton: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 8 },
    saveButtonText: { color: COLORS.background, fontWeight: 'bold', fontSize: 16 }
});
