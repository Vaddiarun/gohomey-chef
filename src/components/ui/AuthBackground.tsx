import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { C } from '../../theme';

const AUTH_BG = require('../../assets/images/auth_bg.jpg');

/** Full-bleed food photo behind the auth cards (Figma "Welcome"), with a slow Ken Burns drift. */
export const AuthBackground = ({ children }: { children: React.ReactNode }) => {
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 14000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 14000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={styles.root}>
      <Animated.Image
        source={AUTH_BG}
        resizeMode="cover"
        style={[
          StyleSheet.absoluteFill,
          styles.image,
          {
            transform: [
              { scale: drift.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1.1] }) },
              { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) },
            ],
          },
        ]}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: C.photoOverlay }]} />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bgWarm,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
