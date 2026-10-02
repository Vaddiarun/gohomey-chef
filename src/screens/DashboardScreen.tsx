import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, Clock, IndianRupee, Repeat, ShoppingBag, Utensils } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { C, F, Shadows } from '../theme';
import { FadeInView, KitchenHeader, PressableScale, SunsetBackdrop } from '../components/ui';
import { OrderCard, OrderCardSkeleton } from '../components/OrderCard';
import { MenuTile } from '../components/MenuTile';
import { QuickAddFab } from '../components/QuickAddFab';
import { useOrderStatusSheet } from '../components/OrderStatusSheet';
import { useChefOrders } from '../hooks/useChefOrders';
import { useTabBarSpace } from '../navigation/FloatingTabBar';
import { formatRupees, isActiveOrder } from '../utils/orders';
import { windowLabel } from '../utils/meals';

interface DashboardData {
  earnings_today: number;
  orders_count_today: number;
  active_slots_count: number;
  active_slots: any[];
}

const DASHBOARD_ORDER_LIMIT = 3;

/** Number tile (Figma "div.bg-card" 76:11773). */
const StatTile = ({ Icon, value, label, onPress, delay }: { Icon: any; value: string; label: string; onPress?: () => void; delay: number }) => (
  <FadeInView delay={delay} style={styles.statWrap}>
    <PressableScale onPress={onPress} disabled={!onPress} pressedScale={0.96} style={styles.stat}>
      <Icon size={20} color={C.primaryRing} strokeWidth={1.67} />
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </PressableScale>
  </FadeInView>
);


export const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const { token, user, handleUnauthorized } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const bottomSpace = useTabBarSpace();

  const [data, setData] = useState<DashboardData | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { orders, loading: ordersLoading, error: ordersError, updatingId, fetchOrders, updateStatus } = useChefOrders();
  const { openStatusSheet, statusSheet } = useOrderStatusSheet(updateStatus);

  const fetchDashboardData = useCallback(async () => {
    setStatsError(null);
    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}chefs/dashboard`;
      console.log('API Request: GET', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401 || response.status === 403) {
        const errData = await response.json().catch(() => ({}));
        console.log('API Error (Dashboard):', response.status, errData?.message || errData?.code);
        handleUnauthorized(errData);
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.log('API Error:', response.status, errorText);
        throw new Error('Failed to fetch dashboard data');
      }

      const result = await response.json();
      console.log('API Response:', JSON.stringify(result, null, 2));

      if (result.status === 'success') {
        setData(result.data);
      } else {
        throw new Error('Something went wrong');
      }
    } catch (err: any) {
      console.log('Dashboard fetch error:', err.message);
      setStatsError('Could not load today’s numbers.');
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
      fetchOrders();
    }, [fetchDashboardData, fetchOrders])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboardData(), fetchOrders(true)]);
    setRefreshing(false);
  }, [fetchDashboardData, fetchOrders]);

  const activeOrders = orders.filter(isActiveOrder);
  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
  const kitchenName = user?.kitchen_name || (user?.name ? `${user.name.split(' ')[0]}’s Kitchen` : 'My Kitchen');
  const goOrders = () => navigation.navigate('Orders');

  const attention =
    pendingCount > 0
      ? `${pendingCount} ${pendingCount === 1 ? 'order needs' : 'orders need'} your attention.`
      : activeOrders.length > 0
      ? `${activeOrders.length} ${activeOrders.length === 1 ? 'order is' : 'orders are'} in your kitchen right now.`
      : 'No orders waiting — new orders will show up here.';

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomSpace + 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} progressViewOffset={insets.top} />
        }
      >
        <SunsetBackdrop width={width} />

        <View style={{ paddingTop: insets.top }}>
          <FadeInView offset={-8}>
            <KitchenHeader
              kitchenName={kitchenName}
              ownerName={user?.name}
              onWallet={() => navigation.navigate('Wallet')}
              onProfile={() => navigation.navigate('Profile')}
            />
          </FadeInView>
        </View>

        <View style={styles.top}>
          <FadeInView delay={80} style={styles.onlineCard}>
            <Text style={styles.onlineTitle}>You're online</Text>
            <Text style={styles.onlineBody}>{attention}</Text>
          </FadeInView>

          <View style={styles.stats}>
            <StatTile delay={140} Icon={ShoppingBag} value={String(data?.orders_count_today ?? 0)} label="Orders" onPress={goOrders} />
            <StatTile delay={200} Icon={Clock} value={String(data?.active_slots_count ?? 0)} label="Active slots" onPress={() => navigation.navigate('Daily')} />
            <StatTile delay={260} Icon={IndianRupee} value={formatRupees(data?.earnings_today ?? 0)} label="Earnings" />
          </View>
          {!!statsError && (
            <Pressable onPress={fetchDashboardData} style={styles.inlineError}>
              <AlertCircle size={14} color={C.danger} />
              <Text style={styles.inlineErrorText}>{statsError} Tap to retry.</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.section}>
          <FadeInView delay={300} style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Orders</Text>
            {orders.length > 0 && (
              <Pressable onPress={goOrders} hitSlop={8}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            )}
          </FadeInView>

          {ordersLoading && orders.length === 0 ? (
            <>
              <OrderCardSkeleton />
              <OrderCardSkeleton />
            </>
          ) : ordersError && orders.length === 0 ? (
            <Pressable onPress={() => fetchOrders()} style={styles.emptyCard}>
              <AlertCircle size={22} color={C.danger} />
              <Text style={styles.emptyText}>{ordersError} Tap to retry.</Text>
            </Pressable>
          ) : activeOrders.length === 0 ? (
            <FadeInView delay={340} style={styles.emptyCard}>
              <ShoppingBag size={22} color={C.iconMuted} />
              <Text style={styles.emptyText}>No active orders right now.</Text>
            </FadeInView>
          ) : (
            activeOrders.slice(0, DASHBOARD_ORDER_LIMIT).map((o, i) => (
              <FadeInView key={o.id} delay={340 + i * 70}>
                <OrderCard
                  order={o}
                  updating={updatingId === o.id}
                  onAccept={() => updateStatus(o.id, 'CONFIRMED')}
                  onChangeStatus={() => openStatusSheet(o)}
                  onPress={() => openStatusSheet(o)}
                />
              </FadeInView>
            ))
          )}

          {/* Active slots today (chefs/dashboard → active_slots) + created-slot history */}
          <FadeInView delay={400} style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Active slots today</Text>
            <Pressable onPress={() => navigation.navigate('CatalogHistory')} hitSlop={8}>
              <Text style={styles.seeAll}>View history</Text>
            </Pressable>
          </FadeInView>
          {data?.active_slots?.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.slotStrip}>
              {data.active_slots.map((slot: any) => (
                <View key={slot.id} style={styles.slotTile}>
                  <MenuTile
                    name={slot.meal_name}
                    price={slot.price}
                    imageUrl={slot.image_url}
                    tag={windowLabel(slot.service_window)}
                    availability={(slot.slots_remaining ?? 0) > 0 ? `${slot.slots_remaining} of ${slot.slots_total} left` : 'Sold out'}
                    tone={(slot.slots_remaining ?? 0) > 0 ? 'ok' : 'out'}
                    onPress={() => navigation.navigate('MealDetail', { meal: slot })}
                  />
                </View>
              ))}
            </ScrollView>
          ) : (
            <FadeInView delay={420} style={styles.emptyCard}>
              <Utensils size={22} color={C.iconMuted} />
              <Text style={styles.emptyText}>No slots live today. Tap Create Meal to add one.</Text>
            </FadeInView>
          )}

          <View style={styles.actions}>
            <FadeInView delay={420} style={styles.actionWrap}>
              <PressableScale style={styles.action} pressedScale={0.96} onPress={() => navigation.navigate('CreateSlot')}>
                <LinearGradient
                  colors={['#FF5C05', '#FF9E75', '#FCB997']}
                  locations={[0, 0.56, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionIcon}
                >
                  <Utensils size={16} color={C.white} strokeWidth={1.33} />
                </LinearGradient>
                <Text style={styles.actionLabel}>Create Meal</Text>
              </PressableScale>
            </FadeInView>
            <FadeInView delay={480} style={styles.actionWrap}>
              <PressableScale style={styles.action} pressedScale={0.96} onPress={goOrders}>
                <View style={[styles.actionIcon, { backgroundColor: '#FFEFE5' }]}>
                  <ShoppingBag size={16} color={C.primaryRing} strokeWidth={1.33} />
                </View>
                <Text style={styles.actionLabel}>Manage Orders</Text>
              </PressableScale>
            </FadeInView>
            <FadeInView delay={540} style={styles.actionWrap}>
              <PressableScale style={styles.action} pressedScale={0.96} onPress={() => navigation.navigate('Subscriptions')}>
                <View style={[styles.actionIcon, { backgroundColor: '#FFEFE5' }]}>
                  <Repeat size={16} color={C.primaryRing} strokeWidth={1.33} />
                </View>
                <Text style={styles.actionLabel}>Subscriptions</Text>
              </PressableScale>
            </FadeInView>
          </View>
        </View>
      </ScrollView>

      <QuickAddFab />
      {statusSheet}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  top: {
    paddingHorizontal: 20,
    gap: 14,
  },
  onlineCard: {
    minHeight: 90,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderCard,
    padding: 16,
    justifyContent: 'center',
    ...Shadows.card,
  },
  onlineTitle: {
    fontFamily: F.interBold,
    fontSize: 15,
    lineHeight: 22.5,
    color: C.textInk,
  },
  onlineBody: {
    fontFamily: F.interRegular,
    fontSize: 12.5,
    lineHeight: 18.75,
    color: C.textMuted3,
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
  },
  statWrap: {
    flex: 1,
  },
  stat: {
    height: 113,
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  statValue: {
    fontFamily: F.jakartaBold,
    fontSize: 20,
    lineHeight: 30,
    color: C.textStrong,
    paddingTop: 16,
  },
  statLabel: {
    fontFamily: F.jakartaSemiBold,
    fontSize: 10,
    lineHeight: 15,
    color: C.textMuted,
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineErrorText: {
    fontFamily: F.jakartaSemiBold,
    fontSize: 11,
    color: C.danger,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 22,
    gap: 12,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: F.jakartaBold,
    fontSize: 19,
    lineHeight: 28.5,
    color: C.textStrong,
  },
  seeAll: {
    fontFamily: F.jakartaBold,
    fontSize: 12,
    color: C.primaryRing,
  },
  emptyCard: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontFamily: F.jakartaSemiBold,
    fontSize: 12,
    color: C.textMuted,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  slotStrip: {
    gap: 12,
    paddingRight: 4,
  },
  slotTile: {
    width: 168,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionWrap: {
    flex: 1,
  },
  action: {
    // Fill the wrapper so all three cards match the tallest (a label can wrap).
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    gap: 7,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  actionLabel: {
    fontFamily: F.jakartaBold,
    fontSize: 11,
    lineHeight: 16.5,
    color: C.textStrong,
  },
});
