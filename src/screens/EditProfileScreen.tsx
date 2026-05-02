import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '../theme';
import {
  ChevronLeft,
  Camera,
  User,
  Mail,
  MapPin,
  Utensils,
  FileText,
  Building2,
  CreditCard,
  Landmark,
  Check,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';

export const EditProfileScreen = ({ navigation }: any) => {
  const { user, updateProfile } = useAuth();
  const [saving, setSaving] = useState(false);

  // Personal
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');

  // Kitchen
  const [kitchenName, setKitchenName] = useState('');
  const [kitchenAddress, setKitchenAddress] = useState('');

  // Bank
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.name || '');
      setEmail(user.email || '');
      setBio(user.bio || '');
      setKitchenName(user.kitchen_name || '');
      setKitchenAddress(user.kitchen_address || '');
      setBankName(user.bank_name || '');
      setBankAccount(user.bank_account_number || '');
      setIfscCode(user.ifsc_code || '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Toast.show({ type: 'error', text1: 'Required', text2: 'Name is required' });
      return;
    }
    setSaving(true);
    try {
      const success = await updateProfile({
        name: fullName.trim(),
        email: email.trim(),
        bio: bio.trim(),
        kitchen_name: kitchenName.trim(),
        kitchen_address: kitchenAddress.trim(),
        bank_name: bankName.trim(),
        bank_account_number: bankAccount.trim(),
        ifsc_code: ifscCode.trim().toUpperCase(),
      });
      if (success) {
        Toast.show({ type: 'success', text1: 'Saved', text2: 'Profile updated successfully' });
        navigation.goBack();
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to update profile' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Something went wrong' });
    } finally {
      setSaving(false);
    }
  };

  const renderField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    Icon: any,
    options?: { placeholder?: string; multiline?: boolean; keyboardType?: any; autoCapitalize?: any }
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, options?.multiline && styles.multilineWrapper]}>
        <Icon size={18} color={Colors.primary} style={options?.multiline ? styles.multilineIcon : styles.inputIcon} />
        <TextInput
          style={[styles.input, options?.multiline && styles.multilineInput]}
          value={value}
          onChangeText={onChange}
          placeholder={options?.placeholder || ''}
          placeholderTextColor={Colors.textSecondary}
          multiline={options?.multiline}
          numberOfLines={options?.multiline ? 4 : 1}
          keyboardType={options?.keyboardType || 'default'}
          autoCapitalize={options?.autoCapitalize || 'sentences'}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
          {saving ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <>
              <Check size={16} color={Colors.background} />
              <Text style={styles.saveBtnText}>Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarCircle}>
                <User size={48} color={Colors.primary} />
              </View>
              <TouchableOpacity style={styles.cameraBtn}>
                <Camera size={16} color={Colors.background} />
              </TouchableOpacity>
            </View>
            <Text style={styles.chefName}>{fullName || 'Chef'}</Text>
            {kitchenName ? <Text style={styles.chefSubtitle}>{kitchenName}</Text> : null}
          </View>

          {/* Personal Info Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionLabel}>PERSONAL INFORMATION</Text>
            </View>
            {renderField('FULL NAME', fullName, setFullName, User, { placeholder: 'Your full name' })}
            {renderField('EMAIL', email, setEmail, Mail, { placeholder: 'chef@example.com', keyboardType: 'email-address', autoCapitalize: 'none' })}
            {renderField('BIO', bio, setBio, FileText, { placeholder: 'Tell diners about your culinary journey...', multiline: true })}
          </View>

          {/* Kitchen Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: Colors.cyan }]} />
              <Text style={styles.sectionLabel}>KITCHEN DETAILS</Text>
            </View>
            {renderField('KITCHEN NAME', kitchenName, setKitchenName, Utensils, { placeholder: 'e.g. The Emerald Atelier' })}
            {renderField('KITCHEN ADDRESS', kitchenAddress, setKitchenAddress, MapPin, { placeholder: 'Full kitchen address' })}
          </View>

          {/* Bank Details Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: '#A78BFA' }]} />
              <Text style={styles.sectionLabel}>BANK DETAILS</Text>
            </View>
            <View style={styles.bankNotice}>
              <Landmark size={14} color={Colors.warning} />
              <Text style={styles.bankNoticeText}>Accurate bank details ensure timely payouts every Friday.</Text>
            </View>
            {renderField('BANK NAME', bankName, setBankName, Building2, { placeholder: 'e.g. State Bank of India' })}
            {renderField('ACCOUNT NUMBER', bankAccount, setBankAccount, CreditCard, { placeholder: 'Your bank account number', keyboardType: 'numeric' })}
            {renderField('IFSC CODE', ifscCode, setIfscCode, Landmark, { placeholder: 'e.g. SBIN0001234', autoCapitalize: 'characters' })}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveFullBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={Colors.background} />
            ) : (
              <Text style={styles.saveFullBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
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
    ...Typography.h2,
    flex: 1,
    textAlign: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  saveBtnText: {
    color: Colors.background,
    fontWeight: 'bold',
    fontSize: 13,
  },
  container: { flex: 1 },
  contentContainer: {
    padding: Spacing.lg,
  },
  // Avatar
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surface,
    borderWidth: 3,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.background,
  },
  chefName: {
    ...Typography.h2,
    marginTop: 4,
  },
  chefSubtitle: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: 'bold',
    marginTop: 2,
  },
  // Sections
  sectionContainer: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginRight: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.textSecondary,
    letterSpacing: 1.5,
  },
  // Fields
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  multilineWrapper: {
    height: 110,
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  multilineIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  input: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
    fontSize: 14,
  },
  multilineInput: {
    textAlignVertical: 'top',
    height: '100%',
  },
  // Bank notice
  bankNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(250, 204, 21, 0.08)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.2)',
    gap: 8,
  },
  bankNoticeText: {
    ...Typography.caption,
    color: Colors.warning,
    flex: 1,
    fontSize: 11,
  },
  // Save button
  saveFullBtn: {
    backgroundColor: Colors.primary,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveFullBtnText: {
    color: Colors.background,
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
