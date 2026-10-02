import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { CircleCheck } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { C, F } from '../theme';
import { FadeInView, KitchenHeader, PrimaryButton } from '../components/ui';
import { DayAccordion, FuelHero, ManagedCard } from '../components/FuelParts';
import { useAuth } from '../context/AuthContext';
import { resolveImageSource } from '../utils/media';
import { friendlyApiError } from '../utils/apiErrors';
import { FuelPlan, planMeta, planPeriodLabel } from '../utils/fuel';

const DETAIL_IMAGE = require('../assets/images/fuel_detail.png');

/**
 * Fuel plan page. Not yet enabled → Figma "Fuel" (76:12447) with Accept.
 * Enabled → Figma "Fuel Details" (76:12554) + "Fuel Plan Activated" note (76:12520).
 */
export const FuelPlanDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();

  const plan: FuelPlan = route.params?.plan;
  const enabled: boolean = !!route.params?.enabled;
  const subscriberCount: number = route.params?.subscriberCount ?? 0;
  const [accepting, setAccepting] = useState(false);

  const days = plan?.menu_json?.days ?? [];
  const kitchenName = user?.kitchen_name || (user?.name ? `${user.name.split(' ')[0]}’s Kitchen` : 'My Kitchen');

  const handleAccept = async () => {
    if (accepting || enabled) return;
    setAccepting(true);
    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}fuel/chef/slots`;
      console.log('API Request: POST', url, { plan_id: plan.id });
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: plan.id }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        const friendly = friendlyApiError(res.status, result, 'Could not enable this Fuel plan.');
        Toast.show({ type: 'error', text1: 'Enable failed', text2: friendly.message });
        return;
      }
      navigation.replace('Success', { kind: 'fuel' });
    } catch {
      Toast.show({ type: 'error', text1: 'Network error', text2: 'Please try again.' });
    } finally {
      setAccepting(false);
    }
  };

  const chips = [
    plan?.duration_label || (days.length ? `${days.length} days` : null),
    plan?.calories ? `${plan.calories} kcal` : null,
    plan?.protein ? `${plan.protein}g protein` : plan?.goal ? plan.goal.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : null,
  ].filter(Boolean) as string[];

  if (!plan) return null;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={{ paddingTop: insets.top }}>
        <KitchenHeader
          kitchenName={kitchenName}
          ownerName={user?.name}
          onBack={() => navigation.goBack()}
          onWallet={() => navigation.navigate('Wallet')}
          onProfile={() => navigation.navigate('Profile')}
        />
      </View>

      <ScrollView contentContainerStyle={[styles.content, !enabled && { paddingBottom: 24 }]} showsVerticalScrollIndicator={false}>
        {enabled ? (
          <>
            <FadeInView fromScale={0.92} offset={0} duration={520} style={styles.photoWrap}>
              <Image source={resolveImageSource(plan.image_url, DETAIL_IMAGE)} style={styles.photo} resizeMode="cover" />
            </FadeInView>
            <FadeInView delay={120} style={styles.info}>
              <Text style={styles.eyebrow}>FUEL</Text>
              <Text style={styles.title}>{plan.name}</Text>
              <Text style={styles.meta}>{[planMeta(plan), planPeriodLabel(plan)].filter(Boolean).join(' · ')}</Text>
              <View style={styles.metaRow}>
                <View style={styles.subsPill}>
                  <Text style={styles.subsPillText}>
                    {subscriberCount} {subscriberCount === 1 ? 'Subscriber' : 'Subscribers'}
                  </Text>
                </View>
                <Text style={styles.price}>₹{Number(plan.price).toLocaleString('en-IN')}</Text>
              </View>
              {!!plan.description && <Text style={styles.description}>{plan.description}</Text>}
              {chips.length > 0 && (
                <View style={styles.chips}>
                  {chips.map((c) => (
                    <View key={c} style={styles.chip}>
                      <Text style={styles.chipText}>{c}</Text>
                    </View>
                  ))}
                </View>
              )}
            </FadeInView>
            <FadeInView delay={200} style={styles.activated}>
              <View style={styles.activatedHead}>
                <CircleCheck size={20} color={C.successDeep} strokeWidth={1.67} />
                <Text style={styles.activatedTitle}>Fuel Plan Activated</Text>
              </View>
              <Text style={styles.activatedBody}>This plan is now available on your public chef profile.</Text>
            </FadeInView>
          </>
        ) : (
          <>
            <FadeInView fromScale={0.96}>
              <FuelHero plan={plan} />
            </FadeInView>
            <FadeInView delay={80}>
              <ManagedCard />
            </FadeInView>
          </>
        )}

        <FadeInView delay={enabled ? 260 : 140} style={styles.includes}>
          {!enabled && <Text style={styles.includesTitle}>Plan includes</Text>}
          {days.length === 0 ? (
            <Text style={styles.emptyMenu}>No menu has been added for this plan yet.</Text>
          ) : (
            days.map((d, i) => <DayAccordion key={d.day} day={d} defaultOpen={i === 0 && !enabled} />)
          )}
        </FadeInView>
      </ScrollView>

      {!enabled && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
          <PrimaryButton label="Accept" onPress={handleAccept} loading={accepting} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40, gap: 16 },
  photoWrap: { alignItems: 'center', paddingTop: 8, paddingHorizontal: 8 },
  photo: { width: '100%', aspectRatio: 1, borderRadius: 999 },
  info: { gap: 3 },
  eyebrow: { fontFamily: F.jakartaBold, fontSize: 10, lineHeight: 15, color: C.primary },
  title: { fontFamily: F.jakartaExtraBold, fontSize: 25, lineHeight: 31.25, color: C.text },
  meta: { fontFamily: F.jakartaRegular, fontSize: 10, lineHeight: 15, color: C.textMuted2, paddingTop: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12 },
  subsPill: { backgroundColor: '#DDF6E4', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  subsPillText: { fontFamily: F.jakartaBold, fontSize: 9, lineHeight: 13.5, color: '#19874D' },
  price: { fontFamily: F.jakartaBold, fontSize: 11, lineHeight: 16.5, color: C.text },
  description: { fontFamily: F.jakartaRegular, fontSize: 12, lineHeight: 20, color: C.textMuted2, paddingTop: 12 },
  chips: { flexDirection: 'row', gap: 8, paddingTop: 12 },
  chip: { flex: 1, backgroundColor: '#F1F1F4', borderRadius: 14, padding: 10, alignItems: 'center' },
  chipText: { fontFamily: F.jakartaBold, fontSize: 9, lineHeight: 13.5, color: C.text },
  activated: { backgroundColor: 'rgba(33,139,91,0.1)', borderRadius: 18, padding: 16, gap: 4 },
  activatedHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activatedTitle: { fontFamily: F.jakartaBold, fontSize: 12, lineHeight: 18, color: C.successDeep },
  activatedBody: { fontFamily: F.jakartaRegular, fontSize: 10, lineHeight: 15, color: C.textMuted },
  includes: { gap: 8 },
  includesTitle: { fontFamily: F.jakartaBold, fontSize: 12, lineHeight: 18, color: C.textStrong },
  emptyMenu: { fontFamily: F.jakartaSemiBold, fontSize: 11, color: C.textMuted },
  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: C.bg },
});
