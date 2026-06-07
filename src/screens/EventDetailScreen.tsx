import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { MapPin, Calendar, Clock, ChevronLeft, Map as MapIcon, Info, Users } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '../theme';
import { SlotProgress } from '../components/SlotProgress';
import { useSocial, SocialEvent } from '../context/SocialContext';
import { format } from 'date-fns';
import MapView, { Marker } from '../components/PlatformMap';
import { resolveImageSource } from '../utils/media';
import { getSocialBookedCount } from '../utils/socialEvent';

export const EventDetailScreen = ({ route, navigation }: any) => {
  const { eventId } = route.params;
  const { fetchEventDetails, joinEvent } = useSocial();
  const [event, setEvent] = useState<SocialEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    const data = await fetchEventDetails(eventId);
    setEvent(data);
    setLoading(false);
  };



  const getImageUrl = () =>
    resolveImageSource(event?.image_url) ||
    resolveImageSource(event?.chef?.kitchen_photo_url) ||
    { uri: 'https://via.placeholder.com/800x400' };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Event not found</Text>
      </View>
    );
  }

  const bookedCount = getSocialBookedCount(event);
  const isFull = bookedCount >= event.slots_total;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.imageContainer}>
        <Image
          source={getImageUrl()}
          style={styles.image}
        />
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{event.title}</Text>
        
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Calendar size={18} color={Colors.primary} />
            <View style={styles.metaTextContainer}>
              <Text style={styles.metaLabel}>{format(new Date(event.date), 'EEEE, MMM dd')}</Text>
              <Text style={styles.metaSubLabel}>{format(new Date(event.date), 'h:mm a')} onwards</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Event</Text>
          <Text style={styles.description}>{event.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Availability</Text>
          <View style={styles.slotBox}>
            <SlotProgress 
              label="Slots Filled" 
              booked={bookedCount} 
              total={event.slots_total} 
              color={Colors.primary}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: 19.0760,
                longitude: 72.8777,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Marker coordinate={{ latitude: 19.0760, longitude: 72.8777 }} />
            </MapView>
            <View style={styles.locationOverlay}>
              <MapPin size={16} color={Colors.primary} />
              <Text style={styles.locationText} numberOfLines={2}>{event.location}</Text>
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerPriceLabel}>Contribution</Text>
          <Text style={styles.footerPrice}>₹{event.price}</Text>
        </View>
        <View style={styles.footerInfo}>
          <Users size={16} color={Colors.textSecondary} />
          <Text style={styles.footerInfoText}>{event.slots_total - bookedCount} slots left</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  imageContainer: {
    width: '100%',
    height: 250,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: Spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    backgroundColor: Colors.background,
  },
  title: {
    ...Typography.h1,
    marginBottom: Spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xl,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metaTextContainer: {
    marginLeft: Spacing.sm,
  },
  metaLabel: {
    ...Typography.body,
    fontWeight: 'bold',
  },
  metaSubLabel: {
    ...Typography.caption,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h2,
    marginBottom: Spacing.sm,
  },
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  slotGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  slotBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  joinBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.cyan,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinBtnText: {
    color: Colors.background,
    fontWeight: 'bold',
    fontSize: 14,
  },
  disabledBtn: {
    backgroundColor: Colors.border,
    opacity: 0.5,
  },
  mapContainer: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  locationOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    ...Typography.caption,
    color: Colors.text,
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerPriceLabel: {
    ...Typography.caption,
  },
  footerPrice: {
    ...Typography.h1,
    color: Colors.primary,
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerInfoText: {
    ...Typography.caption,
    marginLeft: 4,
  },
  errorText: {
    ...Typography.h3,
    color: Colors.danger,
  },
});
