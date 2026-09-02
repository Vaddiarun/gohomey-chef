import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '../theme';
import { Utensils, ArrowRight } from 'lucide-react-native';
import { ChefTip } from '../components/ChefTip';
import Toast from 'react-native-toast-message';
import { sendOtp, mapOtpError } from '../services/otpService';
import { useAuth } from '../context/AuthContext';

export const LoginScreen = ({ navigation }: any) => {
  const { sessionMessage, clearSessionMessage } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Logo Section */}
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Utensils size={40} color={Colors.primary} />
              </View>
              <Text style={styles.title}>Welcome Back, Chef</Text>
              <Text style={styles.subtitle}>Manage your atelier with precision.</Text>
            </View>

            {/* Input Section */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>MOBILE NUMBER</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="9876543210"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  maxLength={10}
                  autoFocus={true}
                />
              </View>
              <Text style={styles.hint}>We'll send a 6-digit verification code via SMS.</Text>
            </View>

            {/* Action Section */}
            <TouchableOpacity 
              style={[styles.button, (phoneNumber.length < 10 || loading) && styles.buttonDisabled]}
              onPress={handleGetOtp}
              disabled={phoneNumber.length < 10 || loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.background} size="small" />
              ) : (
                <>
                  <Text style={styles.buttonText}>GET OTP</Text>
                  <ArrowRight size={20} color={Colors.background} />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.applyLink}
              onPress={() => {
                if (phoneNumber.length < 10) {
                  Toast.show({
                    type: 'info',
                    text1: 'Enter your mobile number',
                    text2: 'We verify your number by OTP before registration.',
                  });
                  return;
                }
                handleGetOtp();
              }}
            >
              <Text style={styles.applyText}>Don't have an account? <Text style={styles.applyHighlight}>Apply to Join</Text></Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <ChefTip tip="Ensure your mobile number is updated in the atelier records to receive priority service notifications." />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  scrollContent: {
    flexGrow: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    ...Typography.h1,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: Spacing.xl,
  },
  label: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  inputWrapper: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    height: 64,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    flex: 1,
    ...Typography.h2,
    color: Colors.text,
    height: '100%',
  },
  hint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  button: {
    backgroundColor: Colors.primary,
    height: 64,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...Typography.h3,
    color: Colors.background,
    marginRight: 12,
  },
  applyLink: {
    alignItems: 'center',
  },
  applyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  applyHighlight: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  footer: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
});
