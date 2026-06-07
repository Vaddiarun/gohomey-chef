import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, ChevronLeft, Package, RefreshCcw, Utensils, Users, Zap } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '../theme';
import { useAuth } from '../context/AuthContext';

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
  SOCIAL_EVENT: 'Social Event',
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

const getItemMeta = (item: CatalogItem) => {
  const parts = [
    item.service_window,
    item.time_slot,
    item.date ? new Date(item.date).toLocaleDateString() : null,
    item.created_at && !item.date ? new Date(item.created_at).toLocaleDateString() : null,
  ];

  return parts.filter(Boolean).join(' • ');
};

const getTypeIcon = (type?: string) => {
  if (type === 'PANTRY_ITEM') return Package;
  if (type === 'SOCIAL_EVENT') return Users;
  if (type === 'FUEL_SLOT') return Zap;
  return Utensils;
};

export const CatalogHistoryScreen = ({ navigation }: any) => {
  const { token } = useAuth();
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
    if (selectedFilter === 'MEALS') {
      return items.filter(item => item.catalog_type === 'DAILY_MEAL');
    }
    if (selectedFilter === 'PANTRY') {
      return items.filter(item => item.catalog_type === 'PANTRY_ITEM');
    }
    if (selectedFilter === 'REMAINING') {
      return items.filter(item => item.catalog_type !== 'DAILY_MEAL' && item.catalog_type !== 'PANTRY_ITEM');
    }

    return items;
  }, [items, selectedFilter]);

  const filterOptions: Array<{ key: CatalogFilter; label: string; count: number }> = [
    { key: 'ALL', label: 'All', count: items.length },
    { key: 'MEALS', label: 'Meals', count: items.filter(item => item.catalog_type === 'DAILY_MEAL').length },
    { key: 'PANTRY', label: 'Pantry', count: items.filter(item => item.catalog_type === 'PANTRY_ITEM').length },
    { key: 'REMAINING', label: 'Remaining', count: items.filter(item => item.catalog_type !== 'DAILY_MEAL' && item.catalog_type !== 'PANTRY_ITEM').length },
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
        throw new Error(result.message || 'Failed to load catalog history');
      }

      setCatalog(result.data || {});
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Catalog History</Text>
        <TouchableOpacity onPress={() => fetchCatalog(true)} style={styles.refreshBtn}>
          <RefreshCcw size={18} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchCatalog(true)}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.centerText}>Loading catalog...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchCatalog()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{catalog?.summary?.total_count || items.length}</Text>
                <Text style={styles.summaryLabel}>Total Items</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{catalog?.summary?.daily_meals_count || 0}</Text>
                <Text style={styles.summaryLabel}>Meals</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{catalog?.summary?.pantry_items_count || 0}</Text>
                <Text style={styles.summaryLabel}>Pantry</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{catalog?.summary?.social_events_count || 0}</Text>
                <Text style={styles.summaryLabel}>Events</Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {filterOptions.map(option => {
                const isSelected = selectedFilter === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.filterChip, isSelected && styles.filterChipActive]}
                    onPress={() => setSelectedFilter(option.key)}
                  >
                    <Text style={[styles.filterText, isSelected && styles.filterTextActive]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.filterCount, isSelected && styles.filterTextActive]}>
                      {option.count}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {filteredItems.length === 0 ? (
              <View style={styles.emptyBox}>
                <Calendar size={32} color={Colors.textSecondary} />
                <Text style={styles.emptyTitle}>No items found</Text>
                <Text style={styles.emptyText}>This filter does not have any catalog items yet.</Text>
              </View>
            ) : (
              filteredItems.map((item, index) => {
                const Icon = getTypeIcon(item.catalog_type);
                const isActive = item.is_active !== false;
                const reason = item.inactive_reason ? reasonLabels[item.inactive_reason] || item.inactive_reason : null;
                const meta = getItemMeta(item);

                return (
                  <View key={`${item.catalog_type}-${item.id || index}`} style={styles.itemCard}>
                    <View style={styles.itemIcon}>
                      <Icon size={18} color={Colors.primary} />
                    </View>
                    <View style={styles.itemBody}>
                      <View style={styles.itemTopRow}>
                        <Text style={styles.itemTitle} numberOfLines={1}>{getItemTitle(item)}</Text>
                        <View style={[styles.statusBadge, isActive ? styles.activeBadge : styles.inactiveBadge]}>
                          <Text style={[styles.statusText, isActive ? styles.activeText : styles.inactiveText]}>
                            {isActive ? 'Active' : 'Inactive'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.itemType}>{typeLabels[item.catalog_type || ''] || item.catalog_type}</Text>
                      {meta ? <Text style={styles.itemMeta}>{meta}</Text> : null}
                      {item.price != null ? <Text style={styles.priceText}>₹{item.price}</Text> : null}
                      {reason ? <Text style={styles.reasonText}>{reason}</Text> : null}
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.h2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: Spacing.xl,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  summaryValue: {
    ...Typography.h2,
    color: Colors.primary,
  },
  summaryLabel: {
    ...Typography.caption,
    marginTop: 4,
    fontWeight: 'bold',
  },
  filterRow: {
    gap: 8,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    ...Typography.caption,
    color: Colors.text,
    fontWeight: 'bold',
  },
  filterCount: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  filterTextActive: {
    color: Colors.background,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: 12,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  itemBody: {
    flex: 1,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemTitle: {
    ...Typography.h3,
    flex: 1,
    fontSize: 16,
  },
  itemType: {
    ...Typography.caption,
    marginTop: 4,
    fontWeight: 'bold',
    color: Colors.cyan,
  },
  itemMeta: {
    ...Typography.caption,
    marginTop: 4,
  },
  priceText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: 'bold',
    marginTop: 6,
  },
  reasonText: {
    ...Typography.caption,
    color: Colors.warning,
    marginTop: 6,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  activeBadge: {
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
  },
  inactiveBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  activeText: {
    color: Colors.primary,
  },
  inactiveText: {
    color: Colors.danger,
  },
  centerBox: {
    paddingVertical: 64,
    alignItems: 'center',
  },
  centerText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  errorText: {
    ...Typography.body,
    color: Colors.danger,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
  },
  retryText: {
    color: Colors.background,
    fontWeight: 'bold',
  },
  emptyBox: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    padding: Spacing.xl,
  },
  emptyTitle: {
    ...Typography.h3,
    marginTop: Spacing.md,
  },
  emptyText: {
    ...Typography.caption,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
});
