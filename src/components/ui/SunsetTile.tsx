import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

type Props = {
  size?: number;
  radius?: number;
  children?: React.ReactNode;
};

/**
 * Orange "sunset" icon square (Figma "div.relative", e.g. node 76:12992).
 * Base fill = the exact radial gradient from Figma (centre top, 1.2w × 0.9h);
 * the two blurred orange blobs on top are reproduced as soft radial falloffs.
 */
export const SunsetTile = ({ size = 48, radius = 12, children }: Props) => {
  // Figma geometry is defined on a 48px square — scale everything with `size`.
  const k = size / 48;
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: radius }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="base" cx={24 * k} cy={0} rx={57.6 * k} ry={43.2 * k} fx={24 * k} fy={0} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#FBBC05" />
            <Stop offset="0.137" stopColor="#FB9E13" />
            <Stop offset="0.274" stopColor="#FB8122" />
            <Stop offset="0.543" stopColor="#FB8122" />
            <Stop offset="0.772" stopColor="#FC6111" />
            <Stop offset="1" stopColor="#FC4100" />
          </RadialGradient>
          {/* span #FC4100, 144px, right -79 / bottom 32, blur 32 */}
          <RadialGradient id="blobTop" cx={55 * k} cy={-56 * k} r={136 * k} fx={55 * k} fy={-56 * k} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#FC4100" stopOpacity={1} />
            <Stop offset="0.29" stopColor="#FC4100" stopOpacity={0.84} />
            <Stop offset="0.53" stopColor="#FC4100" stopOpacity={0.5} />
            <Stop offset="0.76" stopColor="#FC4100" stopOpacity={0.16} />
            <Stop offset="1" stopColor="#FC4100" stopOpacity={0} />
          </RadialGradient>
          {/* span rgba(252,65,0,0.31), 160px, left -40 / top 24, blur 32 */}
          <RadialGradient id="blobLow" cx={40 * k} cy={104 * k} r={144 * k} fx={40 * k} fy={104 * k} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#FC4100" stopOpacity={0.31} />
            <Stop offset="0.33" stopColor="#FC4100" stopOpacity={0.26} />
            <Stop offset="0.56" stopColor="#FC4100" stopOpacity={0.155} />
            <Stop offset="0.78" stopColor="#FC4100" stopOpacity={0.05} />
            <Stop offset="1" stopColor="#FC4100" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={size} height={size} fill="url(#base)" />
        <Rect width={size} height={size} fill="url(#blobLow)" />
        <Rect width={size} height={size} fill="url(#blobTop)" />
      </Svg>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
