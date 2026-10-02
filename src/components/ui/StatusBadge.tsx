import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C, F } from '../../theme';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral';

const TONES: Record<BadgeTone, { bg: string; fg: string }> = {
  success: { bg: C.successTint, fg: C.successDeep },
  warning: { bg: C.warningTint, fg: C.warning },
  danger: { bg: C.dangerBg, fg: C.danger },
  neutral: { bg: 'rgba(241,241,244,0.9)', fg: C.textMuted },
};

/** Rounded status pill (Figma "Verified" / "Under Review"). */
export const StatusBadge = ({ label, tone }: { label: string; tone: BadgeTone }) => (
  <View style={[styles.pill, { backgroundColor: TONES[tone].bg }]}>
    <Text style={[styles.text, { color: TONES[tone].fg }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  text: {
    fontFamily: F.jakartaBold,
    fontSize: 10.5,
    lineHeight: 15.75,
  },
});
