import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Modal
} from 'react-native';
import { Plus, Filter } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '../theme';
import { EventCard } from '../components/EventCard';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSocialBookedCount } from '../utils/socialEvent';

type EventFilter = 'all' | 'open' | 'full' | 'mine';

const FILTER_OPTIONS: { key: EventFilter; label: string }[] = [
  { key: 'all', label: 'All Events' },
  { key: 'open', label: 'Open Slots' },
  { key: 'full', label: 'House Full' },
  { key: 'mine', label: 'My Events' },
];

export const SocialEventsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { events, isLoading, fetchEvents } = useSocial();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<EventFilter>('all');

  useEffect(() => {
    console.log('SocialEventsScreen - Current User:', JSON.stringify(user, null, 2));
    fetchEvents();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  };

  const handleCreateEvent = () => {
    navigation.navigate('CreateEvent');
  };

  const filteredEvents = events.filter((event) => {
    const bookedCount = getSocialBookedCount(event);
    const isFull = bookedCount >= event.slots_total;

    if (activeFilter === 'open') return !isFull;
    if (activeFilter === 'full') return isFull;
    if (activeFilter === 'mine') return event.creator_id === user?.id;
    return true;
  });

  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={Typography.h1}>Social Events</Text>
        <Text style={Typography.caption}>Connect and grow together</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity 
          style={[styles.filterButton, { marginRight: Spacing.sm, backgroundColor: Colors.primary + '20', borderColor: Colors.primary }]}
          onPress={handleCreateEvent}
        >
          <Plus size={20} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.filterButton,
            activeFilter !== 'all' && styles.activeFilterButton,
          ]}
          onPress={() => setFilterVisible(true)}
          activeOpacity={0.7}
        >
          <Filter size={20} color={activeFilter !== 'all' ? Colors.primary : Colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {renderHeader()}

      <FlatList
        data={filteredEvents}
        renderItem={({ item }) => (
          <EventCard 
            event={item} 
            onPress={() => navigation.navigate('EventDetail', { eventId: item.id })} 
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No events found</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={() => fetchEvents()}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      {isLoading && !refreshing && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      <TouchableOpacity 
        style={[styles.fab, { bottom: 20 + insets.bottom }]}
        onPress={handleCreateEvent}
        activeOpacity={0.8}
      >
        <Plus size={24} color={Colors.background} />
      </TouchableOpacity>

      <Modal
        visible={filterVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setFilterVisible(false)}
        >
          <View style={styles.filterMenu}>
            {FILTER_OPTIONS.map((option) => {
              const isActive = activeFilter === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.filterOption, isActive && styles.filterOptionActive]}
                  onPress={() => {
                    setActiveFilter(option.key);
                    setFilterVisible(false);
                  }}
                >
                  <Text style={[styles.filterOptionText, isActive && styles.filterOptionTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeFilterButton: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18, 18, 18, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    marginTop: 100,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  retryText: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'flex-end',
    paddingTop: 72,
    paddingRight: Spacing.lg,
  },
  filterMenu: {
    width: 180,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 6,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  filterOptionActive: {
    backgroundColor: Colors.primary + '20',
  },
  filterOptionText: {
    ...Typography.body,
    fontSize: 14,
  },
  filterOptionTextActive: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
});
