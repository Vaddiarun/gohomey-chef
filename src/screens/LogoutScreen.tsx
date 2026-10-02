import React, { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { C, F, Radius } from '../theme';
import { FadeInView, PressableScale, PrimaryButton } from '../components/ui';
import { useAuth } from '../context/AuthContext';

const LOGO = require('../assets/images/splash_logo.png');

/** Log-out confirmation in the new design (brand logo, confirm + stay). */
export const LogoutScreen = () => {
  const { logout, user } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [leaving, setLeaving] = useState(false);
  const firstName = user?.name?.split(' ')[0];

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) + 24 }]}>
      <StatusBar style="dark" />
      <View style={styles.center}>
        <FadeInView fromScale={0.8} offset={0} duration={520}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        </FadeInView>
        <FadeInView delay={200}>
          <Text style={styles.title}>Log out{firstName ? `, ${firstName}` : ''}?</Text>
        </FadeInView>
        <FadeInView delay={280}>
          <Text style={styles.body}>You can sign back in anytime with your mobile number. Your menu, orders and earnings stay safe.</Text>
        </FadeInView>
      </View>
      <FadeInView delay={360} style={styles.actions}>
        <PrimaryButton
          label="Log out"
          showChevron={false}
          loading={leaving}
          onPress={() => {
            setLeaving(true);
            logout();
          }}
        />
        <PressableScale style={styles.stay} onPress={() => navigation.goBack()} pressedScale={0.97}>
          <Text style={styles.stayText}>Stay signed in</Text>
        </PressableScale>
      </FadeInView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 160, height: 160 },
  title: { marginTop: 24, fontFamily: F.jakartaExtraBold, fontSize: 23, lineHeight: 34.5, color: C.text, textAlign: 'center' },
  body: { marginTop: 8, maxWidth: 280, fontFamily: F.jakartaRegular, fontSize: 14, lineHeight: 24, color: C.textMuted2, textAlign: 'center' },
  actions: { gap: 10 },
  stay: { height: 52, borderRadius: Radius.button, borderWidth: 1, borderColor: C.borderCard, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  stayText: { fontFamily: F.jakartaBold, fontSize: 15, color: C.textInk },
});
