import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';

type Props = {
  children: React.ReactNode;
  /** Delay before the entrance starts (ms) — use for staggered lists. */
  delay?: number;
  duration?: number;
  /** Vertical offset the view slides up from. */
  offset?: number;
  /** Start scale (1 = no zoom). */
  fromScale?: number;
  style?: StyleProp<ViewStyle>;
};

/** Fade + slide-up entrance used across the redesigned screens. */
export const FadeInView = ({
  children,
  delay = 0,
  duration = 420,
  offset = 16,
  fromScale = 1,
  style,
}: Props) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) },
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [fromScale, 1] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};
