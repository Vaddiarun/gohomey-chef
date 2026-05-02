import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../theme';
import { LucideIcon } from 'lucide-react-native';

interface StatCardProps {
  label: string;
  value: string | number;
  subText: string;
  Icon: LucideIcon;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, subText, Icon }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Icon size={16} color={Colors.textSecondary} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.subText}>{subText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    flex: 1,
    marginHorizontal: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  label: {
    ...Typography.caption,
    textTransform: 'uppercase',
  },
  value: {
    ...Typography.h2,
    marginVertical: 2,
  },
  subText: {
    ...Typography.caption,
    fontSize: 10,
  },
});
