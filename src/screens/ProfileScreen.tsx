import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChefHat,
  ChevronRight,
  HelpCircle,
  Landmark,
  LogOut,
  MapPin,
  ShieldCheck,
  User,
  Wallet,
} from 'lucide-react-native';
import { C, F } from '../theme';
import { FadeInView, InboxButton, PressableScale, ScreenHeader } from '../components/ui';
import { getApplicationStatus, useAuth } from '../context/AuthContext';
import { resolveImageSource } from '../utils/media';

const SUPPORT_EMAIL = 'gohomeyybengaluru@gmail.com';

type RowProps = {
  Icon: any;
  label: string;
  caption?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
  delay: number;
};

/** White outlined row with a peach icon tile (Figma 76:13809). */
const ProfileRow = ({ Icon, label, caption, onPress, right, danger, delay }: RowProps) => (
  <FadeInView delay={delay}>
    <PressableScale style={styles.row} onPress={onPress} disabled={!onPress} pressedScale={0.98}>
      <View style={[styles.rowIcon, danger && { backgroundColor: C.dangerBg }]}>
        <Icon size={16} color={danger ? C.danger : C.primaryRing} strokeWidth={1.67} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && { color: C.danger }]}>{label}</Text>
        {!!caption && (
          <Text style={styles.rowCaption} numberOfLines={1}>
            {caption}
          </Text>
        )}
      </View>
      {right ?? (onPress ? <ChevronRight size={16} color={C.iconMuted} strokeWidth={1.67} /> : null)}
    </PressableScale>
  </FadeInView>
);

const STATUS_PILL: Record<string, { text: string; bg: string; fg: string }> = {
  APPROVED: { text: 'Verified', bg: C.successTint, fg: C.successDeep },
  REJECTED: { text: 'Rejected', bg: C.dangerBg, fg: C.danger },
};

/** Private Chef Profile (Figma "Profile" 76:13780). */
export const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const status = getApplicationStatus(user) ?? 'PENDING';
  const pill = STATUS_PILL[status] ?? { text: 'In review', bg: C.warningTint, fg: C.warning };
  const cover = resolveImageSource(user?.kitchen_photo_url);
  const initial = (user?.name?.trim()?.[0] || 'C').toUpperCase();
  const cuisine = user?.expertise?.length ? user.expertise.slice(0, 2).join(', ') : (user as any)?.primary_cuisine;
  const tagline = [cuisine ? `${cuisine} home chef` : undefined, user?.kitchen_name]
    .filter(Boolean)
    .join(' · ');
  const hasBank = !!user?.bank_account_number;

  const openSupport = () =>
    Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=Chef App Support Request&body=Hi GoHomeyy Team,%0A%0AChef Name: ${user?.name || ''}%0APhone: ${user?.phone || ''}%0A%0APlease describe your issue below:%0A`
    );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <ScreenHeader
        title="Private Chef Profile"
        subtitle="GoHomeyy Chef"
        onBack={() => navigation.goBack()}
        right={<InboxButton onPress={() => navigation.navigate('Main', { screen: 'Dashboard', params: { screen: 'Orders' } })} />}
      />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]} showsVerticalScrollIndicator={false}>
        {/* Cover + avatar */}
        <FadeInView offset={0} fromScale={0.97} style={styles.coverWrap}>
          <View style={styles.cover}>{cover && <Image source={cover} style={StyleSheet.absoluteFill} resizeMode="cover" />}</View>
          <View style={styles.avatar}>
            <LinearGradient colors={['#854B48', '#E6A375', '#644970']} start={{ x: 0.21, y: 0.09 }} end={{ x: 0.79, y: 0.91 }} style={StyleSheet.absoluteFill} />
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        </FadeInView>

        <FadeInView delay={80} style={styles.identity}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {user?.name || 'Chef'}
            </Text>
            {status === 'APPROVED' && <ShieldCheck size={16} color={C.primaryRing} strokeWidth={1.67} />}
          </View>
          {!!tagline && <Text style={styles.tagline}>{tagline}</Text>}
        </FadeInView>

        <ProfileRow delay={120} Icon={User} label="Chef information" caption={user?.email || user?.phone} onPress={() => navigation.navigate('EditProfile', { section: 'chef' })} />
        <ProfileRow delay={160} Icon={ChefHat} label="Kitchen information" caption={user?.kitchen_name} onPress={() => navigation.navigate('EditProfile', { section: 'kitchen' })} />
        <ProfileRow delay={200} Icon={MapPin} label="Service area" caption={user?.kitchen_address} onPress={() => navigation.navigate('EditProfile', { section: 'area' })} />
        <ProfileRow
          delay={240}
          Icon={Landmark}
          label="Bank details"
          caption={hasBank ? `${user?.bank_name || 'Bank'} •••• ${String(user?.bank_account_number).slice(-4)}` : 'Add an account for payouts'}
          onPress={() => navigation.navigate('EditProfile', { section: 'bank' })}
        />
        <ProfileRow delay={280} Icon={Wallet} label="Wallet" caption="Earnings & withdrawals" onPress={() => navigation.navigate('Wallet')} />
        <ProfileRow
          delay={320}
          Icon={ShieldCheck}
          label="Verification"
          right={
            <View style={[styles.pill, { backgroundColor: pill.bg }]}>
              <Text style={[styles.pillText, { color: pill.fg }]}>{pill.text}</Text>
            </View>
          }
        />
        <ProfileRow delay={360} Icon={HelpCircle} label="Help & support" caption={SUPPORT_EMAIL} onPress={openSupport} />
        <ProfileRow delay={400} Icon={LogOut} label="Log out" danger onPress={() => navigation.navigate('Logout')} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 20, gap: 16 },
  coverWrap: { marginBottom: 32 },
  cover: {
    height: 144,
    borderRadius: 20,
    backgroundColor: '#F0F0F2',
    overflow: 'hidden',
  },
  avatar: {
    position: 'absolute',
    left: 20,
    bottom: -32,
    width: 80,
    height: 80,
    borderRadius: 22,
    borderWidth: 4,
    borderColor: C.white,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F2',
  },
  avatarText: { fontFamily: F.jakartaBold, fontSize: 28, color: C.white },
  identity: { gap: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flexShrink: 1, fontFamily: F.jakartaBold, fontSize: 20, lineHeight: 30, color: C.textStrong },
  tagline: { fontFamily: F.jakartaRegular, fontSize: 11, lineHeight: 16.5, color: C.textMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  rowIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFEFE5', alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  rowLabel: { fontFamily: F.jakartaBold, fontSize: 11, lineHeight: 16.5, color: C.textStrong },
  rowCaption: { fontFamily: F.jakartaRegular, fontSize: 9, lineHeight: 13.5, color: C.iconMuted },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontFamily: F.jakartaBold, fontSize: 10.5, lineHeight: 15.75 },
});
