import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Camera, Check, ChevronRight, MapPin, PackageCheck, Play, Truck, Utensils, X, Zap } from 'lucide-react-native';
import { C, F, Shadows } from '../theme';
import { PressableScale, PrimaryButton } from './ui';
import { resolveImageSource } from '../utils/media';
import {
  dayMeals,
  dayTitle,
  fmt12,
  FULFILLMENT_STATUS,
  FuelDayMenu,
  FuelPlan,
  FuelSubscriber,
  Fulfillment,
  initials,
  planMeta,
  planPeriodLabel,
} from '../utils/fuel';

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);

const THUMB = require('../assets/images/fuel_thumb.png');
const HERO = require('../assets/images/fuel_hero.png');

// Fuel screens use the "chef-fuel-studio" palette from Figma.
export const FUEL = {
  ink: '#191514',
  muted: '#776F6E',
  border: '#EBDDD6',
  primary: '#FF4A00',
  softBorder: '#FFA87B',
  peach: '#FFDDC3',
  okBg: '#E6F1EA',
  ok: '#0E8E59',
};

const Caret = ({ open }: { open: boolean }) => (
  <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
    <Svg width={16} height={16} viewBox="0 0 16 16">
      <Path d="M4.66667 6.66667L8 10L11.3333 6.66667H4.66667Z" fill={C.primaryRing} />
    </Svg>
  </View>
);

/** Plan list card (Figma "Article" 76:13379). */
export const FuelPlanCard = ({ plan, onPress, active }: { plan: FuelPlan; onPress: () => void; active?: boolean }) => (
  <PressableScale onPress={onPress} pressedScale={0.98} style={styles.planCard}>
    <Image source={resolveImageSource(plan.image_url, THUMB)} style={styles.planThumb} resizeMode="cover" />
    <View style={styles.planBody}>
      <View style={styles.planTagRow}>
        <View style={styles.managedTag}>
          <Text style={styles.managedTagText}>GoHomeyy Managed</Text>
        </View>
        {active && (
          <View style={styles.activeTag}>
            <Text style={styles.activeTagText}>ACTIVE</Text>
          </View>
        )}
      </View>
      <Text style={styles.planName} numberOfLines={1}>
        {plan.name}
      </Text>
      {!!planMeta(plan) && <Text style={styles.planMeta}>{planMeta(plan)}</Text>}
      {!!planPeriodLabel(plan) && <Text style={styles.planMeta}>{planPeriodLabel(plan)}</Text>}
      <View style={styles.planFoot}>
        <Text style={styles.planPrice}>₹{Number(plan.price).toLocaleString('en-IN')}</Text>
        <View style={styles.linkRow}>
          <Text style={styles.link}>View Details</Text>
          <ChevronRight size={11} color={FUEL.primary} strokeWidth={1.5} />
        </View>
      </View>
    </View>
  </PressableScale>
);

/** Expandable "Day N · Breakfast & Lunch" row (Figma "dROP DOWN" 76:16075). */
export const DayAccordion = ({ day, defaultOpen }: { day: FuelDayMenu; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(!!defaultOpen);
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));
    setOpen((o) => !o);
  };
  return (
    <Pressable onPress={toggle} style={styles.dayCard}>
      <View style={styles.dayHead}>
        <Calendar size={16} color={C.primaryRing} strokeWidth={1.33} />
        <Text style={styles.dayTitle}>{dayTitle(day)}</Text>
        <Caret open={open} />
      </View>
      {open && (
        <View style={styles.dayBody}>
          {dayMeals(day).map((m) => (
            <View key={m.period} style={styles.mealRow}>
              <Text style={styles.mealPeriod}>{m.period}</Text>
              <Text style={styles.mealName} numberOfLines={2}>
                {m.name}
              </Text>
              {!!m.time_slot && <Text style={styles.mealTime}>{fmt12(m.time_slot)}</Text>}
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
};

/** Subscriber row (Figma "Button" 76:13443). */
export const SubscriberRow = ({ sub, onPress }: { sub: FuelSubscriber; onPress?: () => void }) => {
  const active = (sub.status ?? 'ACTIVE') === 'ACTIVE';
  return (
    <PressableScale onPress={onPress} pressedScale={0.98} style={styles.subRow}>
      <LinearGradient colors={['#854B48', '#E6A375', '#644970']} locations={[0.16, 0.52, 0.87]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.subAvatar}>
        <Text style={styles.subInitials}>{initials(sub.user?.name)}</Text>
      </LinearGradient>
      <View style={styles.flex}>
        <Text style={styles.subName} numberOfLines={1}>
          {sub.user?.name ?? 'Customer'}
        </Text>
        <Text style={styles.subPlan} numberOfLines={1}>
          {sub.plan?.name ?? 'Fuel Plan'}
          {sub.delivery_days?.length ? ` · ${sub.delivery_days.length} days/week` : ''}
        </Text>
      </View>
      <View style={[styles.subStatus, !active && { backgroundColor: 'rgba(250,192,68,0.2)' }]}>
        <Text style={[styles.subStatusText, !active && { color: C.warning }]}>{(sub.status ?? 'ACTIVE').toUpperCase()}</Text>
      </View>
      <ChevronRight size={11} color={FUEL.muted} strokeWidth={1.5} />
    </PressableScale>
  );
};

/** Today's delivery task with its next action (keeps the existing fulfilment flow). */
export const FulfillmentCard = ({
  item,
  onStatus,
  onWeighIn,
}: {
  item: Fulfillment;
  onStatus: (status: string) => void;
  onWeighIn: () => void;
}) => {
  const cfg = FULFILLMENT_STATUS[item.delivery_status] ?? { label: item.delivery_status, fg: C.textMuted, bg: '#F1F1F4' };
  const action =
    item.delivery_status === 'SCHEDULED'
      ? { label: 'Start Cooking', Icon: Play, onPress: () => onStatus('COOKING') }
      : item.delivery_status === 'COOKING'
      ? { label: 'Weigh-In & Upload', Icon: Camera, onPress: onWeighIn }
      : item.delivery_status === 'READY_FOR_PICKUP'
      ? { label: 'Mark Picked Up', Icon: PackageCheck, onPress: () => onStatus('PICKED_UP') }
      : item.delivery_status === 'PICKED_UP'
      ? { label: 'Mark Delivered', Icon: Truck, onPress: () => onStatus('DELIVERED') }
      : null;

  return (
    <View style={styles.taskCard}>
      <View style={styles.taskTop}>
        <View style={styles.flex}>
          <Text style={styles.taskDish} numberOfLines={1}>
            {item.menu?.item_name ?? 'Menu not set'}
          </Text>
          <Text style={styles.taskMeta} numberOfLines={1}>
            {item.subscription?.user?.name ?? 'Customer'} · {item.subscription?.plan?.name ?? 'Fuel Plan'}
          </Text>
        </View>
        <View style={[styles.taskPill, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.taskPillText, { color: cfg.fg }]}>{cfg.label}</Text>
        </View>
      </View>
      {action ? (
        <PressableScale onPress={action.onPress} pressedScale={0.97} style={styles.taskBtn}>
          <action.Icon size={13} color={C.white} />
          <Text style={styles.taskBtnText}>{action.label}</Text>
        </PressableScale>
      ) : item.delivery_status === 'DELIVERED' ? (
        <View style={styles.taskDone}>
          <Check size={13} color={FUEL.ok} />
          <Text style={styles.taskDoneText}>Delivered</Text>
        </View>
      ) : null}
    </View>
  );
};

/** Sunset plan hero (Figma "div.bg-sunset" 76:12453). */
export const FuelHero = ({ plan, enabled }: { plan: FuelPlan; enabled?: boolean }) => (
  <LinearGradient colors={['#E64611', '#FF742F', '#FAC044']} locations={[0, 0.52, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
    <Image source={resolveImageSource(plan.image_url, HERO)} style={styles.heroImg} resizeMode="cover" />
    <View style={styles.heroTop}>
      <Zap size={28} color={C.white} strokeWidth={1.75} />
      <View style={styles.heroBadge}>
        <Text style={styles.heroBadgeText}>{enabled ? 'ACTIVE' : 'AVAILABLE'}</Text>
      </View>
    </View>
    <Text style={styles.heroTitle} numberOfLines={2}>
      {plan.name}
    </Text>
    <Text style={styles.heroMeta} numberOfLines={1}>
      {[planMeta(plan), planPeriodLabel(plan)].filter(Boolean).join(' · ')}
    </Text>
    <Text style={styles.heroPrice}>₹{Number(plan.price).toLocaleString('en-IN')}</Text>
  </LinearGradient>
);

/** "Managed by GoHomeyy" note card. */
export const ManagedCard = () => (
  <View style={styles.managed}>
    <Text style={styles.managedTitle}>Managed by GoHomeyy</Text>
    <Text style={styles.managedBody}>
      Core plan details and pricing are controlled by GoHomeyy. Review the schedule and terms before offering it.
    </Text>
  </View>
);

/** Fuel NOW instant-order popup with a draining countdown ring. */
export const FuelNowOfferModal = ({
  offer,
  countdown,
  responding,
  onRespond,
}: {
  offer: { item_name: string; chef?: { distance?: number }; seconds_to_accept?: number } | null;
  countdown: number;
  responding: boolean;
  onRespond: (accepted: boolean) => void;
}) => {
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (offer) {
      pop.setValue(0);
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }).start();
    }
  }, [offer]);
  const total = offer?.seconds_to_accept ?? 120;
  const urgent = countdown <= 30;

  return (
    <Modal visible={!!offer} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.offerOverlay}>
        <Animated.View style={[styles.offerCard, { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
          <View style={styles.offerIcon}>
            <Zap size={26} color={C.primary} />
          </View>
          <Text style={styles.offerTitle}>Fuel NOW Request</Text>
          <Text style={styles.offerSub}>Instant order incoming</Text>
          <Text style={[styles.offerCount, urgent && { color: C.danger }]}>{countdown}</Text>
          <Text style={styles.offerCountLabel}>seconds to decide</Text>
          <View style={styles.offerBar}>
            <View style={[styles.offerBarFill, { width: `${Math.max(0, Math.min(1, countdown / total)) * 100}%`, backgroundColor: urgent ? C.danger : C.primary }]} />
          </View>
          {offer && (
            <View style={styles.offerDetails}>
              <View style={styles.offerRow}>
                <Utensils size={14} color={C.textMuted} />
                <Text style={styles.offerRowText}>{offer.item_name}</Text>
              </View>
              {offer.chef?.distance != null && (
                <View style={styles.offerRow}>
                  <MapPin size={14} color={C.textMuted} />
                  <Text style={styles.offerRowText}>{offer.chef.distance.toFixed(2)} km away</Text>
                </View>
              )}
            </View>
          )}
          <View style={styles.offerActions}>
            <PressableScale style={styles.declineBtn} onPress={() => onRespond(false)} disabled={responding}>
              <X size={16} color={C.danger} />
              <Text style={styles.declineText}>Decline</Text>
            </PressableScale>
            <View style={styles.flex}>
              <PrimaryButton label="Accept" onPress={() => onRespond(true)} loading={responding} showChevron={false} />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

/** Small spinner row used while a section loads. */
export const SectionLoader = () => <ActivityIndicator color={C.primary} style={{ marginVertical: 12 }} />;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // Plan card
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    minHeight: 112,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: FUEL.border,
    backgroundColor: C.surface,
  },
  planThumb: { width: 72, height: 73, borderRadius: 36 },
  planBody: { flex: 1, paddingTop: 9, gap: 1 },
  planTagRow: { flexDirection: 'row', gap: 6 },
  managedTag: { alignSelf: 'flex-start', borderWidth: 1, borderColor: FUEL.softBorder, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  managedTagText: { fontFamily: F.jakartaBold, fontSize: 6.5, lineHeight: 9.75, color: FUEL.primary },
  activeTag: { borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, backgroundColor: FUEL.okBg },
  activeTagText: { fontFamily: F.jakartaExtraBold, fontSize: 6.5, lineHeight: 9.75, color: FUEL.ok },
  planName: { fontFamily: F.jakartaExtraBold, fontSize: 10.5, lineHeight: 15.75, color: FUEL.ink, paddingTop: 4 },
  planMeta: { fontFamily: F.jakartaRegular, fontSize: 7.5, lineHeight: 11.25, color: FUEL.muted },
  planFoot: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', minHeight: 26 },
  planPrice: { fontFamily: F.jakartaBold, fontSize: 11, lineHeight: 16.5, color: FUEL.ink },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 26 },
  link: { fontFamily: F.jakartaExtraBold, fontSize: 8, lineHeight: 12, color: FUEL.primary },
  // Day accordion
  dayCard: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 12 },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayTitle: { flex: 1, fontFamily: F.jakartaSemiBold, fontSize: 11, lineHeight: 16.5, color: C.textStrong },
  dayBody: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border, gap: 8 },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mealPeriod: { width: 64, fontFamily: F.jakartaBold, fontSize: 10, color: C.primaryRing },
  mealName: { flex: 1, fontFamily: F.jakartaSemiBold, fontSize: 11, color: C.textStrong },
  mealTime: { fontFamily: F.jakartaRegular, fontSize: 10, color: C.textMuted },
  // Subscriber row
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 43, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: FUEL.border, backgroundColor: C.surface },
  subAvatar: { width: 29, height: 29, borderRadius: 14.5, alignItems: 'center', justifyContent: 'center' },
  subInitials: { fontFamily: F.jakartaExtraBold, fontSize: 8, color: '#3F271D' },
  subName: { fontFamily: F.jakartaBold, fontSize: 8.5, lineHeight: 12.75, color: FUEL.ink },
  subPlan: { fontFamily: F.jakartaRegular, fontSize: 6.5, lineHeight: 9.75, color: FUEL.muted },
  subStatus: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 10, backgroundColor: FUEL.okBg },
  subStatusText: { fontFamily: F.jakartaExtraBold, fontSize: 7, lineHeight: 10.5, color: FUEL.ok },
  // Fulfilment task
  taskCard: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: FUEL.border, padding: 12, gap: 10 },
  taskTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  taskDish: { fontFamily: F.jakartaBold, fontSize: 12, lineHeight: 18, color: FUEL.ink },
  taskMeta: { fontFamily: F.jakartaRegular, fontSize: 10, lineHeight: 15, color: FUEL.muted },
  taskPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  taskPillText: { fontFamily: F.jakartaBold, fontSize: 9 },
  taskBtn: { height: 36, borderRadius: 12, backgroundColor: C.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  taskBtnText: { fontFamily: F.jakartaBold, fontSize: 12, color: C.white },
  taskDone: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  taskDoneText: { fontFamily: F.jakartaBold, fontSize: 11, color: FUEL.ok },
  // Hero
  hero: { height: 216, borderRadius: 22, overflow: 'hidden', padding: 20 },
  // Figma: 175×178 box anchored to the right edge, image scaled 114% and clipped.
  heroImg: { position: 'absolute', right: -25, top: 38, width: 200, height: 200 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 28 },
  heroBadge: { backgroundColor: '#121214', borderRadius: 999, paddingHorizontal: 10, height: 28, justifyContent: 'center' },
  heroBadgeText: { fontFamily: F.jakartaBold, fontSize: 10.5, color: C.white },
  heroTitle: { marginTop: 39, marginRight: 33, fontFamily: F.jakartaBold, fontSize: 23, lineHeight: 34.5, color: C.white },
  heroMeta: { marginRight: 98, fontFamily: F.jakartaRegular, fontSize: 12, lineHeight: 18, color: 'rgba(255,255,255,0.75)' },
  heroPrice: { marginTop: 12, fontFamily: F.jakartaBold, fontSize: 24, lineHeight: 36, color: C.white },
  // Managed card
  managed: { backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 16, gap: 3.4 },
  managedTitle: { fontFamily: F.jakartaBold, fontSize: 12, lineHeight: 18, color: C.textStrong },
  managedBody: { fontFamily: F.jakartaRegular, fontSize: 11, lineHeight: 17.88, color: C.textMuted },
  // Offer modal
  offerOverlay: { flex: 1, backgroundColor: 'rgba(23,23,26,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  offerCard: { width: '100%', maxWidth: 360, backgroundColor: C.surface, borderRadius: 24, padding: 22, alignItems: 'center', ...Shadows.card },
  offerIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: FUEL.peach, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  offerTitle: { fontFamily: F.jakartaExtraBold, fontSize: 18, color: C.text },
  offerSub: { fontFamily: F.jakartaRegular, fontSize: 12, color: C.textMuted, marginTop: 2 },
  offerCount: { marginTop: 14, fontFamily: F.jakartaExtraBold, fontSize: 44, lineHeight: 52, color: C.primary },
  offerCountLabel: { fontFamily: F.jakartaSemiBold, fontSize: 11, color: C.textMuted },
  offerBar: { width: '100%', height: 6, borderRadius: 3, backgroundColor: '#F1F1F4', marginTop: 12, overflow: 'hidden' },
  offerBarFill: { height: 6, borderRadius: 3 },
  offerDetails: { alignSelf: 'stretch', marginTop: 16, gap: 8, padding: 12, borderRadius: 14, backgroundColor: C.bg },
  offerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  offerRowText: { fontFamily: F.jakartaSemiBold, fontSize: 12, color: C.textStrong },
  offerActions: { alignSelf: 'stretch', flexDirection: 'row', gap: 10, marginTop: 18 },
  declineBtn: { height: 52, paddingHorizontal: 18, borderRadius: 17, borderWidth: 1, borderColor: C.dangerBg, backgroundColor: C.dangerBg, flexDirection: 'row', alignItems: 'center', gap: 6 },
  declineText: { fontFamily: F.jakartaBold, fontSize: 14, color: C.danger },
});
