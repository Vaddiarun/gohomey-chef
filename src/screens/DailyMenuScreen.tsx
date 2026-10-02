import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AlertCircle, History, Plus, Utensils } from 'lucide-react-native';
import { C, F } from '../theme';
import { FadeInView, KitchenHeader, PressableScale } from '../components/ui';
import { QuickAddFab } from '../components/QuickAddFab';
import { useTabBarSpace } from '../navigation/FloatingTabBar';
import { useAuth } from '../context/AuthContext';
import { MenuTile, MenuTileSkeleton } from '../components/MenuTile';
import { dayLabel, windowLabel } from '../utils/meals';
import { errorText } from '../utils/apiErrors';

export interface Meal {
  id: string;
  meal_name: string;
  type: 'VEG' | 'NON_VEG';
  service_window: string;
  image_url: string;
  slots_remaining: number;
  /** From chefs/catalog: false once the slot is past, sold out or closed. */
  is_active?: boolean;
  inactive_reason?: string | null;
  slots_total: number;
  price: number;
  date: string;
}

const mealAvailability = (m: Meal): { text: string; tone: 'ok' | 'out' } => {
  if ((m.slots_remaining ?? 0) <= 0) return { text: 'Sold out', tone: 'out' };
  return { text: `Available · ${m.slots_remaining} slots`, tone: 'ok' };
};

export const DailyMenuScreen = () => {
  const navigation = useNavigation<any>();
  const { token, user, handleUnauthorized } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomSpace = useTabBarSpace();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMeals = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      try {
        // The chef's own created meals come from chefs/catalog (daily_meals);
        // GET meals is merged in for any extra fields such as image_url.
        const [catalogRes, mealsRes] = await Promise.all([
          fetch(`${process.env.EXPO_PUBLIC_API_URL}chefs/catalog`, { headers }),
          fetch(`${process.env.EXPO_PUBLIC_API_URL}meals`, { headers }),
        ]);
        if (catalogRes.status === 401 || catalogRes.status === 403) {
          handleUnauthorized(await catalogRes.json().catch(() => ({})));
          return;
        }
        const catalog = await catalogRes.json().catch(() => ({}));
        const mealsBody = await mealsRes.json().catch(() => ({}));
        console.log('Daily: chefs/catalog daily_meals:', JSON.stringify(catalog?.data?.daily_meals ?? null, null, 2));
        console.log('Daily: GET meals:', JSON.stringify(mealsBody, null, 2));

        const fromCatalog: Meal[] = Array.isArray(catalog?.data?.daily_meals) ? catalog.data.daily_meals : [];
        const fromMeals: Meal[] = Array.isArray(mealsBody) ? mealsBody : Array.isArray(mealsBody?.data) ? mealsBody.data : [];
        if (!catalogRes.ok && !mealsRes.ok) throw new Error('Could not load your menu.');

        const byId = new Map<string, Meal>();
        [...fromCatalog, ...fromMeals].forEach((m) => {
          if (!m?.id) return;
          byId.set(m.id, { ...(byId.get(m.id) ?? {}), ...m } as Meal);
        });
        // Only currently active meals here; everything else lives in History.
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const list = [...byId.values()]
          .filter((m) => m.is_active !== false && new Date(m.date).getTime() >= startOfToday.getTime())
          .sort((x, y) => new Date(x.date).getTime() - new Date(y.date).getTime());
        setMeals(list);
      } catch (err: any) {
        setError(errorText(err, 'Could not load your menu.'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useFocusEffect(
    useCallback(() => {
      fetchMeals();
    }, [fetchMeals])
  );

  const kitchenName = user?.kitchen_name || (user?.name ? `${user.name.split(' ')[0]}’s Kitchen` : 'My Kitchen');

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={{ paddingTop: insets.top }}>
        <KitchenHeader
          kitchenName={kitchenName}
          ownerName={user?.name}
          onWallet={() => navigation.navigate('Wallet')}
          onProfile={() => navigation.navigate('Profile')}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomSpace + 60 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchMeals(true)} tintColor={C.primary} colors={[C.primary]} />}
      >
        <FadeInView style={styles.titleRow}>
          <Text style={styles.title}>Active Daily Menu</Text>
          <Pressable onPress={() => navigation.navigate('CatalogHistory')} hitSlop={8} style={styles.historyLink}>
            <History size={14} color={C.primaryRing} strokeWidth={1.67} />
            <Text style={styles.historyText}>History</Text>
          </Pressable>
        </FadeInView>

        {loading && meals.length === 0 ? (
          <View style={styles.grid}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.cell}>
                <MenuTileSkeleton />
              </View>
            ))}
          </View>
        ) : error && meals.length === 0 ? (
          <Pressable onPress={() => fetchMeals()} style={styles.empty}>
            <AlertCircle size={22} color={C.danger} />
            <Text style={styles.emptyText}>{error} Tap to retry.</Text>
          </Pressable>
        ) : meals.length === 0 ? (
          <FadeInView delay={80} style={styles.empty}>
            <Utensils size={24} color={C.iconMuted} />
            <Text style={styles.emptyText}>No meals are live right now.</Text>
            <Pressable onPress={() => navigation.navigate('CatalogHistory')} hitSlop={8}>
              <Text style={styles.historyText}>See past meals in History</Text>
            </Pressable>
            <PressableScale style={styles.emptyCta} onPress={() => navigation.navigate('CreateSlot')}>
              <Plus size={14} color={C.primary} />
              <Text style={styles.emptyCtaText}>Add a meal</Text>
            </PressableScale>
          </FadeInView>
        ) : (
          <View style={styles.grid}>
            {meals.map((m, i) => (
              <FadeInView key={m.id} delay={60 + Math.min(i, 8) * 50} style={styles.cell}>
                <MenuTile
                  name={m.meal_name}
                  price={m.price}
                  imageUrl={m.image_url}
                  tag={`${windowLabel(m.service_window)} · ${dayLabel(m.date)}`}
                  availability={mealAvailability(m).text}
                  tone={mealAvailability(m).tone}
                  onPress={() => navigation.navigate('MealDetail', { meal: m })}
                />
              </FadeInView>
            ))}
          </View>
        )}
      </ScrollView>

      <QuickAddFab />
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
    paddingTop: 8,
    gap: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  title: {
    fontFamily: F.jakartaBold,
    fontSize: 19,
    lineHeight: 28.5,
    color: C.textStrong,
  },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyText: {
    fontFamily: F.jakartaBold,
    fontSize: 12,
    color: C.primaryRing,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  cell: {
    width: '48.4%',
  },
  empty: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    fontFamily: F.jakartaSemiBold,
    fontSize: 12,
    color: C.textMuted,
    textAlign: 'center',
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: C.softOrange,
  },
  emptyCtaText: {
    fontFamily: F.jakartaBold,
    fontSize: 12,
    color: C.primary,
  },
});
