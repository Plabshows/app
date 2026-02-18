import { COLORS } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function ModalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { actId, actTitle } = params;

  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [duration, setDuration] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!date || !location) return; // Basic validation

    setSubmitting(true);

    try {
      // Insert into Supabase
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert('You must be logged in to request a quote');
        setSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('bookings')
        .insert({
          act_id: actId,
          client_id: user.id,
          event_date: date,
          location: location,
          duration: duration,
          status: 'pending'
        });

      if (error) {
        console.error(error);
        alert('Error sending request: ' + error.message);
        setSubmitting(false);
        return;
      }

      setSubmitting(false);
      router.back();
      alert('Quote Request Sent!');
    } catch (err) {
      console.error(err);
      setSubmitting(false);
      alert('An unexpected error occurred.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Request Quote</Text>
        <Text style={styles.actTitle}>{actTitle}</Text>
      </View>

      <ScrollView style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Event Date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#666"
            value={date}
            onChangeText={setDate}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            placeholder="Dubai, UAE"
            placeholderTextColor="#666"
            value={location}
            onChangeText={setLocation}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Duration/Requirements</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g. 2 hours, roaming set"
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
            value={duration}
            onChangeText={setDuration}
          />
        </View>

        <Pressable
          style={[styles.submitButton, submitting && styles.disabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Sending...' : 'Send Request'}
          </Text>
        </Pressable>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
  },
  header: {
    marginBottom: 30,
    marginTop: Platform.OS === 'ios' ? 0 : 20,
  },
  headerTitle: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  actTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: COLORS.textDim,
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  disabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: COLORS.background,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
