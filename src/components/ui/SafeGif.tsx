import React from 'react';
import { Image as RNImage, ImageSourcePropType, ImageStyle, StyleProp } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

// expo-image animates GIFs on Android; plain RN Image only shows the first
// frame. Resolved lazily so a build without the native module never crashes.
const ExpoImage: React.ComponentType<any> | null = requireOptionalNativeModule('ExpoImage')
  ? require('expo-image').Image
  : null;

type Props = {
  source: ImageSourcePropType;
  style?: StyleProp<ImageStyle>;
};

/** Animated GIF (Lordicon exports from Figma) with a static fallback. */
export const SafeGif = ({ source, style }: Props) =>
  ExpoImage ? (
    <ExpoImage source={source} style={style} contentFit="cover" autoplay />
  ) : (
    <RNImage source={source} style={style} resizeMode="cover" />
  );
