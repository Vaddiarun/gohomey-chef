import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Plus, Sparkles } from 'lucide-react-native';
import { C, F } from '../theme';
import { Chip, FadeInView, KitchenHeader, PressableScale } from '../components/ui';
import { SocialPostCard } from '../components/SocialPostCard';
import { QuickAddFab } from '../components/QuickAddFab';
import { useTabBarSpace } from '../navigation/FloatingTabBar';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import { getSocialBookedCount } from '../utils/socialEvent';

type EventFilter = 'all' | 'open' | 'full' | 'mine';

const FILTER_OPTIONS: { key: EventFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open slots' },
  { key: 'full', label: 'House full' },
  { key: 'mine', label: 'My tables' },
];

/** Social tab (Figma "Social Table" 76:13694). */
export const SocialEventsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const bottomSpace = useTabBarSpace();
  const { events, isLoading, fetchEvents } = useSocial();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<EventFilter>('all');

  useEffect(() => {
    fetchEvents();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  };

  const filteredEvents = events.filter((event) => {
    const isFull = getSocialBookedCount(event) >= event.slots_total;
    if (activeFilter === 'open') return !isFull;
    if (activeFilter === 'full') return isFull;
    if (activeFilter === 'mine') return event.creator_id === user?.id;
    return true;
  });

  const kitchenName = user?.kitchen_name || (user?.name ? `${user.name.split(' ')[0]}’s Kitchen` : 'My Kitchen');

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={{ paddingTop: insets.top }}>
        <KitchenHeader
          kitchenName={kitchenName}
          ownerName={user?.name}
          onWallet={() => navigation.navigate('Wallet')}
          onProfile={() => navigation.navigate('Profile')}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomSpace + 60 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
      >
        <FadeInView style={styles.filters}>
          {FILTER_OPTIONS.map((f) => (
            <Chip key={f.key} label={f.label} selected={activeFilter === f.key} onPress={() => setActiveFilter(f.key)} />
          ))}
        </FadeInView>

        {isLoading && !refreshing && events.length === 0 ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
        ) : filteredEvents.length === 0 ? (
          <FadeInView delay={80} style={styles.empty}>
            <Sparkles size={24} color={C.iconMuted} />
            <Text style={styles.emptyText}>
              {activeFilter === 'all' ? 'No social tables yet.' : 'Nothing matches this filter.'}
            </Text>
            {activeFilter === 'all' ? (
              <PressableScale style={styles.emptyCta} onPress={() => navigation.navigate('CreateEvent')}>
                <Plus size={14} color={C.primary} />
                <Text style={styles.emptyCtaText}>Host a Social Table</Text>
              </PressableScale>
            ) : (
              <Pressable onPress={() => setActiveFilter('all')} hitSlop={8}>
                <Text style={styles.link}>Show all</Text>
              </Pressable>
            )}
          </FadeInView>
        ) : (
          filteredEvents.map((event, i) => (
            <FadeInView key={event.id} delay={60 + Math.min(i, 6) * 70}>
              <SocialPostCard event={event} onPress={() => navigation.navigate('EventDetail', { eventId: event.id })} />
            </FadeInView>
          ))
        )}
      </ScrollView>

      <QuickAddFab />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 20, paddingTop: 4, gap: 16 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  empty: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: { fontFamily: F.jakartaSemiBold, fontSize: 12, color: C.textMuted },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: C.softOrange,
  },
  emptyCtaText: { fontFamily: F.jakartaBold, fontSize: 12, color: C.primary },
  link: { fontFamily: F.jakartaBold, fontSize: 12, color: C.primary },
});
