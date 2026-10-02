import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Clock, IndianRupee, Users } from 'lucide-react-native';
import { format, isToday, isTomorrow } from 'date-fns';
import { C, F } from '../theme';
import { PressableScale } from './ui';
import { SocialEvent } from '../context/SocialContext';
import { resolveImageSource } from '../utils/media';
import { getSocialBookedCount } from '../utils/socialEvent';

const when = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const day = isToday(d) ? 'Today' : isTomorrow(d) ? 'Tomorrow' : format(d, 'EEE, d MMM');
  return `${day} · ${format(d, 'h:mm a')}`;
};

/** Social Table post (Figma "div.bg-card" 76:13697). */
export const SocialPostCard = ({ event, onPress }: { event: SocialEvent; onPress: () => void }) => {
  const booked = getSocialBookedCount(event);
  const full = event.slots_total > 0 && booked >= event.slots_total;
  const image = resolveImageSource(event.image_url) ?? resolveImageSource(event.chef?.kitchen_photo_url);
  const avatar = resolveImageSource(event.chef?.kitchen_photo_url);
  const host = event.chef?.kitchen_name || event.chef?.name || 'Chef';

  return (
    <PressableScale onPress={onPress} pressedScale={0.98} style={styles.card}>
      <View style={styles.head}>
        <View style={styles.avatar}>{avatar && <Image source={avatar} style={StyleSheet.absoluteFill} />}</View>
        <View style={styles.flex}>
          <Text style={styles.host} numberOfLines={1}>
            {host}
          </Text>
          <Text style={styles.time}>{when(event.date)}</Text>
        </View>
        {full && (
          <View style={styles.fullPill}>
            <Text style={styles.fullText}>House full</Text>
          </View>
        )}
      </View>

      <Text style={styles.caption} numberOfLines={2}>
        {event.title}
        {event.description ? <Text style={styles.desc}>{`  ${event.description}`}</Text> : null}
      </Text>

      <View style={styles.photo}>{image && <Image source={image} style={StyleSheet.absoluteFill} resizeMode="cover" />}</View>

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Users size={16} color={C.textMuted} strokeWidth={1.33} />
          <Text style={styles.metaText}>
            {booked}/{event.slots_total} joined
          </Text>
        </View>
        <View style={styles.metaItem}>
          <IndianRupee size={16} color={C.textMuted} strokeWidth={1.33} />
          <Text style={styles.metaText}>{Number(event.price).toLocaleString('en-IN')}</Text>
        </View>
        {!!event.end_date && (
          <View style={styles.metaItem}>
            <Clock size={16} color={C.textMuted} strokeWidth={1.33} />
            <Text style={styles.metaText}>
              {format(new Date(event.date), 'h:mm a')} – {format(new Date(event.end_date), 'h:mm a')}
            </Text>
          </View>
        )}
      </View>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 11,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 16, backgroundColor: '#F0F0F2', overflow: 'hidden' },
  host: { fontFamily: F.jakartaBold, fontSize: 12, lineHeight: 18, color: C.textStrong },
  time: { fontFamily: F.jakartaRegular, fontSize: 9, lineHeight: 13.5, color: C.iconMuted },
  fullPill: { backgroundColor: C.dangerBg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  fullText: { fontFamily: F.jakartaBold, fontSize: 9, color: C.danger },
  caption: { fontFamily: F.jakartaBold, fontSize: 11, lineHeight: 16.5, color: C.textStrong },
  desc: { fontFamily: F.jakartaRegular, color: C.textMuted },
  photo: { height: 177, borderRadius: 16, backgroundColor: '#F0F0F2', overflow: 'hidden' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingTop: 1 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontFamily: F.jakartaSemiBold, fontSize: 10, color: C.textMuted },
});
