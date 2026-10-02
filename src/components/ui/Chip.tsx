import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { C, Radius, T } from '../../theme';
import { PressableScale } from './PressableScale';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

/** Selectable pill (Figma "span.border" on Cuisine & Speciality); colours cross-fade on toggle. */
export const Chip = ({ label, selected = false, onPress }: Props) => {
  const active = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(active, { toValue: selected ? 1 : 0, duration: 180, useNativeDriver: false }).start();
  }, [selected]);

  return (
    <PressableScale onPress={onPress} pressedScale={0.94} accessibilityRole="button" accessibilityState={{ selected }}>
      <Animated.View
        style={[
          styles.chip,
          {
            backgroundColor: active.interpolate({ inputRange: [0, 1], outputRange: [C.surface, C.softOrange] }),
            borderColor: active.interpolate({ inputRange: [0, 1], outputRange: [C.borderInput, C.softOrange] }),
          },
        ]}
      >
        <Text style={[T.chip, { color: selected ? C.primary : C.text }]}>{label}</Text>
      </Animated.View>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.chip,
    borderWidth: 1,
  },
});
