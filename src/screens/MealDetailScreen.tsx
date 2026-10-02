import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { IndianRupee } from 'lucide-react-native';
import { C, F, Radius } from '../theme';
import { FadeInView, KitchenHeader, UploadTile } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { resolveBackendMediaUrl } from '../utils/media';
import { dayLabel, platformFee, windowLabel, windowTime } from '../utils/meals';
import { AvailabilityRow, FeeBreakdown } from '../components/MealFormParts';
import type { Meal } from './DailyMenuScreen';

/** Read-only field in the Figma input style. */
const ReadField = ({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) => (
  <View style={styles.group}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.box}>
      {icon}
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  </View>
);

/**
 * Meal details (Figma "Edit Meal" 76:12604). View-only: the backend has no
 * update, cancel or batch-proof endpoint for daily meals.
 */
export const MealDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const meal: Meal = route.params?.meal;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  if (!meal) return null;
  const left = meal.slots_remaining ?? 0;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={{ paddingTop: insets.top }}>
        <KitchenHeader
          kitchenName="Meal Details"
          subtitle="GoHomeyy Chef"
          ownerName={user?.name}
          onBack={() => navigation.goBack()}
          onWallet={() => navigation.navigate('Wallet')}
          onProfile={() => navigation.navigate('Profile')}
        />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]} showsVerticalScrollIndicator={false}>
        <FadeInView>
          <UploadTile tone="cream" previewUri={resolveBackendMediaUrl(meal.image_url)} onPress={() => {}} disabled />
        </FadeInView>
        <FadeInView delay={60}>
          <ReadField label="Name" value={meal.meal_name} />
        </FadeInView>
        <FadeInView delay={100} style={styles.row}>
          <View style={styles.flex}>
            <ReadField label="Type" value={meal.type === 'NON_VEG' ? 'Non-Veg' : 'Veg'} />
          </View>
          <View style={styles.flex}>
            <ReadField label="Base price" value={`${Number(meal.price).toLocaleString('en-IN')}`} icon={<IndianRupee size={16} color={C.iconMuted} strokeWidth={1.33} />} />
          </View>
        </FadeInView>
        <FadeInView delay={140}>
          <FeeBreakdown price={Number(meal.price) || 0} fee={platformFee(user)} />
        </FadeInView>
        <FadeInView delay={180}>
          <ReadField label="Number of slots" value={`${left} of ${meal.slots_total} left`} />
        </FadeInView>
        <FadeInView delay={220} style={styles.availability}>
          <Text style={styles.label}>Availability</Text>
          <AvailabilityRow
            title={windowLabel(meal.service_window)}
            subtitle={`${dayLabel(meal.date)}${windowTime(meal.service_window) ? ` · ${windowTime(meal.service_window)}` : ''} · ${left} slots left`}
            right={
              <View style={[styles.pill, left > 0 ? styles.pillLive : styles.pillOut]}>
                <Text style={[styles.pillText, { color: left > 0 ? C.successDeep : C.danger }]}>{left > 0 ? 'Live' : 'Sold out'}</Text>
              </View>
            }
          />
        </FadeInView>
      </ScrollView>

    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  group: {
    gap: 6,
  },
  label: {
    fontFamily: F.jakartaBold,
    fontSize: 11,
    lineHeight: 16.5,
    color: C.textMuted,
  },
  box: {
    height: 52,
    borderRadius: Radius.field,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  value: {
    flex: 1,
    fontFamily: F.jakartaSemiBold,
    fontSize: 13,
    color: C.textStrong,
  },
  availability: {
    gap: 6,
    marginTop: 17,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillLive: {
    backgroundColor: C.successTint,
  },
  pillOut: {
    backgroundColor: C.dangerBg,
  },
  pillText: {
    fontFamily: F.jakartaBold,
    fontSize: 10.5,
  },
});
