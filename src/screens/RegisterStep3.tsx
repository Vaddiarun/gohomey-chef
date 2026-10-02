import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Modal,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Camera, CircleCheck, FileText, Image as ImageIcon, RefreshCw, X } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { C, F, Radius, Shadows, T } from '../theme';
import {
  ActionSheet,
  FadeInView,
  OnboardingLayout,
  PressableScale,
  PrimaryButton,
  StatusBadge,
  UploadTile,
} from '../components/ui';
import type { SheetOption } from '../components/ui';
import { friendlyApiError } from '../utils/apiErrors';
import { REG_PROGRESS } from './registration/shared';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { refreshSession, readAuthPayload } from '../services/api';
import { compressImage, byteSize, canCompressImages } from '../utils/compressImage';

type FileAsset = {
  uri: string;
  name: string;
  type: string;
};

const STEP_3_UPLOAD_TIMEOUT_MS = 120000;
// api.gohomeyy.store answers 413 above ~1 MB per request (all three files together).
const MAX_UPLOAD_BYTES = 950 * 1024;
const MAX_PDF_BYTES = 400 * 1024;
// Per-file cap so three documents always fit under MAX_UPLOAD_BYTES.
const MAX_FILE_BYTES = 320 * 1024;

const rejectOversized = (bytes: number) => {
  if (bytes <= MAX_FILE_BYTES) return false;
  Toast.show({
    type: 'error',
    text1: 'Photo too large',
    text2: `This image is ${(bytes / 1024 / 1024).toFixed(1)} MB. Please use "Take Photo" or choose a smaller image.`,
  });
  return true;
};

const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = STEP_3_UPLOAD_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

/** Best-effort byte size of a local file:// uri (used only for logging / a warning). */
const getUriSize = async (uri: string): Promise<number> => {
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    return blob.size;
  } catch {
    return 0;
  }
};

const shellQuote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;

const buildStep3Curl = (
  url: string,
  token: string | undefined,
  files: {
    govId: FileAsset;
    safetyCert: FileAsset;
    kitchenPhoto: FileAsset;
  }
) => [
  'curl -X POST',
  shellQuote(url),
  "-H 'Accept: application/json'",
  token ? `-H ${shellQuote(`Authorization: Bearer ${token}`)}` : '',
  `-F ${shellQuote(`government_id=@${files.govId.uri};filename=${files.govId.name};type=${files.govId.type}`)}`,
  `-F ${shellQuote(`food_safety_cert=@${files.safetyCert.uri};filename=${files.safetyCert.name};type=${files.safetyCert.type}`)}`,
  `-F ${shellQuote(`kitchen_photo=@${files.kitchenPhoto.uri};filename=${files.kitchenPhoto.name};type=${files.kitchenPhoto.type}`)}`,
].filter(Boolean).join(' \\\n  ');

const logStep3Curl = (
  url: string,
  token: string | undefined,
  files: {
    govId: FileAsset;
    safetyCert: FileAsset;
    kitchenPhoto: FileAsset;
  }
) => {
  const curl = buildStep3Curl(url, token, files);
  console.log('========== STEP 3 CURL START ==========');
  curl.split('\n').forEach((line) => console.log(line));
  console.log('========== STEP 3 CURL END ==========');
};

export const RegisterStep3 = ({ navigation, route }: any) => {
  const { login } = useAuth();
  const [govId, setGovId] = useState<FileAsset | null>(null);
  const [safetyCert, setSafetyCert] = useState<FileAsset | null>(null);
  const [kitchenPhoto, setKitchenPhoto] = useState<FileAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState<'documents' | 'review'>('documents');
  const [sheet, setSheetContent] = useState<{ title: string; subtitle: string; options: SheetOption[] } | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const setSheet = (content: { title: string; subtitle: string; options: SheetOption[] }) => {
    setSheetContent(content);
    setSheetVisible(true);
  };

  // Hardware back on the checklist returns to the uploads page.
  useEffect(() => {
    if (page !== 'review') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setPage('documents');
      return true;
    });
    return () => sub.remove();
  }, [page]);

  // Pending image state for preview
  const [pendingFile, setPendingFile] = useState<FileAsset | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [activeSlot, setActiveSlot] = useState<'govId' | 'safetyCert' | 'kitchenPhoto' | null>(null);

  const email = route?.params?.email;
  const jwtToken = route?.params?.token || route?.params?.jwt || route?.params?.accessToken;

  const setFileForSlot = (slot: 'govId' | 'safetyCert' | 'kitchenPhoto', file: FileAsset) => {
    if (slot === 'govId') setGovId(file);
    else if (slot === 'safetyCert') setSafetyCert(file);
    else setKitchenPhoto(file);
  };

  const pickDocument = async (setFile: (f: FileAsset) => void) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const mime = asset.mimeType || 'application/octet-stream';
        if (mime.startsWith('image/')) {
          const compressed = await compressImage(asset.uri);
          if (rejectOversized(await byteSize(compressed.uri))) return;
          setFile(compressed);
          return;
        }
        if ((asset.size ?? 0) > MAX_PDF_BYTES) {
          Toast.show({
            type: 'error',
            text1: 'File too large',
            text2: 'Please choose a PDF under 400 KB, or take a photo of the document instead.',
          });
          return;
        }
        setFile({
          uri: asset.uri,
          name: asset.name || 'document',
          type: mime
        });
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const uploadImage = async (setter: (f: FileAsset) => void, slot: 'govId' | 'safetyCert' | 'kitchenPhoto', useCamera: boolean = false) => {
    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'Camera permission is required to take photos.' });
          return;
        }
      }

      // The picker's `quality` only re-encodes JPEGs; every photo is shrunk
      // below with compressImage so the step-3 body stays under the proxy's
      // limit (HTTP 413). allowsEditing also lets the chef frame the document.
      const result = await (useCamera
        ? ImagePicker.launchCameraAsync({
            quality: canCompressImages() ? 0.7 : 0.3,
            allowsEditing: true,
          })
        : ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: canCompressImages() ? 0.7 : 0.3,
            allowsEditing: true,
          })
      );
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const compressed = await compressImage(asset.uri, asset.width);
        const bytes = await byteSize(compressed.uri);
        console.log('Picked image size (KB):', Math.round(bytes / 1024));
        if (rejectOversized(bytes)) return;

        const newFile = {
          uri: compressed.uri,
          name: compressed.name,
          type: compressed.type,
        };

        setFileForSlot(slot, newFile);
        setPendingFile(newFile);
        setActiveSlot(slot);
        setPreviewVisible(true);
      }
    } catch (err) {
      console.warn(err);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to pick image' });
    }
  };

  const handleDone = () => {
    if (pendingFile && activeSlot) {
      setFileForSlot(activeSlot, pendingFile);
      
      setPreviewVisible(false);
      setPendingFile(null);
      setActiveSlot(null);
      Toast.show({ type: 'success', text1: 'Image Confirmed' });
    }
  };

  const handleRetake = () => {
    setPreviewVisible(false);
    // Wait for modal to hide then re-open selection
    const slot = activeSlot;
    setTimeout(() => {
      if (slot === 'govId') handleDocumentSelection(setGovId, 'govId');
      else if (slot === 'safetyCert') handleDocumentSelection(setSafetyCert, 'safetyCert');
      else if (slot === 'kitchenPhoto') handleImageSelection(setKitchenPhoto, 'kitchenPhoto');
    }, 500);
  };

  const handleDocumentSelection = (setter: (f: FileAsset) => void, slot: 'govId' | 'safetyCert') => {
    setSheet({
      title: 'Upload Document',
      subtitle: 'Select a source for your document',
      options: [
        { label: 'Take Photo', description: 'Use your camera', icon: Camera, onPress: () => uploadImage(setter, slot, true) },
        { label: 'Choose from Gallery', description: 'JPG or PNG from your phone', icon: ImageIcon, onPress: () => uploadImage(setter, slot, false) },
        { label: 'Select PDF', description: 'Upload a PDF document', icon: FileText, onPress: () => pickDocument(setter) },
      ],
    });
  };

  const handleImageSelection = (setter: (f: FileAsset) => void, slot: 'kitchenPhoto') => {
    setSheet({
      title: 'Upload Image',
      subtitle: 'Select a source for your photo',
      options: [
        { label: 'Take Photo', description: 'Use your camera', icon: Camera, onPress: () => uploadImage(setter, slot, true) },
        { label: 'Choose from Gallery', description: 'JPG or PNG from your phone', icon: ImageIcon, onPress: () => uploadImage(setter, slot, false) },
      ],
    });
  };

  const handleComplete = async () => {
    console.log('Step 3 submit pressed', {
      hasGovId: !!govId,
      hasSafetyCert: !!safetyCert,
      hasKitchenPhoto: !!kitchenPhoto,
      hasJwtToken: !!jwtToken,
    });

    if (!govId || !safetyCert || !kitchenPhoto) {
      const missing = [
        !govId ? 'Government ID' : null,
        !safetyCert ? 'Food Safety Certificate' : null,
        !kitchenPhoto ? 'Kitchen Photo' : null,
      ].filter(Boolean).join(', ');

      Toast.show({
        type: 'error',
        text1: 'Missing Documents',
        text2: `Please upload: ${missing}`,
      });
      return;
    }

    if (!jwtToken) {
      Toast.show({
        type: 'error',
        text1: 'Session expired',
        text2: 'Please verify your mobile number to continue registration.',
      });
      navigation.navigate('Login');
      return;
    }

    setLoading(true);
    try {
      // Surface the real payload size — a 413 comes from here being too big.
      const sizes = await Promise.all([
        getUriSize(govId.uri),
        getUriSize(safetyCert.uri),
        getUriSize(kitchenPhoto.uri),
      ]);
      const totalBytes = sizes.reduce((a, b) => a + b, 0);
      console.log('Step 3 upload total (KB):', Math.round(totalBytes / 1024));
      if (totalBytes > MAX_UPLOAD_BYTES) {
        Toast.show({
          type: 'error',
          text1: 'Files too large',
          text2: `Your documents add up to ${(totalBytes / 1024 / 1024).toFixed(1)} MB (limit 1 MB). Tap a document to replace it with a smaller photo.`,
        });
        return;
      }
      console.log('Step 3 upload sizes (KB):', {
        government_id: Math.round(sizes[0] / 1024),
        food_safety_cert: Math.round(sizes[1] / 1024),
        kitchen_photo: Math.round(sizes[2] / 1024),
        total: Math.round(totalBytes / 1024),
      });

      const formData = new FormData();

      formData.append('government_id', {
        uri: govId.uri,
        name: govId.name,
        type: govId.type,
      } as any);
      
      formData.append('food_safety_cert', {
        uri: safetyCert.uri,
        name: safetyCert.name,
        type: safetyCert.type,
      } as any);

      formData.append('kitchen_photo', {
        uri: kitchenPhoto.uri,
        name: kitchenPhoto.name,
        type: kitchenPhoto.type,
      } as any);

      console.log('Step 3 API Request:', {
        url: `${process.env.EXPO_PUBLIC_API_URL}chefs/register/step-3`,
        government_id: govId.name,
        food_safety_cert: safetyCert.name,
        kitchen_photo: kitchenPhoto.name,
      });

      const uploadUrl = `${process.env.EXPO_PUBLIC_API_URL}chefs/register/step-3`;
      logStep3Curl(uploadUrl, jwtToken, {
        govId,
        safetyCert,
        kitchenPhoto,
      });

      const response = await fetchWithTimeout(uploadUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${jwtToken}`,
        },
        credentials: 'include',
        body: formData,
      });
      console.log('Step 3 API Response Status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('Step 3 API Failed:', response.status, errorData);
        if (response.status === 401) {
          Toast.show({
            type: 'error',
            text1: 'Session expired',
            text2:
              errorData.code === 'TOKEN_EXPIRED'
                ? 'Your registration session expired. Please verify your number again.'
                : 'Please verify your number again.',
          });
          navigation.navigate('Login');
          return;
        }
        if (response.status === 413) {
          throw new Error('Your photos are too large to upload. Please retake them and try again.');
        }
        throw new Error(friendlyApiError(response.status, errorData).message);
      }

      const data = await response.json().catch(() => ({}));
      console.log('Step 3 API Success:', data);

      // Step 3 now returns a real session token + user. Persist them so the app
      // stays signed in; fall back to /auth/refresh once if either is missing.
      let { token: sessionToken, user: sessionUser } = readAuthPayload(data);
      if (!sessionToken) {
        try {
          const refreshed = readAuthPayload(await refreshSession(jwtToken));
          sessionToken = refreshed.token;
          sessionUser = refreshed.user;
        } catch (refreshErr) {
          console.log('Step 3 post-submit refresh failed:', (refreshErr as Error)?.message);
        }
      }

      Toast.show({
        type: 'success',
        text1: 'Registration Complete',
        text2: 'Your application is under review.',
      });

      if (sessionToken) {
        await login(sessionToken, sessionUser);
      } else {
        navigation.navigate('Login');
      }
    } catch (error: any) {
      console.log('Step 3 API Error:', error?.name, error?.message);
      Toast.show({
        type: 'error',
        text1: 'Upload Error',
        text2: error?.name === 'AbortError'
          ? 'Upload timed out. Please try again with smaller photos or a stronger connection.'
          : error.message || 'Failed to upload documents.',
      });
    } finally {
      setLoading(false);
    }
  };

  const goToReview = () => {
    if (!govId || !safetyCert || !kitchenPhoto) {
      const missing = [
        !govId ? 'Aadhaar / Government ID' : null,
        !safetyCert ? 'Food Safety Certificate' : null,
        !kitchenPhoto ? 'Kitchen Photo' : null,
      ].filter(Boolean).join(', ');
      Toast.show({ type: 'error', text1: 'Missing Documents', text2: `Please upload: ${missing}` });
      return;
    }
    setPage('review');
  };

  const previewModal = (
    <Modal visible={previewVisible} transparent={false} animationType="slide" onRequestClose={() => setPreviewVisible(false)}>
      <SafeAreaView style={styles.modalContainer}>
        <StatusBar style="light" />
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Preview</Text>
          <PressableScale onPress={() => setPreviewVisible(false)} style={styles.modalClose} pressedScale={0.9}>
            <X size={18} color={C.white} />
          </PressableScale>
        </View>

        <View style={styles.previewContainer}>
          {pendingFile && (
            <FadeInView fromScale={0.94} offset={0} style={styles.previewFill}>
              <Image source={{ uri: pendingFile.uri }} style={styles.previewImage} resizeMode="contain" />
            </FadeInView>
          )}
        </View>

        <View style={styles.modalFooter}>
          <PressableScale style={styles.retakeBtn} onPress={handleRetake}>
            <RefreshCw size={18} color={C.primary} />
            <Text style={styles.retakeBtnText}>Retake</Text>
          </PressableScale>
          <View style={{ flex: 2 }}>
            <PrimaryButton label="Use photo" onPress={handleDone} showChevron={false} />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );

  if (page === 'review') {
    const rows: { label: string; done: boolean }[] = [
      { label: 'Basic information', done: true },
      { label: 'Kitchen details', done: true },
      { label: 'Aadhaar / Government ID', done: !!govId },
      { label: 'Food certificate', done: !!safetyCert },
      { label: 'Kitchen photo', done: !!kitchenPhoto },
    ];
    return (
      <OnboardingLayout
        onBack={() => setPage('documents')}
        progress={REG_PROGRESS.review}
        progressFrom={REG_PROGRESS.documents}
        footer={<PrimaryButton label="Save & continue" onPress={handleComplete} loading={loading} />}
      >
        <FadeInView style={styles.reviewTitle}>
          <Text style={T.screenTitle}>Document Review / Checklist</Text>
        </FadeInView>
        <FadeInView delay={80} style={styles.checklist}>
          {rows.map((row, i) => (
            <FadeInView
              key={row.label}
              delay={140 + i * 70}
              offset={8}
              style={[styles.checkRow, i < rows.length - 1 && styles.checkRowDivider]}
            >
              <CircleCheck size={20} color={row.done ? C.successDeep : C.warning} strokeWidth={1.67} />
              <Text style={styles.checkLabel}>{row.label}</Text>
              <StatusBadge label={row.done ? 'Added' : 'Missing'} tone={row.done ? 'success' : 'warning'} />
            </FadeInView>
          ))}
        </FadeInView>
        <FadeInView delay={520}>
          <Text style={[T.subtitle, styles.reviewNote]}>
            Our team reviews your documents within 24 hours. You'll see the status as soon as you're signed in.
          </Text>
        </FadeInView>
      </OnboardingLayout>
    );
  }

  const uploads: { title: string; file: FileAsset | null; onPress: () => void }[] = [
    { title: 'Aadhaar Document Upload', file: govId, onPress: () => handleDocumentSelection(setGovId, 'govId') },
    { title: 'Certificate Upload', file: safetyCert, onPress: () => handleDocumentSelection(setSafetyCert, 'safetyCert') },
    { title: 'Kitchen Photo Upload', file: kitchenPhoto, onPress: () => handleImageSelection(setKitchenPhoto, 'kitchenPhoto') },
  ];

  return (
    <>
      <OnboardingLayout
        onBack={() => navigation.goBack()}
        progress={REG_PROGRESS.documents}
        progressFrom={REG_PROGRESS.location}
        footer={<PrimaryButton label="Continue" onPress={goToReview} />}
      >
        {uploads.map((u, i) => (
          <FadeInView key={u.title} delay={i * 90} style={styles.uploadBlock}>
            <View style={styles.uploadHead}>
              <Text style={T.screenTitle}>{u.title}</Text>
              <Text style={T.subtitle}>Required for verification</Text>
            </View>
            <UploadTile file={u.file} onPress={u.onPress} />
          </FadeInView>
        ))}
      </OnboardingLayout>
      {previewModal}
      <ActionSheet
        visible={sheetVisible}
        title={sheet?.title ?? ''}
        subtitle={sheet?.subtitle}
        options={sheet?.options ?? []}
        onClose={() => setSheetVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  uploadBlock: {
    gap: 8,
  },
  uploadHead: {
    gap: 4,
  },
  reviewTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  checklist: {
    backgroundColor: C.surface,
    borderRadius: Radius.tile,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  checkRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  checkLabel: {
    flex: 1,
    fontFamily: F.jakartaBold,
    fontSize: 12,
    lineHeight: 18,
    color: C.textStrong,
  },
  reviewNote: {
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0E0E10',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  modalTitle: {
    ...T.headerTitle,
    color: C.white,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewFill: {
    width: '100%',
    height: '100%',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingBottom: 32,
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...Shadows.card,
  },
  retakeBtn: {
    flex: 1,
    height: 52,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: C.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  retakeBtnText: {
    ...T.button,
    color: C.primary,
  },
});
