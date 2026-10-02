import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AlertCircle, ShoppingBag } from 'lucide-react-native';
import { C, F } from '../theme';
import { FadeInView, KitchenHeader } from '../components/ui';
import { OrderCard, OrderCardSkeleton } from '../components/OrderCard';
import { QuickAddFab } from '../components/QuickAddFab';
import { useOrderStatusSheet } from '../components/OrderStatusSheet';
import { useChefOrders } from '../hooks/useChefOrders';
import { useTabBarSpace } from '../navigation/FloatingTabBar';
import { useAuth } from '../context/AuthContext';
import { isActiveOrder } from '../utils/orders';

type Filter = 'Active' | 'Completed';

export const OrdersScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomSpace = useTabBarSpace();
  const [filter, setFilter] = useState<Filter>('Active');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const { orders, loading, refreshing, error, updatingId, fetchOrders, updateStatus } = useChefOrders();
  const { openStatusSheet, statusSheet } = useOrderStatusSheet(updateStatus);

  useFocusEffect(
    useCallback(() => {
      fetchOrders().then(() => setUpdatedAt(new Date()));
    }, [fetchOrders])
  );

  const shown = orders.filter((o) => (filter === 'Active' ? isActiveOrder(o) : !isActiveOrder(o)));
  const kitchenName = user?.kitchen_name || (user?.name ? `${user.name.split(' ')[0]}’s Kitchen` : 'My Kitchen');

  const minutesAgo = updatedAt ? Math.round((Date.now() - updatedAt.getTime()) / 60000) : 0;
  const updatedLabel = minutesAgo < 1 ? 'Updated just now' : `Updated ${minutesAgo} min ago`;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={{ paddingTop: insets.top }}>
        <KitchenHeader
          kitchenName={kitchenName}
          ownerName={user?.name}
          onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
          onInbox={() => setFilter((f) => (f === 'Active' ? 'Completed' : 'Active'))}
          onProfile={() => navigation.navigate('Profile')}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomSpace + 60 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchOrders(true).then(() => setUpdatedAt(new Date()))}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
      >
        <FadeInView style={styles.overview}>
          <Text style={styles.eyebrow}>TODAY'S OVERVIEW</Text>
          <Text style={styles.overviewTitle}>{filter === 'Active' ? 'Active Orders' : 'Completed Orders'}</Text>
          <Text style={styles.overviewSub}>{updatedLabel} · Manage today's kitchen activity.</Text>
          <View style={styles.segment}>
            {(['Active', 'Completed'] as Filter[]).map((f) => (
              <Pressable key={f} onPress={() => setFilter(f)} style={[styles.segmentItem, filter === f && styles.segmentActive]}>
                <Text style={[styles.segmentText, filter === f && styles.segmentTextActive]}>{f}</Text>
              </Pressable>
            ))}
          </View>
        </FadeInView>

        {loading && orders.length === 0 ? (
          <View style={{ gap: 16 }}>
            <OrderCardSkeleton />
            <OrderCardSkeleton />
            <OrderCardSkeleton />
          </View>
        ) : error && orders.length === 0 ? (
          <Pressable onPress={() => fetchOrders()} style={styles.empty}>
            <AlertCircle size={22} color={C.danger} />
            <Text style={styles.emptyText}>{error} Tap to retry.</Text>
          </Pressable>
        ) : shown.length === 0 ? (
          <FadeInView delay={80} style={styles.empty}>
            <ShoppingBag size={22} color={C.iconMuted} />
            <Text style={styles.emptyText}>
              {filter === 'Active' ? 'No active orders at the moment.' : 'No completed orders yet.'}
            </Text>
          </FadeInView>
        ) : (
          shown.map((o, i) => (
            <FadeInView key={o.id} delay={60 + Math.min(i, 8) * 60}>
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 12,
  },
  overview: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 3,
    marginBottom: 2,
  },
  eyebrow: {
    fontFamily: F.jakartaBold,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 0.5,
    color: C.primaryRing,
  },
  overviewTitle: {
    fontFamily: F.jakartaBold,
    fontSize: 19,
    lineHeight: 28.5,
    color: C.textStrong,
  },
  overviewSub: {
    fontFamily: F.jakartaRegular,
    fontSize: 11,
    lineHeight: 16.5,
    color: C.textMuted,
  },
  segment: {
    flexDirection: 'row',
    marginTop: 10,
    padding: 3,
    borderRadius: 12,
    backgroundColor: '#F4F5FA',
    alignSelf: 'flex-start',
  },
  segmentItem: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9,
  },
  segmentActive: {
    backgroundColor: C.surface,
    shadowColor: '#15151A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: {
    fontFamily: F.jakartaBold,
    fontSize: 11,
    color: C.textMuted,
  },
  segmentTextActive: {
    color: C.primary,
  },
  empty: {
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
});
