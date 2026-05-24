import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { Trash2 } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '../theme';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export const ConfirmModal = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmModalProps) => {
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(20);

  useEffect(() => {
    if (visible) {
      scale.value = 0.85;
      opacity.value = 0;
      iconScale.value = 0;
      buttonOpacity.value = 0;
      buttonTranslateY.value = 20;

      scale.value = withSpring(1, { damping: 14, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 250 });

      iconScale.value = withDelay(
        100,
        withSpring(1, { damping: 10, stiffness: 220 })
      );

      buttonOpacity.value = withDelay(200, withTiming(1, { duration: 250 }));
      buttonTranslateY.value = withDelay(
        200,
        withSpring(0, { damping: 14, stiffness: 160 })
      );
    }
  }, [visible]);

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: buttonTranslateY.value }],
    opacity: buttonOpacity.value,
  }));

  const accentColor = danger ? Colors.danger : Colors.primary;
  const iconBg = danger ? 'rgba(239, 68, 68, 0.12)' : 'rgba(74, 222, 128, 0.12)';

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, modalStyle]}>
          {/* Icon */}
          <Animated.View style={[styles.iconWrap, { backgroundColor: iconBg }, iconStyle]}>
            <Trash2 size={32} color={accentColor} />
          </Animated.View>

          {/* Text */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Buttons */}
          <Animated.View style={[styles.buttons, buttonStyle]}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
              <Text style={styles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: accentColor }]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Trash2 size={16} color={Colors.background} style={{ marginRight: 6 }} />
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    width: '100%',
    borderRadius: 24,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.h2,
    fontSize: 22,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.sm,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.lg,
  },
  buttons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  confirmText: {
    color: Colors.background,
    fontWeight: 'bold',
    fontSize: 15,
  },
});
