import React, { forwardRef, useRef } from 'react';
import { Animated, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { C, F, Radius, T } from '../../theme';

type Props = TextInputProps & {
  label?: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
};

/** Labelled 52px field (Figma "Chef name / Kitchen name / Location"); border warms to orange on focus. */
export const FormField = forwardRef<TextInput, Props>(({ label, icon, right, style, onFocus, onBlur, ...input }, ref) => {
  const focus = useRef(new Animated.Value(0)).current;

  const animate = (toValue: number) =>
    Animated.timing(focus, { toValue, duration: 180, useNativeDriver: false }).start();

  return (
    <View style={styles.group}>
      {!!label && <Text style={T.label}>{label}</Text>}
      <Animated.View
        style={[
          styles.box,
          { borderColor: focus.interpolate({ inputRange: [0, 1], outputRange: [C.border, C.primary] }) },
        ]}
      >
        {icon}
        <TextInput
          ref={ref}
          placeholderTextColor={C.iconMuted}
          style={[styles.input, style]}
          onFocus={(e) => {
            animate(1);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            animate(0);
            onBlur?.(e);
          }}
          {...input}
        />
        {right}
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  group: {
    gap: 6,
    width: '100%',
  },
  box: {
    height: 52,
    borderRadius: Radius.field,
    borderWidth: 1,
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: F.jakartaSemiBold,
    fontSize: 13,
    color: C.textStrong,
    paddingVertical: 0,
  },
});
