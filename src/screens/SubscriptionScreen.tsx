import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Modal, Pressable, RefreshControl, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Calendar, Package, Plus, Repeat, TrendingUp, Users, X, Zap } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { C, F } from '../theme';
import { Chip, FadeInView, FormField, KitchenHeader, PressableScale, PrimaryButton, ProgressBar, StatusBadge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { friendlyApiError } from '../utils/apiErrors';

interface Plan {
  id: string;
  name: string;
  price: number;
  deliveriesPerWeek: number;
}

interface Slot {
  id: string;
  planId: string;
  planName?: string;
  maxSubscribers: number;
  currentSubscribers?: number;
  deliveryDays: string[];
  status?: string;
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT: Record<string, string> = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' };

/** Subscription slots (subscriptions/plans + subscriptions/slots) in the new design. */
export const SubscriptionScreen = ({ navigation }: any) => {
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create slot sheet
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [maxSubs, setMaxSubs] = useState('10');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const apiFetch = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const url = `${process.env.EXPO_PUBLIC_API_URL}${endpoint}`;
    return fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  }, [token]);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await apiFetch('subscriptions/plans');
      if (res.ok) {
        const result = await res.json();
        if (result.status === 'success') setPlans(result.data || []);
        else setPlans(result.data || result || []);
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
    } finally {
      setLoadingPlans(false);
    }
  }, [apiFetch]);

  const fetchSlots = useCallback(async () => {
    if (!user?.id) { setLoadingSlots(false); return; }
    try {
      const res = await apiFetch(`subscriptions/slots/chef/${user.id}`);
      if (res.ok) {
        const result = await res.json();
        if (result.status === 'success') setSlots(result.data || []);
        else setSlots(result.data || result || []);
      }
    } catch (err) {
      console.error('Error fetching slots:', err);
    } finally {
      setLoadingSlots(false);
    }
  }, [apiFetch, user?.id]);

  useEffect(() => {
    fetchPlans();
    fetchSlots();
  }, [fetchPlans, fetchSlots]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchPlans(), fetchSlots()]);
    setRefreshing(false);
  }, [fetchPlans, fetchSlots]);

  const openCreate = (plan: Plan | null) => {
    setSelectedPlan(plan);
    setShowModal(true);
  };

  const handleCreateSlot = async () => {
    if (!selectedPlan) {
      Toast.show({ type: 'error', text1: 'Select a Plan', text2: 'Please pick a subscription plan first' });
      return;
    }
    if (selectedDays.length === 0) {
      Toast.show({ type: 'error', text1: 'Select Days', text2: 'Pick at least one delivery day' });
      return;
    }

    setCreating(true);
    try {
      const res = await apiFetch('subscriptions/slots', {
        method: 'POST',
        body: JSON.stringify({
          planId: selectedPlan.id,
          maxSubscribers: parseInt(maxSubs) || 10,
          deliveryDays: selectedDays,
        }),
      });
      if (res.ok) {
        Toast.show({ type: 'success', text1: 'Slot Created', text2: 'New subscription slot is live!' });
        setShowModal(false);
        setSelectedPlan(null);
        setSelectedDays([]);
        setMaxSubs('10');
        fetchSlots();
      } else {
        const friendly = friendlyApiError(res.status, await res.json().catch(() => ({})), 'Could not create slot');
        Toast.show({ type: 'error', text1: 'Failed', text2: friendly.message });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Something went wrong' });
    } finally {
      setCreating(false);
    }
  };

  const toggleDay = (day: string) =>
    setSelectedDays(prev => (prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]));

  const getPlanForSlot = (slot: Slot) => plans.find(p => p.id === slot.planId);
  const totalSubs = slots.reduce((sum, s) => sum + (s.currentSubscribers || 0), 0);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={{ paddingTop: insets.top }}>
        <KitchenHeader
          kitchenName="Subscription Slots"
          subtitle="Recurring deliveries"
          ownerName={user?.name}
          onBack={() => navigation.goBack()}
          onWallet={() => navigation.navigate('Wallet')}
          onProfile={() => navigation.navigate('Profile')}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
      >
        <FadeInView style={styles.stats}>
          {[
            { Icon: Package, value: plans.length, label: 'Plans' },
            { Icon: Repeat, value: slots.length, label: 'Active slots' },
            { Icon: TrendingUp, value: totalSubs, label: 'Subscribers' },
          ].map(({ Icon, value, label }) => (
            <View key={label} style={styles.stat}>
              <Icon size={20} color={C.primaryRing} strokeWidth={1.67} />
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </FadeInView>

        <FadeInView delay={60} style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Subscription Plans</Text>
        </FadeInView>
        {loadingPlans ? (
          <ActivityIndicator color={C.primary} />
        ) : plans.length === 0 ? (
          <View style={styles.empty}>
            <Package size={22} color={C.iconMuted} />
            <Text style={styles.emptyText}>No plans available yet.</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.planRow}>
            {plans.map((plan, i) => (
              <FadeInView key={plan.id} delay={80 + i * 50}>
                <PressableScale style={styles.plan} onPress={() => openCreate(plan)} pressedScale={0.97}>
                  <View style={styles.planIcon}>
                    <Zap size={18} color={C.primary} strokeWidth={1.67} />
                  </View>
                  <Text style={styles.planName} numberOfLines={1}>
                    {plan.name}
                  </Text>
                  <Text style={styles.planPrice}>
                    ₹{Number(plan.price).toLocaleString('en-IN')}
                    <Text style={styles.planPer}>/mo</Text>
                  </Text>
                  <View style={styles.planMeta}>
                    <Calendar size={12} color={C.textMuted} />
                    <Text style={styles.planMetaText}>{plan.deliveriesPerWeek}x / week</Text>
                  </View>
                  <View style={styles.planCta}>
                    <Text style={styles.planCtaText}>Create Slot</Text>
                  </View>
                </PressableScale>
              </FadeInView>
            ))}
          </ScrollView>
        )}

        <FadeInView delay={140} style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Your Active Slots</Text>
          <PressableScale style={styles.newBtn} onPress={() => openCreate(plans[0] || null)} pressedScale={0.95}>
            <Plus size={14} color={C.white} />
            <Text style={styles.newBtnText}>New Slot</Text>
          </PressableScale>
        </FadeInView>
        {loadingSlots ? (
          <ActivityIndicator color={C.primary} />
        ) : slots.length === 0 ? (
          <View style={styles.empty}>
            <Repeat size={22} color={C.iconMuted} />
            <Text style={styles.emptyText}>No subscription slots yet. Pick a plan above to create one.</Text>
          </View>
        ) : (
          slots.map((slot, i) => {
            const plan = getPlanForSlot(slot);
            const filled = slot.currentSubscribers || 0;
            return (
              <FadeInView key={slot.id} delay={160 + Math.min(i, 6) * 50} style={styles.slot}>
                <View style={styles.slotHead}>
                  <Zap size={14} color={C.primaryRing} />
                  <Text style={styles.slotName} numberOfLines={1}>
                    {slot.planName || plan?.name || 'Plan'}
                  </Text>
                  <StatusBadge label={slot.status || 'Active'} tone="success" />
                </View>
                <View style={styles.slotRow}>
                  <Users size={14} color={C.textMuted} />
                  <Text style={styles.slotLabel}>Subscribers</Text>
                  <Text style={styles.slotValue}>
                    {filled}/{slot.maxSubscribers}
                  </Text>
                </View>
                <View style={styles.slotRow}>
                  <Calendar size={14} color={C.textMuted} />
                  <Text style={styles.slotLabel}>Delivery days</Text>
                  <Text style={styles.slotValue}>{slot.deliveryDays.map(d => DAY_SHORT[d] || d).join(', ')}</Text>
                </View>
                <ProgressBar progress={slot.maxSubscribers ? Math.min(1, filled / slot.maxSubscribers) : 0} from={0} />
              </FadeInView>
            );
          })
        )}
      </ScrollView>

      {/* Create slot sheet */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)} statusBarTranslucent>
        <Pressable style={styles.overlay} onPress={() => setShowModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
              <View style={styles.handle} />
              <View style={styles.sheetHead}>
                <Text style={styles.sheetTitle}>Create Subscription Slot</Text>
                <Pressable onPress={() => setShowModal(false)} hitSlop={10}>
                  <X size={20} color={C.textMuted} />
                </Pressable>
              </View>

              <Text style={styles.label}>Plan</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {plans.map(p => (
                  <Chip key={p.id} label={`${p.name} · ₹${p.price}`} selected={selectedPlan?.id === p.id} onPress={() => setSelectedPlan(p)} />
                ))}
              </ScrollView>

              <FormField label="Max subscribers" value={maxSubs} onChangeText={(v) => setMaxSubs(v.replace(/\D/g, ''))} keyboardType="number-pad" />

              <Text style={styles.label}>Delivery days</Text>
              <View style={styles.dayGrid}>
                {WEEKDAYS.map(day => (
                  <Chip key={day} label={DAY_SHORT[day]} selected={selectedDays.includes(day)} onPress={() => toggleDay(day)} />
                ))}
              </View>

              <PrimaryButton label="Create Slot" onPress={handleCreateSlot} loading={creating} style={{ marginTop: 8 }} />
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 20, paddingTop: 4, gap: 12 },
  stats: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 14 },
  statValue: { fontFamily: F.jakartaBold, fontSize: 20, lineHeight: 30, color: C.textStrong, paddingTop: 10 },
  statLabel: { fontFamily: F.jakartaSemiBold, fontSize: 10, lineHeight: 15, color: C.textMuted },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  sectionTitle: { fontFamily: F.jakartaBold, fontSize: 17, lineHeight: 25.5, color: C.textStrong },
  planRow: { gap: 12, paddingRight: 4 },
  plan: { width: 168, backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 14, gap: 6 },
  planIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.softOrange, alignItems: 'center', justifyContent: 'center' },
  planName: { fontFamily: F.jakartaBold, fontSize: 13, color: C.textStrong, marginTop: 4 },
  planPrice: { fontFamily: F.jakartaBold, fontSize: 18, color: C.primaryRing },
  planPer: { fontFamily: F.jakartaSemiBold, fontSize: 11, color: C.textMuted },
  planMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  planMetaText: { fontFamily: F.jakartaSemiBold, fontSize: 11, color: C.textMuted },
  planCta: { marginTop: 6, height: 34, borderRadius: 12, backgroundColor: C.softOrange, alignItems: 'center', justifyContent: 'center' },
  planCtaText: { fontFamily: F.jakartaBold, fontSize: 12, color: C.primary },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7 },
  newBtnText: { fontFamily: F.jakartaBold, fontSize: 12, color: C.white },
  slot: { backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 14, gap: 10 },
  slotHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slotName: { flex: 1, fontFamily: F.jakartaBold, fontSize: 13, color: C.textStrong },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slotLabel: { flex: 1, fontFamily: F.jakartaRegular, fontSize: 12, color: C.textMuted },
  slotValue: { fontFamily: F.jakartaBold, fontSize: 12, color: C.textStrong },
  empty: { backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.border, paddingVertical: 28, paddingHorizontal: 20, alignItems: 'center', gap: 8 },
  emptyText: { fontFamily: F.jakartaSemiBold, fontSize: 12, color: C.textMuted, textAlign: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(23,23,26,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, gap: 12 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.borderInput },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontFamily: F.jakartaBold, fontSize: 18, color: C.textStrong },
  label: { fontFamily: F.jakartaBold, fontSize: 11, color: C.textMuted },
  chipRow: { gap: 8 },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
