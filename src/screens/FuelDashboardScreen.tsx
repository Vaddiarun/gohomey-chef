import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Switch,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography } from '../theme';
import { useAuth } from '../context/AuthContext';
import {
  Zap,
  Clock,
  Users,
  ChevronRight,
  AlertCircle,
  Play,
  Camera,
  Check,
  X,
  MapPin,
  Utensils,
  Wifi,
  WifiOff,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { format } from 'date-fns';

interface Fulfillment {
  id: string;
  fulfillment_date: string;
  delivery_time_slot: string;
  delivery_status: string;
  subscription: {
    user: { name: string; phone: string };
    plan: { name: string; menu_json: any };
  };
}

interface Subscriber {
  id: string;
  plan: { id: string; name: string; price?: number };
  user: { id: string; name: string; phone: string };
  delivery_days?: string[];
  status?: string;
}

interface FuelPlan {
  id: string;
  name: string;
  price: number;
  delivery_time_slots?: string[];
  is_enabled_for_chef?: boolean;
  chef_slots?: Array<{ id?: string; time_slot: string }>;
}

interface FuelChefSlot {
  id?: string;
  plan_id?: string;
  planId?: string;
  time_slot: string;
  plan?: { id: string; name?: string };
}

interface FuelNowOffer {
  session_id: string;
  expires_at: string;
  seconds_to_accept: number;
  plan_id: string;
  item_name: string;
  user_location: { latitude: number; longitude: number };
  chef: { id: string; distance: number };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  SCHEDULED: { label: 'Scheduled', color: Colors.cyan, bg: 'rgba(34, 211, 238, 0.1)' },
  COOKING: { label: 'Cooking', color: Colors.warning, bg: 'rgba(250, 204, 21, 0.1)' },
  READY_FOR_PICKUP: { label: 'Ready', color: Colors.primary, bg: 'rgba(74, 222, 128, 0.1)' },
  PICKED_UP: { label: 'Picked Up', color: Colors.primary, bg: 'rgba(74, 222, 128, 0.08)' },
  DELIVERED: { label: 'Delivered', color: Colors.primary, bg: 'rgba(74, 222, 128, 0.08)' },
  PAUSED: { label: 'Paused', color: Colors.textSecondary, bg: 'rgba(156, 163, 175, 0.1)' },
  MISSED: { label: 'Missed', color: Colors.danger, bg: 'rgba(239, 68, 68, 0.1)' },
  CANCELLED: { label: 'Cancelled', color: Colors.danger, bg: 'rgba(239, 68, 68, 0.1)' },
};

const getFuelSlotPlanId = (slot: FuelChefSlot) => slot.plan_id || slot.planId || slot.plan?.id;

export const FuelDashboardScreen = () => {
  const navigation = useNavigation<any>();
  const { token } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');

  const [fulfillments, setFulfillments] = useState<Fulfillment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isOnline, setIsOnline] = useState(false);
  const [currentOffer, setCurrentOffer] = useState<FuelNowOffer | null>(null);
  const [countdown, setCountdown] = useState(120);
  const [respondingOffer, setRespondingOffer] = useState(false);

  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
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
      Toast.show({ type: 'error', text1: 'Enable failed', text2: err.message || 'Please try again.' });
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
  const enabledPlanCount = plans.filter(
    plan => plan.is_enabled_for_chef || enabledSlots.some(slot => getFuelSlotPlanId(slot) === plan.id)
  ).length;

  const stats = {
    total: fulfillments.length,
    cooking: fulfillments.filter(f => f.delivery_status === 'COOKING').length,
    ready: fulfillments.filter(f => f.delivery_status === 'READY_FOR_PICKUP').length,
  };

  const fmt12 = (slot: string) => {
    if (!slot || slot === 'Unscheduled') return 'Unscheduled';
    const [h, m] = slot.split(':').map(Number);
    if (isNaN(h)) return slot;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m ?? 0).padStart(2, '0')} ${ampm}`;
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Fuel NOW Offer Modal */}
      <Modal visible={!!currentOffer} transparent animationType="fade">
        <View style={styles.offerOverlay}>
          <View style={styles.offerCard}>
            <View style={styles.offerHeader}>
              <View style={styles.offerIconWrap}>
                <Zap size={28} color={Colors.warning} />
              </View>
              <Text style={styles.offerTitle}>Fuel NOW Request</Text>
              <Text style={styles.offerSubtitle}>Instant order incoming</Text>
            </View>

            <View style={styles.countdownWrap}>
              <Text
                style={[
                  styles.countdownNum,
                  countdown <= 30 && { color: Colors.danger },
                ]}
              >
                {countdown}
              </Text>
              <Text style={styles.countdownLabel}>seconds to decide</Text>
            </View>

            {currentOffer && (
              <View style={styles.offerDetails}>
                <View style={styles.offerRow}>
                  <Utensils size={14} color={Colors.textSecondary} />
                  <Text style={styles.offerRowText}>{currentOffer.item_name}</Text>
                </View>
                {currentOffer.chef?.distance != null && (
                  <View style={styles.offerRow}>
                    <MapPin size={14} color={Colors.textSecondary} />
                    <Text style={styles.offerRowText}>
                      {currentOffer.chef.distance.toFixed(2)} km away
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.offerActions}>
              <TouchableOpacity
                style={styles.declineBtn}
                onPress={() => handleRespondOffer(false)}
                disabled={respondingOffer}
              >
                <X size={16} color={Colors.danger} />
                <Text style={styles.declineBtnText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => handleRespondOffer(true)}
                disabled={respondingOffer}
              >
                {respondingOffer ? (
                  <ActivityIndicator color={Colors.background} size="small" />
                ) : (
                  <>
                    <Check size={16} color={Colors.background} />
                    <Text style={styles.acceptBtnText}>Accept</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              fetchPlans();
              fetchEnabledSlots();
              fetchSubscribers();
              fetchFulfillments(true);
            }}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.screenTitle}>Fuel Kitchen</Text>
            <Text style={styles.dateLabel}>{format(new Date(), 'EEEE, MMM d')}</Text>
          </View>
          <View style={styles.headerIconWrap}>
            <Zap size={22} color={Colors.warning} />
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statCard, styles.statMiddle]}>
            <Text style={[styles.statNum, { color: Colors.warning }]}>{stats.cooking}</Text>
            <Text style={styles.statLabel}>Cooking</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: Colors.primary }]}>{stats.ready}</Text>
            <Text style={styles.statLabel}>Ready</Text>
          </View>
        </View>

        {/* Fuel NOW Card */}
        <View style={[styles.nowCard, isOnline && styles.nowCardActive]}>
          <View style={styles.nowLeft}>
            <View style={[styles.nowIconWrap, isOnline && styles.nowIconActive]}>
              {isOnline ? (
                <Wifi size={18} color={Colors.primary} />
              ) : (
                <WifiOff size={18} color={Colors.textSecondary} />
              )}
            </View>
            <View>
              <Text style={styles.nowTitle}>Fuel NOW</Text>
              <Text style={styles.nowSub}>
                {isOnline ? 'Online — receiving instant orders' : 'Tap to go online'}
              </Text>
            </View>
          </View>
          <Switch
            value={isOnline}
            onValueChange={setIsOnline}
            trackColor={{ false: Colors.border, true: 'rgba(74, 222, 128, 0.35)' }}
            thumbColor={isOnline ? Colors.primary : Colors.textSecondary}
          />
        </View>

        {/* Fuel Plans Section */}
        <View style={styles.plansSection}>
          <View style={styles.plansSectionHeader}>
            <Zap size={15} color={Colors.warning} />
            <Text style={styles.plansSectionTitle}>
              Fuel Plans{plans.length > 0 ? ` (${enabledPlanCount}/${plans.length} enabled)` : ''}
            </Text>
          </View>

          {loadingPlans ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: Spacing.sm }} />
          ) : plans.length === 0 ? (
            <Text style={styles.subsEmpty}>No Fuel plans available yet.</Text>
          ) : (
            plans.map(plan => {
              const enabledPlanSlots = enabledSlots.filter(slot => getFuelSlotPlanId(slot) === plan.id);
              const enabled = !!plan.is_enabled_for_chef || enabledPlanSlots.length > 0;
              const slots = enabledPlanSlots.length
                ? enabledPlanSlots.map(slot => slot.time_slot)
                : enabled && plan.chef_slots?.length
                ? plan.chef_slots.map(slot => slot.time_slot)
                : plan.delivery_time_slots ?? [];

              return (
                <TouchableOpacity
                  key={plan.id}
                  style={styles.planRow}
                  activeOpacity={0.7}
                  onPress={() =>
                    navigation.navigate('FuelPlanDetail', { plan, enabled, slots })
                  }
                >
                  <View style={styles.planRowTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fuelPlanName}>{plan.name}</Text>
                      <Text style={styles.fuelPlanPrice}>₹{plan.price}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.enablePlanBtn, enabled && styles.enabledPlanBtn]}
                      onPress={() => handleEnablePlan(plan.id)}
                      disabled={enabled || enablingPlanId === plan.id}
                    >
                      {enablingPlanId === plan.id ? (
                        <ActivityIndicator color={Colors.background} size="small" />
                      ) : (
                        <Text style={[styles.enablePlanText, enabled && styles.enabledPlanText]}>
                          {enabled ? 'Enabled' : 'Enable'}
                        </Text>
                      )}
                    </TouchableOpacity>
                    <ChevronRight size={16} color={Colors.textSecondary} />
                  </View>

                  {slots.length > 0 && (
                    <View style={styles.timeSlotsRow}>
                      {slots.map(slot => (
                        <View key={`${plan.id}-${slot}`} style={styles.timeSlotChip}>
                          <Clock size={11} color={Colors.cyan} />
                          <Text style={styles.timeSlotText}>{fmt12(slot)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Subscribers Section */}
        <View style={styles.subsSection}>
          <TouchableOpacity
            style={styles.subsSectionHeader}
            onPress={() => navigation.navigate('FuelSubscribers')}
            activeOpacity={0.7}
          >
            <Users size={15} color={Colors.cyan} />
            <Text style={styles.subsSectionTitle}>
              Fuel Subscribers{subscribers.length > 0 ? ` (${subscribers.length})` : ''}
            </Text>
            <ChevronRight size={15} color={Colors.textSecondary} />
          </TouchableOpacity>

          {loadingSubscribers ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: Spacing.sm }} />
          ) : subscribers.length === 0 ? (
            <Text style={styles.subsEmpty}>No active subscribers yet.</Text>
          ) : (
            subscribers.slice(0, 3).map(sub => (
              <View key={sub.id} style={styles.subRow}>
                <View style={styles.subAvatar}>
                  <Users size={14} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subName}>{sub.user?.name ?? 'Customer'}</Text>
                  <Text style={styles.subPlan}>{sub.plan?.name ?? 'Fuel Plan'}</Text>
                </View>
                {sub.status && (
                  <View style={[
                    styles.subStatusBadge,
                    { backgroundColor: sub.status === 'ACTIVE' ? 'rgba(74,222,128,0.1)' : 'rgba(250,204,21,0.1)' }
                  ]}>
                    <Text style={[
                      styles.subStatusText,
                      { color: sub.status === 'ACTIVE' ? Colors.primary : Colors.warning }
                    ]}>
                      {sub.status}
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}

          {subscribers.length > 3 && (
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => navigation.navigate('FuelSubscribers')}
            >
              <Text style={styles.viewAllText}>View all {subscribers.length} subscribers</Text>
              <ChevronRight size={13} color={Colors.cyan} />
            </TouchableOpacity>
          )}
        </View>

        {/* Section Title */}
        <Text style={styles.sectionTitle}>Today's Work</Text>

        {/* Content */}
        {loading && !refreshing ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.centerText}>Loading Fuel tasks...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <AlertCircle size={36} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchFulfillments()}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : fulfillments.length === 0 ? (
          <View style={styles.centerBox}>
            <Zap size={36} color={Colors.textSecondary} />
            <Text style={styles.centerText}>No Fuel tasks for today.</Text>
          </View>
        ) : (
          sortedSlots.map(slot => (
            <View key={slot} style={styles.slotGroup}>
              <View style={styles.slotHeader}>
                <Clock size={13} color={Colors.cyan} />
                <Text style={styles.slotTime}>{fmt12(slot)}</Text>
                <View style={styles.slotCountBadge}>
                  <Text style={styles.slotCountText}>{grouped[slot].length}</Text>
                </View>
              </View>

              {grouped[slot].map(item => {
                const cfg = STATUS_CONFIG[item.delivery_status] ?? {
                  label: item.delivery_status,
                  color: Colors.textSecondary,
                  bg: 'rgba(156, 163, 175, 0.1)',
                };
                return (
                  <View key={item.id} style={styles.fulfillmentCard}>
                    <View style={styles.fulfillmentTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.planName}>
                          {item.subscription?.plan?.name ?? 'Fuel Plan'}
                        </Text>
                        <Text style={styles.customerName}>
                          {item.subscription?.user?.name ?? 'Customer'}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                        <Text style={[styles.statusText, { color: cfg.color }]}>
                          {cfg.label}
                        </Text>
                      </View>
                    </View>

                    {item.delivery_status === 'SCHEDULED' && (
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleStatusUpdate(item.id, 'COOKING')}
                        activeOpacity={0.8}
                      >
                        <Play size={13} color={Colors.background} />
                        <Text style={styles.actionBtnText}>Start Cooking</Text>
                      </TouchableOpacity>
                    )}

                    {item.delivery_status === 'COOKING' && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnYellow]}
                        onPress={() =>
                          navigation.navigate('FuelWeighIn', { fulfillmentId: item.id })
                        }
                        activeOpacity={0.8}
                      >
                        <Camera size={13} color={Colors.background} />
                        <Text style={styles.actionBtnText}>Weigh-In & Upload</Text>
                      </TouchableOpacity>
                    )}

                    {item.delivery_status === 'READY_FOR_PICKUP' && (
                      <View style={styles.readyRow}>
                        <Check size={13} color={Colors.primary} />
                        <Text style={styles.readyRowText}>Ready for Pickup</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: 40 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  screenTitle: { ...Typography.h1 },
  dateLabel: { ...Typography.caption, marginTop: 2 },
  headerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(250, 204, 21, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  statMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.border,
  },
  statNum: { ...Typography.h2, fontSize: 22 },
  statLabel: { ...Typography.caption, marginTop: 2 },

  // Fuel NOW card
  nowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  nowCardActive: {
    borderColor: 'rgba(74, 222, 128, 0.4)',
    backgroundColor: 'rgba(74, 222, 128, 0.05)',
  },
  nowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  nowIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  nowIconActive: { backgroundColor: 'rgba(74, 222, 128, 0.15)' },
  nowTitle: { ...Typography.body, fontWeight: '600' },
  nowSub: { ...Typography.caption, marginTop: 2 },

  // Subscribers link
  subscribersLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  subscribersLinkText: {
    ...Typography.body,
    color: Colors.cyan,
    flex: 1,
    fontWeight: '600',
    fontSize: 13,
  },

  // Fuel plans
  plansSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  plansSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  plansSectionTitle: {
    ...Typography.body,
    color: Colors.warning,
    fontWeight: '700',
    flex: 1,
    fontSize: 13,
  },
  planRow: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  planRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fuelPlanName: {
    ...Typography.body,
    fontWeight: '700',
    fontSize: 13,
  },
  fuelPlanPrice: {
    ...Typography.caption,
    color: Colors.warning,
    marginTop: 2,
    fontWeight: '700',
  },
  enablePlanBtn: {
    minWidth: 82,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  enabledPlanBtn: {
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.35)',
  },
  enablePlanText: {
    color: Colors.background,
    fontWeight: 'bold',
    fontSize: 12,
  },
  enabledPlanText: {
    color: Colors.primary,
  },
  timeSlotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  timeSlotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  timeSlotText: {
    fontSize: 11,
    color: Colors.cyan,
    fontWeight: '600',
  },

  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.sm,
  },

  // Loading / error / empty
  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  centerText: { ...Typography.body, color: Colors.textSecondary, marginTop: Spacing.md },
  errorBox: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderRadius: 16,
  },
  errorText: {
    ...Typography.body,
    color: Colors.danger,
    textAlign: 'center',
    marginVertical: Spacing.md,
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
  },
  retryBtnText: { ...Typography.body, fontWeight: 'bold', color: Colors.background },

  // Slot groups
  slotGroup: { marginBottom: Spacing.md },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: 6,
  },
  slotTime: { ...Typography.caption, color: Colors.cyan, fontWeight: '700', flex: 1 },
  slotCountBadge: {
    backgroundColor: 'rgba(34, 211, 238, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  slotCountText: { fontSize: 11, color: Colors.cyan, fontWeight: 'bold' },

  // Fulfillment card
  fulfillmentCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fulfillmentTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  planName: { ...Typography.body, fontWeight: '700', marginBottom: 2 },
  customerName: { ...Typography.caption },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  actionBtnYellow: { backgroundColor: Colors.warning },
  actionBtnText: { color: Colors.background, fontWeight: 'bold', fontSize: 13 },

  readyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
  },
  readyRowText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
  },

  // Offer Modal
  offerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  offerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: Spacing.lg,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.3)',
  },
  offerHeader: { alignItems: 'center', marginBottom: Spacing.md },
  offerIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  offerTitle: { ...Typography.h2, textAlign: 'center' },
  offerSubtitle: { ...Typography.caption, textAlign: 'center', marginTop: 4 },
  countdownWrap: { alignItems: 'center', marginBottom: Spacing.md },
  countdownNum: {
    fontSize: 64,
    fontWeight: 'bold',
    color: Colors.warning,
    lineHeight: 72,
  },
  countdownLabel: { ...Typography.caption, marginTop: 4 },
  offerDetails: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: 8,
  },
  offerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  offerRowText: { ...Typography.caption, color: Colors.text },
  offerActions: { flexDirection: 'row', gap: 12 },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.danger,
    paddingVertical: 14,
    gap: 6,
  },
  declineBtnText: { color: Colors.danger, fontWeight: 'bold', fontSize: 14 },
  acceptBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    gap: 6,
  },
  acceptBtnText: { color: Colors.background, fontWeight: 'bold', fontSize: 14 },

  // Subscribers section
  subsSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  subsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  subsSectionTitle: {
    ...Typography.body,
    color: Colors.cyan,
    fontWeight: '700',
    flex: 1,
    fontSize: 13,
  },
  subsEmpty: {
    ...Typography.caption,
    textAlign: 'center',
    paddingVertical: Spacing.md,
    color: Colors.textSecondary,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  subAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subName: { ...Typography.body, fontWeight: '700', fontSize: 13 },
  subPlan: { ...Typography.caption, marginTop: 1 },
  subStatusBadge: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  subStatusText: { fontSize: 10, fontWeight: '700' },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
  },
  viewAllText: { ...Typography.caption, color: Colors.cyan, fontWeight: '600' },

});
