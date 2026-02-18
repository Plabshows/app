import { COLORS } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function ModalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { actId, actTitle, ownerId } = params;

  const [clientName, setClientName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [date, setDate] = useState('');
  const [requirements, setRequirements] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!clientName || !whatsapp || !date) {
      alert('Por favor, completa los campos requeridos.');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('leads')
        .insert({
          act_id: actId,
          act_owner_id: ownerId,
          client_name: clientName,
          client_whatsapp: whatsapp,
          event_date: date,
          status: 'pending'
        });

      if (error) {
        console.error(error);
        alert('Error al enviar la solicitud: ' + error.message);
        setSubmitting(false);
        return;
      }

      setSubmitting(false);
      alert('¡Solicitud de disponibilidad enviada! Te contactaremos pronto.');
      router.back();
    } catch (err) {
      console.error(err);
      setSubmitting(false);
      alert('Ocurrió un error inesperado.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Consultar Disponibilidad</Text>
        <Text style={styles.actTitle}>{actTitle}</Text>
      </View>

      <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nombre Completo *</Text>
          <TextInput
            style={styles.input}
            placeholder="Tu nombre"
            placeholderTextColor="#666"
            value={clientName}
            onChangeText={setClientName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>WhatsApp / Teléfono *</Text>
          <TextInput
            style={styles.input}
            placeholder="+34 ..."
            placeholderTextColor="#666"
            keyboardType="phone-pad"
            value={whatsapp}
            onChangeText={setWhatsapp}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Fecha del Evento *</Text>
          <TextInput
            style={styles.input}
            placeholder="DD/MM/AAAA"
            placeholderTextColor="#666"
            value={date}
            onChangeText={setDate}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Detalles adicionales</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Tipo de evento, duración, etc."
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
            value={requirements}
            onChangeText={setRequirements}
          />
        </View>

        <Pressable
          style={[styles.submitButton, submitting && styles.disabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Enviando...' : 'Enviar Solicitud'}
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
