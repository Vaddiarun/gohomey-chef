import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '../theme';
import { 
  ChevronLeft, 
  Camera, 
  FileText, 
  CheckCircle,
  HelpCircle,
  Info,
  Utensils,
  X,
  RefreshCw
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { refreshSession, readAuthPayload } from '../services/api';

type FileAsset = {
  uri: string;
  name: string;
  type: string;
};

const STEP_3_UPLOAD_TIMEOUT_MS = 120000;

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
        setFile({
          uri: asset.uri,
          name: asset.name || 'document',
          type: asset.mimeType || 'application/octet-stream'
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
          Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
          return;
        }
      }

      // Keep uploads small — the step-3 endpoint / proxy rejects large bodies
      // (HTTP 413). Low quality + a forced crop re-encodes the photo well below
      // multi-MB. allowsEditing also lets the chef frame the document.
      const result = await (useCamera
        ? ImagePicker.launchCameraAsync({
            quality: 0.3,
            allowsEditing: true,
          })
        : ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.3,
            allowsEditing: true,
          })
      );
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const filename = asset.uri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        const newFile = {
          uri: asset.uri,
          name: filename,
          type: asset.mimeType || type
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
    Alert.alert(
      'Upload Document',
      'Select a source for your document',
      [
        { text: 'Take Photo', onPress: () => uploadImage(setter, slot, true) },
        { text: 'Choose from Gallery', onPress: () => uploadImage(setter, slot, false) },
        { text: 'Select PDF', onPress: () => pickDocument(setter) },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const handleImageSelection = (setter: (f: FileAsset) => void, slot: 'kitchenPhoto') => {
    Alert.alert(
      'Upload Image',
      'Select a source for your photo',
      [
        { text: 'Take Photo', onPress: () => uploadImage(setter, slot, true) },
        { text: 'Choose from Gallery', onPress: () => uploadImage(setter, slot, false) },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
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
        throw new Error(errorData.message || `Failed to submit Step 3 (Status: ${response.status})`);
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.brandTitle}>GO HOMEYY</Text>
        <View style={styles.progressRing}>
           <View style={styles.progressInner}>
             <Text style={styles.progressText}>100%</Text>
           </View>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.introSection}>
          <Text style={styles.subtitle}>STEP 3 OF 3</Text>
          <Text style={styles.title}>Security & Verification</Text>
          <Text style={styles.description}>
            To maintain our high standards of safety and professional trust, please upload the following documents. These will be reviewed by our concierge team within 24 hours.
          </Text>
        </View>

        <View style={styles.uploadSection}>
          <View style={styles.uploadCard}>
            <View style={styles.uploadHeader}>
              <View style={styles.uploadIconLabel}>
                <View style={styles.iconCircle}>
                  <FileText size={18} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.uploadTitle}>Government ID</Text>
                  <Text style={styles.uploadSub}>Passport, License, or National ID</Text>
                </View>
              </View>
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredText}>REQUIRED</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.uploadPlaceholder} onPress={() => handleDocumentSelection(setGovId, 'govId')}>
              <Camera size={32} color={Colors.primary} style={{ opacity: 0.5 }} />
              <Text style={styles.uploadLabel}>{govId ? govId.name : 'Tap to Capture or Upload'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.uploadCard}>
            <View style={styles.uploadHeader}>
              <View style={styles.uploadIconLabel}>
                <View style={styles.iconCircle}>
                  <CheckCircle size={18} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.uploadTitle}>Food Safety Certificate</Text>
                  <Text style={styles.uploadSub}>FSSAI or local equivalent</Text>
                </View>
              </View>
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredText}>REQUIRED</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.uploadPlaceholder} onPress={() => handleDocumentSelection(setSafetyCert, 'safetyCert')}>
              <FileText size={32} color={Colors.primary} style={{ opacity: 0.5 }} />
              <Text style={styles.uploadLabel}>{safetyCert ? safetyCert.name : 'Upload PDF or JPG'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.uploadCard}>
            <View style={styles.uploadHeader}>
              <View style={styles.uploadIconLabel}>
                <View style={styles.iconCircle}>
                  <Utensils size={18} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.uploadTitle}>Kitchen Photo</Text>
                  <Text style={styles.uploadSub}>Wide shot of your primary workspace</Text>
                </View>
              </View>
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredText}>REQUIRED</Text>
              </View>
            </View>
            <View style={styles.kitchenPhotosRow}>
              <View style={styles.exampleContainer}>
                <Image source={require('../assets/images/risotto.png')} style={styles.exampleImage} />
                <View style={styles.exampleOverlay}>
                  <Text style={styles.exampleText}>Example</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.uploadYoursBtn} onPress={() => handleImageSelection(setKitchenPhoto, 'kitchenPhoto')}>
                 {kitchenPhoto ? (
                   <>
                     <Image source={{ uri: kitchenPhoto.uri }} style={styles.kitchenPhotoPreview} />
                     <View style={styles.selectedOverlay}>
                       <CheckCircle size={14} color={Colors.background} />
                       <Text style={styles.selectedOverlayText}>ATTACHED</Text>
                     </View>
                   </>
                 ) : (
                   <>
                     <Camera size={24} color={Colors.primary} style={{ opacity: 0.5, marginBottom: 8 }} />
                     <Text style={styles.uploadYoursText}>Upload Yours</Text>
                   </>
                 )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.noteBox}>
          <View style={styles.noteHeader}>
            <Info size={16} color={Colors.primary} />
            <Text style={styles.noteTitle}>CHEF'S NOTE</Text>
          </View>
          <Text style={styles.noteText}>
            Ensure all text on documents is clearly legible. High-quality kitchen photos improve your profile ranking by 40%.
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.prevBtn}>
            <Text style={styles.prevBtnText}>PREVIOUS</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.completeBtn, loading && { opacity: 0.7 }]}
            onPress={handleComplete}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.background} size="small" />
            ) : (
              <>
                <CheckCircle size={20} color={Colors.background} style={styles.btnIcon} />
                <Text style={styles.completeBtnText}>COMPLETE REGISTRATION</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={previewVisible}
        transparent={false}
        animationType="slide"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>PREVIEW</Text>
            <TouchableOpacity onPress={() => setPreviewVisible(false)}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.previewContainer}>
            {pendingFile && (
              <Image 
                source={{ uri: pendingFile.uri }} 
                style={styles.previewImage} 
                resizeMode="contain"
              />
            )}
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
              <RefreshCw size={20} color={Colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.retakeBtnText}>RETAKE</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
              <CheckCircle size={20} color={Colors.background} style={{ marginRight: 8 }} />
              <Text style={styles.doneBtnText}>DONE</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    ...Typography.body,
    fontWeight: 'bold',
    letterSpacing: 4,
    color: Colors.text,
  },
  progressRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  progressInner: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 10,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  introSection: {
    marginBottom: 32,
  },
  subtitle: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    ...Typography.h1,
    fontSize: 28,
    marginBottom: 12,
  },
  description: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  uploadSection: {
    marginBottom: 32,
  },
  uploadCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  uploadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  uploadIconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  uploadTitle: {
    color: Colors.text,
    fontWeight: 'bold',
    fontSize: 14,
  },
  uploadSub: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  requiredBadge: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  requiredText: {
    color: Colors.primary,
    fontSize: 8,
    fontWeight: 'bold',
  },
  uploadPlaceholder: {
    height: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 8,
  },
  kitchenPhotosRow: {
    flexDirection: 'row',
  },
  exampleContainer: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  exampleImage: {
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  exampleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 2,
    alignItems: 'center',
  },
  exampleText: {
    color: Colors.text,
    fontSize: 10,
  },
  uploadYoursBtn: {
    flex: 1,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  kitchenPhotoPreview: {
    width: '100%',
    height: '100%',
  },
  selectedOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(74, 222, 128, 0.9)',
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedOverlayText: {
    color: Colors.background,
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  uploadYoursText: {
    color: Colors.textSecondary,
    fontSize: 10,
  },
  noteBox: {
    backgroundColor: 'rgba(34, 211, 238, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.1)',
    marginBottom: 40,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteTitle: {
    color: Colors.cyan,
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 8,
    letterSpacing: 1,
  },
  noteText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prevBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  prevBtnText: {
    color: Colors.textSecondary,
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  completeBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginLeft: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  completeBtnText: {
    color: Colors.background,
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  btnIcon: {
    marginRight: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth:1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    ...Typography.body,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: Colors.textSecondary,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.7,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: Spacing.xl,
    paddingBottom: 40,
    backgroundColor: Colors.surface,
  },
  retakeBtn: {
    flex: 1,
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  retakeBtnText: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  doneBtn: {
    flex: 2,
    height: 60,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  doneBtnText: {
    color: Colors.background,
    fontWeight: 'bold',
  },
});
