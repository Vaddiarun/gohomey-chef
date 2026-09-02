import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { 
  Plus, 
  Calendar, 
  TrendingUp, 
  ChefHat, 
  ChevronRight,
  Wallet,
  MapPin,
  RefreshCcw,
  AlertCircle,
  Users
} from 'lucide-react-native';
import React, { useEffect, useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { Colors, Spacing, Typography } from '../theme';
import { StatCard } from '../components/StatCard';
import { SlotCard } from '../components/SlotCard';
import { ChefTip } from '../components/ChefTip';
import { resolveImageSource } from '../utils/media';

interface Slot {
  id: string;
  meal_name: string;
  type: 'VEG' | 'NON-VEG';
  service_window: 'LUNCH' | 'DINNER' | string;
  image_url: string;
  slots_remaining: number;
  slots_total: number;
  price: number;
  date: string;
}

interface DashboardData {
  earnings_today: number;
  orders_count_today: number;
  active_slots_count: number;
  active_slots: Slot[];
}

export const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const { token, user, handleUnauthorized } = useAuth();
  
  useEffect(() => {
    if (user) {
      console.log('Dashboard - Chef Profile:', JSON.stringify(user, null, 2));
    }
  }, [user]);
  
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [locationText, setLocationText] = useState('Fetching location...');

  const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const fetchLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationText('Location permission denied');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;

      let address = 'Location unavailable';
      try {
        const geoUrl =
          `https://maps.googleapis.com/maps/api/geocode/json` +
          `?latlng=${latitude},${longitude}` +
          `&key=${GOOGLE_MAPS_KEY}` +
          `&result_type=street_address|locality&language=en`;

        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json();
        if (geoData.status === 'OK' && geoData.results.length > 0) {
          // Get a short format like "Gachibowli, Hyderabad" from the full address
          const addressComponents = geoData.results[0].address_components;
          const sublocality = addressComponents.find((c: any) => c.types.includes('sublocality'))?.short_name;
          const locality = addressComponents.find((c: any) => c.types.includes('locality'))?.short_name;
          
          if (sublocality && locality) {
            address = `${sublocality}, ${locality}`;
          } else if (locality) {
            address = locality;
          } else {
             const parts = geoData.results[0].formatted_address.split(', ');
             address = parts.slice(0, Math.min(2, parts.length)).join(', ');
          }
        } else {
          // Fallback
          const reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (reverse.length > 0) {
            const a = reverse[0];
            address = `${a.street ? a.street + ', ' : ''}${a.city || a.region || ''}`.trim();
          }
        }
      } catch {
        const reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (reverse.length > 0) {
          const a = reverse[0];
          address = `${a.street ? a.street + ', ' : ''}${a.city || a.region || ''}`.trim();
        }
      }
      setLocationText(address || 'Unknown Location');
    } catch (error) {
      console.error('Error fetching location:', error);
      setLocationText('Could not detect location');
    }
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    setError(null);
    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}chefs/dashboard`;
      console.log('API Request: GET', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401 || response.status === 403) {
        const errData = await response.json().catch(() => ({}));
        console.log('API Error (Dashboard):', response.status, errData?.message || errData?.code);
        handleUnauthorized(errData);
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.log('API Error:', response.status, errorText);
        throw new Error('Failed to fetch dashboard data');
      }

      const result = await response.json();
      console.log('API Response:', JSON.stringify(result, null, 2));
      
      if (result.status === 'success') {
        setData(result.data);
      } else {
        throw new Error(result.message || 'Something went wrong');
      }
    } catch (err: any) {
      console.log('Dashboard fetch error:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData])
  );

  const onRefresh = useCallback(() => {
    fetchDashboardData(true);
  }, [fetchDashboardData]);

  const getImageUrl = (url: string) =>
    resolveImageSource(url, require('../assets/images/risotto.png'));

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Top Branding & Location */}
        <View style={styles.topBranding}>
          <Text style={styles.brandingText}>THE VERDANT ATELIER</Text>
          <View style={styles.locationRow}>
            <MapPin size={14} color={Colors.primary} />
            <Text style={styles.locationText}>{locationText}</Text>
          </View>
        </View>

        {/* Earnings Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{getGreeting()}, Chef</Text>
            <View style={styles.earningsContainer}>
              <Wallet size={24} color={Colors.primary} />
              <Text style={styles.earningsAmount}> {formatCurrency(data?.earnings_today || 0)}</Text>
              <Text style={styles.earningsLabel}> EARNINGS TODAY</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.profileIcon} onPress={handleProfilePress}>
              <ChefHat size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Loading/Error State */}
        {loading && !refreshing && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Preparing your atelier...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <AlertCircle size={40} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchDashboardData()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && (
          <>
            {/* Stats Row */}
            <View style={styles.statsRow}>
              <StatCard 
                label="Orders Today" 
                value={data?.orders_count_today.toString() || "0"} 
                subText="Total received" 
                Icon={TrendingUp} 
              />
              <StatCard 
                label="Active Slots" 
                value={data?.active_slots_count.toString() || "0"} 
                subText="Live listings" 
                Icon={Calendar} 
              />
            </View>

            {/* Quick Actions */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity 
                style={styles.createBtn}
                onPress={() => navigation.navigate('CreateSlot')}
              >
                <Plus size={20} color={Colors.background} />
                <Text style={styles.createBtnText}>Create New Slot</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.manageBtn}
                onPress={() => navigation.navigate('Social' as any)}
              >
                <Users size={16} color={Colors.primary} />
                <Text style={styles.manageBtnText}>Social Events</Text>
                <ChevronRight size={16} color={Colors.primary} />
              </TouchableOpacity>

            </View>

            {/* Active Slots Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Slots Today</Text>
              <TouchableOpacity onPress={() => navigation.navigate('CatalogHistory')}>
                <Text style={styles.viewHistory}>View History</Text>
              </TouchableOpacity>
            </View>

            {data?.active_slots && data.active_slots.length > 0 ? (
              data.active_slots.map((slot) => (
                <SlotCard 
                  key={slot.id}
                  title={slot.meal_name}
                  tag={slot.service_window}
                  image={getImageUrl(slot.image_url)}
                  status="READY"
                  slotsLeft={slot.slots_remaining}
                  price={slot.price}
                  type={slot.type}
                />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Plus size={24} color={Colors.primary} />
                </View>
                <Text style={styles.emptyText}>No active slots for today.</Text>
                <TouchableOpacity 
                  style={styles.emptyAction}
                  onPress={() => navigation.navigate('CreateSlot')}
                >
                  <Text style={styles.emptyLink}>Create your first slot</Text>
                </TouchableOpacity>
              </View>
            )}

            <ChefTip tip="Dinner demand for local cuisine is peaking. Consider opening 2 extra slots for the evening rush!" />
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  topBranding: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  brandingText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  locationText: {
    color: Colors.text,
    fontSize: 10,
    marginLeft: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  greeting: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  earningsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  earningsAmount: {
    ...Typography.h1,
    fontSize: 28,
  },
  earningsLabel: {
    ...Typography.caption,
    fontSize: 10,
    marginLeft: 4,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  actionsContainer: {
    marginBottom: Spacing.xl,
  },
  createBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: Spacing.sm,
  },
  createBtnText: {
    color: Colors.background,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  manageBtnText: {
    color: Colors.primary,
    fontSize: 14,
    marginHorizontal: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h3,
  },
  viewHistory: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  centerContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...Typography.body,
    marginTop: Spacing.md,
    color: Colors.textSecondary,
  },
  errorContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.1)',
  },
  errorText: {
    ...Typography.body,
    color: Colors.danger,
    textAlign: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
  },
  retryText: {
    ...Typography.h3,
    fontSize: 14,
    color: Colors.background,
  },
  emptyContainer: {
    padding: Spacing.xl,
    paddingVertical: 40,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 24,
    marginBottom: Spacing.xl,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyAction: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyLink: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
});

