import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { C } from '../theme';

const HAT = require('../assets/images/splash_hat.png');
const H_MARK = require('../assets/images/splash_h.png');
const LOGO = require('../assets/images/splash_logo.png');

// Figma splash frames (412 × 917): 77:19885 → 77:19891 → 77:19898.
const FRAME_W = 412;
const FRAME_H = 917;
const HAT_SIZE = 104;
const H_START = 183;
const H_END = 175;
const LOGO_SIZE = 204;

type Props = { onFinish: () => void };

/**
 * Splash animation: the chef hat drops in from the top, the "H" rises from the
 * bottom, they meet (frame 2) and resolve into the final logo (frame 3), then
 * the overlay fades away to reveal the app.
 */
export const AnimatedSplash = ({ onFinish }: Props) => {
  const { width, height } = useWindowDimensions();
  const s = Math.min(width / FRAME_W, 1.25);
  const cx = width / 2;
  const cy = height / 2;
  // Centre-anchored Figma y → screen y.
  const mapY = (frameY: number) => cy + (frameY - FRAME_H / 2) * s;
  const mapX = (frameX: number) => cx + (frameX - FRAME_W / 2) * s;

  const travel = useRef(new Animated.Value(0)).current;   // frame 1 → 2
  const merge = useRef(new Animated.Value(0)).current;    // frame 2 → 3
  const pulse = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(150),
      Animated.parallel([
        Animated.timing(travel, {
          toValue: 1,
          duration: 850,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(merge, { toValue: 1, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.delay(150),
      Animated.timing(exit, { toValue: 1, duration: 320, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => onFinish());
  }, []);

  // Frame 1 → 2 positions (top-left corners).
  const hatStartY = -52 * s;                       // peeking from the top edge
  const hatEndY = mapY(298);
  const hatStartX = mapX(114);
  const hatEndX = mapX(112);
  const hStartY = height - (FRAME_H - 820) * s;    // peeking from the bottom edge
  const hEndY = mapY(360);
  const hStartX = mapX(125);
  const hEndX = mapX(124);

  const piecesOpacity = merge.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.root, { opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}
    >
      <StatusBar style="dark" />
      <Animated.Image
        source={HAT}
        style={[
          styles.abs,
          {
            width: HAT_SIZE * s,
            height: HAT_SIZE * s,
            opacity: piecesOpacity,
            transform: [
              { translateX: travel.interpolate({ inputRange: [0, 1], outputRange: [hatStartX, hatEndX] }) },
              { translateY: travel.interpolate({ inputRange: [0, 1], outputRange: [hatStartY, hatEndY] }) },
              { rotate: travel.interpolate({ inputRange: [0, 1], outputRange: ['-14deg', '0deg'] }) },
            ],
          },
        ]}
      />
      <Animated.Image
        source={H_MARK}
        style={[
          styles.abs,
          {
            width: H_START * s,
            height: H_START * s,
            opacity: piecesOpacity,
            transform: [
              { translateX: travel.interpolate({ inputRange: [0, 1], outputRange: [hStartX, hEndX - ((H_START - H_END) * s) / 2] }) },
              { translateY: travel.interpolate({ inputRange: [0, 1], outputRange: [hStartY, hEndY - ((H_START - H_END) * s) / 2] }) },
              { scale: travel.interpolate({ inputRange: [0, 1], outputRange: [1, H_END / H_START] }) },
            ],
          },
        ]}
      />
      <Animated.Image
        source={LOGO}
        style={[
          styles.abs,
          {
            width: LOGO_SIZE * s,
            height: LOGO_SIZE * s,
            opacity: merge,
            transform: [
              { translateX: cx - (LOGO_SIZE * s) / 2 },
              { translateY: mapY(321) },
              {
                scale: Animated.add(
                  merge.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }),
                  Animated.add(
                    pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.04] }),
                    exit.interpolate({ inputRange: [0, 1], outputRange: [0, 0.08] })
                  )
                ),
              },
            ],
          },
        ]}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {
    backgroundColor: C.bg,
    zIndex: 1000,
    elevation: 1000,
  },
  abs: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
