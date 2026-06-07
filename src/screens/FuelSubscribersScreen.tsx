import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, Typography } from '../theme';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  AlertCircle,
  ChevronLeft,
  Calendar,
  Zap,
  Phone,
  User,
} from 'lucide-react-native';

interface Subscriber {
  id: string;
  plan: {
    id: string;
    name: string;
    price: number;
    deliveriesPerWeek?: number;
  };
  user: {
    id: string;
    name: string;
    phone: string;
  };
  delivery_days?: string[];
  status?: string;
  start_date?: string;
}

const STATUS_COLOR: Record<string, { color: string; bg: string }> = {
  ACTIVE: { color: Colors.primary, bg: 'rgba(74, 222, 128, 0.1)' },
  PAUSED: { color: Colors.warning, bg: 'rgba(250, 204, 21, 0.1)' },
  CANCELLED: { color: Colors.danger, bg: 'rgba(239, 68, 68, 0.1)' },
};

const DAY_SHORT: Record<string, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun',
};

export const FuelSubscribersScreen = () => {
  const navigation = useNavigation<any>();
  const { token } = useAuth();

  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setError(err.message);
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fuel Subscribers</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{subscribers.length}</Text>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.centerText}>Loading subscribers...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <AlertCircle size={36} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchSubscribers()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchSubscribers(true)}
              tintColor={Colors.primary}
            />
          }
        >
          {subscribers.length === 0 ? (
            <View style={styles.centerBox}>
              <Users size={40} color={Colors.textSecondary} />
              <Text style={styles.centerText}>No active Fuel subscribers yet.</Text>
            </View>
          ) : (
            subscribers.map(sub => {
              const statusCfg = STATUS_COLOR[sub.status ?? 'ACTIVE'] ?? STATUS_COLOR.ACTIVE;
              return (
                <View key={sub.id} style={styles.card}>
                  {/* Plan badge + status */}
                  <View style={styles.cardTop}>
                    <View style={styles.planBadge}>
                      <Zap size={12} color={Colors.warning} />
                      <Text style={styles.planBadgeText}>{sub.plan?.name ?? 'Fuel Plan'}</Text>
                    </View>
                    {sub.status && (
                      <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                        <Text style={[styles.statusText, { color: statusCfg.color }]}>
                          {sub.status}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Customer info */}
                  <View style={styles.customerRow}>
                    <View style={styles.avatarWrap}>
                      <User size={18} color={Colors.primary} />
                    </View>
                    <View>
                      <Text style={styles.customerName}>{sub.user?.name ?? 'Customer'}</Text>
                      {sub.user?.phone && (
                        <View style={styles.phoneRow}>
                          <Phone size={11} color={Colors.textSecondary} />
                          <Text style={styles.phoneText}>{sub.user.phone}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Plan details */}
                  <View style={styles.detailsRow}>
                    {sub.plan?.price != null && (
                      <View style={styles.detailChip}>
                        <Text style={styles.detailChipText}>
                          ₹{sub.plan.price}
                          {sub.plan.deliveriesPerWeek ? ` / ${sub.plan.deliveriesPerWeek}×wk` : ''}
                        </Text>
                      </View>
                    )}
                    {sub.delivery_days && sub.delivery_days.length > 0 && (
                      <View style={styles.daysWrap}>
                        {sub.delivery_days.map(day => (
                          <View key={day} style={styles.dayChip}>
                            <Text style={styles.dayChipText}>{DAY_SHORT[day] ?? day}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {sub.start_date && (
                    <View style={styles.startDateRow}>
                      <Calendar size={11} color={Colors.textSecondary} />
                      <Text style={styles.startDateText}>
                        Since {new Date(sub.start_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...Typography.h3, flex: 1 },
  headerBadge: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  headerBadgeText: { fontSize: 13, fontWeight: 'bold', color: Colors.primary },

  scrollContent: { padding: Spacing.md, paddingBottom: 40 },

  // States
  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  centerText: { ...Typography.body, color: Colors.textSecondary, marginTop: Spacing.md },
  errorBox: {
    margin: Spacing.md,
    padding: Spacing.lg,
    alignItems: 'center',
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

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(250, 204, 21, 0.12)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  planBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.warning },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.sm,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerName: { ...Typography.body, fontWeight: '700' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  phoneText: { ...Typography.caption },

  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.xs,
  },
  detailChip: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailChipText: { fontSize: 12, color: Colors.text, fontWeight: '600' },
  daysWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  dayChip: {
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  dayChipText: { fontSize: 11, color: Colors.cyan, fontWeight: '600' },

  startDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  startDateText: { ...Typography.caption },
});
