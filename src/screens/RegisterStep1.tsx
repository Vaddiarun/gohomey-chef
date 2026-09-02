import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '../theme';
import { 
  ChevronLeft, 
  User, 
  Mail, 
  Phone, 
  Utensils, 
  Info
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';

export const RegisterStep1 = ({ navigation, route }: any) => {
  const { updateRegistrationStep } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(route?.params?.phoneNumber || '');
  const [cuisine, setCuisine] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!fullName || !email || !phone || !cuisine) {
      Toast.show({
        type: 'error',
        text1: 'Missing Fields',
        text2: 'Please fill out all the fields.',
      });
      return;
    }

    const token = route.params?.token;
    if (!token) {
      Toast.show({
        type: 'error',
        text1: 'Session expired',
        text2: 'Please verify your mobile number to continue registration.',
      });
      navigation.navigate('Login');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}chefs/register/step-1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          full_name: fullName,
          email: email,
          mobile_number: `+91${phone}`,
          primary_cuisine: cuisine
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('Step 1 API Failed. Status:', response.status);
        console.log('Error Data:', JSON.stringify(errorData, null, 2));
        if (response.status === 401) {
          Toast.show({
            type: 'error',
            text1: 'Session expired',
            text2:
              errorData.code === 'TOKEN_EXPIRED'
                ? 'Your registration session expired. Please verify your number again.'
                : 'Please verify your number again.',
          });
          navigation.navigate('Login');
          return;
        }
        throw new Error(errorData.message || `Failed to submit Step 1 (Status: ${response.status})`);
      }

      console.log('Step 1 API Success');
      await updateRegistrationStep(2);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Personal info saved successfully.',
      });
      navigation.navigate('RegisterStep2', { email, token, phoneNumber: phone });
    } catch (error: any) {
      console.log('Step 1 API Error caught:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Something went wrong',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chef Registration</Text>
        <View style={styles.stepBadge}>
          <Text style={styles.stepText}>STEP 1/3</Text>
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          style={styles.container} 
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.introSection}>
            <Text style={styles.subtitle}>THE VERDANT ATELIER</Text>
            <Text style={styles.title}>Join the Atelier</Text>
            <Text style={styles.description}>
              Begin your culinary journey with our exclusive network.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>FULL NAME</Text>
              <View style={styles.inputWrapper}>
                <User size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Chef Auguste Escoffier"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <View style={styles.inputWrapper}>
                <Mail size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="auguste@cuisine.com"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>MOBILE NUMBER</Text>
              <View style={styles.inputWrapper}>
                <Phone size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+1(555) 000-0000"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>PRIMARY CUISINE</Text>
              <View style={styles.inputWrapper}>
                <Utensils size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  value={cuisine}
                  onChangeText={setCuisine}
                  placeholder="e.g. French, Italian"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
            </View>
          </View>

          <View style={styles.noteBox}>
            <View style={styles.noteHeader}>
              <Info size={16} color={Colors.primary} />
              <Text style={styles.noteTitle}>Chef's Note</Text>
            </View>
            <Text style={styles.noteText}>
              Your personal details help us curate the best matching kitchen opportunities for your specific skill set.
            </Text>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.prevBtn} disabled>
              <Text style={styles.prevBtnText}>PREVIOUS</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.nextBtn, loading && { opacity: 0.7 }]}
              onPress={handleNext}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.background} size="small" />
              ) : (
                <Text style={styles.nextBtnText}>NEXT</Text>
              )}
            </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.body,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  stepBadge: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  stepText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  introSection: {
    marginBottom: 32,
  },
  subtitle: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    ...Typography.h1,
    fontSize: 32,
    marginBottom: 12,
  },
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  form: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: 'bold',
    marginBottom: 8,
    fontSize: 10,
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    height: 60,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
  },
  noteBox: {
    backgroundColor: 'rgba(74, 222, 128, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.1)',
    marginBottom: 40,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteTitle: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
  },
  noteText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prevBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    opacity: 0.3,
  },
  prevBtnText: {
    color: Colors.textSecondary,
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  nextBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    minWidth: 120,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  nextBtnText: {
    color: Colors.background,
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 1,
  },
});
