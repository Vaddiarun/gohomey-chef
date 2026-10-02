import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import { C, F, Radius, Shadows, T } from '../theme';
import { AuthBackground, BrandMark, FadeInView, PrimaryButton } from '../components/ui';
import { sendOtp, mapOtpError } from '../services/otpService';
import { useAuth } from '../context/AuthContext';
import { KeyboardAware } from '../components/ui/KeyboardAware';

export const LoginScreen = ({ navigation }: any) => {
  const { sessionMessage, clearSessionMessage } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const focus = useRef(new Animated.Value(0)).current;

  // Surface why the user landed back here (expired / invalid session).
  useEffect(() => {
    if (sessionMessage) {
      Toast.show({ type: 'info', text1: 'Sign in required', text2: sessionMessage });
      clearSessionMessage();
    }
  }, [sessionMessage]);

  const handleGetOtp = async () => {
    if (phoneNumber.length >= 10) {
      setLoading(true);
      try {
        await sendOtp(`+91${phoneNumber}`);

        console.log('Login API Success');
        Toast.show({
          type: 'success',
          text1: 'OTP Sent',
          text2: 'Please check your messages.',
        });
        navigation.navigate('Verification', { phoneNumber });
      } catch (error: any) {
        console.log('Login API Error:', error.code || error.message);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: mapOtpError(error),
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const animateFocus = (toValue: number) =>
    Animated.timing(focus, { toValue, duration: 180, useNativeDriver: false }).start();

  return (
    <AuthBackground>
      <StatusBar style="light" />
      <KeyboardAware style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
          <FadeInView fromScale={0.96} offset={24} duration={520} style={styles.card}>
            <View style={styles.headline}>
              <FadeInView delay={150}>
                <BrandMark />
              </FadeInView>
              <View style={styles.textBlock}>
                <FadeInView delay={220}>
                  <Text style={[T.authTitle, styles.center]}>Sign in to your Account</Text>
                </FadeInView>
                <FadeInView delay={290}>
                  <Text style={[T.authSubtitle, styles.center]}>Enter your mobile number to log in</Text>
                </FadeInView>
              </View>
            </View>

            <FadeInView delay={360} style={styles.form}>
              <Animated.View
                style={[
                  styles.inputArea,
                  { borderColor: focus.interpolate({ inputRange: [0, 1], outputRange: [C.borderAuth, C.primary] }) },
                ]}
              >
                <TextInput
                  style={[T.authInput, styles.input]}
                  placeholder="Enter Your Number"
                  placeholderTextColor={C.placeholder}
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={(v) => setPhoneNumber(v.replace(/\D/g, ''))}
                  maxLength={10}
                  autoFocus
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  onFocus={() => animateFocus(1)}
                  onBlur={() => animateFocus(0)}
                  returnKeyType="done"
                  onSubmitEditing={handleGetOtp}
                />
              </Animated.View>

              <PrimaryButton
                label="Send OTP"
                onPress={handleGetOtp}
                loading={loading}
                disabled={phoneNumber.length < 10}
              />
            </FadeInView>
          </FadeInView>
        </ScrollView>
      </KeyboardAware>
    </AuthBackground>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    // Figma: card top sits at 257/917 — slightly above true centre.
    paddingBottom: 50,
    paddingTop: 24,
  },
  card: {
    width: 327,
    maxWidth: '100%',
    backgroundColor: C.glass,
    borderRadius: Radius.auth,
    padding: 24,
    alignItems: 'center',
    gap: 14,
  },
  headline: {
    alignItems: 'center',
    gap: 24,
  },
  textBlock: {
    alignItems: 'center',
    gap: 12,
  },
  center: {
    textAlign: 'center',
  },
  form: {
    width: '100%',
    gap: 24,
  },
  inputArea: {
    height: 46,
    borderRadius: Radius.auth,
    borderWidth: 1,
    backgroundColor: C.surface,
    paddingHorizontal: 14,
    justifyContent: 'center',
    ...Shadows.input,
  },
  input: {
    height: '100%',
    paddingVertical: 0,
    fontFamily: F.interMedium,
  },
});
