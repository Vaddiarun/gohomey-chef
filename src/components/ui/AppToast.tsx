import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ToastConfig, ToastConfigParams } from 'react-native-toast-message';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react-native';
import { C, F } from '../../theme';

const TONES = {
  success: { Icon: CheckCircle2, fg: C.success, bg: C.successBg },
  error: { Icon: AlertCircle, fg: C.danger, bg: C.dangerBg },
  info: { Icon: Info, fg: C.primaryRing, bg: '#FFEFE5' },
};

const Card = ({ text1, text2, tone }: ToastConfigParams<any> & { tone: keyof typeof TONES }) => {
  const t = TONES[tone];
  return (
    <View style={styles.card}>
      <View style={[styles.icon, { backgroundColor: t.bg }]}>
        <t.Icon size={18} color={t.fg} strokeWidth={2} />
      </View>
      <View style={styles.text}>
        {!!text1 && <Text style={styles.title}>{text1}</Text>}
        {!!text2 && <Text style={styles.body}>{text2}</Text>}
      </View>
    </View>
  );
};

/** Toasts in the new design: white card, tinted icon tile, Jakarta type. */
export const toastConfig: ToastConfig = {
  success: (p) => <Card {...p} tone="success" />,
  error: (p) => <Card {...p} tone="error" />,
  info: (p) => <Card {...p} tone="info" />,
};

const styles = StyleSheet.create({
  card: {
    width: '90%',
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    shadowColor: '#17171B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 1 },
  title: { fontFamily: F.jakartaBold, fontSize: 13, lineHeight: 19, color: C.textStrong },
  body: { fontFamily: F.jakartaRegular, fontSize: 12, lineHeight: 17, color: C.textMuted },
});
