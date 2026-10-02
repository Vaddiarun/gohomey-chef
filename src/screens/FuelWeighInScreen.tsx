import React, { useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Scale } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { C, F } from '../theme';
import { FadeInView, FormField, OnboardingLayout, PrimaryButton, UploadTile } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { usePhotoPicker } from '../hooks/usePhotoPicker';
import { friendlyApiError } from '../utils/apiErrors';

/** Fuel weigh-in proof: photo + weight (POST fuel/fulfillments/:id/weigh-in). */
export const FuelWeighInScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { token } = useAuth();
  const { fulfillmentId, itemName } = (route.params as any) ?? {};
  const [grams, setGrams] = useState('');
  const [loading, setLoading] = useState(false);
  const { file, openPicker, sheet } = usePhotoPicker({ title: 'Weigh-in photo', subtitle: 'Show the meal on the scale with the reading visible' });

  const gramsNum = parseInt(grams, 10);
  const canSubmit = !!file && gramsNum > 0 && !!fulfillmentId;

  const handleSubmit = async () => {
    if (!file || !fulfillmentId) return;
    if (isNaN(gramsNum) || gramsNum <= 0) {
      Toast.show({ type: 'error', text1: 'Invalid weight', text2: 'Enter the weight in grams.' });
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('batch_proof', { uri: file.uri, name: file.name, type: file.type } as any);
      formData.append('weight_verification_grams', String(gramsNum));

      const url = `${process.env.EXPO_PUBLIC_API_URL}fuel/fulfillments/${fulfillmentId}/weigh-in`;
      console.log('API Request: POST', url, { grams: gramsNum });
      const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
      const result = await response.json().catch(() => ({}));
      console.log('Weigh-in response:', JSON.stringify(result, null, 2));
      if (response.ok) {
        Toast.show({ type: 'success', text1: 'Weigh-in complete', text2: `${gramsNum}g submitted — marked Ready for Pickup.` });
        navigation.goBack();
      } else {
        const friendly = friendlyApiError(response.status, result, 'Could not submit the weigh-in.');
        Toast.show({ type: 'error', text1: 'Upload failed', text2: friendly.message });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Network error', text2: 'Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <OnboardingLayout
        title="Weigh-In Proof"
        onBack={() => navigation.goBack()}
        footer={<PrimaryButton label="Submit Weigh-In" onPress={handleSubmit} loading={loading} disabled={!canSubmit} />}
      >
        <FadeInView style={styles.head}>
          <View style={styles.iconBox}>
            <Scale size={20} color={C.primary} strokeWidth={1.67} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.title}>{itemName || 'Fuel meal'}</Text>
            <Text style={styles.sub}>Weigh the packed meal and photograph it on the scale.</Text>
          </View>
        </FadeInView>
        <FadeInView delay={80}>
          <UploadTile tone="cream" file={file} onPress={openPicker} />
        </FadeInView>
        <FadeInView delay={140}>
          <FormField
            label="Weight (grams)"
            value={grams}
            onChangeText={(v) => setGrams(v.replace(/\D/g, ''))}
            keyboardType="number-pad"
            placeholder="e.g. 450"
            right={<Text style={styles.unit}>g</Text>}
          />
        </FadeInView>
      </OnboardingLayout>
      {sheet}
    </>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 4 },
  iconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.softOrange, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: F.jakartaBold, fontSize: 18, lineHeight: 27, color: C.textStrong },
  sub: { fontFamily: F.jakartaRegular, fontSize: 12, lineHeight: 18, color: C.textMuted },
  unit: { fontFamily: F.jakartaBold, fontSize: 13, color: C.textMuted },
});
