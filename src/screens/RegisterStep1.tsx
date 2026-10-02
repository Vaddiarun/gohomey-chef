import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  BackHandler,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ChevronDown, Plus, Search } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { C, F, Radius, Shadows, T } from '../theme';
import { AuthBackground, Chip, FadeInView, OnboardingLayout, PrimaryButton } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { REG_PROGRESS, stepLabel } from './registration/shared';
import { friendlyApiError } from '../utils/apiErrors';
import { KeyboardAware } from '../components/ui/KeyboardAware';

const CUISINES = ['Indian', 'Asian', 'Continental', 'Healthy', 'Comfort Food', 'Desserts'];

/** White 46px auth field (Figma "Input Field" on Sign Up). */
const AuthField = ({ error, ...props }: React.ComponentProps<typeof TextInput> & { error?: string | null }) => (
  <View>
    <View style={[styles.authField, !!error && styles.authFieldError]}>
      <TextInput placeholderTextColor={C.placeholder} {...props} style={[T.authInput, styles.authInput, props.style]} />
    </View>
    {!!error && <Text style={styles.fieldErrorText}>{error}</Text>}
  </View>
);

export const RegisterStep1 = ({ navigation, route }: any) => {
  const { updateRegistrationStep } = useAuth();
  const [page, setPage] = useState<'signup' | 'cuisine'>('signup');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(String(route?.params?.phoneNumber || '').replace(/\D/g, '').slice(-10));
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [customCuisines, setCustomCuisines] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<'email' | 'phone' | null>(null);

  // Hardware back on the cuisine page returns to the sign-up card.
  useEffect(() => {
    if (page !== 'cuisine') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setPage('signup');
      return true;
    });
    return () => sub.remove();
  }, [page]);

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

  const allCuisines = useMemo(() => [...CUISINES, ...customCuisines], [customCuisines]);
  const trimmedQuery = query.trim();
  const visibleCuisines = trimmedQuery
    ? allCuisines.filter((c) => c.toLowerCase().includes(trimmedQuery.toLowerCase()))
    : allCuisines;
  const canAddCustom =
    trimmedQuery.length > 1 && !allCuisines.some((c) => c.toLowerCase() === trimmedQuery.toLowerCase());

  const toggleCuisine = (c: string) =>
    setCuisines((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const addCustomCuisine = () => {
    if (!canAddCustom) return;
    setCustomCuisines((prev) => [...prev, trimmedQuery]);
    setCuisines((prev) => [...prev, trimmedQuery]);
    setQuery('');
  };

  const handleSignUp = () => {
    if (!firstName.trim() || !email.trim() || phone.length < 10) {
      Toast.show({
        type: 'error',
        text1: 'Missing Fields',
        text2: 'Please enter your name, email and mobile number.',
      });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      Toast.show({ type: 'error', text1: 'Invalid email', text2: 'Please enter a valid email address.' });
      return;
    }
    setPage('cuisine');
  };

  const handleNext = async () => {
    if (!fullName || !email || !phone || cuisines.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Missing Fields',
        text2: 'Please pick at least one cuisine.',
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
          email: email.trim(),
          mobile_number: `+91${phone}`,
          primary_cuisine: cuisines.join(', '),
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
        const friendly = friendlyApiError(response.status, errorData, 'We could not save your details. Please try again.');
        Toast.show({ type: 'error', text1: friendly.title, text2: friendly.message });
        if (friendly.field === 'email' || friendly.field === 'phone') {
          // Back to the sign-up card so the chef can correct it.
          setPage('signup');
          setFieldError(friendly.field);
        }
        return;
      }

      console.log('Step 1 API Success');
      await updateRegistrationStep(2);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Personal info saved successfully.',
      });
      navigation.navigate('RegisterStep2', { email: email.trim(), token, phoneNumber: phone });
    } catch (error: any) {
      console.log('Step 1 API Error caught:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Connection problem',
        text2: 'Please check your internet and try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (page === 'cuisine') {
    return (
      <OnboardingLayout
        onBack={() => setPage('signup')}
        progress={REG_PROGRESS.cuisine}
        progressFrom={0}
        footer={<PrimaryButton label="Continue" onPress={handleNext} loading={loading} />}
      >
        <FadeInView style={styles.titleBlock}>
          <Text style={T.screenTitle}>Cuisine & Speciality</Text>
          <Text style={T.subtitle}>{stepLabel(1)}</Text>
        </FadeInView>

        <FadeInView delay={80} style={styles.cuisineBody}>
          <View style={styles.search}>
            <Search size={16} color={C.textMuted2} strokeWidth={1.33} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search options"
              placeholderTextColor={C.textMuted2}
              style={styles.searchInput}
              returnKeyType="done"
              onSubmitEditing={addCustomCuisine}
            />
          </View>

          <View style={styles.chips}>
            {visibleCuisines.map((c, i) => (
              <FadeInView key={c} delay={120 + i * 40} offset={8}>
                <Chip label={c} selected={cuisines.includes(c)} onPress={() => toggleCuisine(c)} />
              </FadeInView>
            ))}
            {canAddCustom && (
              <FadeInView offset={8}>
                <Pressable style={styles.addChip} onPress={addCustomCuisine}>
                  <Plus size={14} color={C.primary} />
                  <Text style={[T.chip, { color: C.primary }]}>Add “{trimmedQuery}”</Text>
                </Pressable>
              </FadeInView>
            )}
          </View>
        </FadeInView>
      </OnboardingLayout>
    );
  }

  return (
    <AuthBackground>
      <StatusBar style="light" />
      <KeyboardAware style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
          <FadeInView fromScale={0.96} offset={24} duration={520} style={styles.card}>
            <View style={styles.signUpHead}>
              <FadeInView delay={150}>
                <Text style={T.authTitle}>Sign Up</Text>
              </FadeInView>
              <FadeInView delay={210} style={styles.loginRow}>
                <Text style={styles.loginMuted}>Already have an account? </Text>
                <Pressable onPress={() => navigation.navigate('Login')} hitSlop={8}>
                  <Text style={styles.loginLink}>Log In</Text>
                </Pressable>
              </FadeInView>
            </View>

            <View style={styles.fields}>
              <FadeInView delay={270} style={styles.nameRow}>
                <View style={styles.flex}>
                  <AuthField placeholder="First name" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
                </View>
                <View style={styles.flex}>
                  <AuthField placeholder="Last name" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
                </View>
              </FadeInView>
              <FadeInView delay={320}>
                <AuthField
                  placeholder="Email address"
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    if (fieldError === 'email') setFieldError(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  error={fieldError === 'email' ? 'This email is already registered' : null}
                />
              </FadeInView>
              <FadeInView delay={370}>
                <View style={[styles.authField, styles.phoneField, fieldError === 'phone' && styles.authFieldError]}>
                  <View style={styles.country}>
                    <Text style={styles.flag}>🇮🇳</Text>
                    <ChevronDown size={12} color={C.inputText} />
                  </View>
                  <TextInput
                    style={[T.authInput, styles.authInput, styles.phoneInput]}
                    placeholder="Mobile number"
                    placeholderTextColor={C.placeholder}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={(v) => {
                      setPhone(v.replace(/\D/g, '').slice(0, 10));
                      if (fieldError === 'phone') setFieldError(null);
                    }}
                    maxLength={10}
                  />
                </View>
              </FadeInView>
            </View>

            <FadeInView delay={430}>
              <PrimaryButton label="Sign Up" onPress={handleSignUp} />
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
    paddingVertical: 24,
  },
  card: {
    width: 327,
    maxWidth: '100%',
    backgroundColor: C.glass,
    borderRadius: Radius.auth,
    padding: 24,
    gap: 24,
  },
  signUpHead: {
    alignItems: 'center',
    gap: 12,
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginMuted: {
    fontFamily: F.interMedium,
    fontSize: 12,
    lineHeight: 16.8,
    letterSpacing: -0.12,
    color: 'rgba(23,23,26,0.61)',
  },
  loginLink: {
    fontFamily: F.interSemiBold,
    fontSize: 12,
    lineHeight: 16.8,
    letterSpacing: -0.12,
    color: 'rgba(23,23,26,0.61)',
    textDecorationLine: 'underline',
  },
  fields: {
    gap: 16,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 16,
  },
  authField: {
    height: 46,
    borderRadius: Radius.auth,
    borderWidth: 1,
    borderColor: C.borderAuth,
    backgroundColor: C.surface,
    paddingHorizontal: 14,
    justifyContent: 'center',
    overflow: 'hidden',
    ...Shadows.input,
  },
  authFieldError: {
    borderColor: C.danger,
  },
  fieldErrorText: {
    fontFamily: F.interMedium,
    fontSize: 11,
    lineHeight: 16,
    color: C.danger,
    marginTop: 4,
    marginLeft: 2,
  },
  authInput: {
    height: '100%',
    paddingVertical: 0,
  },
  phoneField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 0,
    gap: 10,
  },
  country: {
    width: 62,
    height: 48,
    borderRightWidth: 1,
    borderColor: C.borderAuth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  flag: {
    fontSize: 16,
  },
  phoneInput: {
    flex: 1,
  },
  // ── Cuisine page ──
  titleBlock: {
    marginTop: 20,
  },
  cuisineBody: {
    gap: 16,
    marginTop: 8,
  },
  search: {
    height: 44,
    borderRadius: Radius.field,
    borderWidth: 1,
    borderColor: C.searchBorder,
    backgroundColor: C.searchBg,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
    fontFamily: F.jakartaRegular,
    fontSize: 12,
    color: C.text,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.chip,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.primary,
  },
});
