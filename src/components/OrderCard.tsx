import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Utensils } from 'lucide-react-native';
import { C, F, Shadows } from '../theme';
import { PressableScale } from './ui';
import { resolveImageSource } from '../utils/media';
import {
  deliverByLabel,
  formatRupees,
  isOverdueOrder,
  nextStatuses,
  orderCustomer,
  orderImage,
  orderItemCount,
  orderNumber,
  orderTime,
  orderTitle,
  orderTotal,
  statusLabel,
  statusTone,
} from '../utils/orders';

type Props = {
  order: any;
  /** PENDING → CONFIRMED (the orange Accept button). */
  onAccept?: () => void;
  /** Opens the status picker (Change Status ▾). */
  onChangeStatus?: () => void;
  /** Long-press / tap on a card. */
  onPress?: () => void;
  updating?: boolean;
};

/** Order ticket — Figma component "Orders" (76:607 / 76:630 / 76:648). */
export const OrderCard = ({ order, onAccept, onChangeStatus, onPress, updating }: Props) => {
  const status: string = order?.status ?? 'PENDING';
  const overdue = isOverdueOrder(order);
  const isNew = status === 'PENDING' && !overdue;
  // Overdue orders keep their status, so the chef can still update them.
  const canChange = status !== 'PENDING' && nextStatuses(status).length > 0;
  const tone = overdue ? { bg: C.warningTint, fg: C.warning } : statusTone(status);
  const deliverBy = !overdue && !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(status) ? deliverByLabel(order) : undefined;
  const image = resolveImageSource(orderImage(order));
  const count = orderItemCount(order);

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.number}>{orderNumber(order)}</Text>
        {isNew ? (
          <Text style={styles.time}>{orderTime(order)}</Text>
        ) : (
          <View style={[styles.pill, { backgroundColor: tone.bg }]}>
            <Text style={[styles.pillText, { color: tone.fg }]}>{overdue ? `${statusLabel(status)} · Not updated` : statusLabel(status)}</Text>
          </View>
        )}
      </View>

      <View style={[styles.body, isNew && styles.bodyCentered]}>
        <View style={styles.thumb}>
          {image ? (
            <Image source={image} style={styles.thumbImg} />
          ) : (
            <Utensils size={20} color={C.iconMuted} strokeWidth={1.5} />
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {orderTitle(order)}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {count} {count === 1 ? 'item' : 'items'} · {orderCustomer(order)}
          </Text>
          <Text style={styles.price}>{formatRupees(orderTotal(order))}</Text>
          {!!deliverBy && <Text style={styles.deliverBy}>{deliverBy}</Text>}
        </View>
        {isNew ? (
          <PressableScale style={styles.accept} onPress={onAccept} disabled={updating} pressedScale={0.94}>
            {updating ? <ActivityIndicator color={C.white} size="small" /> : <Text style={styles.acceptText}>Accept</Text>}
          </PressableScale>
        ) : (
          <Text style={styles.time}>{orderTime(order)}</Text>
        )}
      </View>

      {canChange && (
        <PressableScale style={styles.change} onPress={onChangeStatus} disabled={updating} pressedScale={0.95}>
          {updating ? (
            <ActivityIndicator color={C.textInk} size="small" />
          ) : (
            <>
              <Text style={styles.changeText}>Change Status</Text>
              <Svg width={16} height={16} viewBox="0 0 16 16">
                <Path d="M4.66667 6.66667L8 10L11.3333 6.66667H4.66667Z" fill="#1D1B20" />
              </Svg>
            </>
          )}
        </PressableScale>
      )}
    </Pressable>
  );
};

/** Placeholder card while orders load. */
export const OrderCardSkeleton = () => (
  <View style={styles.skeleton}>
    <View style={styles.skelLineShort} />
    <View style={styles.skelRow}>
      <View style={styles.skelThumb} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={styles.skelLine} />
        <View style={styles.skelLineShort} />
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  skeleton: { backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 16, gap: 16, opacity: 0.7 },
  skelRow: { flexDirection: 'row', gap: 12 },
  skelThumb: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#F0F0F2' },
  skelLine: { height: 12, borderRadius: 6, backgroundColor: '#F0F0F2', width: '70%' },
  skelLineShort: { height: 10, borderRadius: 5, backgroundColor: '#F0F0F2', width: '35%' },
  card: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 16,
  },
  deliverBy: {
    fontFamily: F.jakartaSemiBold,
    fontSize: 10,
    lineHeight: 15,
    color: C.primaryRing,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  number: {
    fontFamily: F.jakartaBold,
    fontSize: 12,
    lineHeight: 18,
    color: C.textStrong,
  },
  time: {
    fontFamily: F.jakartaRegular,
    fontSize: 10,
    lineHeight: 15,
    color: C.iconMuted,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillText: {
    fontFamily: F.jakartaBold,
    fontSize: 10.5,
    lineHeight: 15.75,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bodyCentered: {
    alignItems: 'center',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F0F0F2',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: F.jakartaBold,
    fontSize: 13,
    lineHeight: 19.5,
    color: C.textStrong,
  },
  sub: {
    fontFamily: F.jakartaRegular,
    fontSize: 11,
    lineHeight: 16.5,
    color: C.textMuted,
  },
  price: {
    fontFamily: F.jakartaBold,
    fontSize: 13,
    lineHeight: 19.5,
    color: C.textStrong,
    paddingTop: 4,
  },
  accept: {
    width: 104,
    height: 38,
    borderRadius: 13,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.button,
  },
  acceptText: {
    fontFamily: F.jakartaBold,
    fontSize: 15,
    lineHeight: 22.5,
    color: C.white,
  },
  change: {
    position: 'absolute',
    right: 14,
    bottom: 15,
    minWidth: 112,
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#F4F5FA',
  },
  changeText: {
    fontFamily: F.jakartaBold,
    fontSize: 9,
    lineHeight: 15.75,
    color: '#1D1B20',
  },
});
