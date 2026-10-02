import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { BadgeCheck, ChevronRight, Clock, CreditCard } from 'lucide-react-native';
import { C, F } from '../theme';
import { FadeInView, PressableScale, PrimaryButton, ScreenHeader } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { formatRupees } from '../utils/orders';
import { bankLabel, MIN_WITHDRAWAL } from '../utils/wallet';
import { fetchWallet, requestWithdrawal, statusParams } from '../utils/withdrawals';
import { KeyboardAware } from '../components/ui/KeyboardAware';

const QUICK = [2000, 5000];

/**
 * Withdraw (Figma 76:13953). Raises a request for the admin portal; admin pays
 * manually and updates the status. Shows "open soon" while the API is missing.
 */
export const WithdrawScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const [available, setAvailable] = useState(Math.max(0, Math.floor(Number(route.params?.available) || 0)));
  const [amount, setAmount] = useState('');
  const [focused, setFocused] = useState(false);
  const [sending, setSending] = useState(false);
  // One key per screen visit: a retry after a timeout can't create a second request.
  const idempotencyKey = useRef(`wd-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`).current;

  // Prefer the server's balance when the wallet API exists.
  useEffect(() => {
    fetchWallet(token).then((w) => {
      if (w?.wallet_balance != null) setAvailable(Math.max(0, Math.floor(w.wallet_balance)));
    });
  }, [token]);

  const bank = bankLabel(user);
  const value = parseInt(amount, 10) || 0;

  const submit = async () => {
    // Backend needs account number, IFSC and holder name before it accepts a request.
    if (!bank || !user?.ifsc_code || !user?.bank_holder_name?.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Complete your bank details',
        text2: !bank ? 'Payouts go to the bank account on your profile.' : 'Add the account holder name and IFSC to request a payout.',
      });
      navigation.navigate('EditProfile', { section: 'bank' });
      return;
    }
    if (value < MIN_WITHDRAWAL) {
      Toast.show({ type: 'error', text1: 'Amount too low', text2: `The minimum withdrawal is ${formatRupees(MIN_WITHDRAWAL)}.` });
      return;
    }
    if (value > available) {
      Toast.show({ type: 'error', text1: 'Not enough balance', text2: `You can withdraw up to ${formatRupees(available)}.` });
      return;
    }
    setSending(true);
    const r = await requestWithdrawal(token, value, idempotencyKey);
    setSending(false);
    if (r.ok) {
      navigation.replace('WithdrawStatus', statusParams(r.data));
      return;
    }
    if (r.unavailable) {
      // Backend route not deployed yet — never pretend the money moved.
      Toast.show({ type: 'info', text1: 'Withdrawals open soon', text2: 'We’re setting up payouts. Contact support for an urgent payout.' });
      return;
    }
    // Server rules (minimum, 2 per week, one pending at a time…) come back as readable messages.
    Toast.show({ type: 'error', text1: 'Request not sent', text2: r.message || 'Please try again.' });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <ScreenHeader title="Withdraw" onBack={() => navigation.goBack()} />

      <KeyboardAware style={styles.flex}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <FadeInView offset={10} fromScale={0.97}>
            <LinearGradient colors={['#C83406', '#E64611', '#FF9E75']} locations={[0, 0.52, 1]} start={{ x: 0.37, y: 0 }} end={{ x: 0.63, y: 1 }} style={styles.balance}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balanceValue}>{formatRupees(available)}</Text>
            </LinearGradient>
          </FadeInView>

          <FadeInView delay={80} style={styles.group}>
            <Text style={styles.label}>Amount</Text>
            <View style={[styles.ring, focused && styles.ringOn]}>
              <View style={[styles.input, focused && styles.inputOn]}>
                <Text style={styles.inputText}>₹</Text>
                <TextInput
                  value={amount ? Number(amount).toLocaleString('en-IN') : ''}
                  onChangeText={(v) => setAmount(v.replace(/\D/g, '').slice(0, 7))}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={C.iconMuted}
                  style={[styles.inputText, styles.flex]}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                />
              </View>
            </View>
          </FadeInView>

          <FadeInView delay={120} style={styles.quick}>
            {[...QUICK.map((q) => ({ label: `₹ ${q.toLocaleString('en-IN')}`, v: q })), { label: 'Max', v: available }].map((q) => {
              const active = value > 0 && value === q.v;
              return (
                <PressableScale key={q.label} style={[styles.quickItem, active && styles.quickActive]} onPress={() => setAmount(String(q.v))} pressedScale={0.95}>
                  <Text style={[styles.quickText, active && { color: C.primary }]}>{q.label}</Text>
                </PressableScale>
              );
            })}
          </FadeInView>

          <FadeInView delay={160}>
            <PressableScale style={styles.bank} onPress={() => navigation.navigate('EditProfile', { section: 'bank' })} pressedScale={0.98}>
              <View style={styles.bankIcon}>
                <CreditCard size={18} color={C.otpActive} strokeWidth={1.67} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.bankTitle}>{bank ?? 'Add bank account'}</Text>
                <Text style={styles.bankSub} numberOfLines={1}>
                  {bank ? user?.bank_holder_name || 'Payout account' : 'Needed to receive payouts'}
                </Text>
              </View>
              {bank ? <BadgeCheck size={18} color={C.success} strokeWidth={1.67} /> : <ChevronRight size={18} color={C.iconMuted} strokeWidth={1.67} />}
            </PressableScale>
          </FadeInView>

          <FadeInView delay={200} style={styles.note}>
            <Clock size={16} color={C.textMuted3} strokeWidth={1.67} style={{ marginTop: 1 }} />
            <Text style={styles.noteText}>Minimum {formatRupees(MIN_WITHDRAWAL)} · Max 2 withdrawals per week · Paid in 2–3 business days.</Text>
          </FadeInView>

          <FadeInView delay={240}>
            <PrimaryButton label="Continue" showChevron={false} onPress={submit} loading={sending} />
          </FadeInView>
        </ScrollView>
      </KeyboardAware>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  balance: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 15,
    shadowColor: '#15151A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  balanceLabel: { fontFamily: F.jakartaBold, fontSize: 15, letterSpacing: 0.5, color: 'rgba(255,255,255,0.7)' },
  balanceValue: { fontFamily: F.jakartaBold, fontSize: 15, color: C.white },
  group: { gap: 6 },
  label: { fontFamily: F.jakartaBold, fontSize: 11.8, lineHeight: 18, color: C.textMuted3 },
  ring: { borderRadius: 11, borderWidth: 3, borderColor: 'transparent', margin: -3 },
  ringOn: { borderColor: C.otpActiveRing },
  input: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.borderCard,
    backgroundColor: C.white,
  },
  inputOn: { borderColor: C.primaryRing },
  inputText: { fontFamily: F.jakartaRegular, fontSize: 15, color: C.textInk, paddingVertical: 0 },
  quick: { flexDirection: 'row', gap: 8, marginTop: -4 },
  quickItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: C.borderCard, backgroundColor: C.surface },
  quickActive: { borderColor: C.primary, backgroundColor: '#FFF5ED' },
  quickText: { fontFamily: F.jakartaBold, fontSize: 12.9, lineHeight: 19.5, color: C.textInk },
  bank: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderCard,
    backgroundColor: C.surface,
    shadowColor: '#17171B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  bankIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: C.otpActiveRing, alignItems: 'center', justifyContent: 'center' },
  bankTitle: { fontFamily: F.jakartaBold, fontSize: 13.5, lineHeight: 21, color: C.textInk },
  bankSub: { fontFamily: F.jakartaRegular, fontSize: 12, lineHeight: 18, color: C.textMuted3 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(252,65,0,0.04)' },
  noteText: { flex: 1, fontFamily: F.jakartaRegular, fontSize: 12.5, lineHeight: 18.75, color: C.textMuted3 },
});
