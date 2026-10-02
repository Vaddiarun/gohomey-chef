import React, { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { ClipboardList, LayoutDashboard, ShoppingBasket, Sparkles, Zap } from 'lucide-react-native';
import { F } from '../theme';

const ICONS: Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  Dashboard: LayoutDashboard,
  Daily: ClipboardList,
  Fuel: Zap,
  Pantry: ShoppingBasket,
  Social: Sparkles,
};

const INACTIVE = 'rgba(255,255,255,0.45)';

/** Space screens should leave at the bottom so content clears the floating bar. */
export const useTabBarSpace = () => {
  const insets = useSafeAreaInsets();
  return 66 + Math.max(insets.bottom, 12) + 24;
};

/**
 * Floating dark tab bar (Figma "div.shadow-float" 76:11710): the orange
 * gradient pill glides to the selected tab and the icons spring on tap.
 */
export const FloatingTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();
  const [layouts, setLayouts] = useState<Record<number, { x: number; width: number }>>({});
  const pillX = useRef(new Animated.Value(0)).current;
  const pillW = useRef(new Animated.Value(0)).current;
  const hide = useRef(new Animated.Value(0)).current;
  const scales = useRef(state.routes.map(() => new Animated.Value(1))).current;
  const ready = layouts[state.index] != null;

  useEffect(() => {
    const l = layouts[state.index];
    if (!l) return;
    Animated.parallel([
      Animated.spring(pillX, { toValue: l.x, useNativeDriver: false, speed: 18, bounciness: 7 }),
      Animated.spring(pillW, { toValue: l.width, useNativeDriver: false, speed: 18, bounciness: 7 }),
    ]).start();
  }, [state.index, layouts]);

  // Slide away while the keyboard is open.
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () =>
      Animated.timing(hide, { toValue: 1, duration: 180, useNativeDriver: true }).start()
    );
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      Animated.timing(hide, { toValue: 0, duration: 180, useNativeDriver: true }).start()
    );
    return () => {
      show.remove();
      hideSub.remove();
    };
  }, []);

  const focusedOptions = descriptors[state.routes[state.index].key]?.options as any;
  if (focusedOptions?.tabBarStyle?.display === 'none') return null;

  const onLayout = (i: number) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setLayouts((prev) => {
      if (prev[i]?.x === x && prev[i]?.width === width) return prev;
      if (i === state.index && prev[i] == null) {
        pillX.setValue(x);
        pillW.setValue(width);
      }
      return { ...prev, [i]: { x, width } };
    });
  };

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { paddingBottom: Math.max(insets.bottom, 12) + 8 },
        { transform: [{ translateY: hide.interpolate({ inputRange: [0, 1], outputRange: [0, 140] }) }] },
      ]}
    >
      <View style={styles.bar}>
        {ready && (
          <Animated.View style={[styles.pill, { left: pillX, width: pillW }]}>
            <LinearGradient
              colors={['#FC4100', '#FB8122', '#FAC044']}
              locations={[0, 0.56, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        )}
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const Icon = ICONS[route.name] ?? LayoutDashboard;
          const label = (descriptors[route.key].options.title as string) ?? route.name;
          const color = focused ? '#FFFFFF' : INACTIVE;

          const onPress = () => {
            Animated.sequence([
              Animated.timing(scales[i], { toValue: 0.82, duration: 90, useNativeDriver: true }),
              Animated.spring(scales[i], { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 14 }),
            ]).start();
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name as never);
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLayout={onLayout(i)}
              style={styles.item}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={label}
            >
              <Animated.View style={{ transform: [{ scale: scales[i] }] }}>
                <Icon size={18} color={color} strokeWidth={1.5} />
              </Animated.View>
              <Text style={[styles.label, { color }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 20,
  },
  bar: {
    width: '100%',
    maxWidth: 372,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#121214',
    borderRadius: 26,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#15151A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  pill: {
    position: 'absolute',
    top: 10,
    bottom: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  item: {
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  label: {
    fontFamily: F.jakartaBold,
    fontSize: 9,
    lineHeight: 13.5,
    letterSpacing: 0.225,
  },
});
