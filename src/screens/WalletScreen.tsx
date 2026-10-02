import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { ArrowUpRight, Ellipsis, IndianRupee, Landmark, Wallet } from 'lucide-react-native';
import { C, F } from '../theme';
import { FadeInView, PressableScale, PrimaryButton, ScreenHeader } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useChefOrders } from '../hooks/useChefOrders';
import { formatRupees } from '../utils/orders';
import { platformFee } from '../utils/meals';
import { entryWhen, walletSummary } from '../utils/wallet';
import { fetchWallet, fetchWithdrawals, statusParams, WalletInfo, Withdrawal, withdrawalLabel, withdrawalTone } from '../utils/withdrawals';

const TILE_GRADIENT = ['#FF7A5C', '#FCB997', '#FFF5ED'] as const;

/** Wallet (Figma 76:13846). Figures are derived from orders until a wallet API exists. */
export const WalletScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const { orders, loading, refreshing, fetchOrders } = useChefOrders();
  const [server, setServer] = useState<WalletInfo | undefined>();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  const loadPayouts = useCallback(() => {
    fetchWallet(token).then(setServer);
    fetchWithdrawals(token).then((w) => setWithdrawals(w ?? []));
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
      loadPayouts();
    }, [fetchOrders, loadPayouts])
  );

  // Server wallet figures (when the API exists) override the order-derived ones.
  const summary = useMemo(() => walletSummary(orders, server?.platform_fee_flat ?? platformFee(user), { ...user, ...server }), [orders, user, server]);
  const show = (n: number) => (loading && orders.length === 0 ? '—' : formatRupees(n));

  const openOrders = () => navigation.navigate('Main', { screen: 'Dashboard', params: { screen: 'Orders' } });
  const latest = withdrawals[0];
  const openPayouts = () =>
    latest
      ? navigation.navigate('WithdrawStatus', statusParams(latest))
      : Toast.show({ type: 'info', text1: 'No withdrawals yet', text2: 'Your withdrawal requests will show up here.' });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <ScreenHeader title="Wallet" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { fetchOrders(true); loadPayouts(); }} tintColor={C.primary} colors={[C.primary]} />}
      >
        {/* Earnings card (76:13864) */}
        <FadeInView offset={12} fromScale={0.97}>
          <LinearGradient
            colors={['#C83406', '#E64611', '#FF9E75']}
            locations={[0, 0.52, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.eyebrow}>THIS MONTH</Text>
                <Text style={styles.heroAmount} numberOfLines={1} adjustsFontSizeToFit>
                  {show(summary.monthEarnings)}
                </Text>
                <Text style={styles.heroCaption}>Total Earnings</Text>
              </View>
              <PressableScale onPress={openOrders} hitSlop={10} pressedScale={0.85} accessibilityLabel="Order history">
                <Ellipsis size={20} color={C.white} strokeWidth={1.67} />
              </PressableScale>
            </View>
            <View style={styles.split}>
              <View style={styles.splitBox}>
                <Text style={styles.splitLabel}>AVAILABLE</Text>
                <Text style={styles.splitValue} numberOfLines={1} adjustsFontSizeToFit>
                  {show(summary.available)}
                </Text>
              </View>
              <View style={styles.splitBox}>
                <Text style={styles.splitLabel}>PENDING</Text>
                <Text style={styles.splitValue} numberOfLines={1} adjustsFontSizeToFit>
                  {show(summary.pending)}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </FadeInView>

        {/* Shortcut tiles (76:13886) */}
        <View style={styles.tiles}>
          {[
            { Icon: Wallet, title: 'Wallet', sub: 'View balance', onPress: () => navigation.navigate('Withdraw', { available: summary.available }) },
            { Icon: Landmark, title: 'Payouts', sub: 'Track payouts', onPress: openPayouts },
          ].map((t, i) => (
            <FadeInView key={t.title} delay={100 + i * 60} style={styles.tileWrap}>
              <PressableScale style={styles.tile} onPress={t.onPress} pressedScale={0.97}>
                <LinearGradient colors={TILE_GRADIENT} locations={[0, 0.54, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tileIcon}>
                  <t.Icon size={20} color={C.white} strokeWidth={1.67} />
                </LinearGradient>
                <Text style={styles.tileTitle}>{t.title}</Text>
                <Text style={styles.tileSub}>{t.sub}</Text>
              </PressableScale>
            </FadeInView>
          ))}
        </View>

        {/* Withdrawal requests — admin reviews, pays and updates the status. */}
        {withdrawals.length > 0 && (
          <FadeInView delay={180} style={styles.section}>
            <Text style={styles.sectionTitle}>Withdrawals</Text>
            {withdrawals.slice(0, 5).map((w) => {
              const tone = withdrawalTone(w.status);
              const color = tone === 'ok' ? C.successDeep : tone === 'bad' ? C.danger : C.warning;
              return (
                <PressableScale key={w.id} style={styles.entry} onPress={() => navigation.navigate('WithdrawStatus', statusParams(w))} pressedScale={0.98}>
                  <View style={styles.entryIcon}>
                    <ArrowUpRight size={16} color={C.primaryRing} strokeWidth={1.67} />
                  </View>
                  <View style={styles.entryText}>
                    <Text style={styles.entryTitle} numberOfLines={1}>
                      {w.reference ?? 'Withdrawal'}
                    </Text>
                    <Text style={styles.entryWhen}>{w.created_at ? entryWhen(new Date(w.created_at)) : ''}</Text>
                  </View>
                  <View style={styles.entryRight}>
                    <Text style={[styles.entryAmount, { color: C.textStrong }]}>− {formatRupees(w.amount)}</Text>
                    <Text style={[styles.entryStatus, { color }]}>{withdrawalLabel(w.status)}</Text>
                  </View>
                </PressableScale>
              );
            })}
          </FadeInView>
        )}

        {/* Recent earnings (76:13903) */}
        <FadeInView delay={200} style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Recent Earnings</Text>
            <PressableScale onPress={openOrders} hitSlop={8} pressedScale={0.9}>
              <Text style={styles.seeAll}>See all</Text>
            </PressableScale>
          </View>
          {summary.recent.length === 0 ? (
            <Text style={styles.empty}>{loading ? 'Loading earnings…' : 'Completed orders will show up here.'}</Text>
          ) : (
            summary.recent.map((e, i) => (
              <FadeInView key={e.id} delay={240 + Math.min(i, 6) * 40} style={styles.entry}>
                <View style={styles.entryIcon}>
                  <IndianRupee size={16} color={C.primaryRing} strokeWidth={1.67} />
                </View>
                <View style={styles.entryText}>
                  <Text style={styles.entryTitle} numberOfLines={1}>
                    {e.title}
                  </Text>
                  <Text style={styles.entryWhen}>{e.when}</Text>
                </View>
                <View style={styles.entryRight}>
                  <Text style={[styles.entryAmount, e.status === 'Pending' && { color: C.iconMuted }]}>+ {formatRupees(e.amount)}</Text>
                  <Text style={styles.entryStatus}>{e.status}</Text>
                </View>
              </FadeInView>
            ))
          )}
        </FadeInView>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
        <PrimaryButton label="Withdraw" onPress={() => navigation.navigate('Withdraw', { available: summary.available })} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 20, paddingBottom: 24, gap: 16 },
  hero: {
    borderRadius: 24,
    padding: 20,
    gap: 24,
    shadowColor: '#15151A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow: { fontFamily: F.jakartaBold, fontSize: 10, lineHeight: 15, letterSpacing: 0.5, color: 'rgba(255,255,255,0.7)' },
  heroAmount: { marginTop: 8, fontFamily: F.jakartaBold, fontSize: 34, lineHeight: 51, color: C.white },
  heroCaption: { fontFamily: F.jakartaRegular, fontSize: 11, lineHeight: 16.5, color: 'rgba(255,255,255,0.75)' },
  split: { flexDirection: 'row', gap: 12 },
  splitBox: { flex: 1, padding: 12, gap: 3, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)' },
  splitLabel: { fontFamily: F.jakartaBold, fontSize: 9, lineHeight: 13.5, color: 'rgba(255,255,255,0.65)' },
  splitValue: { fontFamily: F.jakartaBold, fontSize: 17, lineHeight: 25.5, color: C.white },
  tiles: { flexDirection: 'row', gap: 12 },
  tileWrap: { flex: 1 },
  tile: { padding: 16, borderRadius: 18, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  tileIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { marginTop: 12, fontFamily: F.jakartaBold, fontSize: 12, lineHeight: 18, color: C.textStrong },
  tileSub: { fontFamily: F.jakartaRegular, fontSize: 9, lineHeight: 13.5, color: C.textMuted },
  section: { gap: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: F.jakartaBold, fontSize: 13, lineHeight: 19.5, color: C.textStrong },
  seeAll: { fontFamily: F.jakartaBold, fontSize: 10, lineHeight: 15, color: C.primaryRing },
  empty: { paddingVertical: 20, textAlign: 'center', fontFamily: F.jakartaSemiBold, fontSize: 12, color: C.textMuted },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  entryIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFEFE5', alignItems: 'center', justifyContent: 'center' },
  entryText: { flex: 1 },
  entryTitle: { fontFamily: F.jakartaBold, fontSize: 11, lineHeight: 16.5, color: C.textStrong },
  entryWhen: { fontFamily: F.jakartaRegular, fontSize: 9, lineHeight: 13.5, color: C.iconMuted },
  entryRight: { alignItems: 'flex-end' },
  entryAmount: { fontFamily: F.jakartaBold, fontSize: 11, lineHeight: 16.5, color: C.successDeep },
  entryStatus: { fontFamily: F.jakartaRegular, fontSize: 8, lineHeight: 12, color: C.iconMuted },
  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: C.bg },
});
