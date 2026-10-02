import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { C } from '../../theme';

type Props = {
  value: boolean;
  onValueChange?: (v: boolean) => void;
  disabled?: boolean;
  /** Track colour when on (default Eucalyptus green; Fuel Now uses #E64611). */
  activeColor?: string;
};

/** 48 × 28 switch (Figma "div.flex" 76:12407): green when on, Pearl Bush when off; knob slides with a spring. */
export const Toggle = ({ value, onValueChange, disabled, activeColor = C.successDeep }: Props) => {
  const t = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(t, { toValue: value ? 1 : 0, useNativeDriver: false, speed: 20, bounciness: 6 }).start();
  }, [value]);

  return (
    <Pressable
      onPress={() => !disabled && onValueChange?.(!value)}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      style={{ opacity: disabled ? 0.45 : 1 }}
    >
      <Animated.View
        style={[
          styles.track,
          { backgroundColor: t.interpolate({ inputRange: [0, 1], outputRange: [C.border, activeColor] }) },
        ]}
      >
        <Animated.View
          style={[styles.knob, { transform: [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }] }]}
        />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 4,
    justifyContent: 'center',
  },
  knob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
});
