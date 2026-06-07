import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Spacing, Typography } from '../theme';
import { useAuth } from '../context/AuthContext';
import { StatusModal } from '../components/StatusModal';
import { ChefTip } from '../components/ChefTip';
import * as ImagePicker from 'expo-image-picker';
import { Camera, CheckCircle, Scale, Image as ImageIcon } from 'lucide-react-native';

export const FuelWeighInScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { token } = useAuth();
  const { fulfillmentId } = (route.params as any) ?? {};

  const [image, setImage] = useState<string | null>(null);
  const [grams, setGrams] = useState('');
  const [loading, setLoading] = useState(false);

  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
    onClose: () => void;
  }>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
    onClose: () => {},
  });

  const closeModal = () => setModalConfig(prev => ({ ...prev, visible: false }));

  // ── Camera / Gallery ────────────────────────────────────────────────────────

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setModalConfig({
        visible: true,
        type: 'error',
        title: 'Permission Denied',
        message: 'Camera permission is required to capture weigh-in proof.',
        onClose: closeModal,
      });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setModalConfig({
        visible: true,
        type: 'error',
        title: 'Permission Denied',
        message: 'Gallery permission is required to select a photo.',
        onClose: closeModal,
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!image || !grams || !fulfillmentId) return;

    const gramsNum = parseInt(grams, 10);
    if (isNaN(gramsNum) || gramsNum <= 0) {
      setModalConfig({
        visible: true,
        type: 'error',
        title: 'Invalid Weight',
        message: 'Please enter a valid weight in grams.',
        onClose: closeModal,
      });
      return;
    }

    setLoading(true);
    try {
      const uriParts = image.split('.');
      const ext = uriParts[uriParts.length - 1];

      const formData = new FormData();
      formData.append('batch_proof', {
        uri: image,
        name: `weigh_in_${Date.now()}.${ext}`,
        type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      } as any);
      formData.append('weight_verification_grams', String(gramsNum));

      const url = `${process.env.EXPO_PUBLIC_API_URL}fuel/fulfillments/${fulfillmentId}/weigh-in`;
      console.log('API Request: POST', url, { grams: gramsNum });

      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const result = await response.json();
      console.log('Weigh-in response:', JSON.stringify(result, null, 2));

      if ((response.ok && result.status === 'success') || response.ok) {
        setModalConfig({
          visible: true,
          type: 'success',
          title: 'Weigh-In Complete!',
          message: `${gramsNum}g submitted. Meal is now marked as Ready for Pickup.`,
          onClose: () => {
            closeModal();
            navigation.goBack();
          },
        });
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (err: any) {
      setModalConfig({
        visible: true,
        type: 'error',
        title: 'Upload Failed',
        message: err.message || 'Something went wrong. Please try again.',
        onClose: closeModal,
      });
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !!image && !!grams && parseInt(grams, 10) > 0 && !loading;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusModal
        visible={modalConfig.visible}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        onClose={modalConfig.onClose}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Instruction header */}
          <View style={styles.infoHeader}>
            <View style={styles.infoIconWrap}>
              <Scale size={24} color={Colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Weigh-In Proof</Text>
              <Text style={styles.infoSubtitle}>
                Place the meal on a scale, frame both together, and enter the weight.
              </Text>
            </View>
          </View>

          {/* Camera capture area */}
          <TouchableOpacity
            style={styles.captureArea}
            onPress={takePhoto}
            activeOpacity={0.8}
          >
            {image ? (
              <Image source={{ uri: image }} style={styles.previewImage} />
            ) : (
              <View style={styles.placeholder}>
                <View style={styles.cameraIconWrap}>
                  <Camera size={32} color={Colors.primary} />
                </View>
                <Text style={styles.placeholderTitle}>Tap to capture</Text>
                <Text style={styles.placeholderSub}>Frame the food on a weighing scale</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Gallery option */}
          <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery}>
            <ImageIcon size={14} color={Colors.textSecondary} />
            <Text style={styles.galleryBtnText}>Choose from Gallery instead</Text>
          </TouchableOpacity>

          {/* Weight input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Weight (grams)</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={grams}
                onChangeText={setGrams}
                keyboardType="number-pad"
                placeholder="e.g. 450"
                placeholderTextColor={Colors.textSecondary}
                maxLength={5}
              />
              <View style={styles.inputSuffix}>
                <Text style={styles.inputSuffixText}>g</Text>
              </View>
            </View>
          </View>

          <ChefTip tip="Ensure the weighing scale display is clearly visible in the photo for verification." />

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.background} size="small" />
            ) : (
              <>
                <CheckCircle size={20} color={Colors.background} />
                <Text style={styles.submitBtnText}>Submit & Mark Ready</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelLink} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelLinkText}>CANCEL & RETURN</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: Spacing.md, paddingBottom: 40 },

  // Info header
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: Spacing.lg,
  },
  infoIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(250, 204, 21, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: { ...Typography.h3, marginBottom: 4 },
  infoSubtitle: { ...Typography.caption, lineHeight: 18 },

  // Capture area
  captureArea: {
    height: 280,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  previewImage: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center' },
  cameraIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  placeholderTitle: { ...Typography.body, fontWeight: 'bold', marginBottom: 4 },
  placeholderSub: { ...Typography.caption },

  galleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  galleryBtnText: { ...Typography.caption, fontWeight: '600' },

  // Weight input
  inputSection: { marginBottom: Spacing.lg },
  inputLabel: { ...Typography.body, fontWeight: '600', marginBottom: Spacing.sm },
  inputWrap: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    ...Typography.h3,
    fontSize: 20,
  },
  inputSuffix: {
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
    backgroundColor: Colors.background,
  },
  inputSuffixText: { ...Typography.body, color: Colors.textSecondary, fontWeight: 'bold' },

  // Submit
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 28,
    height: 56,
    marginBottom: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnDisabled: {
    backgroundColor: Colors.textSecondary,
    shadowColor: 'transparent',
    elevation: 0,
  },
  submitBtnText: { color: Colors.background, fontWeight: 'bold', fontSize: 16 },

  cancelLink: { alignItems: 'center', paddingVertical: Spacing.sm },
  cancelLinkText: { ...Typography.caption, fontWeight: 'bold', color: Colors.textSecondary },
});
