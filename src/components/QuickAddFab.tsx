import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { PressableScale, SunsetTile } from './ui';
import { useTabBarSpace } from '../navigation/FloatingTabBar';

const ITEMS: { label: string; route: string; params?: object }[] = [
  { label: 'Add New Daily', route: 'CreateSlot' },
  { label: 'Add New Pantry', route: 'AddPantryItem', params: {} },
  { label: 'Add New Socials', route: 'CreateEvent' },
];

/**
 * Orange "+" (Figma "add new" 76:14875): opens the Add New Daily / Pantry /
 * Socials menu; the plus turns into an × and the menu springs from the corner.
 */
export const QuickAddFab = () => {
  const navigation = useNavigation<any>();
  // Figma: 26px above the tab bar's top edge.
  const bottom = useTabBarSpace() + 10;
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: open ? 1 : 0, useNativeDriver: true, speed: 18, bounciness: open ? 8 : 0 }).start();
  }, [open]);

  const go = (route: string, params?: object) => {
    setOpen(false);
    setTimeout(() => navigation.navigate(route, params), 120);
  };

  return (
    <>
      {open && <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />}
      <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
        <Animated.View
          pointerEvents={open ? 'auto' : 'none'}
          style={[
            styles.menu,
            {
              opacity: anim,
              transform: [
                { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
                { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
                { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
              ],
            },
          ]}
        >
          {ITEMS.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => go(item.route, item.params)}
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
            >
              <Text style={styles.menuText}>{item.label}</Text>
            </Pressable>
          ))}
        </Animated.View>

        <PressableScale onPress={() => setOpen((v) => !v)} pressedScale={0.9} accessibilityLabel="Add new">
          <View style={styles.fabShadow}>
            <SunsetTile>
              <Animated.View
                style={{
                  marginTop: -2,
                  transform: [{ rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '135deg'] }) }],
                }}
              >
                <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                  <Path
                    d="M10 16.6667V10M10 10V3.33333M10 10H16.6667M10 10H3.33333"
                    stroke="white"
                    strokeWidth={1.67}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </Animated.View>
            </SunsetTile>
          </View>
        </PressableScale>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 15,
    alignItems: 'flex-end',
    gap: 16,
  },
  menu: {
    width: 200,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  menuItem: {
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  menuItemPressed: {
    backgroundColor: 'rgba(29,27,32,0.08)',
  },
  // M3 Body Large — system Roboto on Android, as in the Figma menu.
  menuText: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.5,
    color: '#1D1B20',
  },
  fabShadow: {
    borderRadius: 12,
    shadowColor: '#FC4100',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
});
