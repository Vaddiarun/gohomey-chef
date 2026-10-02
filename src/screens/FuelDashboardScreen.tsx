import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, ChevronRight, Leaf, Power } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { C, F } from '../theme';
import { FadeInView, KitchenHeader, PressableScale, Toggle } from '../components/ui';
import { FUEL, FuelNowOfferModal, FuelPlanCard, FulfillmentCard, SectionLoader, SubscriberRow } from '../components/FuelParts';
import { useTabBarSpace } from '../navigation/FloatingTabBar';
import { fmt12, FuelChefSlot, FuelPlan, FuelSubscriber, Fulfillment, isPlanEnabled } from '../utils/fuel';
import { errorText } from '../utils/apiErrors';

interface FuelNowOffer {
  session_id: string;
  expires_at: string;
  seconds_to_accept: number;
  plan_id: string;
  item_name: string;
  user_location: { latitude: number; longitude: number };
  chef: { id: string; distance: number };
}

const SUBSCRIBER_PREVIEW = 3;

export const FuelDashboardScreen = () => {
  const navigation = useNavigation<any>();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomSpace = useTabBarSpace();
  const today = format(new Date(), 'yyyy-MM-dd');

  const [fulfillments, setFulfillments] = useState<Fulfillment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isOnline, setIsOnline] = useState(false);
  const [currentOffer, setCurrentOffer] = useState<FuelNowOffer | null>(null);
  const [countdown, setCountdown] = useState(120);
  const [respondingOffer, setRespondingOffer] = useState(false);

  const [subscribers, setSubscribers] = useState<FuelSubscriber[]>([]);
  const [loadingSubscribers, setLoadingSubscribers] = useState(true);
  const [plans, setPlans] = useState<FuelPlan[]>([]);
  const [enabledSlots, setEnabledSlots] = useState<FuelChefSlot[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [enablingPlanId, setEnablingPlanId] = useState<string | null>(null);

  const sseXhrRef = useRef<XMLHttpRequest | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}fuel/chef/plans`;
      console.log('API Request: GET', url);
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      console.log('Fuel chef plans:', JSON.stringify(result, null, 2));
      const raw = Array.isArray(result) ? result : (result.data ?? result.plans ?? []);
      setPlans(Array.isArray(raw) ? raw : []);
    } catch (err) {
      console.warn('Failed to fetch Fuel plans:', err);
      setPlans([]);
    } finally {
      setLoadingPlans(false);
    }
  }, [token]);

  const fetchEnabledSlots = useCallback(async () => {
    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}fuel/chef/slots`;
      console.log('API Request: GET', url);
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      console.log('Fuel chef enabled slots:', JSON.stringify(result, null, 2));
      const raw = Array.isArray(result) ? result : (result.data ?? result.slots ?? []);
      setEnabledSlots(Array.isArray(raw) ? raw : []);
    } catch (err) {
      console.warn('Failed to fetch enabled Fuel slots:', err);
      setEnabledSlots([]);
    }
  }, [token]);

  const handleEnablePlan = async (planId: string) => {
    if (enablingPlanId) return;
    setEnablingPlanId(planId);
    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}fuel/chef/slots`;
      console.log('API Request: POST', url, { plan_id: planId });
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId }),
      });
      const result = await res.json().catch(() => ({}));
      console.log('Fuel enable plan:', JSON.stringify(result, null, 2));
      if (!res.ok) {
        throw new Error(result.message || 'Could not enable Fuel plan');
      }

      Toast.show({ type: 'success', text1: 'Fuel plan enabled' });
      await Promise.all([fetchPlans(), fetchEnabledSlots()]);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Enable failed', text2: errorText(err, 'Please try again.') });
    } finally {
      setEnablingPlanId(null);
    }
  };

  // ── Subscribers ─────────────────────────────────────────────────────────────

  const fetchSubscribers = useCallback(async () => {
    setLoadingSubscribers(true);
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
    } catch (err) {
      console.warn('Failed to fetch subscribers:', err);
      setSubscribers([]);
    } finally {
      setLoadingSubscribers(false);
    }
  }, [token]);

  // ── Fulfillments ────────────────────────────────────────────────────────────

  const fetchFulfillments = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const url = `${process.env.EXPO_PUBLIC_API_URL}fuel/chef/fulfillments?date=${today}`;
        console.log('API Request: GET', url);
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        const result = await res.json();
        console.log('Fuel fulfillments:', JSON.stringify(result, null, 2));
        const raw = Array.isArray(result) ? result : (result.data ?? result.fulfillments ?? []);
        setFulfillments(Array.isArray(raw) ? raw : []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [today, token]
  );

  useFocusEffect(
    useCallback(() => {
      fetchPlans();
      fetchEnabledSlots();
      fetchSubscribers();
      fetchFulfillments();
    }, [fetchPlans, fetchEnabledSlots, fetchSubscribers, fetchFulfillments])
  );

  // ── Status Update ───────────────────────────────────────────────────────────

  const handleStatusUpdate = async (fulfillmentId: string, status: string) => {
    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}fuel/fulfillments/${fulfillmentId}/status`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const result = await res.json();
      if (res.ok) {
        setFulfillments(prev =>
          prev.map(f => (f.id === fulfillmentId ? { ...f, delivery_status: status } : f))
        );
        Toast.show({ type: 'success', text1: 'Status updated' });
      } else {
        Toast.show({ type: 'error', text1: result.message || 'Update failed' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Network error. Try again.' });
    }
  };

  // ── Fuel NOW SSE ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOnline || !token) {
      if (sseXhrRef.current) {
        sseXhrRef.current.abort();
        sseXhrRef.current = null;
      }
      setCurrentOffer(null);
      return;
    }

    let active = true;
    let buffer = '';

    const connect = () => {
      if (!active) return;
      const xhr = new XMLHttpRequest();
      const url = `${process.env.EXPO_PUBLIC_API_URL}fuel/now/chef-stream?token=${token}`;
      console.log('SSE connect:', url);
      xhr.open('GET', url, true);
      xhr.setRequestHeader('Accept', 'text/event-stream');
      xhr.setRequestHeader('Cache-Control', 'no-cache');

      let processed = 0;

      xhr.onprogress = () => {
        const raw = xhr.responseText.slice(processed);
        processed = xhr.responseText.length;
        buffer += raw;

        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() ?? '';

        for (const block of blocks) {
          let etype = '';
          let edata = '';
          for (const line of block.split('\n')) {
            if (line.startsWith('event:')) etype = line.slice(6).trim();
            else if (line.startsWith('data:')) edata = line.slice(5).trim();
          }
          if (!etype) continue;

          if (etype === 'fuel_now_offer') {
            try {
              const offer: FuelNowOffer = JSON.parse(edata);
              setCurrentOffer(offer);
              setCountdown(offer.seconds_to_accept ?? 120);
            } catch (e) {
              console.warn('parse offer error', e);
            }
          } else if (
            etype === 'fuel_now_accepted' ||
            etype === 'fuel_now_rejected' ||
            etype === 'fuel_now_expired'
          ) {
            setCurrentOffer(null);
            if (etype === 'fuel_now_expired')
              Toast.show({ type: 'error', text1: 'Fuel NOW offer expired' });
          }
        }
      };

      xhr.onload = () => { if (active) setTimeout(connect, 3000); };
      xhr.onerror = () => { if (active) setTimeout(connect, 5000); };
      xhr.send();
      sseXhrRef.current = xhr;
    };

    connect();

    return () => {
      active = false;
      if (sseXhrRef.current) {
        sseXhrRef.current.abort();
        sseXhrRef.current = null;
      }
    };
  }, [isOnline, token]);

  // ── Countdown ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (!currentOffer) return;

    countdownTimerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(countdownTimerRef.current!);
          setCurrentOffer(null);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [currentOffer]);

  // ── Respond to Offer ────────────────────────────────────────────────────────

  const handleRespondOffer = async (accepted: boolean) => {
    if (!currentOffer || respondingOffer) return;
    setRespondingOffer(true);
    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}fuel/now/dispatch/${currentOffer.session_id}/respond`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted }),
      });
      const result = await res.json();
      if (res.ok) {
        setCurrentOffer(null);
        Toast.show({
          type: accepted ? 'success' : 'info',
          text1: accepted ? 'Order accepted! Check your tasks.' : 'Offer declined.',
        });
        if (accepted) fetchFulfillments();
      } else {
        Toast.show({ type: 'error', text1: result.message || 'Response failed' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Network error. Try again.' });
    } finally {
      setRespondingOffer(false);
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const grouped = fulfillments.reduce<Record<string, Fulfillment[]>>((acc, f) => {
    const slot = f.delivery_time_slot || 'Unscheduled';
    if (!acc[slot]) acc[slot] = [];
    acc[slot].push(f);
    return acc;
  }, {});
  const sortedSlots = Object.keys(grouped).sort();

  const activePlans = plans.filter((plan) => isPlanEnabled(plan, enabledSlots));
  const availablePlans = plans.filter((plan) => !isPlanEnabled(plan, enabledSlots));
  const activeSubscribers = subscribers.filter((s) => (s.status ?? 'ACTIVE') === 'ACTIVE');
  const kitchenName = user?.kitchen_name || (user?.name ? `${user.name.split(' ')[0]}’s Kitchen` : 'My Kitchen');

  const openPlan = (plan: FuelPlan) =>
    navigation.navigate('FuelPlanDetail', {
      plan,
      enabled: isPlanEnabled(plan, enabledSlots),
      subscriberCount: subscribers.filter((s) => s.plan?.id === plan.id).length,
    });

  const onRefresh = () => {
    fetchPlans();
    fetchEnabledSlots();
    fetchSubscribers();
    fetchFulfillments(true);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <FuelNowOfferModal offer={currentOffer} countdown={countdown} responding={respondingOffer} onRespond={handleRespondOffer} />

      <View style={[styles.headerWrap, { paddingTop: insets.top }]}>
        <KitchenHeader
          kitchenName={kitchenName}
          ownerName={user?.name}
          onInbox={() => navigation.navigate('FuelSubscribers')}
          onProfile={() => navigation.navigate('Profile')}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomSpace + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
      >
        {/* Impact */}
        <FadeInView>
          <LinearGradient colors={['#FC4100', '#FB8122', '#E64611']} start={{ x: 0, y: 0.2 }} end={{ x: 1, y: 0.8 }} style={styles.impact}>
            <View style={styles.leaf}>
              <Leaf size={82} color="rgba(255,255,255,0.25)" strokeWidth={1.4} />
            </View>
            <Text style={styles.impactTitle}>YOUR FUEL IMPACT</Text>
            <View style={styles.impactRow}>
              {[
                { value: subscribers.length, label: 'Total Subscribers' },
                { value: fulfillments.length, label: 'Meals Today' },
                { value: activePlans.length, label: 'Active Plans' },
              ].map((s, i) => (
                <View key={s.label} style={[styles.impactCell, i < 2 && styles.impactDivider, i > 0 && { paddingLeft: 12 }]}>
                  <Text style={styles.impactValue}>{s.value}</Text>
                  <Text style={styles.impactLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </FadeInView>

        {/* Fuel Now */}
        <FadeInView delay={70} style={styles.nowCard}>
          <View style={styles.nowIcon}>
            <Power size={18} color={FUEL.primary} strokeWidth={1.5} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.nowTitle}>Fuel Now</Text>
            <Text style={styles.nowSub}>{isOnline ? 'Online — receiving instant Fuel orders' : 'Go online and start fulfilling Fuel orders'}</Text>
          </View>
          <Text style={styles.nowState}>{isOnline ? 'ON' : 'OFF'}</Text>
          <Toggle value={isOnline} onValueChange={setIsOnline} activeColor="#E64611" />
        </FadeInView>

        {/* Today's deliveries (existing fulfilment flow) */}
        {(loading || fulfillments.length > 0 || !!error) && (
          <FadeInView delay={110} style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.h2}>Today's Fuel Deliveries</Text>
              <Text style={styles.sub}>{format(new Date(), 'EEEE, d MMM')}</Text>
            </View>
            {loading && !refreshing ? (
              <SectionLoader />
            ) : error ? (
              <Pressable onPress={() => fetchFulfillments()} style={styles.errorRow}>
                <AlertCircle size={14} color={C.danger} />
                <Text style={styles.errorText}>Could not load today's deliveries. Tap to retry.</Text>
              </Pressable>
            ) : (
              sortedSlots.map((slot) => (
                <View key={slot} style={styles.slotGroup}>
                  <Text style={styles.slotTime}>
                    {fmt12(slot) || 'Unscheduled'} · {grouped[slot].length}
                  </Text>
                  {grouped[slot].map((item) => (
                    <FulfillmentCard
                      key={item.id}
                      item={item}
                      onStatus={(status) => handleStatusUpdate(item.id, status)}
                      onWeighIn={() => navigation.navigate('FuelWeighIn', { fulfillmentId: item.id, itemName: item.menu?.item_name })}
                    />
                  ))}
                </View>
              ))
            )}
          </FadeInView>
        )}

        {/* Available plans */}
        <FadeInView delay={150} style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.h2}>Available Fuel Plans</Text>
            <Text style={styles.sub}>GoHomeyy-managed plans for your kitchen</Text>
          </View>
          {loadingPlans ? (
            <SectionLoader />
          ) : availablePlans.length === 0 ? (
            <Text style={styles.empty}>{plans.length ? 'You have accepted every available plan.' : 'No Fuel plans available yet.'}</Text>
          ) : (
            availablePlans.map((plan, i) => (
              <FadeInView key={plan.id} delay={180 + i * 60}>
                <FuelPlanCard plan={plan} onPress={() => openPlan(plan)} />
              </FadeInView>
            ))
          )}
        </FadeInView>

        {/* Subscribers */}
        <FadeInView delay={210} style={styles.section}>
          <View style={styles.subsHead}>
            <View style={styles.flex}>
              <Text style={styles.h3}>Active Subscribers</Text>
              <Text style={styles.subTiny}>
                {activeSubscribers.length} active {activeSubscribers.length === 1 ? 'subscriber' : 'subscribers'}
              </Text>
            </View>
            {subscribers.length > 0 && (
              <Pressable onPress={() => navigation.navigate('FuelSubscribers')} hitSlop={8} style={styles.linkRow}>
                <Text style={styles.link}>View all</Text>
                <ChevronRight size={10} color={FUEL.primary} strokeWidth={1.5} />
              </Pressable>
            )}
          </View>
          {loadingSubscribers ? (
            <SectionLoader />
          ) : subscribers.length === 0 ? (
            <Text style={styles.empty}>No active subscribers yet.</Text>
          ) : (
            <View style={styles.subList}>
              {subscribers.slice(0, SUBSCRIBER_PREVIEW).map((sub) => (
                <SubscriberRow key={sub.id} sub={sub} onPress={() => navigation.navigate('FuelSubscribers')} />
              ))}
            </View>
          )}
          {subscribers.length > 0 && (
            <PressableScale style={styles.outlineBtn} onPress={() => navigation.navigate('FuelSubscribers')} pressedScale={0.97}>
              <Text style={styles.outlineText}>View All Subscribers</Text>
              <ChevronRight size={11} color={FUEL.primary} strokeWidth={1.5} />
            </PressableScale>
          )}
        </FadeInView>

        {/* Active plans */}
        {activePlans.length > 0 && (
          <FadeInView delay={250} style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.h2}>Active Fuel Plans</Text>
              <Text style={styles.sub}>GoHomeyy-managed plans for your kitchen</Text>
            </View>
            {activePlans.map((plan) => (
              <FuelPlanCard key={plan.id} plan={plan} active onPress={() => openPlan(plan)} />
            ))}
          </FadeInView>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  headerWrap: { backgroundColor: C.surface },
  content: { paddingHorizontal: 15, paddingTop: 10, gap: 9 },
  // Impact
  impact: {
    height: 133,
    padding: 18,
    gap: 21,
    overflow: 'hidden',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 6,
    shadowColor: '#8F5A41',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  leaf: { position: 'absolute', right: 10, bottom: -10, transform: [{ rotate: '-10deg' }] },
  impactTitle: { fontFamily: F.jakartaExtraBold, fontSize: 10, lineHeight: 15, letterSpacing: 1.1, color: 'rgba(255,255,255,0.92)' },
  impactRow: { flexDirection: 'row' },
  impactCell: { flex: 1, gap: 3, paddingRight: 12 },
  impactDivider: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.3)' },
  impactValue: { fontFamily: F.jakartaExtraBold, fontSize: 20, lineHeight: 20, color: C.white },
  impactLabel: { fontFamily: F.jakartaRegular, fontSize: 9, lineHeight: 12.15, color: C.white },
  // Fuel now
  nowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 69,
    paddingHorizontal: 11,
    paddingVertical: 16,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: FUEL.border,
    backgroundColor: C.surface,
  },
  nowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: FUEL.peach, alignItems: 'center', justifyContent: 'center' },
  nowTitle: { fontFamily: F.jakartaRegular, fontSize: 12, lineHeight: 18, color: FUEL.ink },
  nowSub: { fontFamily: F.jakartaRegular, fontSize: 8.5, lineHeight: 12.75, color: FUEL.muted },
  nowState: { fontFamily: F.jakartaExtraBold, fontSize: 8, lineHeight: 12, color: FUEL.muted },
  // Sections
  section: { gap: 8, marginTop: 8 },
  sectionHead: { gap: 3, paddingTop: 7, paddingHorizontal: 2 },
  h2: { fontFamily: F.jakartaExtraBold, fontSize: 13, lineHeight: 19.5, color: FUEL.ink },
  h3: { fontFamily: F.jakartaExtraBold, fontSize: 12, lineHeight: 18, color: FUEL.ink },
  sub: { fontFamily: F.jakartaRegular, fontSize: 9, lineHeight: 13.5, color: FUEL.muted },
  subTiny: { fontFamily: F.jakartaRegular, fontSize: 7.5, lineHeight: 11.25, color: FUEL.muted },
  subsHead: { flexDirection: 'row', alignItems: 'center', paddingTop: 7 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  link: { fontFamily: F.jakartaExtraBold, fontSize: 7.5, lineHeight: 11.25, color: FUEL.primary },
  subList: { gap: 4 },
  outlineBtn: {
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: FUEL.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  outlineText: { fontFamily: F.jakartaExtraBold, fontSize: 8, lineHeight: 12, color: FUEL.primary },
  empty: { fontFamily: F.jakartaSemiBold, fontSize: 11, color: FUEL.muted, paddingVertical: 8, paddingHorizontal: 2 },
  slotGroup: { gap: 8 },
  slotTime: { fontFamily: F.jakartaBold, fontSize: 10, color: C.primaryRing, paddingHorizontal: 2 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  errorText: { fontFamily: F.jakartaSemiBold, fontSize: 11, color: C.danger },
});
