import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Utensils } from 'lucide-react-native';
import { C, F } from '../theme';
import { PressableScale } from './ui';
import { resolveImageSource } from '../utils/media';

type Tone = 'ok' | 'warn' | 'out';

type Props = {
  name: string;
  price: number;
  imageUrl?: string;
  /** Small pill over the photo, e.g. "Lunch · Today" or a category. */
  tag?: string;
  availability: string;
  tone?: Tone;
  onPress: () => void;
};

const TONE_COLOR: Record<Tone, string> = { ok: C.successDeep, warn: C.warning, out: C.danger };

/** Grid tile for Daily menu and Pantry (Figma "div.overflow-hidden" 76:12052 / 76:13609). */
export const MenuTile = ({ name, price, imageUrl, tag, availability, tone = 'ok', onPress }: Props) => {
  const image = resolveImageSource(imageUrl);
  return (
    <PressableScale onPress={onPress} pressedScale={0.97} style={styles.tile}>
      <View style={styles.image}>
        {image ? <Image source={image} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Utensils size={26} color={C.iconMuted} strokeWidth={1.3} />}
        {!!tag && (
          <View style={styles.tag}>
            <Text style={styles.tagText} numberOfLines={1}>
              {tag}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.price}>₹{Number(price).toLocaleString('en-IN')}</Text>
        <Text style={[styles.avail, { color: TONE_COLOR[tone] }]}>{availability}</Text>
      </View>
    </PressableScale>
  );
};

/** Loading placeholder in the same shape. */
export const MenuTileSkeleton = () => (
  <View style={[styles.tile, styles.skeleton]}>
    <View style={styles.image} />
    <View style={styles.body}>
      <View style={styles.skelLine} />
      <View style={[styles.skelLine, { width: '40%' }]} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  tile: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  image: {
    height: 128,
    backgroundColor: '#F0F0F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: {
    position: 'absolute',
    left: 8,
    top: 8,
    maxWidth: '85%',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  tagText: { fontFamily: F.jakartaBold, fontSize: 9, color: C.textStrong },
  body: { padding: 12, gap: 4 },
  name: { fontFamily: F.jakartaBold, fontSize: 12, lineHeight: 18, color: C.textStrong },
  price: { fontFamily: F.jakartaBold, fontSize: 12, lineHeight: 18, color: C.primaryRing },
  avail: { fontFamily: F.jakartaSemiBold, fontSize: 9, lineHeight: 13.5 },
  skeleton: { opacity: 0.6 },
  skelLine: { height: 10, width: '70%', borderRadius: 5, backgroundColor: '#F0F0F2' },
});
