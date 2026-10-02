import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, Gradients } from '../../theme';

type Props = {
  /** 0 → 1 */
  progress: number;
  /** Progress the bar animates from on mount (defaults to the previous step). */
  from?: number;
};

/** 8px onboarding progress bar with the orange→amber gradient fill; the fill grows on mount. */
export const ProgressBar = ({ progress, from }: Props) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const value = useRef(new Animated.Value(from ?? Math.max(0, progress - 0.17))).current;

  useEffect(() => {
    Animated.timing(value, {
      toValue: progress,
      duration: 700,
      delay: 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={styles.track} onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}>
      <Animated.View
        style={[
          styles.fill,
          { width: value.interpolate({ inputRange: [0, 1], outputRange: [0, trackWidth] }) },
        ]}
      >
        <LinearGradient
          colors={Gradients.progress}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: C.border,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
});
