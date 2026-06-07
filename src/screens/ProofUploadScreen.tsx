import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '../theme';
import { ChefTip } from '../components/ChefTip';
import { StatusModal } from '../components/StatusModal';
import { Camera, CheckCircle, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator } from 'react-native';

export const ProofUploadScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { token } = useAuth();
  const { mealId } = (route.params as any) || {};

  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Modal State
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

  const handleSubmitProof = async () => {
    if (!image) return;
    if (!mealId) {
      setModalConfig({
        visible: true,
        type: 'error',
        title: 'Missing Context',
        message: 'No meal identification was provided. Please go back and try again.',
        onClose: () => setModalConfig(prev => ({ ...prev, visible: false })),
      });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      const uriParts = image.split('.');
      const fileType = uriParts[uriParts.length - 1];
      
      formData.append('batch_proof', {
        uri: image,
        name: `proof_${Date.now()}.${fileType}`,
        type: `image/${fileType}`,
      } as any);

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}meals/${mealId}/proof`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();
      
      if (response.ok && result.status === 'success') {
        setModalConfig({
          visible: true,
          type: 'success',
          title: 'Proof Uploaded!',
          message: 'Batch proof successfully submitted. Your slot is now ready.',
          onClose: () => {
            setModalConfig(prev => ({ ...prev, visible: false }));
            navigation.goBack();
          },
        });
      } else {
        throw new Error(result.message || 'Failed to upload proof');
      }
    } catch (error: any) {
      setModalConfig({
        visible: true,
        type: 'error',
        title: 'Upload Failed',
        message: error.message || 'Something went wrong while uploading proof.',
        onClose: () => setModalConfig(prev => ({ ...prev, visible: false })),
      });
    } finally {
      setLoading(false);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setModalConfig({
        visible: true,
        type: 'error',
        title: 'Permission Denied',
        message: 'We need camera permissions to capture batch proof images.',
        onClose: () => setModalConfig(prev => ({ ...prev, visible: false })),
      });
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusModal 
        visible={modalConfig.visible}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        onClose={modalConfig.onClose}
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Upload proof before pickup</Text>
          <Text style={styles.subtitle}>Required before "Ready for Pickup" status can be enabled for this batch.</Text>
        </View>

        {/* Camera Capture Area */}
        <TouchableOpacity style={styles.captureArea} onPress={takePhoto}>
          {image ? (
            <Image source={{ uri: image }} style={styles.previewImage} />
          ) : (
            <View style={styles.placeholder}>
              <View style={styles.cameraIcon}>
                <Camera size={32} color={Colors.primary} />
              </View>
              <Text style={styles.placeholderText}>Tap to capture batch</Text>
              <Text style={styles.subPlaceholderText}>Empty preview area</Text>
            </View>
          )}
        </TouchableOpacity>

        <ChefTip tip="Ensure all labels are visible and the packaging is sealed properly for a high rating." />

        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.submitBtn, (!image || loading) && styles.disabledBtn]}
            disabled={!image || loading}
            onPress={handleSubmitProof}
          >
            {loading ? (
              <ActivityIndicator color={Colors.background} size="small" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Submit Proof</Text>
                <CheckCircle size={20} color={Colors.background} style={styles.btnIcon} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelLink} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelLinkText}>CANCEL & RETURN</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    padding: Spacing.md,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h2,
    marginBottom: 8,
  },
  subtitle: {
    ...Typography.caption,
    lineHeight: 18,
  },
  captureArea: {
    height: 300,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  placeholder: {
    alignItems: 'center',
  },
  cameraIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  placeholderText: {
    ...Typography.body,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subPlaceholderText: {
    ...Typography.caption,
    fontSize: 10,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  actions: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: Spacing.md,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabledBtn: {
    opacity: 0.5,
    backgroundColor: Colors.textSecondary,
  },
  submitBtnText: {
    color: Colors.background,
    fontWeight: 'bold',
    fontSize: 16,
  },
  btnIcon: {
    marginLeft: 8,
  },
  cancelLink: {
    alignItems: 'center',
    padding: Spacing.sm,
  },
  cancelLinkText: {
    ...Typography.caption,
    fontWeight: 'bold',
    color: Colors.textSecondary,
  },
});
