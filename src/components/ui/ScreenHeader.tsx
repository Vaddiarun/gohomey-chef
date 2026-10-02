import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { ArrowLeft } from 'lucide-react-native';
import { C, F } from '../../theme';
import { PressableScale } from './PressableScale';
import INBOX_ICON from '../../assets/svg/inboxIcon';

type Props = {
  title: string;
  /** Small grey caption under the title (e.g. "GoHomeyy Chef"). */
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
};

/** Back arrow + title header used by Profile / Wallet / Withdraw (Figma "header.grid" 76:13785). */
export const ScreenHeader = ({ title, subtitle, onBack, right }: Props) => (
  <View style={styles.row}>
    <View style={styles.left}>
      {onBack && (
        <PressableScale onPress={onBack} pressedScale={0.85} hitSlop={10} accessibilityLabel="Go back">
          <ArrowLeft size={20} color={C.textStrong} strokeWidth={1.67} />
        </PressableScale>
      )}
      <View style={styles.titleCol}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
    <View style={styles.right}>{right}</View>
  </View>
);

/** 36px outlined inbox button (Figma 76:13794). */
export const InboxButton = ({ onPress }: { onPress?: () => void }) => (
  <PressableScale onPress={onPress} pressedScale={0.9} style={styles.inbox} accessibilityLabel="Order history">
    <SvgXml xml={INBOX_ICON} width={18} height={18} />
  </PressableScale>
);

const styles = StyleSheet.create({
  row: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
    gap: 12,
  },
  left: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleCol: { flexShrink: 1 },
  title: { fontFamily: F.jakartaBold, fontSize: 17, lineHeight: 25.5, color: C.textStrong },
  subtitle: { fontFamily: F.jakartaSemiBold, fontSize: 10, lineHeight: 15, color: C.iconMuted },
  right: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  inbox: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
