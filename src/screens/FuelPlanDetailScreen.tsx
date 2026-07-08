import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Spacing, Typography } from '../theme';
import { useAuth } from '../context/AuthContext';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
  Coffee,
  Sun,
  Moon,
  Flame,
  Target,
  Check,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';

interface FuelMeal {
  name: string;
  time_slot: string;
}

interface FuelDayMenu {
  day: number;
  meals: {
    breakfast?: FuelMeal;
    lunch?: FuelMeal;
    dinner?: FuelMeal;
  };
}

interface FuelPlanDetail {
  id: string;
  name: string;
  goal?: string;
  description?: string;
  price: number;
  duration_days?: number;
  duration_label?: string;
  delivery_time_slots?: string[];
  menu_json?: { days: FuelDayMenu[] };
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

const MEAL_CONFIG = {
  breakfast: { label: 'Breakfast', Icon: Coffee, color: Colors.warning },
  lunch: { label: 'Lunch', Icon: Sun, color: Colors.primary },
  dinner: { label: 'Dinner', Icon: Moon, color: Colors.cyan },
} as const;

const fmt12 = (slot?: string) => {
  if (!slot) return '';
  const [h, m] = slot.split(':').map(Number);
  if (isNaN(h)) return slot;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m ?? 0).padStart(2, '0')} ${ampm}`;
};

export const FuelPlanDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  const plan: FuelPlanDetail = route.params?.plan;
  const initialEnabled: boolean = !!route.params?.enabled;
  const initialSlots: string[] = route.params?.slots ?? [];

  const [enabled, setEnabled] = useState(initialEnabled);
  const [slots, setSlots] = useState<string[]>(initialSlots);
  const [enabling, setEnabling] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(1);

  const days = plan?.menu_json?.days ?? [];
  const macros = [
    { label: 'Calories', value: plan?.calories, unit: 'kcal' },
    { label: 'Protein', value: plan?.protein, unit: 'g' },
    { label: 'Carbs', value: plan?.carbs, unit: 'g' },
    { label: 'Fat', value: plan?.fat, unit: 'g' },
  ].filter(m => m.value != null);

  const handleEnable = async () => {
    if (enabling || enabled) return;
    setEnabling(true);
    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}fuel/chef/slots`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: plan.id }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(result.message || 'Could not enable Fuel plan');
      }

      Toast.show({ type: 'success', text1: 'Fuel plan enabled' });
      setEnabled(true);
      setSlots(plan.delivery_time_slots ?? []);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Enable failed', text2: err.message || 'Please try again.' });
    } finally {
      setEnabling(false);
    }
  };

  if (!plan) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.centerBox}>
          <Text style={styles.centerText}>Plan not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{plan.name}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 + insets.bottom }]}
      >
        {/* Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            {plan.goal && (
              <View style={styles.goalBadge}>
                <Zap size={11} color={Colors.warning} />
                <Text style={styles.goalBadgeText}>{plan.goal.replace(/_/g, ' ')}</Text>
              </View>
            )}
            {plan.duration_label && (
              <View style={styles.durationBadge}>
                <Clock size={11} color={Colors.cyan} />
                <Text style={styles.durationBadgeText}>{plan.duration_label}</Text>
              </View>
            )}
          </View>
          <Text style={styles.planPrice}>₹{plan.price}</Text>
          {plan.description ? (
            <Text style={styles.planDescription}>{plan.description}</Text>
          ) : null}
        </View>

        {/* Macros */}
        {macros.length > 0 && (
          <View style={styles.macroRow}>
            {macros.map(m => (
              <View key={m.label} style={styles.macroCard}>
                <Flame size={13} color={Colors.primary} />
                <Text style={styles.macroValue}>{m.value}{m.unit}</Text>
                <Text style={styles.macroLabel}>{m.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Delivery time slots */}
        {plan.delivery_time_slots && plan.delivery_time_slots.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Times</Text>
            <View style={styles.timeSlotsRow}>
              {plan.delivery_time_slots.map(slot => (
                <View key={slot} style={styles.timeSlotChip}>
                  <Clock size={11} color={Colors.cyan} />
                  <Text style={styles.timeSlotText}>{fmt12(slot)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Day-wise menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Day-Wise Menu</Text>
          {days.length === 0 ? (
            <View style={styles.emptyMenuBox}>
              <Text style={styles.emptyMenuText}>No menu has been added for this plan yet.</Text>
            </View>
          ) : (
            days.map(day => {
              const isExpanded = expandedDay === day.day;
              return (
                <View key={day.day} style={styles.dayCard}>
                  <TouchableOpacity
                    style={styles.dayHeader}
                    activeOpacity={0.7}
                    onPress={() => setExpandedDay(isExpanded ? null : day.day)}
                  >
                    <Text style={styles.dayHeaderText}>Day {day.day}</Text>
                    {isExpanded ? (
                      <ChevronUp size={16} color={Colors.textSecondary} />
                    ) : (
                      <ChevronDown size={16} color={Colors.textSecondary} />
                    )}
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.mealsWrap}>
                      {(['breakfast', 'lunch', 'dinner'] as const).map(mealKey => {
                        const meal = day.meals?.[mealKey];
                        if (!meal) return null;
                        const cfg = MEAL_CONFIG[mealKey];
                        return (
                          <View key={mealKey} style={styles.mealRow}>
                            <View style={[styles.mealIconWrap, { backgroundColor: `${cfg.color}1F` }]}>
                              <cfg.Icon size={14} color={cfg.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.mealLabel}>{cfg.label}</Text>
                              <Text style={styles.mealName}>{meal.name}</Text>
                            </View>
                            {meal.time_slot && (
                              <Text style={styles.mealTime}>{fmt12(meal.time_slot)}</Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Enable / Subscribe action */}
      <View style={[styles.footer, { paddingBottom: Spacing.md + insets.bottom }]}>
        <TouchableOpacity
          style={[styles.enableBtn, enabled && styles.enabledBtn]}
          onPress={handleEnable}
          disabled={enabled || enabling}
          activeOpacity={0.8}
        >
          {enabling ? (
            <ActivityIndicator color={Colors.background} size="small" />
          ) : enabled ? (
            <>
              <Check size={16} color={Colors.primary} />
              <Text style={styles.enabledBtnText}>Enabled — Cooking This Plan</Text>
            </>
          ) : (
            <>
              <Target size={16} color={Colors.background} />
              <Text style={styles.enableBtnText}>Enable This Plan</Text>
            </>
          )}
        </TouchableOpacity>
        {enabled && slots.length > 0 && (
          <View style={styles.footerSlotsRow}>
            {slots.map(slot => (
              <View key={slot} style={styles.timeSlotChip}>
                <Clock size={11} color={Colors.cyan} />
                <Text style={styles.timeSlotText}>{fmt12(slot)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },

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

  scrollContent: { padding: Spacing.md, paddingBottom: 120 },

  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerText: { ...Typography.body, color: Colors.textSecondary },

  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  heroTop: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.sm },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(250, 204, 21, 0.12)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  goalBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.warning, textTransform: 'capitalize' },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  durationBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.cyan },
  planPrice: { ...Typography.h2, color: Colors.primary, marginBottom: Spacing.xs },
  planDescription: { ...Typography.body, color: Colors.textSecondary },

  macroRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.lg },
  macroCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: 2,
  },
  macroValue: { ...Typography.body, fontWeight: '700', fontSize: 13 },
  macroLabel: { ...Typography.caption, fontSize: 10 },

  section: { marginBottom: Spacing.lg },
  sectionTitle: { ...Typography.h3, fontSize: 15, marginBottom: Spacing.sm },

  timeSlotsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  timeSlotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  timeSlotText: { fontSize: 11, color: Colors.cyan, fontWeight: '600' },

  emptyMenuBox: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyMenuText: { ...Typography.caption, textAlign: 'center' },

  dayCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  dayHeaderText: { ...Typography.body, fontWeight: '700' },
  mealsWrap: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: 10,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mealIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealLabel: { fontSize: 10, color: Colors.textSecondary, fontWeight: '600' },
  mealName: { ...Typography.body, fontSize: 13, fontWeight: '600', marginTop: 1 },
  mealTime: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600' },

  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  enableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  enabledBtn: {
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.35)',
  },
  enableBtnText: { color: Colors.background, fontWeight: 'bold', fontSize: 14 },
  enabledBtnText: { color: Colors.primary, fontWeight: 'bold', fontSize: 14 },
  footerSlotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.sm,
    justifyContent: 'center',
  },
});
