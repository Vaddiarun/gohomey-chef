import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { XCircle, AlertCircle } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface StatusModalProps {
  visible: boolean;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  onClose: () => void;
  actionText?: string;
}

// PhonePe-style success animation component
const SuccessAnimation = ({ visible }: { visible: boolean }) => {
  const circleProgress = useSharedValue(0);
  const checkProgress = useSharedValue(0);
  const scale = useSharedValue(0);
  const ringOpacity = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const bgCircleOpacity = useSharedValue(0);

  const CIRCLE_SIZE = 100;
  const CENTER = CIRCLE_SIZE / 2;
  const RADIUS = 40;
  const STROKE_WIDTH = 4;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  // Checkmark path length (approximate)
  const CHECK_LENGTH = 60;

  useEffect(() => {
    if (visible) {
      // Reset
      circleProgress.value = 0;
      checkProgress.value = 0;
      scale.value = 0;
      ringOpacity.value = 0;
      pulseScale.value = 1;
      bgCircleOpacity.value = 0;

      // Step 1: Scale in with bounce
      scale.value = withSpring(1, {
        damping: 12,
        stiffness: 200,
        mass: 0.8,
      });

      // Step 2: Draw the circle ring
      ringOpacity.value = withDelay(100, withTiming(1, { duration: 200 }));
      circleProgress.value = withDelay(
        150,
        withTiming(1, {
          duration: 600,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        })
      );

      // Step 3: Fill the background circle
      bgCircleOpacity.value = withDelay(
        700,
        withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) })
      );

      // Step 4: Draw the checkmark
      checkProgress.value = withDelay(
        750,
        withTiming(1, {
          duration: 400,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        })
      );

      // Step 5: Pulse effect
      pulseScale.value = withDelay(
        1100,
        withSequence(
          withSpring(1.1, { damping: 4, stiffness: 300 }),
          withSpring(1, { damping: 8, stiffness: 200 })
        )
      );
    }
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value * pulseScale.value },
    ],
  }));

  const circleProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - circleProgress.value),
    opacity: ringOpacity.value,
  }));

  const bgCircleStyle = useAnimatedStyle(() => ({
    opacity: bgCircleOpacity.value,
    transform: [{ scale: bgCircleOpacity.value }],
  }));

  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECK_LENGTH * (1 - checkProgress.value),
  }));

  return (
    <Animated.View style={[styles.animationContainer, containerStyle]}>
      {/* Glow background */}
      <Animated.View style={[styles.glowCircle, bgCircleStyle]} />

      <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} viewBox={`0 0 ${CIRCLE_SIZE} ${CIRCLE_SIZE}`}>
        {/* Background circle (filled) */}
        <AnimatedCircle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="rgba(74, 222, 128, 0.15)"
          stroke="none"
        />

        {/* Animated ring */}
        <AnimatedCircle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke={Colors.primary}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          animatedProps={circleProps}
          transform={`rotate(-90, ${CENTER}, ${CENTER})`}
        />

        {/* Animated checkmark */}
        <AnimatedPath
          d={`M ${CENTER - 14} ${CENTER + 2} L ${CENTER - 4} ${CENTER + 12} L ${CENTER + 16} ${CENTER - 10}`}
          fill="none"
          stroke={Colors.primary}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={CHECK_LENGTH}
          animatedProps={checkProps}
        />
      </Svg>
    </Animated.View>
  );
};

export const StatusModal = ({
  visible,
  type,
  title,
  message,
  onClose,
  actionText = 'Continue',
}: StatusModalProps) => {
  const contentScale = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(30);
  const buttonOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      contentScale.value = 0;
      contentOpacity.value = 0;
      buttonTranslateY.value = 30;
      buttonOpacity.value = 0;
      textOpacity.value = 0;

      // Modal content scales in
      contentScale.value = withSpring(1, { damping: 14, stiffness: 180 });
      contentOpacity.value = withTiming(1, { duration: 300 });

      // Text fades in after animation
      textOpacity.value = withDelay(
        800,
        withTiming(1, { duration: 400 })
      );

      // Button slides up
      buttonTranslateY.value = withDelay(
        1000,
        withSpring(0, { damping: 12, stiffness: 150 })
      );
      buttonOpacity.value = withDelay(
        1000,
        withTiming(1, { duration: 300 })
      );
    }
  }, [visible]);

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: contentScale.value }],
    opacity: contentOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: buttonTranslateY.value }],
    opacity: buttonOpacity.value,
  }));

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <SuccessAnimation visible={visible} />;
      case 'error':
        return (
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
            <XCircle size={48} color={Colors.danger} />
          </View>
        );
      case 'info':
        return (
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(34, 211, 238, 0.1)' }]}>
            <AlertCircle size={48} color={Colors.cyan} />
          </View>
        );
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.modalContent, contentStyle]}>
          {getIcon()}

          <Animated.View style={textStyle}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
          </Animated.View>

          <Animated.View style={[styles.buttonWrapper, buttonStyle]}>
            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor:
                    type === 'success'
                      ? Colors.primary
                      : type === 'error'
                      ? Colors.danger
                      : Colors.cyan,
                },
              ]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>{actionText}</Text>
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
  modalContent: {
    backgroundColor: Colors.surface,
    width: '100%',
    borderRadius: 24,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  animationContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  glowCircle: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
  },
  iconContainer: {
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
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  message: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  buttonWrapper: {
    width: '100%',
  },
  button: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.background,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
