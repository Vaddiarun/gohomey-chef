import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Typography } from '../theme';
import { MapPin, Clock, ChevronRight } from 'lucide-react-native';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY_FOR_PICKUP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';

interface OrderCardProps {
  orderId: string;
  items: string;
  status: OrderStatus;
  deliveryTime: string;
  location: string;
  onPress?: () => void;
  onActionPress?: (status: OrderStatus) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  orderId,
  items,
  status,
  deliveryTime,
  location,
  onPress,
  onActionPress,
}) => {
    const isPending = status === 'PENDING';
    const isConfirmed = status === 'CONFIRMED';
    const isPreparing = status === 'PREPARING';
    const isReady = status === 'READY_FOR_PICKUP';

  const getStatusColor = () => {
    switch(status) {
      case 'PENDING': return Colors.warning; // yellow for attention
      case 'CONFIRMED': return Colors.cyan;
      case 'PREPARING': return Colors.warning;
      case 'READY_FOR_PICKUP': return Colors.primary;
      case 'OUT_FOR_DELIVERY': return Colors.primaryDark;
      case 'DELIVERED': return Colors.primaryDark;
      case 'CANCELLED': return Colors.danger;
      case 'REFUNDED': return '#9333EA'; // Purple
      default: return Colors.textSecondary;
    }
  };

  const getStatusBg = () => {
    const color = getStatusColor();
    return `${color}33`; // 20% opacity
  };

  const getActionLabel = () => {
    if (isPending) return 'ACCEPT';
    if (isConfirmed) return 'START PREPARING';
    if (isPreparing) return 'MARK AS READY';
    if (isReady) return 'WAITING FOR PICKUP';
    return status.replace(/_/g, ' ');
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.header}>
        <View>
          <Text style={styles.orderIdLabel}>ORDER ID</Text>
          <Text style={styles.orderId}>{orderId}</Text>
        </View>
        <View style={[
          styles.statusBadge, 
          { backgroundColor: getStatusBg() }
        ]}>
          <View style={[
            styles.statusDot, 
            { backgroundColor: getStatusColor() }
          ]} />
          <Text style={[
            styles.statusText, 
            { color: getStatusColor() }
          ]}>
            {status.replace(/_/g, ' ')}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.items}>{items}</Text>
        
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Clock size={14} color={Colors.textSecondary} />
            <Text style={styles.infoText}>Delivery: {deliveryTime}</Text>
          </View>
          <View style={styles.infoItem}>
            <MapPin size={14} color={Colors.textSecondary} />
            <Text style={styles.infoText}>{location}</Text>
          </View>
        </View>
      </View>

      {(isPending || isConfirmed || isPreparing || isReady) && (
        <View style={styles.actionRow}>
          {isPending && (
            <TouchableOpacity 
              style={[styles.smallActionBtn, styles.cancelBtn]} 
              onPress={() => onActionPress?.('CANCELLED')}
            >
              <Text style={styles.cancelBtnText}>REJECT</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              isPending && { flex: 2 },
              { 
                backgroundColor: (isPending || isConfirmed || isPreparing) ? Colors.primary : Colors.surface,
                borderColor: (isPending || isConfirmed || isPreparing) ? Colors.primary : Colors.border
              }
            ]} 
            onPress={() => {
              if (isPending) onActionPress?.('CONFIRMED');
              else if (isConfirmed) onActionPress?.('PREPARING');
              else if (isPreparing) onActionPress?.('READY_FOR_PICKUP');
            }}
            disabled={isReady}
          >
            <Text style={[
              styles.actionButtonText, 
              { color: (isPending || isConfirmed || isPreparing) ? Colors.background : Colors.primary }
            ]}>
              {getActionLabel()}
            </Text>
            {(isPending || isConfirmed || isPreparing) && <ChevronRight size={18} color={Colors.background} />}
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  orderIdLabel: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  orderId: {
    ...Typography.h3,
    fontSize: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    marginBottom: Spacing.md,
  },
  items: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  infoRow: {
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    ...Typography.caption,
    marginLeft: 6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  smallActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelBtn: {
    borderColor: Colors.danger,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  cancelBtnText: {
    color: Colors.danger,
    fontWeight: 'bold',
    fontSize: 14,
  },
  actionButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
  },
  actionButtonText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
});
