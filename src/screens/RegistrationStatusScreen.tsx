import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { format } from 'date-fns';
import {
  BadgeCheck,
  CircleCheck,
  Clock,
  LifeBuoy,
  LogOut,
  RefreshCw,
  Sparkles,
  TriangleAlert,
  Wallet,
  X,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { C, F, Radius, Shadows, T } from '../theme';
import { FadeInView, PressableScale, PrimaryButton, SafeGif, StatusBadge, StatusHalo } from '../components/ui';
import type { BadgeTone } from '../components/ui';
import { useAuth, getApplicationStatus } from '../context/AuthContext';

const VERIFIED_CHECK = require('../assets/images/verified_check.gif');
const SUPPORT_EMAIL = 'concierge@gohomeyy.com';

const PENDING_COPY: Record<string, { title: string; body: string; step: number }> = {
  PENDING_REVIEW: {
    title: 'Verification in progress',
    body: 'Our team is reviewing your documents. This usually takes less than 24 hours.',
    step: 1,
  },
  PHONE_VETTING: {
    title: 'Phone vetting',
    body: "We'll call you shortly for a quick introduction to verify your profile details.",
    step: 2,
  },
  KITCHEN_AUDIT: {
    title: 'Kitchen audit',
    body: 'A safety check of your kitchen is in progress. We will notify you of the result soon.',
    step: 3,
  },
};

const formatReviewed = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : format(d, "d MMM, h:mm a");
};

const docTone = (status?: string): { label: string; tone: BadgeTone } => {
  const s = (status || '').toUpperCase();
  if (['VERIFIED', 'APPROVED', 'ACCEPTED'].includes(s)) return { label: 'Verified', tone: 'success' };
  if (['REJECTED', 'DECLINED', 'FAILED'].includes(s)) return { label: 'Rejected', tone: 'danger' };
  return { label: 'Under Review', tone: 'warning' };
};

export const RegistrationStatusScreen = ({ navigation, route }: any) => {
  const { login, logout, fetchProfile, user, token: sessionToken } = useAuth();
  // Prefer the live profile so "Check for updates" re-renders with the new state.
  const status: string = getApplicationStatus(user) || String(route?.params?.status || 'PENDING_REVIEW').toUpperCase();
  const token = route?.params?.token || sessionToken;
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  // Confirm the latest review state on open — once admin approves, the
  // navigator switches to the dashboard on its own.
  useEffect(() => {
    if (sessionToken) fetchProfile();
  }, []);

  const handleCheckForUpdates = async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
    Toast.show({ type: 'info', text1: 'Status refreshed' });
  };

  const contactSupport = () =>
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Chef verification')}`).catch(() =>
      Toast.show({ type: 'info', text1: 'Contact support', text2: SUPPORT_EMAIL })
    );

  const supportButton = (
    <PressableScale style={styles.outlineBtn} onPress={contactSupport}>
      <LifeBuoy size={18} color={C.textInk} strokeWidth={1.65} />
      <Text style={styles.outlineText}>Contact support</Text>
    </PressableScale>
  );

  const logoutLink = (
    <Pressable onPress={() => logout()} style={styles.logout} hitSlop={8}>
      <LogOut size={14} color={C.textMuted3} />
      <Text style={styles.logoutText}>Log out</Text>
    </Pressable>
  );

  let content: React.ReactNode;

  if (status === 'APPROVED') {
    content = (
      <>
        <View style={styles.hero}>
          <StatusHalo color={C.success} halo={C.successHalo} haloInner={C.successHaloInner}>
            <SafeGif source={VERIFIED_CHECK} style={styles.checkGif} />
          </StatusHalo>
          <FadeInView delay={260} style={styles.heroText}>
            <Text style={[T.statusTitle, styles.center]}>You're verified</Text>
            <Text style={[T.statusBody, styles.center]}>Orders, menus and payouts are unlocked.</Text>
          </FadeInView>
        </View>

        <View style={styles.statRow}>
          {[
            { value: 'Verified', label: 'Status', Icon: BadgeCheck },
            { value: 'Enabled', label: 'Payouts', Icon: Wallet },
          ].map(({ value, label, Icon }, i) => (
            <FadeInView key={label} delay={360 + i * 90} style={styles.statCard}>
              <View style={styles.statIcon}>
                <Icon size={16} color={C.success} strokeWidth={1.33} />
              </View>
              <View style={styles.statText}>
                <Text style={T.statusTitle}>{value}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            </FadeInView>
          ))}
        </View>

        <FadeInView delay={540} style={styles.tip}>
          <Sparkles size={16} color={C.success} strokeWidth={1.33} style={styles.tipIcon} />
          <Text style={styles.tipText}>Go online now — new chefs get boosted visibility for 48 hours.</Text>
        </FadeInView>

        <FadeInView delay={620} style={styles.fullWidth}>
          <PrimaryButton label="Go to Dashboard" onPress={() => login(token)} />
        </FadeInView>
      </>
    );
  } else if (status === 'REJECTED') {
    const reviewed = formatReviewed(user?.reviewed_at);
    const reason = user?.rejection_reason;
    content = (
      <>
        <View style={styles.hero}>
          <StatusHalo color={C.danger} halo={C.dangerHalo} haloInner={C.dangerHaloInner}>
            <X size={29} color={C.white} strokeWidth={3.6} />
          </StatusHalo>
          <FadeInView delay={260} style={styles.heroText}>
            <Text style={[T.statusTitle, styles.center]}>Verification rejected</Text>
            <Text style={[T.statusBody, styles.center]}>
              {reviewed ? `Reviewed on ${reviewed}` : 'Your application was not approved this time.'}
            </Text>
          </FadeInView>
        </View>

        <FadeInView delay={360} style={styles.reasonBox}>
          <TriangleAlert size={18} color={C.danger} strokeWidth={1.5} style={styles.reasonIcon} />
          <View style={styles.reasonText}>
            <Text style={styles.reasonTitle}>{reason || 'Some details need another look'}</Text>
            <Text style={styles.reasonBody}>
              {user?.rejection_details ||
                (reason
                  ? 'Retake in bright light with the full document in frame.'
                  : 'Please re-upload clear documents or contact support for details.')}
            </Text>
          </View>
        </FadeInView>

        <FadeInView delay={440} style={styles.actions}>
          <PrimaryButton
            label="Re - upload document"
            showChevron={false}
            onPress={() => navigation.navigate('RegisterStep3', { token, resubmit: true })}
          />
          {supportButton}
        </FadeInView>
      </>
    );
  } else {
    const copy = PENDING_COPY[status] ?? {
      title: 'Application status',
      body: 'We are processing your application. Please check back later.',
      step: 1,
    };
    const rows: { label: string; badge: { label: string; tone: BadgeTone } }[] = user?.documents?.length
      ? user.documents.map((d) => ({ label: d.name || d.type || 'Document', badge: docTone(d.status) }))
      : ['Documents', 'Phone vetting', 'Kitchen audit', 'Final approval'].map((label, i) => {
          // Stage 1..4; earlier stages are done, the current one is in review.
          const stage = i + 1;
          const badge: { label: string; tone: BadgeTone } =
            stage < copy.step
              ? { label: 'Verified', tone: 'success' }
              : stage === copy.step
              ? { label: 'Under Review', tone: 'warning' }
              : { label: 'Pending', tone: 'neutral' };
          return { label, badge };
        });

    content = (
      <>
        <View style={styles.hero}>
          <StatusHalo color={C.primary} halo="rgba(252,65,0,0.12)" haloInner="rgba(252,65,0,0.18)">
            <Clock size={28} color={C.white} strokeWidth={2.4} />
          </StatusHalo>
          <FadeInView delay={260} style={styles.heroText}>
            <Text style={[T.statusTitle, styles.center]}>{copy.title}</Text>
            <Text style={[T.statusBody, styles.center]}>{copy.body}</Text>
          </FadeInView>
        </View>

        <FadeInView delay={360} style={styles.checklist}>
          {rows.map((row, i) => (
            <FadeInView
              key={row.label + i}
              delay={420 + i * 70}
              offset={8}
              style={[styles.checkRow, i < rows.length - 1 && styles.checkRowDivider]}
            >
              <CircleCheck
                size={20}
                strokeWidth={1.67}
                color={row.badge.tone === 'success' ? C.successDeep : row.badge.tone === 'danger' ? C.danger : row.badge.tone === 'warning' ? C.warning : C.iconMuted}
              />
              <Text style={styles.checkLabel}>{row.label}</Text>
              <StatusBadge label={row.badge.label} tone={row.badge.tone} />
            </FadeInView>
          ))}
        </FadeInView>

        <FadeInView delay={720} style={styles.actions}>
          <PrimaryButton label="Check for updates" onPress={handleCheckForUpdates} loading={refreshing} showChevron={false} />
          {supportButton}
        </FadeInView>
      </>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {content}
        <FadeInView delay={800}>{logoutLink}</FadeInView>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.surface,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 16,
  },
  center: {
    textAlign: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  hero: {
    alignItems: 'center',
    paddingTop: 8,
  },
  heroText: {
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
  },
  checkGif: {
    width: 29,
    height: 29,
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  statCard: {
    flex: 1,
    height: 80,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borderCard,
    backgroundColor: C.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
    ...Shadows.card,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statText: {
    alignItems: 'center',
    minWidth: 77,
  },
  statLabel: {
    fontFamily: F.interRegular,
    fontSize: 11.5,
    lineHeight: 17.25,
    color: C.textMuted3,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: C.successBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '100%',
  },
  tipIcon: {
    marginTop: 1,
  },
  tipText: {
    flex: 1,
    fontFamily: F.interRegular,
    fontSize: 12.3,
    lineHeight: 18.75,
    color: C.success,
    textAlign: 'center',
  },
  reasonBox: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    padding: 16,
    borderRadius: 12,
    backgroundColor: C.dangerBg,
  },
  reasonIcon: {
    marginTop: 2,
  },
  reasonText: {
    flex: 1,
    gap: 2,
  },
  reasonTitle: {
    fontFamily: F.interBold,
    fontSize: 13.5,
    lineHeight: 20.25,
    color: C.danger,
  },
  reasonBody: {
    fontFamily: F.interRegular,
    fontSize: 12.3,
    lineHeight: 18.75,
    color: C.danger,
    opacity: 0.85,
  },
  actions: {
    width: '100%',
    gap: 10,
  },
  outlineBtn: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.borderCard,
    backgroundColor: C.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  outlineText: {
    fontFamily: F.interBold,
    fontSize: 15,
    lineHeight: 22.5,
    letterSpacing: -0.15,
    color: C.textInk,
  },
  checklist: {
    width: '100%',
    backgroundColor: C.surface,
    borderRadius: Radius.tile,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  checkRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  checkLabel: {
    flex: 1,
    fontFamily: F.jakartaBold,
    fontSize: 12,
    lineHeight: 18,
    color: C.textStrong,
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  logoutText: {
    fontFamily: F.interMedium,
    fontSize: 13,
    color: C.textMuted3,
  },
});
