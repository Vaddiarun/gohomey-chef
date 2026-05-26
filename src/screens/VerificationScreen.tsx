import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  KeyboardAvoidingView, 
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ImageBackground,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '../theme';
import { ChevronLeft, Utensils, ShieldCheck } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';

export const VerificationScreen = ({ navigation, route }: any) => {
  const { login } = useAuth();
  const { phoneNumber } = route.params || { phoneNumber: '98765 43210' };
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(59);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const inputRefs = useRef<Array<any>>([]);

  useEffect(() => {
    if (timer <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const formattedPhone = `+91${String(phoneNumber).replace(/\D/g, '').slice(-10)}`;
  const timerLabel = `0:${timer < 10 ? `0${timer}` : timer}`;

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      // Optionally clear the previous digit when navigating back automatically
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
    }
  };

  const handleVerify = async () => {
    const fullOtp = otp.join('');
    if (fullOtp.length < 6) {
      Toast.show({ type: 'error', text1: 'Invalid OTP', text2: 'Please enter all 6 digits.' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone: formattedPhone, otp: fullOtp }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.log('Verify API Failed:', data);
        throw new Error(data.message || 'Failed to verify OTP');
      }

      console.log('Verify API Success:', data);
      Toast.show({
        type: 'success',
        text1: 'Verification Successful',
      });

      // Navigate based on whether the user is new or registration is incomplete
      const isNewUser = data.isNewUser || data.is_new_user;
      const status = data.applicationStatus || data.application_status;
      const step = data.registrationStep || data.registration_step;
      const redirectToStatus = data.redirectToStatus || data.redirect_to_status;
      const token = data.token;

      if (status === 'APPROVED') {
        console.log('Navigation: APPROVED chef, heading to Dashboard');
        login(token); // Navigate to Main Dashboard
        return;
      }

      if (status === 'DRAFT') {
        console.log('Navigation: DRAFT chef, heading to Step', step);
        // Scenario B: Returning Chef (Incomplete Registration)
        if (step === 2) {
          navigation.navigate('RegisterStep2', { token, phoneNumber });
        } else if (step === 3) {
          navigation.navigate('RegisterStep3', { token, phoneNumber });
        } else {
          navigation.navigate('RegisterStep1', { token, phoneNumber });
        }
        return;
      }

      // Default: Scenario C: Returning Chef (Review Process)
      // Covers PENDING_REVIEW, PHONE_VETTING, KITCHEN_AUDIT, REJECTED, or APPROVED with redirectToStatus
      console.log('Navigation: STATUS screen, status:', status, 'redirectToStatus:', redirectToStatus);
      navigation.navigate('RegistrationStatus', { status, token });
    } catch (error: any) {
      console.log('Verify API Error:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Verification Failed',
        text2: error.message || 'Invalid OTP',
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
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone: formattedPhone }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('Resend OTP API Failed:', errorData);
        throw new Error(errorData.message || 'Failed to resend OTP');
      }

      setOtp(['', '', '', '', '', '']);
      setTimer(59);
      inputRefs.current[0]?.focus();
      Toast.show({
        type: 'success',
        text1: 'OTP Sent',
        text2: 'Please check your messages.',
      });
    } catch (error: any) {
      console.log('Resend OTP API Error:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Resend Failed',
        text2: error.message || 'Could not resend OTP',
      });
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <ChevronLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <View style={styles.logoBadge}>
                <Utensils size={20} color={Colors.primary} />
              </View>
              <Text style={styles.headerBrand}>THE VERDANT ATELIER</Text>
            </View>
          </View>

            <ScrollView 
              style={{ flex: 1 }} 
              contentContainerStyle={{ flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.content}>
                <Text style={styles.label}>SECURITY ACCESS</Text>
                <Text style={styles.title}>Verify Your Number</Text>
                <Text style={styles.subtitle}>
                  Enter the 6-digit code sent to <Text style={styles.phoneText}>+91 {phoneNumber}</Text>
                </Text>

                {/* OTP Input Row */}
                <View style={styles.otpRow}>
                  {otp.map((digit, index) => (
                    <View key={index} style={styles.otpBox}>
                      <TextInput
                        ref={(el) => { inputRefs.current[index] = el; }}
                        style={styles.otpInput}
                        keyboardType="number-pad"
                        maxLength={1}
                        value={digit}
                        onChangeText={(val) => handleOtpChange(val, index)}
                        onKeyPress={(e) => handleKeyPress(e, index)}
                      />
                    </View>
                  ))}
                </View>

                <TouchableOpacity 
                  style={[styles.button, loading && { opacity: 0.7 }]} 
                  onPress={handleVerify}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={Colors.background} size="small" />
                  ) : (
                    <Text style={styles.buttonText}>VERIFY & LOGIN</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.resendContainer}>
                  <TouchableOpacity
                    onPress={handleResendOtp}
                    disabled={resendLoading}
                    style={styles.resendButton}
                  >
                    {resendLoading ? (
                      <ActivityIndicator color={Colors.primary} size="small" />
                    ) : (
                      <Text style={[styles.resendText, timer > 0 && styles.resendDisabled]}>
                        RESEND CODE
                      </Text>
                    )}
                  </TouchableOpacity>
                  {timer > 0 && (
                    <Text style={styles.timerText}>Wait {timerLabel} to request new code</Text>
                  )}
                </View>
              </View>

              {/* Bottom Illustration Area */}
              <View style={styles.illustrationArea}>
                <ImageBackground 
                  source={require('../assets/images/risotto.png')} 
                  style={styles.bgImage}
                  imageStyle={{ opacity: 0.3, borderRadius: 24 }}
                >
                  <View style={styles.secureBadge}>
                    <ShieldCheck size={16} color={Colors.primary} />
                    <View style={styles.secureInfo}>
                      <Text style={styles.secureTitle}>SECURE ENTRY</Text>
                      <Text style={styles.secureText}>Encryption Active for @gohomey_chef</Text>
                    </View>
                  </View>
                </ImageBackground>
              </View>
            </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginRight: 44, // offset back button
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  headerBrand: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: 'bold',
    letterSpacing: 2,
    fontSize: 10,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 40,
    paddingBottom: 20,
  },
  label: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  title: {
    ...Typography.h1,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
  },
  phoneText: {
    color: Colors.text,
    fontWeight: 'bold',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  otpBox: {
    width: 44,
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpInput: {
    flex: 1,
    width: '100%',
    ...Typography.h2,
    color: Colors.text,
    textAlign: 'center',
  },
  button: {
    backgroundColor: Colors.primary,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  buttonText: {
    ...Typography.h3,
    color: Colors.background,
  },
  resendContainer: {
    alignItems: 'center',
  },
  resendButton: {
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  resendDisabled: {
    color: Colors.textSecondary,
  },
  timerText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  illustrationArea: {
    height: 200,
    margin: Spacing.lg,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  bgImage: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.lg,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.3)',
    alignSelf: 'flex-start',
  },
  secureInfo: {
    marginLeft: 12,
  },
  secureTitle: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 10,
  },
  secureText: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.textSecondary,
  },
});
