import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';
import { ArrowLeft } from 'lucide-react-native';
import { C, F } from '../../theme';
import { PressableScale } from './PressableScale';
import INBOX_ICON from '../../assets/svg/inboxIcon';

const WALLET = require('../../assets/images/wallet_icon.png');
const RUPEE = require('../../assets/images/rupee_white.png');

/** Green "Open Now" pill (Figma 76:11746). */
export const OpenBadge = () => (
  <View style={styles.open}>
    <View style={styles.openDot} />
    <Text style={styles.openText}>Open Now</Text>
  </View>
);

/** Round wallet button with a tiny ₹ balance chip (Figma 76:11750). */
export const WalletBadge = ({ balance = 0, onPress }: { balance?: number; onPress?: () => void }) => (
  <PressableScale onPress={onPress} pressedScale={0.9} style={styles.wallet} accessibilityLabel="Wallet">
    <View style={styles.walletDisc} />
    <Image source={WALLET} style={styles.walletIcon} />
    <Image source={RUPEE} style={styles.walletRupeeTilt} />
    <View style={styles.walletChip}>
      <Image source={RUPEE} style={styles.walletChipRupee} />
      <Text style={styles.walletChipText}>{Math.round(balance)}</Text>
    </View>
  </PressableScale>
);

/** Initial avatar with the warm three-stop gradient (Figma 76:11757). */
export const Avatar = ({ name, onPress, bordered }: { name?: string; onPress?: () => void; bordered?: boolean }) => (
  <PressableScale onPress={onPress} pressedScale={0.9} style={[styles.avatar, bordered && styles.avatarBorder]} accessibilityLabel="Profile">
    <LinearGradient
      colors={['#854B48', '#E6A375', '#644970']}
      start={{ x: 0.21, y: 0.09 }}
      end={{ x: 0.79, y: 0.91 }}
      style={StyleSheet.absoluteFill}
    />
    <Text style={styles.avatarText}>{(name?.trim()?.[0] || 'C').toUpperCase()}</Text>
  </PressableScale>
);

type Props = {
  kitchenName: string;
  /** Replaces the Open Now badge with a small grey caption (e.g. "GoHomeyy Chef"). */
  subtitle?: string;
  ownerName?: string;
  onBack?: () => void;
  onWallet?: () => void;
  onInbox?: () => void;
  onProfile?: () => void;
};

/**
 * Kitchen header row: name + Open Now on the left; wallet (Dashboard) or inbox
 * (Orders, with a back arrow) and the avatar on the right.
 */
export const KitchenHeader = ({ kitchenName, subtitle, ownerName, onBack, onWallet, onInbox, onProfile }: Props) => (
  <View style={styles.row}>
    <View style={styles.left}>
      {onBack && (
        <PressableScale onPress={onBack} pressedScale={0.85} hitSlop={10} accessibilityLabel="Go back">
          <ArrowLeft size={20} color={C.textStrong} strokeWidth={1.67} />
        </PressableScale>
      )}
      <View style={styles.titleCol}>
        <Text style={styles.kitchen} numberOfLines={1}>
          {kitchenName}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : <OpenBadge />}
      </View>
    </View>
    <View style={styles.right}>
      {onInbox ? (
        <PressableScale onPress={onInbox} pressedScale={0.9} style={styles.inbox} accessibilityLabel="Order history">
          <SvgXml xml={INBOX_ICON} width={18} height={18} />
        </PressableScale>
      ) : (
        <WalletBadge onPress={onWallet} />
      )}
      <Avatar name={ownerName || kitchenName} onPress={onProfile} bordered={!!onInbox} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
    gap: 12,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleCol: {
    flexShrink: 1,
    alignItems: 'flex-start',
  },
  kitchen: {
    fontFamily: F.jakartaBold,
    fontSize: 17,
    lineHeight: 25.5,
    color: C.textStrong,
  },
  subtitle: {
    fontFamily: F.jakartaSemiBold,
    fontSize: 10,
    lineHeight: 15,
    color: C.iconMuted,
  },
  open: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.successBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  openDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: C.success,
  },
  openText: {
    fontFamily: F.interBold,
    fontSize: 12,
    lineHeight: 18,
    color: C.success,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wallet: {
    width: 40,
    height: 40,
  },
  walletDisc: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    backgroundColor: 'rgba(17,17,22,0.68)',
  },
  walletIcon: {
    position: 'absolute',
    left: 10.4,
    top: 10.4,
    width: 19.85,
    height: 19.85,
    transform: [{ rotate: '-27.23deg' }],
  },
  walletRupeeTilt: {
    position: 'absolute',
    left: 18.2,
    top: 19.4,
    width: 4.74,
    height: 6.51,
    transform: [{ rotate: '-26.02deg' }],
  },
  walletChip: {
    position: 'absolute',
    left: 6,
    top: 31,
    width: 28,
    height: 9.23,
    borderRadius: 33,
    backgroundColor: '#342F36',
    borderWidth: 0.4,
    borderColor: '#4AB425',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  walletChipRupee: {
    width: 3.67,
    height: 5.04,
  },
  walletChipText: {
    fontFamily: F.interRegular,
    fontSize: 6,
    lineHeight: 7,
    color: C.white,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#111116',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  avatarBorder: {
    borderWidth: 2,
    borderColor: C.white,
  },
  avatarText: {
    fontFamily: F.jakartaExtraBold,
    fontSize: 14,
    lineHeight: 20,
    color: '#3F271D',
  },
  inbox: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
