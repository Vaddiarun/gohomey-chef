import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Clock } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { C, F, Radius, T } from '../theme';
import { AuthBackground, FadeInView, PrimaryButton } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { verifyOtp, sendOtp, mapOtpError } from '../services/otpService';
import { readAuthPayload, isEstablishedChef } from '../services/api';
import { KeyboardAware } from '../components/ui/KeyboardAware';

const OTP_LENGTH = 6;

/** One digit cell — pops when a digit lands, glows when it is the active slot. */
const OtpCell = ({ digit, active }: { digit: string; active: boolean }) => {
  const pop = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    if (digit) {
      pop.setValue(0.82);
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 14 }).start();
    }
  }, [digit]);

  useEffect(() => {
    Animated.timing(glow, { toValue: active ? 1 : 0, duration: 160, useNativeDriver: false }).start();
  }, [active]);

  return (
    <Animated.View
      style={[
        styles.cellRing,
        { backgroundColor: glow.interpolate({ inputRange: [0, 1], outputRange: ['rgba(244,241,254,0)', C.otpActiveRing] }) },
      ]}
    >
      <Animated.View
        style={[
          styles.cell,
          { borderColor: glow.interpolate({ inputRange: [0, 1], outputRange: [C.borderCard, C.otpActive] }) },
        ]}
      >
        <Animated.Text style={[styles.cellText, { transform: [{ scale: pop }] }]}>{digit}</Animated.Text>
      </Animated.View>
    </Animated.View>
  );
};

export const VerificationScreen = ({ navigation, route }: any) => {
  const { login, beginRegistration } = useAuth();
  const { phoneNumber } = route.params || { phoneNumber: '98765 43210' };
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(59);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [focused, setFocused] = useState(true);
  const inputRef = useRef<TextInput>(null);
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (timer <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const digitsOnly = String(phoneNumber).replace(/\D/g, '').slice(-10);
  const formattedPhone = `+91${digitsOnly}`;
  const maskedPhone = `+91 ${digitsOnly.slice(0, 2)}•• ••• ${digitsOnly.slice(-3)}`;
  const timerLabel = `0:${timer < 10 ? `0${timer}` : timer}`;

  const runShake = () => {
    shake.setValue(0);
    Animated.sequence(
      [10, -10, 7, -7, 0].map((toValue) =>
        Animated.timing(shake, { toValue, duration: 55, easing: Easing.linear, useNativeDriver: true })
      )
    ).start();
  };

  const handleVerify = async () => {
    const fullOtp = otp;
    if (fullOtp.length < OTP_LENGTH) {
      runShake();
      Toast.show({ type: 'error', text1: 'Invalid OTP', text2: 'Please enter all 6 digits.' });
      return;
    }

    setLoading(true);
    try {
      const data = await verifyOtp(formattedPhone, fullOtp);

      console.log('Verify API Success:', data);
      Toast.show({
        type: 'success',
        text1: 'Verification Successful',
      });

      const payload = readAuthPayload(data);
      const { token, user, registrationStep, applicationStatus } = payload;

      // Not an established chef yet — brand-new number, an existing role:USER
      // account, or a chef with an unfinished draft. The token is a USER-role
      // registration token (it will 403 on chef routes, by design), so persist
      // it for resume and drop into the signup flow — never the dashboard.
      if (!isEstablishedChef(payload)) {
        const step = registrationStep || 1;
        console.log('Navigation: not-yet-a-chef, heading to registration step', step);
        await beginRegistration({ token, step, phoneNumber });
        const target = step === 3 ? 'RegisterStep3' : step === 2 ? 'RegisterStep2' : 'RegisterStep1';
        // Drop the used OTP screen so "back" from signup returns to Login.
        navigation.reset({
          index: 1,
          routes: [{ name: 'Login' }, { name: target, params: { token, phoneNumber } }],
        });
        return;
      }

      // Established chef: store the real session. The navigator then routes to
      // the dashboard (APPROVED) or the review status screen (PENDING_REVIEW,
      // PHONE_VETTING, KITCHEN_AUDIT, REJECTED) based on the profile status.
      console.log('Navigation: established chef, status:', applicationStatus);
      await login(token, user);
    } catch (error: any) {
      console.log('Verify API Error:', error.code || error.message);
      runShake();
      Toast.show({
        type: 'error',
        text1: 'Verification Failed',
        text2: mapOtpError(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendLoading) {
      return;
    }

    if (timer > 0) {
      Toast.show({
        type: 'info',
        text1: 'Please wait',
        text2: `You can resend OTP in ${timerLabel}.`,
      });
      return;
    }

    setResendLoading(true);
    try {
      console.log('Resend OTP API Request:', formattedPhone);
      await sendOtp(formattedPhone);

      setOtp('');
      setTimer(59);
      inputRef.current?.focus();
      Toast.show({
        type: 'success',
        text1: 'OTP Sent',
        text2: 'Please check your messages.',
      });
    } catch (error: any) {
      console.log('Resend OTP API Error:', error.code || error.message);
      Toast.show({
        type: 'error',
        text1: 'Resend Failed',
        text2: mapOtpError(error),
      });
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <AuthBackground>
      <StatusBar style="light" />
      <KeyboardAware style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
          <FadeInView fromScale={0.96} offset={24} duration={520} style={styles.card}>
            <FadeInView delay={150}>
              <Text style={[T.authTitle, styles.center]}>OTP</Text>
            </FadeInView>

            <View style={styles.body}>
              <FadeInView delay={220}>
                <Text style={styles.sentTo}>
                  <Text style={styles.sentToMuted}>Code sent to </Text>
                  <Text style={styles.sentToPhone}>{maskedPhone}</Text>
                </Text>
              </FadeInView>

              <FadeInView delay={290}>
                <Pressable onPress={() => inputRef.current?.focus()}>
                  <Animated.View style={[styles.cells, { transform: [{ translateX: shake }] }]}>
                    {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                      <OtpCell
                        key={i}
                        digit={otp[i] || ''}
                        active={focused && i === Math.min(otp.length, OTP_LENGTH - 1)}
                      />
                    ))}
                  </Animated.View>
                </Pressable>
                {/* One hidden field keeps paste + SMS autofill working across all cells. */}
                <TextInput
                  ref={inputRef}
                  value={otp}
                  onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, OTP_LENGTH))}
                  keyboardType="number-pad"
                  maxLength={OTP_LENGTH}
                  autoFocus
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  style={styles.hiddenInput}
                  caretHidden
                />
              </FadeInView>

              <FadeInView delay={360}>
                <Pressable
                  style={styles.resendRow}
                  onPress={handleResendOtp}
                  disabled={resendLoading}
                  hitSlop={8}
                >
                  {resendLoading ? (
                    <ActivityIndicator size="small" color={C.primary} />
                  ) : (
                    <Clock size={14} color="rgba(23,23,26,0.62)" strokeWidth={1.17} />
                  )}
                  {timer > 0 ? (
                    <Text style={styles.resendText}>Resend code in {timerLabel}</Text>
                  ) : (
                    <Text style={[styles.resendText, styles.resendActive]}>Resend code</Text>
                  )}
                </Pressable>
              </FadeInView>

              <FadeInView delay={430}>
                <PrimaryButton label="Get Started" onPress={handleVerify} loading={loading} />
              </FadeInView>
            </View>
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
    paddingVertical: 24,
  },
  card: {
    width: 369,
    maxWidth: '100%',
    backgroundColor: C.glass,
    borderRadius: Radius.auth,
    paddingHorizontal: 26,
    paddingTop: 17,
    paddingBottom: 31,
    gap: 14,
  },
  center: {
    textAlign: 'center',
  },
  body: {
    gap: 24,
  },
  sentTo: {
    fontSize: 12.4,
    lineHeight: 19.5,
  },
  sentToMuted: {
    fontFamily: F.interRegular,
    color: 'rgba(23,23,26,0.5)',
  },
  sentToPhone: {
    fontFamily: F.interBold,
    color: C.textInk,
  },
  cells: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 58,
    alignItems: 'center',
  },
  cellRing: {
    flex: 1,
    marginHorizontal: 1.5,
    height: 58,
    borderRadius: 13,
    padding: 3,
  },
  cell: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontFamily: F.interBold,
    fontSize: 20,
    lineHeight: 30,
    color: C.textInk,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resendText: {
    fontFamily: F.interRegular,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(23,23,26,0.62)',
  },
  resendActive: {
    fontFamily: F.interSemiBold,
    color: C.primary,
  },
});
