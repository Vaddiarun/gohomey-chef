import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AlertCircle, Calendar, Package, Sparkles, Utensils, Zap } from 'lucide-react-native';
import { format } from 'date-fns';
import { C, F } from '../theme';
import { Chip, FadeInView, KitchenHeader, StatusBadge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { windowLabel } from '../utils/meals';
import { errorText } from '../utils/apiErrors';

type CatalogType = 'DAILY_MEAL' | 'PANTRY_ITEM' | 'SOCIAL_EVENT' | 'FUEL_SLOT';
type CatalogFilter = 'ALL' | 'MEALS' | 'PANTRY' | 'REMAINING';

interface CatalogItem {
  id?: string;
  catalog_type?: CatalogType | string;
  is_active?: boolean;
  inactive_reason?: string | null;
  name?: string;
  title?: string;
  meal_name?: string;
  plan_name?: string;
  price?: number;
  date?: string;
  created_at?: string;
  updated_at?: string;
  service_window?: string;
  time_slot?: string;
  inventory?: number;
  slots_remaining?: number;
  slots_total?: number;
  capacity?: number;
}

interface CatalogSummary {
  daily_meals_count?: number;
  pantry_items_count?: number;
  social_events_count?: number;
  fuel_slots_count?: number;
  total_count?: number;
}

interface CatalogData {
  summary?: CatalogSummary;
  daily_meals?: CatalogItem[];
  pantry_items?: CatalogItem[];
  social_events?: CatalogItem[];
  fuel_slots?: CatalogItem[];
}

const typeLabels: Record<string, string> = {
  DAILY_MEAL: 'Daily Meal',
  PANTRY_ITEM: 'Pantry',
  SOCIAL_EVENT: 'Social Table',
  FUEL_SLOT: 'Fuel Slot',
};

const reasonLabels: Record<string, string> = {
  PAST_DATE: 'Past date',
  SOLD_OUT: 'Sold out',
  SERVICE_WINDOW_CLOSED: 'Service window closed',
  OUT_OF_STOCK: 'Out of stock',
  EVENT_ENDED: 'Event ended',
};

const getItemTitle = (item: CatalogItem) =>
  item.meal_name || item.title || item.name || item.plan_name || typeLabels[item.catalog_type || ''] || 'Catalog Item';

const safeDate = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : format(d, 'd MMM yyyy');
};

const getItemMeta = (item: CatalogItem) =>
  [
    item.service_window ? windowLabel(item.service_window) : null,
    item.time_slot,
    safeDate(item.date) ?? safeDate(item.created_at),
    item.slots_total != null ? `${item.slots_remaining ?? 0}/${item.slots_total} slots left` : null,
    item.inventory != null ? `${item.inventory} in stock` : null,
  ]
    .filter(Boolean)
    .join(' · ');

const getTypeIcon = (type?: string) => {
  if (type === 'PANTRY_ITEM') return Package;
  if (type === 'SOCIAL_EVENT') return Sparkles;
  if (type === 'FUEL_SLOT') return Zap;
  return Utensils;
};

/** Every slot / item the chef has created (GET chefs/catalog). */
export const CatalogHistoryScreen = ({ navigation }: any) => {
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<CatalogFilter>('ALL');

  const items = useMemo(() => {
    if (!catalog) return [];
    return [
      ...(catalog.daily_meals || []).map(item => ({ ...item, catalog_type: item.catalog_type || 'DAILY_MEAL' })),
      ...(catalog.pantry_items || []).map(item => ({ ...item, catalog_type: item.catalog_type || 'PANTRY_ITEM' })),
      ...(catalog.social_events || []).map(item => ({ ...item, catalog_type: item.catalog_type || 'SOCIAL_EVENT' })),
      ...(catalog.fuel_slots || []).map(item => ({ ...item, catalog_type: item.catalog_type || 'FUEL_SLOT' })),
    ];
  }, [catalog]);

  const filteredItems = useMemo(() => {
    if (selectedFilter === 'MEALS') return items.filter(item => item.catalog_type === 'DAILY_MEAL');
    if (selectedFilter === 'PANTRY') return items.filter(item => item.catalog_type === 'PANTRY_ITEM');
    if (selectedFilter === 'REMAINING') {
      return items.filter(item => item.catalog_type !== 'DAILY_MEAL' && item.catalog_type !== 'PANTRY_ITEM');
    }
    return items;
  }, [items, selectedFilter]);

  const filterOptions: Array<{ key: CatalogFilter; label: string; count: number }> = [
    { key: 'ALL', label: 'All', count: items.length },
    { key: 'MEALS', label: 'Meals', count: items.filter(item => item.catalog_type === 'DAILY_MEAL').length },
    { key: 'PANTRY', label: 'Pantry', count: items.filter(item => item.catalog_type === 'PANTRY_ITEM').length },
    { key: 'REMAINING', label: 'Social & Fuel', count: items.filter(item => item.catalog_type !== 'DAILY_MEAL' && item.catalog_type !== 'PANTRY_ITEM').length },
  ];

  const fetchCatalog = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}chefs/catalog`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();

      if (!response.ok || result.status !== 'success') {
        throw new Error('Could not load your created slots.');
      }

      setCatalog(result.data || {});
    } catch (err: any) {
      setError(errorText(err, 'Something went wrong.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const summary = [
    { label: 'Total', value: catalog?.summary?.total_count || items.length },
    { label: 'Meals', value: catalog?.summary?.daily_meals_count || 0 },
    { label: 'Pantry', value: catalog?.summary?.pantry_items_count || 0 },
    { label: 'Socials', value: catalog?.summary?.social_events_count || 0 },
  ];

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={{ paddingTop: insets.top }}>
        <KitchenHeader kitchenName="Created Slots" subtitle="Catalog history" ownerName={user?.name} onBack={() => navigation.goBack()} onProfile={() => navigation.navigate('Profile')} onWallet={() => navigation.navigate('Wallet')} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchCatalog(true)} tintColor={C.primary} colors={[C.primary]} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
        ) : error ? (
          <Pressable onPress={() => fetchCatalog()} style={styles.empty}>
            <AlertCircle size={22} color={C.danger} />
            <Text style={styles.emptyText}>{error} Tap to retry.</Text>
          </Pressable>
        ) : (
          <>
            <FadeInView style={styles.stats}>
              {summary.map((s) => (
                <View key={s.label} style={styles.stat}>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </FadeInView>

            <FadeInView delay={60}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
                {filterOptions.map((o) => (
                  <Chip key={o.key} label={`${o.label} · ${o.count}`} selected={selectedFilter === o.key} onPress={() => setSelectedFilter(o.key)} />
                ))}
              </ScrollView>
            </FadeInView>

            {filteredItems.length === 0 ? (
              <FadeInView delay={100} style={styles.empty}>
                <Calendar size={24} color={C.iconMuted} />
                <Text style={styles.emptyText}>Nothing created here yet.</Text>
              </FadeInView>
            ) : (
              filteredItems.map((item, index) => {
                const Icon = getTypeIcon(item.catalog_type);
                const isActive = item.is_active !== false;
                const reason = item.inactive_reason ? reasonLabels[item.inactive_reason] || item.inactive_reason : null;
                const meta = getItemMeta(item);
                return (
                  <FadeInView key={`${item.catalog_type}-${item.id || index}`} delay={100 + Math.min(index, 8) * 40} style={styles.item}>
                    <View style={styles.itemIcon}>
                      <Icon size={18} color={C.primary} strokeWidth={1.67} />
                    </View>
                    <View style={styles.itemBody}>
                      <View style={styles.itemTop}>
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {getItemTitle(item)}
                        </Text>
                        <StatusBadge label={isActive ? 'Active' : 'Inactive'} tone={isActive ? 'success' : 'neutral'} />
                      </View>
                      <Text style={styles.itemType}>{typeLabels[item.catalog_type || ''] || item.catalog_type}</Text>
                      {!!meta && <Text style={styles.itemMeta}>{meta}</Text>}
                      <View style={styles.itemFoot}>
                        {item.price != null && <Text style={styles.price}>₹{Number(item.price).toLocaleString('en-IN')}</Text>}
                        {!!reason && <Text style={styles.reason}>{reason}</Text>}
                      </View>
                    </View>
                  </FadeInView>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 20, paddingTop: 4, gap: 12 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, paddingVertical: 12, paddingHorizontal: 10 },
  statValue: { fontFamily: F.jakartaBold, fontSize: 20, lineHeight: 30, color: C.textStrong },
  statLabel: { fontFamily: F.jakartaSemiBold, fontSize: 10, lineHeight: 15, color: C.textMuted },
  filters: { gap: 8, paddingVertical: 2 },
  item: { flexDirection: 'row', gap: 12, backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 14 },
  itemIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.softOrange, alignItems: 'center', justifyContent: 'center' },
  itemBody: { flex: 1, gap: 2 },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemTitle: { flex: 1, fontFamily: F.jakartaBold, fontSize: 13, lineHeight: 19.5, color: C.textStrong },
  itemType: { fontFamily: F.jakartaSemiBold, fontSize: 10, color: C.primaryRing },
  itemMeta: { fontFamily: F.jakartaRegular, fontSize: 11, lineHeight: 16.5, color: C.textMuted },
  itemFoot: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  price: { fontFamily: F.jakartaBold, fontSize: 13, color: C.textStrong },
  reason: { fontFamily: F.jakartaSemiBold, fontSize: 10, color: C.danger },
  empty: { backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.border, paddingVertical: 32, alignItems: 'center', gap: 10 },
  emptyText: { fontFamily: F.jakartaSemiBold, fontSize: 12, color: C.textMuted, textAlign: 'center', paddingHorizontal: 20 },
});
