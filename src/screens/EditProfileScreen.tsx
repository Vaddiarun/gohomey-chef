import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Building2, CreditCard, Landmark, Mail, MapPin, User, Utensils } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { C, F, Radius } from '../theme';
import { FadeInView, FormField, PrimaryButton, ScreenHeader } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { KeyboardAware } from '../components/ui/KeyboardAware';

type Section = 'chef' | 'kitchen' | 'area' | 'bank' | 'all';

const TITLES: Record<Section, { title: string; subtitle: string }> = {
  chef: { title: 'Chef information', subtitle: 'How diners see you' },
  kitchen: { title: 'Kitchen information', subtitle: 'Your kitchen on GoHomeyy' },
  area: { title: 'Service area', subtitle: 'Where you cook from' },
  bank: { title: 'Bank details', subtitle: 'Where your payouts go' },
  all: { title: 'Edit profile', subtitle: 'GoHomeyy Chef' },
};

const icon = (Icon: any) => <Icon size={16} color={C.iconMuted} strokeWidth={1.33} />;

/** Profile editor in the new design; Profile rows open one section each. */
export const EditProfileScreen = ({ navigation, route }: any) => {
  const section: Section = route?.params?.section ?? 'all';
  const show = (s: Section) => section === 'all' || section === s;
  const { user, updateProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [kitchenName, setKitchenName] = useState('');
  const [kitchenAddress, setKitchenAddress] = useState('');
  const [bankHolderName, setBankHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  useEffect(() => {
    if (!user) return;
    setFullName(user.name || '');
    setEmail(user.email || '');
    setBio(user.bio || '');
    setKitchenName(user.kitchen_name || '');
    setKitchenAddress(user.kitchen_address || '');
    setBankHolderName(user.bank_holder_name || '');
    setBankName(user.bank_name || '');
    setBankAccount(user.bank_account_number || '');
    setIfscCode(user.ifsc_code || '');
  }, [user]);

  const handleSave = async () => {
    const data: Record<string, string> = {};
    if (show('chef')) {
      if (!fullName.trim()) {
        Toast.show({ type: 'error', text1: 'Required', text2: 'Name is required' });
        return;
      }
      Object.assign(data, { name: fullName.trim(), email: email.trim(), bio: bio.trim() });
    }
    if (show('kitchen')) data.kitchen_name = kitchenName.trim();
    if (show('kitchen') || show('area')) data.kitchen_address = kitchenAddress.trim();
    if (show('bank')) {
      if (ifscCode.trim() && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(ifscCode.trim())) {
        Toast.show({ type: 'error', text1: 'IFSC code', text2: 'Enter a valid 11-character IFSC code.' });
        return;
      }
      Object.assign(data, {
        bank_holder_name: bankHolderName.trim(),
        bank_name: bankName.trim(),
        bank_account_number: bankAccount.trim(),
        ifsc_code: ifscCode.trim().toUpperCase(),
      });
    }
    setSaving(true);
    try {
      const success = await updateProfile(data);
      if (success) {
        Toast.show({ type: 'success', text1: 'Saved', text2: 'Profile updated successfully' });
        navigation.goBack();
      } else {
        Toast.show({ type: 'error', text1: 'Could not save', text2: 'Check your internet connection and try again.' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Something went wrong' });
    } finally {
      setSaving(false);
    }
  };

  const head = TITLES[section] ?? TITLES.all;
  let delay = 0;
  const next = () => (delay += 50);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <ScreenHeader title={head.title} subtitle={head.subtitle} onBack={() => navigation.goBack()} />

      <KeyboardAware style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {show('chef') && (
            <>
              {section === 'all' && <Text style={styles.eyebrow}>PERSONAL INFORMATION</Text>}
              <FadeInView delay={next()}>
                <FormField label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your full name" autoCapitalize="words" icon={icon(User)} />
              </FadeInView>
              <FadeInView delay={next()}>
                <FormField label="Email" value={email} onChangeText={setEmail} placeholder="chef@example.com" keyboardType="email-address" autoCapitalize="none" icon={icon(Mail)} />
              </FadeInView>
              <FadeInView delay={next()} style={styles.group}>
                <Text style={styles.label}>Bio</Text>
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell diners about your culinary journey…"
                  placeholderTextColor={C.iconMuted}
                  multiline
                  textAlignVertical="top"
                  style={styles.textArea}
                />
              </FadeInView>
            </>
          )}

          {show('kitchen') && (
            <>
              {section === 'all' && <Text style={styles.eyebrow}>KITCHEN DETAILS</Text>}
              <FadeInView delay={next()}>
                <FormField label="Kitchen name" value={kitchenName} onChangeText={setKitchenName} placeholder="e.g. Amma’s Kitchen" autoCapitalize="words" icon={icon(Utensils)} />
              </FadeInView>
            </>
          )}

          {(show('kitchen') || show('area')) && (
            <FadeInView delay={next()}>
              <FormField label="Kitchen address" value={kitchenAddress} onChangeText={setKitchenAddress} placeholder="Full kitchen address" icon={icon(MapPin)} />
            </FadeInView>
          )}

          {show('bank') && (
            <>
              {section === 'all' && <Text style={styles.eyebrow}>BANK DETAILS</Text>}
              <FadeInView delay={next()} style={styles.notice}>
                <Landmark size={14} color={C.primaryRing} strokeWidth={1.67} />
                <Text style={styles.noticeText}>Accurate bank details ensure your payouts arrive on time.</Text>
              </FadeInView>
              <FadeInView delay={next()}>
                <FormField label="Account holder name" value={bankHolderName} onChangeText={setBankHolderName} placeholder="Name as per bank account" autoCapitalize="words" icon={icon(User)} />
              </FadeInView>
              <FadeInView delay={next()}>
                <FormField label="Bank name" value={bankName} onChangeText={setBankName} placeholder="e.g. State Bank of India" autoCapitalize="words" icon={icon(Building2)} />
              </FadeInView>
              <FadeInView delay={next()}>
                <FormField label="Account number" value={bankAccount} onChangeText={(v) => setBankAccount(v.replace(/\D/g, ''))} placeholder="Your bank account number" keyboardType="number-pad" icon={icon(CreditCard)} />
              </FadeInView>
              <FadeInView delay={next()}>
                <FormField label="IFSC code" value={ifscCode} onChangeText={(v) => setIfscCode(v.toUpperCase())} placeholder="e.g. SBIN0001234" autoCapitalize="characters" maxLength={11} icon={icon(Landmark)} />
              </FadeInView>
            </>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          <PrimaryButton label="Save" showChevron={false} onPress={handleSave} loading={saving} />
        </View>
      </KeyboardAware>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 14 },
  eyebrow: { marginTop: 6, fontFamily: F.jakartaBold, fontSize: 10, lineHeight: 15, letterSpacing: 0.5, color: C.primaryRing },
  group: { gap: 6 },
  label: { fontFamily: F.jakartaBold, fontSize: 11, lineHeight: 16.5, color: C.textMuted },
  textArea: {
    minHeight: 110,
    borderRadius: Radius.field,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: F.jakartaSemiBold,
    fontSize: 13,
    color: C.textStrong,
  },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: 'rgba(252,65,0,0.04)' },
  noticeText: { flex: 1, fontFamily: F.jakartaSemiBold, fontSize: 11, lineHeight: 16, color: C.textMuted },
  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: C.bg },
});
