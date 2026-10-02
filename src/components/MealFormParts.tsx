import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CalendarDays, Clock } from 'lucide-react-native';
import { C, F } from '../theme';
import { Toggle } from './ui';
import { feeBreakdown } from '../utils/meals';

/** Three small fee cards (Figma 76:12366). */
export const FeeBreakdown = ({ price, fee: flatFee }: { price: number; fee: number }) => {
  const { fee, chefEarns, customerPrice } = feeBreakdown(price, flatFee);
  const cards = [
    { label: 'Platform fee', value: fee, note: 'Flat, per order' },
    { label: 'Chef earns', value: chefEarns },
    { label: 'Customer price', value: customerPrice },
  ];
  return (
    <View style={styles.feeRow}>
      {cards.map((c) => (
        <View key={c.label} style={styles.feeCard}>
          <Text style={styles.feeLabel}>{c.label}</Text>
          <Text style={styles.feeValue}>₹{c.value.toLocaleString('en-IN')}</Text>
          {c.note ? <Text style={styles.feeNote}>{c.note}</Text> : <View style={styles.feeNoteSpacer} />}
        </View>
      ))}
    </View>
  );
};

/** Availability row with clock icon and switch (Figma 76:12399). */
export const AvailabilityRow = ({
  title,
  subtitle,
  value,
  onChange,
  disabled,
  icon = 'clock',
  right,
}: {
  title: string;
  subtitle: string;
  value?: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
  icon?: 'clock' | 'calendar';
  right?: React.ReactNode;
}) => (
  <View style={[styles.availRow, disabled && styles.availDisabled]}>
    {icon === 'clock' ? (
      <Clock size={20} color={C.primaryRing} strokeWidth={1.67} />
    ) : (
      <CalendarDays size={20} color={C.primaryRing} strokeWidth={1.67} />
    )}
    <View style={styles.availText}>
      <Text style={styles.availTitle}>{title}</Text>
      <Text style={styles.availSub}>{subtitle}</Text>
    </View>
    {right ?? <Toggle value={!!value} onValueChange={onChange} disabled={disabled} />}
  </View>
);

const styles = StyleSheet.create({
  feeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  feeCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    gap: 3,
  },
  feeLabel: {
    fontFamily: F.jakartaBold,
    fontSize: 8,
    lineHeight: 12,
    color: C.iconMuted,
  },
  feeValue: {
    fontFamily: F.jakartaBold,
    fontSize: 11,
    lineHeight: 16.5,
    color: C.textStrong,
  },
  feeNote: {
    fontFamily: F.jakartaRegular,
    fontSize: 7,
    lineHeight: 10.5,
    color: C.primaryRing,
  },
  feeNoteSpacer: {
    height: 10.5,
  },
  availRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  availDisabled: {
    opacity: 0.6,
  },
  availText: {
    flex: 1,
  },
  availTitle: {
    fontFamily: F.jakartaBold,
    fontSize: 12,
    lineHeight: 18,
    color: C.textStrong,
  },
  availSub: {
    fontFamily: F.jakartaRegular,
    fontSize: 10,
    lineHeight: 15,
    color: C.textMuted,
  },
});
