import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight } from 'lucide-react-native';
import { C, F, Radius } from '../../theme';
import { PressableScale } from './PressableScale';

export type SheetOption = {
  label: string;
  description?: string;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: SheetOption[];
  onClose: () => void;
};

/** Bottom sheet in the app style — replaces the system Alert for "pick a source" choices. */
export const ActionSheet = ({ visible, title, subtitle, options, onClose }: Props) => {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(progress, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 4 }).start();
    } else if (mounted) {
      Animated.timing(progress, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => setMounted(false));
    }
  }, [visible]);

  if (!mounted) return null;

  // Close first, then run the action once the sheet is gone (pickers open their own UI).
  const choose = (opt: SheetOption) => {
    onClose();
    setTimeout(opt.onPress, 220);
  };

  return (
    <Modal transparent visible statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: Math.max(insets.bottom, 16) + 8 },
          { transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [420, 0] }) }] },
        ]}
      >
        <View style={styles.handle} />
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

        <View style={styles.options}>
          {options.map(({ label, description, icon: Icon, onPress }) => (
            <PressableScale key={label} style={styles.option} pressedScale={0.98} onPress={() => choose({ label, icon: Icon, onPress })}>
              <View style={styles.optionIcon}>
                <Icon size={20} color={C.primary} strokeWidth={1.67} />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionLabel}>{label}</Text>
                {!!description && <Text style={styles.optionDesc}>{description}</Text>}
              </View>
              <ChevronRight size={16} color={C.iconMuted} />
            </PressableScale>
          ))}
        </View>

        <PressableScale style={styles.cancel} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </PressableScale>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(23,23,26,0.45)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.borderInput,
    marginBottom: 16,
  },
  title: {
    fontFamily: F.jakartaBold,
    fontSize: 18,
    lineHeight: 27,
    color: C.textStrong,
  },
  subtitle: {
    fontFamily: F.jakartaRegular,
    fontSize: 12,
    lineHeight: 18,
    color: C.textMuted,
    marginTop: 2,
  },
  options: {
    marginTop: 16,
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: Radius.field,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.softOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontFamily: F.jakartaSemiBold,
    fontSize: 14,
    lineHeight: 20,
    color: C.textStrong,
  },
  optionDesc: {
    fontFamily: F.jakartaRegular,
    fontSize: 11.5,
    lineHeight: 16,
    color: C.textMuted,
  },
  cancel: {
    marginTop: 14,
    height: 48,
    borderRadius: Radius.button,
    backgroundColor: C.searchBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: F.jakartaBold,
    fontSize: 15,
    color: C.text,
  },
});
