import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { Colors, Spacing, Typography } from '../theme';
import { Clock, ShoppingBag } from 'lucide-react-native';

export type SlotStatus = 'COOKING' | 'READY';

interface SlotCardProps {
  title: string;
  image: any;
  status: SlotStatus;
  slotsLeft: number;
  price: number;
  type: 'VEG' | 'NON-VEG';
  timeRemaining?: string;
  tag?: string;
  onPress?: () => void;
}

export const SlotCard: React.FC<SlotCardProps> = ({
  title,
  image,
  status,
  slotsLeft,
  price,
  type,
  timeRemaining,
  tag,
  onPress
}) => {
  const isCooking = status === 'COOKING';
  const isVeg = type === 'VEG';

  const content = (
    <>
      <Image source={image} style={styles.image} />

      {/* Top Badges */}
      <View style={styles.topBadges}>
        <View style={styles.statusBadge}>
          <Text style={[styles.statusText, { color: isCooking ? Colors.warning : Colors.primary }]}>
            {status}
          </Text>
        </View>
        <View style={[styles.typeBadge, { borderColor: isVeg ? Colors.primary : Colors.danger }]}>
          <View style={[styles.typeDot, { backgroundColor: isVeg ? Colors.primary : Colors.danger }]} />
        </View>
      </View>

      <View style={styles.overlay}>
        <View style={styles.bottomContent}>
          <View style={styles.textInfo}>
            <Text style={styles.title} numberOfLines={1}>
              {title}<Text style={styles.tag}> • {tag}</Text>
            </Text>
            
            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <ShoppingBag size={10} color="#FFFFFF" />
                <Text style={styles.detailText}>{slotsLeft} left</Text>
              </View>
              {timeRemaining && (
                <View style={styles.detailItem}>
                  <Clock size={10} color="#FFFFFF" />
                  <Text style={styles.detailText}>{timeRemaining}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>PRICE</Text>
            <Text style={styles.priceValue}>₹{price}</Text>
          </View>
        </View>
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable style={styles.container} onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 180,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  topBadges: {
    padding: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  typeBadge: {
    width: 20,
    height: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  typeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  bottomContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: Spacing.md,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  textInfo: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    ...Typography.h3,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  tag: {
    fontSize: 12,
    fontWeight: 'normal',
    color: 'rgba(255,255,255,0.7)',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  detailText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 4,
    fontWeight: '500',
  },
  priceContainer: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.primary,
  },
  priceLabel: {
    fontSize: 8,
    color: Colors.primary,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  priceValue: {
    ...Typography.h3,
    color: Colors.primary,
    fontSize: 16,
  },
});
