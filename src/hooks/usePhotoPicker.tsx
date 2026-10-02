import React, { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { ActionSheet } from '../components/ui';
import type { PickedFile } from '../components/ui';
import { compressImage } from '../utils/compressImage';

/**
 * Camera / gallery picker in the app's bottom-sheet style. Photos are
 * compressed before they're returned, so uploads stay under the proxy limit.
 */
export const usePhotoPicker = (opts: { title: string; subtitle?: string; cameraOnly?: boolean; aspect?: [number, number] }) => {
  const [file, setFile] = useState<PickedFile | null>(null);
  const [open, setOpen] = useState(false);

  const pick = async (useCamera: boolean) => {
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Toast.show({ type: 'error', text1: 'Permission Denied', text2: useCamera ? 'Camera access is needed to take the photo.' : 'Photo access is needed to pick an image.' });
      return;
    }
    const pickerOpts = { allowsEditing: true, aspect: opts.aspect ?? ([4, 3] as [number, number]), quality: 0.7 };
    const result = useCamera
      ? await ImagePicker.launchCameraAsync(pickerOpts)
      : await ImagePicker.launchImageLibraryAsync({ ...pickerOpts, mediaTypes: ['images'] });
    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];
      setFile(await compressImage(asset.uri, asset.width));
    }
  };

  const sheet = (
    <ActionSheet
      visible={open}
      title={opts.title}
      subtitle={opts.subtitle}
      options={[
        { label: 'Take Photo', description: 'Use your camera', icon: Camera, onPress: () => pick(true) },
        ...(opts.cameraOnly
          ? []
          : [{ label: 'Choose from Gallery', description: 'JPG or PNG from your phone', icon: ImageIcon, onPress: () => pick(false) }]),
      ]}
      onClose={() => setOpen(false)}
    />
  );

  return { file, setFile, openPicker: () => setOpen(true), sheet };
};
