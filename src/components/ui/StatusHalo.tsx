import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

type Props = {
  color: string;
  halo: string;
  haloInner: string;
  children: React.ReactNode;
};

/**
 * 104px status medallion (Figma "span.relative" on verified / rejected):
 * the core pops in with a spring and the outer halo breathes.
 */
export const StatusHalo = ({ color, halo, haloInner, children }: Props) => {
  const pop = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 9, bounciness: 12, delay: 120 } as any).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          styles.halo,
          {
            backgroundColor: halo,
            opacity: pop,
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }],
          },
        ]}
      />
      <Animated.View style={[styles.haloInner, { backgroundColor: haloInner, opacity: pop }]} />
      <Animated.View
        style={[
          styles.core,
          {
            backgroundColor: color,
            shadowColor: color,
            transform: [{ scale: pop }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 52,
  },
  haloInner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 40,
  },
  core: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 9,
    elevation: 6,
  },
});
