import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Typography } from '../theme';
import { Package, Edit3, Trash2, IndianRupee } from 'lucide-react-native';

interface PantryCardProps {
  id: string;
  name: string;
  category: string;
  price: number;
  inventory: number;
  image_url?: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const PantryCard: React.FC<PantryCardProps> = ({
  id,
  name,
  category,
  price,
  inventory,
  image_url,
  onEdit,
  onDelete,
}) => {
  const isLowStock = inventory <= 5;
  const isOutOfStock = inventory === 0;

  return (
    <View style={styles.container}>
      {/* Image Section */}
      <View style={styles.imageContainer}>
        {image_url ? (
          <Image source={{ uri: image_url }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Package size={28} color={Colors.primary} />
          </View>
        )}
        {/* Category Badge */}
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{category}</Text>
        </View>
      </View>

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>

        <View style={styles.detailsRow}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>PRICE</Text>
            <Text style={styles.priceValue}>₹{price}</Text>
          </View>

          <View style={[
            styles.stockContainer,
            isOutOfStock && styles.stockOut,
            isLowStock && !isOutOfStock && styles.stockLow,
          ]}>
            <Text style={styles.stockLabel}>{isOutOfStock ? 'OUT OF STOCK' : 'IN STOCK'}</Text>
            <Text style={[
              styles.stockValue,
              isOutOfStock && styles.stockValueOut,
              isLowStock && !isOutOfStock && styles.stockValueLow,
            ]}>{inventory}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(id)}>
            <Edit3 size={14} color={Colors.primary} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(id)}>
            <Trash2 size={14} color={Colors.danger} />
            <Text style={styles.deleteBtnText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  imageContainer: {
    height: 140,
    backgroundColor: Colors.card,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.05)',
  },
  categoryBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  categoryText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.primary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  infoSection: {
    padding: Spacing.md,
  },
  name: {
    ...Typography.h3,
    fontSize: 16,
    marginBottom: Spacing.sm,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  priceContainer: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
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
  stockContainer: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'flex-end',
  },
  stockLow: {
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
  },
  stockOut: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  stockLabel: {
    fontSize: 8,
    color: Colors.primary,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  stockValue: {
    ...Typography.h3,
    color: Colors.primary,
    fontSize: 16,
  },
  stockValueLow: {
    color: Colors.warning,
  },
  stockValueOut: {
    color: Colors.danger,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.3)',
    gap: 6,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    gap: 6,
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.danger,
  },
});
