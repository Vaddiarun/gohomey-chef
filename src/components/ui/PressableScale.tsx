import React, { useRef } from 'react';
import { Animated, Pressable, PressableProps, StyleProp, StyleSheet, ViewStyle } from 'react-native';

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed. */
  pressedScale?: number;
  children: React.ReactNode;
};

/** Pressable that springs down slightly on touch — the tap feedback for buttons, chips and tiles. */
export const PressableScale = ({ style, pressedScale = 0.97, children, onPressIn, onPressOut, ...rest }: Props) => {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (toValue: number) =>
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: 6 }).start();

  // Flex sizing must sit on the outer Pressable — on the inner view it has no
  // effect, so `flex: 1` buttons in a row would shrink to their content.
  const { flex, flexGrow, flexShrink, flexBasis, alignSelf } = StyleSheet.flatten(style) ?? {};
  const outer = { flex, flexGrow, flexShrink, flexBasis, alignSelf };
  const fills = flex != null || flexGrow != null;

  return (
    <Pressable
      {...rest}
      style={outer}
      onPressIn={(e) => {
        animateTo(pressedScale);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animateTo(1);
        onPressOut?.(e);
      }}
    >
      <Animated.View style={[style, fills && styles.fill, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  fill: { flexGrow: 1 },
});
