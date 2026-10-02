import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, Linking, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, Clock, MapPin, Navigation, Scale, Users } from 'lucide-react-native';
import { C, F } from '../theme';
import { FadeInView, PressableScale, ProgressBar } from '../components/ui';
import { useSocial, SocialEvent } from '../context/SocialContext';
import { resolveImageSource } from '../utils/media';
import { getSocialBookedCount } from '../utils/socialEvent';

/** Social Table details — new design pattern (photo hero, info chips, seat progress, location card). */
export const EventDetailScreen = ({ route, navigation }: any) => {
  const { eventId } = route.params;
  const { fetchEventDetails } = useSocial();
  const insets = useSafeAreaInsets();
  const [event, setEvent] = useState<SocialEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await fetchEventDetails(eventId);
      setEvent(data);
      setLoading(false);
    })();
  }, [eventId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }
  if (!event) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>This Social Table could not be found.</Text>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.link}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const booked = getSocialBookedCount(event);
  const left = Math.max(0, event.slots_total - booked);
  const image = resolveImageSource(event.image_url) || resolveImageSource(event.chef?.kitchen_photo_url);
  const start = new Date(event.date);
  const end = event.end_date ? new Date(event.end_date) : null;

  const openMaps = () =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`).catch(() => {});

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          {image ? <Image source={image} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
          <View style={styles.heroShade} />
          <PressableScale style={[styles.back, { top: insets.top + 8 }]} onPress={() => navigation.goBack()} pressedScale={0.9}>
            <ArrowLeft size={18} color={C.text} strokeWidth={2} />
          </PressableScale>
        </View>

        <View style={styles.sheet}>
          <FadeInView style={styles.info}>
            <Text style={styles.eyebrow}>SOCIAL TABLE</Text>
            <Text style={styles.title}>{event.title}</Text>
            <View style={styles.metaRow}>
              <View style={[styles.pill, left === 0 && { backgroundColor: C.dangerBg }]}>
                <Text style={[styles.pillText, left === 0 && { color: C.danger }]}>
                  {left === 0 ? 'House full' : `${booked} joined · ${left} left`}
                </Text>
              </View>
              <Text style={styles.price}>₹{Number(event.price).toLocaleString('en-IN')}</Text>
            </View>
            {!!event.description && <Text style={styles.description}>{event.description}</Text>}
          </FadeInView>

          <FadeInView delay={80} style={styles.chips}>
            <View style={styles.chip}>
              <Calendar size={14} color={C.primaryRing} />
              <Text style={styles.chipText}>{format(start, 'EEE, d MMM')}</Text>
            </View>
            <View style={styles.chip}>
              <Clock size={14} color={C.primaryRing} />
              <Text style={styles.chipText}>
                {format(start, 'h:mm a')}
                {end ? ` – ${format(end, 'h:mm a')}` : ''}
              </Text>
            </View>
            {event.social_balance && (
              <View style={styles.chip}>
                <Scale size={14} color={C.primaryRing} />
                <Text style={styles.chipText}>Balanced</Text>
              </View>
            )}
          </FadeInView>

          <FadeInView delay={140} style={styles.card}>
            <View style={styles.cardHead}>
              <Users size={18} color={C.primaryRing} strokeWidth={1.67} />
              <Text style={styles.cardTitle}>Seats</Text>
              <Text style={styles.cardValue}>
                {booked}/{event.slots_total}
              </Text>
            </View>
            <ProgressBar progress={event.slots_total ? booked / event.slots_total : 0} from={0} />
          </FadeInView>

          <FadeInView delay={200} style={styles.card}>
            <View style={styles.cardHead}>
              <MapPin size={18} color={C.primaryRing} strokeWidth={1.67} />
              <Text style={styles.cardTitle}>Location</Text>
            </View>
            <Text style={styles.location}>{event.location}</Text>
            <PressableScale style={styles.mapsBtn} onPress={openMaps} pressedScale={0.97}>
              <Navigation size={14} color={C.primary} />
              <Text style={styles.mapsText}>Open in Maps</Text>
            </PressableScale>
          </FadeInView>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.bg },
  muted: { fontFamily: F.jakartaSemiBold, fontSize: 13, color: C.textMuted },
  link: { fontFamily: F.jakartaBold, fontSize: 13, color: C.primary },
  hero: { height: 300, backgroundColor: '#F0F0F2' },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.12)' },
  back: {
    position: 'absolute',
    left: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    marginTop: -24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: C.bg,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },
  info: { gap: 4 },
  eyebrow: { fontFamily: F.jakartaBold, fontSize: 10, lineHeight: 15, color: C.primary },
  title: { fontFamily: F.jakartaExtraBold, fontSize: 25, lineHeight: 31.25, color: C.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10 },
  pill: { backgroundColor: '#DDF6E4', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontFamily: F.jakartaBold, fontSize: 10, color: '#19874D' },
  price: { fontFamily: F.jakartaBold, fontSize: 16, color: C.text },
  description: { fontFamily: F.jakartaRegular, fontSize: 12, lineHeight: 20, color: C.textMuted2, paddingTop: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F1F1F4', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  chipText: { fontFamily: F.jakartaBold, fontSize: 11, color: C.text },
  card: { backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 16, gap: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, fontFamily: F.jakartaBold, fontSize: 13, color: C.textStrong },
  cardValue: { fontFamily: F.jakartaBold, fontSize: 13, color: C.primaryRing },
  location: { fontFamily: F.jakartaSemiBold, fontSize: 12, lineHeight: 18, color: C.textStrong },
  mapsBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.softOrange, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
  mapsText: { fontFamily: F.jakartaBold, fontSize: 12, color: C.primary },
});
