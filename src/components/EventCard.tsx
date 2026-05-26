import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MapPin, Calendar, Users, ChevronRight, User } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '../theme';
import { SlotProgress } from './SlotProgress';
import { SocialEvent } from '../context/SocialContext';
import { format } from 'date-fns';
import { resolveImageSource } from '../utils/media';

interface EventCardProps {
  event: SocialEvent;
  onPress: () => void;
}

const resolveImage = (event: SocialEvent) => {
  // image_url is often a local device file:// path (never uploaded) — skip it
  const imageSource = resolveImageSource(event.image_url);
  if (imageSource) return imageSource;
  // Fall back to chef's kitchen photo which is always a real server URL
  const kitchenPhotoSource = resolveImageSource(event.chef?.kitchen_photo_url);
  if (kitchenPhotoSource) return kitchenPhotoSource;
  return { uri: 'https://via.placeholder.com/400x200' };
};

export const EventCard = ({ event, onPress }: EventCardProps) => {
  const bookedCount = (event as any).slots_booked || 0;
  const isFull = bookedCount >= event.slots_total;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image
        source={resolveImage(event)}
        style={styles.image}
        resizeMode="cover"
      />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
          <View style={[styles.badge, { backgroundColor: isFull ? Colors.danger + '20' : Colors.primary + '20' }]}>
            <Text style={[styles.badgeText, { color: isFull ? Colors.danger : Colors.primary }]}>
              {isFull ? 'House Full' : 'Open'}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Calendar size={14} color={Colors.primary} />
            <Text style={styles.infoText}>
              {format(new Date(event.date), 'MMM dd, h:mm a')}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <MapPin size={14} color={Colors.primary} />
            <Text style={styles.infoText} numberOfLines={1}>{event.location}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.slotsContainer}>
          <SlotProgress 
            label="Slots Filled" 
            booked={bookedCount} 
            total={event.slots_total} 
            color={Colors.primary}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.price}>₹{event.price}</Text>
          <View style={styles.actionButton}>
            <Text style={styles.actionText}>View Detail</Text>
            <ChevronRight size={16} color={Colors.primary} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  image: {
    width: '100%',
    height: 140,
  },
  content: {
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.h3,
    flex: 1,
    marginRight: Spacing.sm,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.md,
    flex: 0.5,
  },
  infoText: {
    ...Typography.caption,
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  slotsContainer: {
    marginBottom: Spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  price: {
    ...Typography.h2,
    color: Colors.primary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
});
