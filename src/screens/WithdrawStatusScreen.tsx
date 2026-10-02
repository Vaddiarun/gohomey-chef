import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Ban, Check, Clock, CreditCard, X } from 'lucide-react-native';
import { C, F } from '../theme';
import { FadeInView, PressableScale, StatusHalo } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { formatRupees } from '../utils/orders';
import { bankLabel } from '../utils/wallet';

export type WithdrawState = 'PENDING' | 'APPROVED' | 'REJECTED';

const shortDate = (iso?: string) => {
  const d = iso ? new Date(iso) : undefined;
  return d && !isNaN(d.getTime()) ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : undefined;
};

/**
 * Withdrawal request status (Figma pending 76:14010 / approved 76:14054 / rejected 76:14104).
 * Params: state, reference, amount, account?, reviewedAt?, reason?, reasonDetail?
 */
export const WithdrawStatusScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const p = useRoute<any>().params ?? {};
  const state: WithdrawState = p.state ?? 'PENDING';
  const on = shortDate(p.reviewedAt);
  const account = p.account ?? bankLabel(user) ?? '—';

  const view = {
    PENDING: {
      title: 'Request submitted',
      sub: 'Awaiting admin approval',
      halo: { color: C.primary, halo: 'rgba(252,65,0,0.22)', haloInner: 'rgba(252,65,0,0.31)' },
      Icon: Clock,
      banner: { bg: 'rgba(252,65,0,0.14)', fg: C.primaryRing, Icon: Clock, text: 'Typically reviewed within 12 hours' },
      amountColor: C.primary,
    },
    APPROVED: {
      title: 'Approved',
      sub: on ? `Approved by admin on ${on}` : 'Approved by admin',
      halo: { color: C.success, halo: C.successHalo, haloInner: C.successHaloInner },
      Icon: Check,
      banner: { bg: C.successBg, fg: C.success, Icon: Check, text: 'Queued for bank transfer' },
      amountColor: C.primary,
    },
    REJECTED: {
      title: 'Request rejected',
      sub: on ? `Declined by admin on ${on}` : 'Declined by admin',
      halo: { color: C.danger, halo: C.dangerHalo, haloInner: C.dangerHaloInner },
      Icon: X,
      banner: { bg: C.dangerBg, fg: C.danger, Icon: Ban, text: p.reason || 'Request declined' },
      amountColor: '#D9A431',
    },
  }[state];

  const rows = [
    { k: 'Reference', v: p.reference || '—' },
    { k: 'Amount', v: p.amount != null ? `₹ ${Math.round(Number(p.amount)).toLocaleString('en-IN')}` : '—', color: view.amountColor },
    { k: 'Account', v: account },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <StatusHalo {...view.halo}>
            <view.Icon size={29} color={C.white} strokeWidth={2.4} />
          </StatusHalo>
          <FadeInView delay={200}>
            <Text style={styles.title}>{view.title}</Text>
          </FadeInView>
          <FadeInView delay={260}>
            <Text style={styles.sub}>{view.sub}</Text>
          </FadeInView>
        </View>

        <FadeInView delay={320} style={[styles.banner, { backgroundColor: view.banner.bg }]}>
          <view.banner.Icon size={state === 'REJECTED' ? 12 : 18} color={view.banner.fg} strokeWidth={1.8} style={state === 'REJECTED' ? { marginTop: 4 } : undefined} />
          <View style={styles.flex}>
            <Text style={[styles.bannerTitle, { color: view.banner.fg }]}>{view.banner.text}</Text>
            {state === 'REJECTED' && !!p.reasonDetail && <Text style={styles.bannerBody}>{p.reasonDetail}</Text>}
          </View>
        </FadeInView>

        <FadeInView delay={380} style={styles.card}>
          {rows.map((r) => (
            <View key={r.k} style={styles.kv}>
              <Text style={styles.k}>{r.k}</Text>
              <Text style={[styles.v, r.color ? { color: r.color } : null]}>{r.v}</Text>
            </View>
          ))}
        </FadeInView>

        {state === 'REJECTED' ? (
          <FadeInView delay={440}>
            <PressableScale style={[styles.button, styles.buttonDanger]} onPress={() => navigation.navigate('EditProfile', { section: 'bank' })} pressedScale={0.97}>
              <CreditCard size={18} color={C.danger} strokeWidth={1.67} />
              <Text style={[styles.buttonText, { color: C.danger }]}>Update payout details</Text>
            </PressableScale>
          </FadeInView>
        ) : state === 'PENDING' ? (
          <FadeInView delay={440}>
            <PressableScale style={styles.button} onPress={() => navigation.navigate('Wallet')} pressedScale={0.97}>
              <Text style={styles.buttonText}>Back to earnings</Text>
            </PressableScale>
          </FadeInView>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 29, paddingVertical: 24, gap: 16 },
  head: { alignItems: 'center', paddingTop: 8 },
  title: { marginTop: 12, fontFamily: F.jakartaBold, fontSize: 18, lineHeight: 27, letterSpacing: -0.36, color: C.textInk, textAlign: 'center' },
  sub: { marginTop: 4, fontFamily: F.jakartaRegular, fontSize: 13, lineHeight: 19.5, color: C.textMuted3, textAlign: 'center' },
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 16, borderRadius: 12 },
  bannerTitle: { fontFamily: F.jakartaBold, fontSize: 13, lineHeight: 19.5 },
  bannerBody: { fontFamily: F.jakartaRegular, fontSize: 12.5, lineHeight: 18.75, color: C.danger, opacity: 0.85 },
  card: {
    padding: 16,
    gap: 10,
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
  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  k: { fontFamily: F.jakartaRegular, fontSize: 13, lineHeight: 19.5, color: C.textMuted3 },
  v: { flexShrink: 1, fontFamily: F.jakartaBold, fontSize: 13, lineHeight: 19.5, color: C.textInk, textAlign: 'right' },
  button: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.borderCard,
    backgroundColor: C.surface,
  },
  buttonDanger: { borderColor: C.danger, backgroundColor: 'transparent' },
  buttonText: { fontFamily: F.jakartaBold, fontSize: 15, lineHeight: 22.5, letterSpacing: -0.15, color: C.textInk },
});
