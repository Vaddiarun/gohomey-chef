import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop, SvgXml } from 'react-native-svg';
import HEADER_WAVES from '../../assets/svg/headerWaves';

type Props = {
  width: number;
  height?: number;
  /** Faint wavy line pattern on top (Dashboard header). */
  waves?: boolean;
};

/**
 * Orange radial header (Figma "div.relative" 76:11589, 428 × 321 at x −16).
 * Base = exact radial gradient; the two blurred blobs are soft radial falloffs.
 */
export const SunsetBackdrop = ({ width, height = 321, waves = true }: Props) => {
  // Figma geometry lives on a 428-wide canvas starting 16px left of the screen.
  const k = (width + 16) / 428;
  const W = 428 * k;
  const H = height;
  return (
    <View pointerEvents="none" style={[styles.wrap, { width, height: H }]}>
      <Svg width={W} height={H} style={{ position: 'absolute', left: -16 * k }}>
        <Defs>
          <RadialGradient id="hdr" cx={214 * k} cy={0} rx={513.6 * k} ry={288.9} fx={214 * k} fy={0} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#FBBC05" />
            <Stop offset="0.137" stopColor="#FB9E13" />
            <Stop offset="0.274" stopColor="#FB8122" />
            <Stop offset="0.543" stopColor="#FB8122" />
            <Stop offset="0.772" stopColor="#FC6111" />
            <Stop offset="1" stopColor="#FC4100" />
          </RadialGradient>
          {/* 160px rgba(252,65,0,0.31) blob, left −40 / top 24, blur 32 */}
          <RadialGradient id="blobA" cx={40 * k} cy={104} r={144} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#FC4100" stopOpacity={0.31} />
            <Stop offset="0.56" stopColor="#FC4100" stopOpacity={0.155} />
            <Stop offset="1" stopColor="#FC4100" stopOpacity={0} />
          </RadialGradient>
          {/* 144px #FC4100 blob, right −79 / bottom 32, blur 32 */}
          <RadialGradient id="blobB" cx={W + 7 * k} cy={H - 104} r={136} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#FC4100" stopOpacity={1} />
            <Stop offset="0.53" stopColor="#FC4100" stopOpacity={0.5} />
            <Stop offset="1" stopColor="#FC4100" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={W} height={H} fill="url(#hdr)" />
        <Rect width={W} height={H} fill="url(#blobA)" />
        <Rect width={W} height={H} fill="url(#blobB)" />
      </Svg>
      {waves && (
        // Figma Group 1: 556 × 362 at (−71, −42) on a 412-wide frame, opacity 0.15 (baked into the SVG).
        <View style={{ position: 'absolute', left: -71 * (width / 412), top: -42 }}>
          <SvgXml xml={HEADER_WAVES} width={556 * (width / 412)} height={362} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
});
