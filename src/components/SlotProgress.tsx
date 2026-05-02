import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../theme';

interface SlotProgressProps {
  label: string;
  booked: number;
  total: number;
  color: string;
  icon?: React.ReactNode;
}

export const SlotProgress = ({ label, booked, total, color, icon }: SlotProgressProps) => {
  const percentage = total > 0 ? (booked / total) * 100 : 0;
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.labelContainer}>
          {icon}
          <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={styles.count}>
          <Text style={{ color }}>{booked}</Text>/{total}
        </Text>
      </View>
      <View style={styles.progressBarBg}>
        <View 
          style={[
            styles.progressBarFill, 
            { width: `${percentage}%`, backgroundColor: color }
          ]} 
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    ...Typography.caption,
    marginLeft: 4,
    fontWeight: '600',
  },
  count: {
    ...Typography.caption,
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
