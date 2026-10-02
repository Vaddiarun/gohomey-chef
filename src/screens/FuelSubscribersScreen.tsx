import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, ActivityIndicator, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { AlertCircle, Calendar, Phone, Users, Zap } from 'lucide-react-native';
import { C, F } from '../theme';
import { Chip, FadeInView, KitchenHeader, PressableScale, StatusBadge } from '../components/ui';
import type { BadgeTone } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { initials } from '../utils/fuel';

interface Subscriber {
  id: string;
  plan: { id: string; name: string; price: number; deliveriesPerWeek?: number };
  user: { id: string; name: string; phone: string };
  delivery_days?: string[];
  status?: string;
  start_date?: string;
}

const STATUS_TONE: Record<string, BadgeTone> = { ACTIVE: 'success', PAUSED: 'warning', CANCELLED: 'danger' };
const DAY_SHORT: Record<string, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun',
};

type Filter = 'ALL' | 'ACTIVE' | 'PAUSED';

/** All Fuel subscribers (GET fuel/chef/subscriptions) in the new card style. */
export const FuelSubscribersScreen = () => {
  const navigation = useNavigation<any>();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('ALL');

  const fetchSubscribers = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const url = `${process.env.EXPO_PUBLIC_API_URL}fuel/chef/subscriptions`;
        console.log('API Request: GET', url);
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        const result = await res.json();
        console.log('Fuel subscribers:', JSON.stringify(result, null, 2));
        const raw = Array.isArray(result) ? result : (result.data ?? result.subscriptions ?? []);
        setSubscribers(Array.isArray(raw) ? raw : []);
      } catch (err: any) {
        setError('Could not load subscribers.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useFocusEffect(
    useCallback(() => {
      fetchSubscribers();
    }, [fetchSubscribers])
  );

  const shown = subscribers.filter((s) => filter === 'ALL' || (s.status ?? 'ACTIVE') === filter);
  const count = (f: Filter) => subscribers.filter((s) => f === 'ALL' || (s.status ?? 'ACTIVE') === f).length;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={{ paddingTop: insets.top }}>
        <KitchenHeader
          kitchenName="Fuel Subscribers"
          subtitle={`${subscribers.length} total`}
          ownerName={user?.name}
          onBack={() => navigation.goBack()}
          onWallet={() => navigation.navigate('Wallet')}
          onProfile={() => navigation.navigate('Profile')}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchSubscribers(true)} tintColor={C.primary} colors={[C.primary]} />}
      >
        <FadeInView style={styles.filters}>
          {(['ALL', 'ACTIVE', 'PAUSED'] as Filter[]).map((f) => (
            <Chip key={f} label={`${f === 'ALL' ? 'All' : f === 'ACTIVE' ? 'Active' : 'Paused'} · ${count(f)}`} selected={filter === f} onPress={() => setFilter(f)} />
          ))}
        </FadeInView>

        {loading && !refreshing ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
        ) : error ? (
          <Pressable onPress={() => fetchSubscribers()} style={styles.empty}>
            <AlertCircle size={22} color={C.danger} />
            <Text style={styles.emptyText}>{error} Tap to retry.</Text>
          </Pressable>
        ) : shown.length === 0 ? (
          <FadeInView delay={60} style={styles.empty}>
            <Users size={24} color={C.iconMuted} />
            <Text style={styles.emptyText}>{subscribers.length ? 'Nobody matches this filter.' : 'No Fuel subscribers yet.'}</Text>
          </FadeInView>
        ) : (
          shown.map((sub, i) => (
            <FadeInView key={sub.id} delay={60 + Math.min(i, 8) * 50} style={styles.card}>
              <View style={styles.top}>
                <LinearGradient colors={['#854B48', '#E6A375', '#644970']} locations={[0.16, 0.52, 0.87]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.avatar}>
                  <Text style={styles.initials}>{initials(sub.user?.name)}</Text>
                </LinearGradient>
                <View style={styles.flex}>
                  <Text style={styles.name} numberOfLines={1}>
                    {sub.user?.name ?? 'Customer'}
                  </Text>
                  <View style={styles.planRow}>
                    <Zap size={12} color={C.primaryRing} />
                    <Text style={styles.plan} numberOfLines={1}>
                      {sub.plan?.name ?? 'Fuel Plan'}
                      {sub.plan?.price ? ` · ₹${Number(sub.plan.price).toLocaleString('en-IN')}` : ''}
                    </Text>
                  </View>
                </View>
                <StatusBadge label={(sub.status ?? 'ACTIVE').charAt(0) + (sub.status ?? 'ACTIVE').slice(1).toLowerCase()} tone={STATUS_TONE[sub.status ?? 'ACTIVE'] ?? 'neutral'} />
              </View>

              {!!sub.delivery_days?.length && (
                <View style={styles.days}>
                  {sub.delivery_days.map((d) => (
                    <View key={d} style={styles.day}>
                      <Text style={styles.dayText}>{DAY_SHORT[d] ?? d.slice(0, 3)}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.foot}>
                {!!sub.start_date && (
                  <View style={styles.footItem}>
                    <Calendar size={13} color={C.textMuted} />
                    <Text style={styles.footText}>Since {format(new Date(sub.start_date), 'd MMM yyyy')}</Text>
                  </View>
                )}
                {!!sub.user?.phone && (
                  <PressableScale style={styles.call} onPress={() => Linking.openURL(`tel:${sub.user.phone}`)} pressedScale={0.95}>
                    <Phone size={13} color={C.primary} />
                    <Text style={styles.callText}>Call</Text>
                  </PressableScale>
                )}
              </View>
            </FadeInView>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 4, gap: 12 },
  filters: { flexDirection: 'row', gap: 8 },
  card: { backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 14, gap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: F.jakartaExtraBold, fontSize: 12, color: '#3F271D' },
  name: { fontFamily: F.jakartaBold, fontSize: 13, lineHeight: 19.5, color: C.textStrong },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  plan: { flex: 1, fontFamily: F.jakartaRegular, fontSize: 11, color: C.textMuted },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  day: { backgroundColor: C.softOrange, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  dayText: { fontFamily: F.jakartaBold, fontSize: 10, color: C.primary },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footText: { fontFamily: F.jakartaSemiBold, fontSize: 11, color: C.textMuted },
  call: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.softOrange, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  callText: { fontFamily: F.jakartaBold, fontSize: 11, color: C.primary },
  empty: { backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.border, paddingVertical: 32, alignItems: 'center', gap: 10 },
  emptyText: { fontFamily: F.jakartaSemiBold, fontSize: 12, color: C.textMuted },
});
