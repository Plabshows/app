import { COLORS } from '@/src/constants/theme';
import { supabase } from '@/src/lib/supabase';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder';
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

function CheckoutForm({ clientSecret, onSuccess, onError }: { clientSecret: string, onSuccess: () => void, onError: (err: any) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/booking-success',
      },
      redirect: 'if_required'
    });

    if (error) {
      setIsProcessing(false);
      onError(error);
    } else {
      setIsProcessing(false);
      onSuccess();
    }
  };

  return (
    <View style={styles.checkoutBox}>
      {/* 
         @ts-ignore 
         PaymentElement is a React DOM component, we render it safely within the web app context 
       */}
      <PaymentElement />

      <Pressable
        style={[styles.submitButton, isProcessing && styles.disabled]}
        onPress={handlePay}
        disabled={isProcessing || !stripe || !elements}
      >
        <Text style={styles.submitButtonText}>
          {isProcessing ? 'Processing...' : 'Confirm Payment'}
        </Text>
      </Pressable>
    </View>
  );
}

export default function ModalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { actId, actTitle, ownerId, packageSelected, finalPrice } = params;

  // Form State
  const [clientName, setClientName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [date, setDate] = useState('');
  const [requirements, setRequirements] = useState('');

  // Checkout State
  const [submitting, setSubmitting] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const handleInitializeCheckout = async () => {
    if (!clientName || !whatsapp || !date) {
      alert('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Save Lead / Booking Intent to Supabase first
      const { data: leadData, error: dbError } = await supabase
        .from('leads')
        .insert({
          act_id: actId,
          act_owner_id: ownerId,
          client_name: clientName,
          client_whatsapp: whatsapp,
          event_date: date,
          requirements: requirements || `Package: ${packageSelected} | Price: ${finalPrice} AED`,
          status: 'checkout_pending'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 2. Ask Edge Function to create Stripe PaymentIntent
      const { data: stripeData, error: funcError } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          amount: parseInt(finalPrice as string, 10),
          currency: 'aed',
          destination_account: null, // We will route this correctly in the Edge Function later
          description: `Booking: ${packageSelected} - ${actTitle}`,
          leadId: leadData?.id
        }
      });

      console.log('--- STRIPE RESPONSE ---', stripeData, funcError);

      if (funcError) {
        throw new Error(funcError.message || 'Supabase Edge Function failed');
      }
      if (stripeData?.error) {
        throw new Error(stripeData.error);
      }
      if (!stripeData?.clientSecret) {
        throw new Error('No clientSecret returned from Supabase Edge Function');
      }

      setClientSecret(stripeData.clientSecret);
      setSubmitting(false);

    } catch (err: any) {
      console.error(err);
      setSubmitting(false);
      alert(err.message || 'An unexpected error occurred during checkout setup.');
    }
  };

  const onSuccess = async () => {
    router.push('/booking-success');
  };

  const onError = (error: any) => {
    console.error(error);
    router.push('/booking-cancel');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Secure Checkout</Text>
        <Text style={styles.actTitle}>{actTitle}</Text>
        <Text style={styles.packageDetail}>{packageSelected} • {finalPrice} AED</Text>
      </View>

      {!clientSecret ? (
        <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="John Doe"
              placeholderTextColor="#666"
              value={clientName}
              onChangeText={setClientName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>WhatsApp / Phone *</Text>
            <TextInput
              style={styles.input}
              placeholder="+971 ..."
              placeholderTextColor="#666"
              keyboardType="phone-pad"
              value={whatsapp}
              onChangeText={setWhatsapp}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Event Date *</Text>
            <TextInput
              style={styles.input}
              placeholder="DD/MM/YYYY"
              placeholderTextColor="#666"
              value={date}
              onChangeText={setDate}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Event Details (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Venue, timings, etc."
              placeholderTextColor="#666"
              multiline
              numberOfLines={4}
              value={requirements}
              onChangeText={setRequirements}
            />
          </View>

          <Pressable
            style={[styles.submitButton, submitting && styles.disabled]}
            onPress={handleInitializeCheckout}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.submitButtonText}>Proceed to Pay {finalPrice} AED</Text>
            )}
          </Pressable>
        </ScrollView>
      ) : (
        <ScrollView style={styles.form}>
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
            <CheckoutForm clientSecret={clientSecret} onSuccess={onSuccess} onError={onError} />
          </Elements>
          <Pressable onPress={() => setClientSecret(null)} style={{ marginTop: 20, alignItems: 'center' }}>
            <Text style={{ color: COLORS.textDim }}>← Back to Details</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
  },
  checkoutBox: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
  packageDetail: {
    color: COLORS.textDim,
    fontSize: 16,
    marginTop: 4
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
    borderColor: 'rgba(255,255,255,0.1)',
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
    justifyContent: 'center',
    marginTop: 20,
  },
  disabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 16,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 8
  }
});
