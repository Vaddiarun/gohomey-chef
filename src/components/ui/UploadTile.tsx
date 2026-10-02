import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Camera, FileText, RefreshCw, Upload } from 'lucide-react-native';
import { C, F, Radius } from '../../theme';
import { PressableScale } from './PressableScale';
import { FadeInView } from './FadeInView';
import { SunsetTile } from './SunsetTile';
import { LinearGradient } from 'expo-linear-gradient';

export type PickedFile = { uri: string; name: string; type: string };

type Props = {
  file?: PickedFile | null;
  onPress: () => void;
  /** 'cream' = meal photo tile (#FFF5ED, Figma 76:12340); default = document tile. */
  tone?: 'default' | 'cream';
  /** Existing remote image to show when nothing new is picked. */
  previewUri?: string | null;
  disabled?: boolean;
  /** Icon square: 'sunset' (meal/docs) or 'coral' (pantry, Figma 76:14187). */
  icon?: 'sunset' | 'coral';
};

/** 176px upload drop-zone (Figma "Profile Photo Upload" tile); shows a preview once a file is picked. */
export const UploadTile = ({ file, onPress, tone = 'default', previewUri, disabled, icon = 'sunset' }: Props) => {
  const shown = file ?? (previewUri ? { uri: previewUri, name: '', type: 'image/remote' } : null);
  const isImage = !!shown && shown.type.startsWith('image/');

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      pressedScale={0.98}
      style={[styles.tile, tone === 'cream' && styles.cream]}
      accessibilityRole="button"
    >
      {shown ? (
        <FadeInView fromScale={0.96} offset={0} style={StyleSheet.absoluteFill}>
          {isImage ? (
            <Image source={{ uri: shown.uri }} style={styles.preview} resizeMode="cover" />
          ) : (
            <View style={styles.docPreview}>
              <FileText size={32} color={C.primaryRing} />
              <Text style={styles.docName} numberOfLines={1}>
                {shown.name}
              </Text>
            </View>
          )}
          {!disabled && (
          <View style={styles.changePill}>
            <RefreshCw size={12} color={C.white} />
            <Text style={styles.changeText}>Change</Text>
          </View>
          )}
        </FadeInView>
      ) : (
        <View style={styles.empty}>
          {icon === 'coral' ? (
            <LinearGradient
              colors={['#FF7A5C', '#FCB997', '#FFF5ED']}
              locations={[0, 0.54, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.coral}
            >
              <Camera size={20} color={C.white} strokeWidth={1.67} />
            </LinearGradient>
          ) : (
            <SunsetTile>
              {/* Figma: 20px camera at top 13 inside the 48px square (1px above centre). */}
              <Camera size={20} color={C.white} strokeWidth={1.67} style={styles.camera} />
            </SunsetTile>
          )}
          <View style={styles.uploadRow}>
            <Upload size={16} color={C.primaryRing} strokeWidth={1.33} />
            <Text style={styles.uploadText}>Upload</Text>
          </View>
        </View>
      )}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  tile: {
    height: 176,
    width: '100%',
    borderRadius: Radius.tile,
    backgroundColor: C.uploadBg,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  cream: {
    backgroundColor: '#FFF5ED',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11.5,
  },
  coral: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: {
    marginTop: -2,
  },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadText: {
    fontFamily: F.jakartaBold,
    fontSize: 12,
    lineHeight: 18,
    color: C.primaryRing,
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  docPreview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  docName: {
    fontFamily: F.jakartaSemiBold,
    fontSize: 13,
    color: C.textStrong,
  },
  changePill: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(23,23,26,0.6)',
  },
  changeText: {
    fontFamily: F.jakartaBold,
    fontSize: 11,
    color: C.white,
  },
});
