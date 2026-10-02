import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { C, Radius, Shadows, T } from '../../theme';
import { PressableScale } from './PressableScale';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Trailing chevron (Figma "Component 5"). */
  showChevron?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Orange 52px CTA — Figma "Component 5". */
export const PrimaryButton = ({ label, onPress, loading, disabled, showChevron = true, style }: Props) => {
  const inactive = disabled || loading;
  return (
    <PressableScale
      onPress={onPress}
      disabled={inactive}
      style={[styles.button, disabled && !loading && styles.disabled, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color={C.white} size="small" />
      ) : (
        <View style={styles.row}>
          <Text style={T.button}>{label}</Text>
          {showChevron && <ChevronRight size={16} color={C.white} strokeWidth={2} />}
        </View>
      )}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: Radius.button,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.button,
  },
  disabled: {
    opacity: 0.55,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
