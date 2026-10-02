import React, { useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CircleCheck, ShieldCheck } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { C, F } from '../theme';
import { FadeInView, OnboardingLayout, PrimaryButton, UploadTile } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { usePhotoPicker } from '../hooks/usePhotoPicker';
import { friendlyApiError } from '../utils/apiErrors';

/** Batch proof photo for a daily meal (POST meals/:id/proof). */
export const ProofUploadScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { token } = useAuth();
  const { mealId } = (route.params as any) || {};
  const [loading, setLoading] = useState(false);
  const { file, openPicker, sheet } = usePhotoPicker({ title: 'Batch proof', subtitle: 'Photograph the finished batch, clearly lit' });

  const handleSubmitProof = async () => {
    if (!file) return;
    if (!mealId) {
      Toast.show({ type: 'error', text1: 'Missing meal', text2: 'Please go back and open the meal again.' });
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('batch_proof', { uri: file.uri, name: file.name, type: file.type } as any);

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}meals/${mealId}/proof`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.status === 'success') {
        Toast.show({ type: 'success', text1: 'Proof uploaded', text2: 'Your slot is now ready.' });
        navigation.goBack();
      } else {
        const friendly = friendlyApiError(response.status, result, 'Could not upload the proof.');
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
        title="Batch Proof"
        onBack={() => navigation.goBack()}
        footer={<PrimaryButton label="Submit Proof" onPress={handleSubmitProof} loading={loading} disabled={!file} />}
      >
        <FadeInView style={styles.head}>
          <Text style={styles.title}>Capture Batch Proof</Text>
          <Text style={styles.sub}>A photo of the cooked batch confirms your slot is ready for customers.</Text>
        </FadeInView>
        <FadeInView delay={80}>
          <UploadTile tone="cream" file={file} onPress={openPicker} />
        </FadeInView>
        <FadeInView delay={140} style={styles.tips}>
          {['Show the full batch in frame', 'Use daylight or bright kitchen light', 'Keep the photo sharp — hold steady'].map((t) => (
            <View key={t} style={styles.tip}>
              <CircleCheck size={16} color={C.successDeep} strokeWidth={1.67} />
              <Text style={styles.tipText}>{t}</Text>
            </View>
          ))}
        </FadeInView>
        <FadeInView delay={200} style={styles.note}>
          <ShieldCheck size={16} color={C.primaryRing} strokeWidth={1.67} />
          <Text style={styles.noteText}>Proof photos are only used for quality checks.</Text>
        </FadeInView>
      </OnboardingLayout>
      {sheet}
    </>
  );
};

const styles = StyleSheet.create({
  head: { gap: 4, marginTop: 8 },
  title: { fontFamily: F.jakartaBold, fontSize: 24, lineHeight: 36, color: C.textStrong },
  sub: { fontFamily: F.jakartaRegular, fontSize: 12, lineHeight: 18, color: C.textMuted },
  tips: { backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 16, gap: 10, marginTop: 8 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tipText: { fontFamily: F.jakartaSemiBold, fontSize: 12, color: C.textStrong },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.softOrange, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 4 },
  noteText: { flex: 1, fontFamily: F.jakartaSemiBold, fontSize: 11, color: C.primary },
});
