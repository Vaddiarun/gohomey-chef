import React, { useEffect } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { C, F } from '../theme';
import { FadeInView, PrimaryButton, SafeGif } from '../components/ui';

export type SuccessKind = 'daily' | 'fuel' | 'social' | 'pantry' | 'withdraw';

/** Copy + animation per flow — Figma "animation" frames 76:12736 / 12750 / 12764 / 12778 / 12792. */
const CONTENT: Record<SuccessKind, { gif: any; title: string; body: string; cta?: string; tab?: string }> = {
  daily: {
    gif: require('../assets/images/success_knife.gif'),
    title: 'Daily’s looking good!',
    body: 'Your meal updates are live and ready for hungry customers.',
    cta: 'View Menu',
    tab: 'Daily',
  },
  fuel: {
    gif: require('../assets/images/success_confetti.gif'),
    title: 'Fuel is officially on!',
    body: 'Your Fuel Plan is active and ready to be discovered by your customers.',
    cta: 'View Fuel Plan',
    tab: 'Fuel',
  },
  social: {
    gif: require('../assets/images/success_baubles.gif'),
    title: 'Social Table Created',
    body: 'Your Social Table is live. We’ll keep you posted when someone joins the conversation.',
    cta: 'View',
    tab: 'Social',
  },
  pantry: {
    gif: require('../assets/images/success_grocery.gif'),
    title: 'Pantry’s stocked!',
    body: 'Your item is live. Keep calm and relax — we’ll notify you when an order is placed.',
    cta: 'View Menu',
    tab: 'Pantry',
  },
  withdraw: {
    gif: require('../assets/images/success_coins.gif'),
    title: 'Money’s on the move!',
    body: 'Your withdrawal request is in. We’ll let you know as soon as it reaches your account.',
  },
};

/** Celebration screen shown after publishing; the Lordicon GIF pops in, then the copy rises. */
export const SuccessScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const kind: SuccessKind = route.params?.kind ?? 'daily';
  const c = CONTENT[kind];

  const done = () => {
    if (c.tab) {
      // Pops back to the tabs (removing this screen) and focuses the matching tab.
      navigation.navigate('Main', { screen: c.tab });
    } else {
      navigation.goBack();
    }
  };

  // Hardware back behaves like the CTA instead of returning to the finished form.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      done();
      return true;
    });
    // Withdraw has no button in Figma — return on its own after a moment.
    const timer = c.cta ? undefined : setTimeout(done, 3200);
    return () => {
      sub.remove();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="dark" />
      <View style={styles.center}>
        <FadeInView fromScale={0.6} offset={0} duration={520}>
          <SafeGif source={c.gif} style={styles.gif} />
        </FadeInView>
        <FadeInView delay={260} style={styles.titleWrap}>
          <Text style={styles.title}>{c.title}</Text>
        </FadeInView>
        <FadeInView delay={340}>
          <Text style={styles.body}>{c.body}</Text>
        </FadeInView>
        {c.cta && (
          <FadeInView delay={440} style={styles.cta}>
            <PrimaryButton label={c.cta} onPress={done} showChevron={false} />
          </FadeInView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  gif: {
    width: 202,
    height: 202,
  },
  titleWrap: {
    marginTop: 27,
  },
  title: {
    fontFamily: F.jakartaExtraBold,
    fontSize: 23,
    lineHeight: 34.5,
    color: C.text,
    textAlign: 'center',
  },
  body: {
    marginTop: 8,
    maxWidth: 260,
    fontFamily: F.jakartaRegular,
    fontSize: 14,
    lineHeight: 24,
    color: C.textMuted2,
    textAlign: 'center',
  },
  cta: {
    width: '100%',
    marginTop: 48,
    paddingLeft: 4,
  },
});
