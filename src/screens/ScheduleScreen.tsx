import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '../theme';
import { SlotCard } from '../components/SlotCard';
import { Calendar as CalendarIcon, Clock, Users, ChevronRight, X, AlertCircle, Camera } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { ActivityIndicator, Alert } from 'react-native';

interface Meal {
  id: string;
  meal_name: string;
  type: 'VEG' | 'NON_VEG';
  service_window: string;
  image_url: string;
  slots_remaining: number;
  slots_total: number;
  price: number;
  date: string;
}

export const ScheduleScreen = () => {
  const navigation = useNavigation<any>();
  const { token } = useAuth();
  const [selectedDate, setSelectedDate] = React.useState('ALL');
  const [meals, setMeals] = React.useState<Meal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = React.useState(false);
  const [selectedMeal, setSelectedMeal] = React.useState<Meal | null>(null);

  // Generate dynamic date strip (current day + next 6 days)
  const days = React.useMemo(() => {
    const dates = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return {
        id: d.toISOString().split('T')[0],
        day: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),



        date: d.getDate().toString(),
        fullDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      };
    });
    return [{ id: 'ALL', day: 'ALL', date: '∞', fullDate: 'All Upcoming Slots' }, ...dates];
  }, []);

  const fetchMeals = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = selectedDate === 'ALL' ? '' : `?date=${selectedDate}`;
      const url = `${process.env.EXPO_PUBLIC_API_URL}meals${query}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch meals');

      const result = await response.json();
      let mealsList: Meal[] = [];
      if (Array.isArray(result)) {
        mealsList = result;
      } else if (result.status === 'success') {
        mealsList = result.data || [];
      } else if (result.data && Array.isArray(result.data)) {
        mealsList = result.data;
      }
      setMeals(mealsList);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, token]);

  const handleDeleteMeal = async (mealId: string) => {
    Alert.alert(
      'Cancel Slot',
      'Are you sure you want to cancel this meal slot? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}meals/${mealId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });

              if (response.ok) {
                Alert.alert('Success', 'Meal slot cancelled successfully');
                setIsModalVisible(false);
                fetchMeals();
              } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete meal slot');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          }
        }
      ]
    );
  };

  React.useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  const getImageUrl = (url: string) => {
    if (!url) return require('../assets/images/risotto.png');
    if (url.startsWith('http')) return { uri: url };
    return { uri: `${process.env.EXPO_PUBLIC_API_URL.replace('/api/v1/', '')}${url}` };
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <Text style={styles.screenTitle}>Schedule</Text>
        {/* Date Strip */}
        <View style={styles.dateStrip}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateStripScroll}>
            {days.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.dateItem, selectedDate === item.id && styles.activeDateItem]}
                onPress={() => setSelectedDate(item.id)}
              >
                <Text style={[styles.dayText, selectedDate === item.id && styles.activeDayText]}>{item.day}</Text>
                <Text style={[styles.dateText, selectedDate === item.id && styles.activeDateText]}>{item.date}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Slots - {days.find(d => d.id === selectedDate)?.fullDate}</Text>
            {loading && <ActivityIndicator size="small" color={Colors.primary} />}
          </View>

          {error && (
            <View style={styles.errorBox}>
              <AlertCircle size={20} color={Colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {!loading && meals.length === 0 && !error && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No slots listed for this date.</Text>
            </View>
          )}

          {meals.map((meal) => (
            <SlotCard
              key={meal.id}
              title={meal.meal_name}
              tag={meal.service_window}
              image={getImageUrl(meal.image_url)}
              status="READY"
              slotsLeft={meal.slots_remaining}
              price={meal.price}
              type={meal.type === 'NON_VEG' ? 'NON-VEG' : 'VEG'}
              onPress={() => {
                setSelectedMeal(meal);
                setIsModalVisible(true);
              }}
            />
          ))}

          <View style={styles.infoBox}>
            <CalendarIcon size={20} color={Colors.primary} />
            <Text style={styles.infoBoxText}>Tap on a slot to manage capacity or update details.</Text>
          </View>
        </ScrollView>

        {/* Manage Slot Modal (Simplified Bottom Sheet) */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={isModalVisible}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setIsModalVisible(false)}
          >
            <Pressable style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.handle} />
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <X size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalTitle}>Manage Slot</Text>
              <Text style={styles.modalSubtitle}>{selectedMeal?.service_window} • {days.find(d => d.id === selectedDate)?.fullDate}</Text>

              <View style={styles.optionsContainer}>
                <TouchableOpacity style={styles.optionRow}>
                  <View style={styles.optionIcon}>
                    <Clock size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionLabel}>Dish Name</Text>
                    <Text style={styles.optionValue}>{selectedMeal?.meal_name}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.optionRow}>
                  <View style={styles.optionIcon}>
                    <Users size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionLabel}>Current Capacity</Text>
                    <Text style={styles.optionValue}>{selectedMeal?.slots_remaining} / {selectedMeal?.slots_total} portions</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.proofBtn}
                onPress={() => {
                  setIsModalVisible(false);
                  navigation.navigate('ProofUpload', { mealId: selectedMeal?.id });
                }}
              >
                <Camera size={20} color={Colors.background} />
                <Text style={styles.proofBtnText}>Capture Batch Proof</Text>
              </TouchableOpacity>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.discardBtn}
                  onPress={() => selectedMeal && handleDeleteMeal(selectedMeal.id)}
                >
                  <Text style={[styles.discardBtnText, { color: Colors.danger }]}>Cancel Slot</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={() => setIsModalVisible(false)}>
                  <Text style={styles.confirmBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

// Dummy ChefHat since I didn't import it in this file scope (it was in Dashboard)
const ChefHat = ({ size, color }: any) => <CalendarIcon size={size} color={color} />;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  screenTitle: {
    ...Typography.h1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    backgroundColor: Colors.surface,
  },
  dateStrip: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  dateStripScroll: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    gap: 12,
  },
  dateItem: {
    alignItems: 'center',
    paddingVertical: 12,
    width: 60,
    borderRadius: 30,
  },
  activeDateItem: {
    backgroundColor: Colors.primary,
  },
  dayText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  activeDayText: {
    color: Colors.background,
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  activeDateText: {
    color: Colors.background,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  errorText: {
    color: Colors.danger,
    marginLeft: 8,
    fontSize: 12,
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.2)',
  },
  infoBoxText: {
    ...Typography.caption,
    marginLeft: 12,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    position: 'absolute',
    left: '50%',
    marginLeft: -20,
    top: -10,
  },
  modalTitle: {
    ...Typography.h2,
    marginBottom: 4,
  },
  modalSubtitle: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: 'bold',
    marginBottom: Spacing.xl,
  },
  optionsContainer: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  optionInfo: {
    flex: 1,
  },
  optionLabel: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  optionValue: {
    ...Typography.body,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 16,
  },
  discardBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  discardBtnText: {
    color: Colors.textSecondary,
    fontWeight: 'bold',
  },
  confirmBtn: {
    flex: 2,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: Colors.background,
    fontWeight: 'bold',
  },
  proofBtn: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  proofBtnText: {
    color: Colors.background,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
