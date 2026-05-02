import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../theme';
import { Lightbulb } from 'lucide-react-native';

interface ChefTipProps {
  tip: string;
}

export const ChefTip: React.FC<ChefTipProps> = ({ tip }) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Lightbulb size={16} color={Colors.cyan} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Chef's Pro Tip</Text>
        <Text style={styles.tip}>{tip}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(34, 211, 238, 0.1)', // cyan with low opacity
    borderRadius: 12,
    padding: Spacing.md,
    flexDirection: 'row',
    marginVertical: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.2)',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  content: {
    flex: 1,
  },
  title: {
    ...Typography.caption,
    color: Colors.cyan,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  tip: {
    ...Typography.caption,
    color: Colors.text,
    lineHeight: 16,
  },
});
