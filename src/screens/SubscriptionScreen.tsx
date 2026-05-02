import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Zap,
  ChevronLeft,
  Package,
  Plus,
  Calendar,
  Users,
  Check,
  X,
  Repeat,
  Flame,
  TrendingUp,
} from 'lucide-react-native';
import { Colors, Spacing, Typography } from '../theme';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';

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

export const SubscriptionScreen = ({ navigation }: any) => {
  const { token, user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create slot modal
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
        const err = await res.json().catch(() => ({}));
        Toast.show({ type: 'error', text1: 'Failed', text2: err.message || 'Could not create slot' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Something went wrong' });
    } finally {
      setCreating(false);
    }
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const getPlanForSlot = (slot: Slot) => plans.find(p => p.id === slot.planId);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Zap size={20} color={Colors.warning} />
          <Text style={styles.headerTitle}>Fuel</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIconContainer}>
            <Flame size={32} color={Colors.warning} />
          </View>
          <Text style={styles.heroTitle}>Power Your Kitchen</Text>
          <Text style={styles.heroSubtitle}>
            Choose a subscription plan and create delivery slots for recurring customers.
          </Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Package size={18} color={Colors.primary} />
            <Text style={styles.statValue}>{plans.length}</Text>
            <Text style={styles.statLabel}>Plans</Text>
          </View>
          <View style={styles.statCard}>
            <Repeat size={18} color={Colors.cyan} />
            <Text style={styles.statValue}>{slots.length}</Text>
            <Text style={styles.statLabel}>Active Slots</Text>
          </View>
          <View style={styles.statCard}>
            <TrendingUp size={18} color={Colors.warning} />
            <Text style={styles.statValue}>
              {slots.reduce((sum, s) => sum + (s.currentSubscribers || 0), 0)}
            </Text>
            <Text style={styles.statLabel}>Subscribers</Text>
          </View>
        </View>

        {/* Plans Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Subscription Plans</Text>
        </View>

        {loadingPlans ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading plans...</Text>
          </View>
        ) : plans.length === 0 ? (
          <View style={styles.emptyBox}>
            <Package size={32} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>No plans available yet</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.plansScroll}>
            {plans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[styles.planCard, selectedPlan?.id === plan.id && styles.planCardSelected]}
                onPress={() => { setSelectedPlan(plan); setShowModal(true); }}
                activeOpacity={0.8}
              >
                <View style={styles.planIconWrap}>
                  <Zap size={20} color={selectedPlan?.id === plan.id ? Colors.background : Colors.warning} />
                </View>
                <Text style={[styles.planName, selectedPlan?.id === plan.id && styles.planNameSelected]}>{plan.name}</Text>
                <Text style={[styles.planPrice, selectedPlan?.id === plan.id && styles.planPriceSelected]}>
                  ₹{plan.price}<Text style={styles.planPriceSuffix}>/mo</Text>
                </Text>
                <View style={styles.planMeta}>
                  <Calendar size={12} color={selectedPlan?.id === plan.id ? Colors.background : Colors.textSecondary} />
                  <Text style={[styles.planMetaText, selectedPlan?.id === plan.id && { color: Colors.background }]}>
                    {plan.deliveriesPerWeek}x / week
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.planBtn, selectedPlan?.id === plan.id && styles.planBtnSelected]}
                  onPress={() => { setSelectedPlan(plan); setShowModal(true); }}
                >
                  <Text style={[styles.planBtnText, selectedPlan?.id === plan.id && styles.planBtnTextSelected]}>
                    Create Slot
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Active Slots Section */}
        <View style={[styles.sectionHeader, { marginTop: Spacing.xl }]}>
          <Text style={styles.sectionTitle}>Your Active Slots</Text>
          <TouchableOpacity onPress={() => { setSelectedPlan(plans[0] || null); setShowModal(true); }}>
            <View style={styles.addSlotBtn}>
              <Plus size={14} color={Colors.background} />
              <Text style={styles.addSlotText}>New Slot</Text>
            </View>
          </TouchableOpacity>
        </View>

        {loadingSlots ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading slots...</Text>
          </View>
        ) : slots.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <Plus size={24} color={Colors.primary} />
            </View>
            <Text style={styles.emptyText}>No subscription slots yet</Text>
            <Text style={styles.emptySubText}>Pick a plan above to create your first slot</Text>
          </View>
        ) : (
          slots.map((slot) => {
            const plan = getPlanForSlot(slot);
            return (
              <View key={slot.id} style={styles.slotCard}>
                <View style={styles.slotCardHeader}>
                  <View style={styles.slotPlanBadge}>
                    <Zap size={12} color={Colors.warning} />
                    <Text style={styles.slotPlanName}>{slot.planName || plan?.name || 'Plan'}</Text>
                  </View>
                  <View style={styles.slotStatusBadge}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>{slot.status || 'Active'}</Text>
                  </View>
                </View>

                <View style={styles.slotDetails}>
                  <View style={styles.slotDetailItem}>
                    <Users size={14} color={Colors.textSecondary} />
                    <Text style={styles.slotDetailLabel}>Subscribers</Text>
                    <Text style={styles.slotDetailValue}>{slot.currentSubscribers || 0}/{slot.maxSubscribers}</Text>
                  </View>
                  <View style={styles.slotDetailItem}>
                    <Calendar size={14} color={Colors.textSecondary} />
                    <Text style={styles.slotDetailLabel}>Delivery Days</Text>
                    <Text style={styles.slotDetailValue}>{slot.deliveryDays.map(d => DAY_SHORT[d] || d).join(', ')}</Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.progressBg}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(100, ((slot.currentSubscribers || 0) / slot.maxSubscribers) * 100)}%` },
                    ]}
                  />
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Create Slot Modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)}>
          <Pressable style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Subscription Slot</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Plan selector */}
            <Text style={styles.modalLabel}>SELECT PLAN</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.planSelector}>
              {plans.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.planChip, selectedPlan?.id === p.id && styles.planChipActive]}
                  onPress={() => setSelectedPlan(p)}
                >
                  <Text style={[styles.planChipText, selectedPlan?.id === p.id && styles.planChipTextActive]}>
                    {p.name} — ₹{p.price}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Max subscribers */}
            <Text style={styles.modalLabel}>MAX SUBSCRIBERS</Text>
            <View style={styles.modalInputWrapper}>
              <Users size={16} color={Colors.primary} />
              <TextInput
                style={styles.modalInput}
                value={maxSubs}
                onChangeText={setMaxSubs}
                keyboardType="numeric"
                placeholder="10"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>

            {/* Delivery days */}
            <Text style={styles.modalLabel}>DELIVERY DAYS</Text>
            <View style={styles.daysGrid}>
              {WEEKDAYS.map(day => (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayChip, selectedDays.includes(day) && styles.dayChipActive]}
                  onPress={() => toggleDay(day)}
                >
                  {selectedDays.includes(day) && <Check size={12} color={Colors.background} />}
                  <Text style={[styles.dayChipText, selectedDays.includes(day) && styles.dayChipTextActive]}>
                    {DAY_SHORT[day]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.createBtn, creating && { opacity: 0.7 }]}
              onPress={handleCreateSlot}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color={Colors.background} />
              ) : (
                <>
                  <Zap size={18} color={Colors.background} />
                  <Text style={styles.createBtnText}>Launch Slot</Text>
                </>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { ...Typography.h2 },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg },

  // Hero
  hero: { alignItems: 'center', marginBottom: 28 },
  heroIconContainer: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(250, 204, 21, 0.2)',
  },
  heroTitle: { ...Typography.h1, fontSize: 26, marginBottom: 8 },
  heroSubtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },

  // Stats
  statsRow: { flexDirection: 'row', marginBottom: Spacing.xl, gap: 10 },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 16, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border, gap: 6,
  },
  statValue: { ...Typography.h2, fontSize: 22 },
  statLabel: { ...Typography.caption, fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },

  // Section
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { ...Typography.h3 },

  // Plans
  plansScroll: { gap: 12, paddingBottom: 4 },
  planCard: {
    width: 170, backgroundColor: Colors.surface, borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: Colors.border,
  },
  planCardSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  planIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  planName: { ...Typography.body, fontWeight: 'bold', marginBottom: 4 },
  planNameSelected: { color: Colors.background },
  planPrice: { ...Typography.h1, fontSize: 24, marginBottom: 8 },
  planPriceSelected: { color: Colors.background },
  planPriceSuffix: { fontSize: 12, fontWeight: 'normal' },
  planMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
  planMetaText: { ...Typography.caption, fontSize: 11 },
  planBtn: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    paddingVertical: 8, borderRadius: 10, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.primary,
  },
  planBtnSelected: { backgroundColor: Colors.background, borderColor: Colors.background },
  planBtnText: { color: Colors.primary, fontWeight: 'bold', fontSize: 12 },
  planBtnTextSelected: { color: Colors.primary },

  // Slots
  addSlotBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
  },
  addSlotText: { color: Colors.background, fontWeight: 'bold', fontSize: 12 },
  slotCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 12,
  },
  slotCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  slotPlanBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  slotPlanName: { color: Colors.warning, fontSize: 12, fontWeight: 'bold' },
  slotStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  statusText: { color: Colors.primary, fontSize: 10, fontWeight: 'bold' },
  slotDetails: { gap: 10 },
  slotDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slotDetailLabel: { ...Typography.caption, fontSize: 11, flex: 1 },
  slotDetailValue: { ...Typography.body, fontSize: 13, fontWeight: '600' },
  progressBg: { height: 4, backgroundColor: Colors.border, borderRadius: 2, marginTop: 14, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },

  // Loading/Empty
  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  loadingText: { ...Typography.caption },
  emptyBox: {
    padding: 32, alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed',
  },
  emptyIconCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  emptyText: { ...Typography.body, color: Colors.textSecondary, marginTop: 8 },
  emptySubText: { ...Typography.caption, marginTop: 4, textAlign: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.lg, paddingBottom: 40, maxHeight: '85%',
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2,
    alignSelf: 'center', marginBottom: 16,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { ...Typography.h2 },
  modalLabel: { fontSize: 10, fontWeight: 'bold', color: Colors.textSecondary, letterSpacing: 1, marginBottom: 8, marginTop: 16 },
  planSelector: { marginBottom: 4, maxHeight: 44 },
  planChip: {
    backgroundColor: Colors.background, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border, marginRight: 8,
  },
  planChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  planChipText: { color: Colors.text, fontSize: 12, fontWeight: 'bold' },
  planChipTextActive: { color: Colors.background },

  modalInputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background,
    borderRadius: 12, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: Colors.border, gap: 8,
  },
  modalInput: { flex: 1, ...Typography.body, color: Colors.text },

  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  dayChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.background, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
  },
  dayChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayChipText: { color: Colors.text, fontSize: 12, fontWeight: 'bold' },
  dayChipTextActive: { color: Colors.background },

  createBtn: {
    backgroundColor: Colors.primary, height: 54, borderRadius: 27,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 24, gap: 8,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  createBtnText: { color: Colors.background, fontWeight: 'bold', fontSize: 16 },
});
