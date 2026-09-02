import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '../theme';
import {
  ChevronLeft,
  MapPin,
  Utensils,
  ArrowRight,
  Plus,
  X,
  Check,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import MapView, { Marker, Region } from '../components/PlatformMap';
import { LocationSearchInput } from '../components/LocationSearchInput';
import * as Location from 'expo-location';

const PRESET_APPLIANCES = [
  'OVEN',
  'MICROWAVE',
  'REFRIGERATOR',
  'FREEZER',
  'DISHWASHER',
  'BLENDER',
  'MIXER',
  'FOOD PROCESSOR',
  'SOUS-VIDE',
  'AIR FRYER',
  'CONVECTION OVEN',
  'PRESSURE COOKER',
  'INDUCTION',
  'GAS STOVE',
];

export const RegisterStep2 = ({ navigation, route }: any) => {
  const { updateRegistrationStep } = useAuth();
  const [kitchenName, setKitchenName] = useState('');
  const [capacity, setCapacity] = useState('12');
  const [appliances, setAppliances] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [newAppliance, setNewAppliance] = useState('');
  const inputRef = useRef<TextInput>(null);

  const [region, setRegion] = useState<Region>({
    latitude: 17.385,
    longitude: 78.4867,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [coordinates, setCoordinates] = useState({
    latitude: 17.385,
    longitude: 78.4867,
  });
  const [address, setAddress] = useState('');
  const [addressQuery, setAddressQuery] = useState('');

  const email = route?.params?.email;
  const token = route?.params?.token;

  const toggleAppliance = (item: string) => {
    setAppliances(prev =>
      prev.includes(item) ? prev.filter(a => a !== item) : [...prev, item]
    );
  };

  const addCustomAppliance = () => {
    const trimmed = newAppliance.trim().toUpperCase();
    if (trimmed && !appliances.includes(trimmed)) {
      setAppliances(prev => [...prev, trimmed]);
    }
    setNewAppliance('');
    inputRef.current?.focus();
  };

  const handleNext = async () => {
    if (!kitchenName || !capacity) {
      Toast.show({
        type: 'error',
        text1: 'Missing Fields',
        text2: 'Please fill out all the fields.',
      });
      return;
    }

    if (!token) {
      Toast.show({
        type: 'error',
        text1: 'Session expired',
        text2: 'Please verify your mobile number to continue registration.',
      });
      navigation.navigate('Login');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}chefs/register/step-2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          kitchen_name: kitchenName,
          kitchen_address: address,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          max_capacity: parseInt(capacity) || 0,
          appliances: appliances,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('Step 2 API Failed. Status:', response.status);
        if (response.status === 401) {
          Toast.show({
            type: 'error',
            text1: 'Session expired',
            text2:
              errorData.code === 'TOKEN_EXPIRED'
                ? 'Your registration session expired. Please verify your number again.'
                : 'Please verify your number again.',
          });
          navigation.navigate('Login');
          return;
        }
        throw new Error(errorData.message || `Failed to submit Step 2 (Status: ${response.status})`);
      }

      console.log('Step 2 API Success');
      await updateRegistrationStep(3);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Kitchen details saved successfully.',
      });
      navigation.navigate('RegisterStep3', { email, token, phoneNumber: route?.params?.phoneNumber });
    } catch (error: any) {
      console.log('Step 2 API Error caught:', error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Something went wrong',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chef Registration</Text>
        <View style={styles.stepBadge}>
          <Text style={styles.stepText}>Step 2/3</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="always"
        >
          <View style={styles.introSection}>
            <Text style={styles.subtitle}>WORKSPACE PROFILE</Text>
            <Text style={styles.title}>Your Kitchen Space</Text>
            <Text style={styles.description}>
              Tell us about where the magic happens. Your kitchen details help clients trust your craft.
            </Text>
          </View>

          <View style={styles.form}>
            {/* Kitchen Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>KITCHEN NAME</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={kitchenName}
                  onChangeText={setKitchenName}
                  placeholder="e.g. The Emerald Atelier"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
            </View>

            {/* Location */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>LOCATION</Text>

              <LocationSearchInput
                value={addressQuery}
                onChangeText={setAddressQuery}
                onLocationSelected={({ address, latitude, longitude }) => {
                  setAddress(address);
                  setCoordinates({ latitude, longitude });
                  setRegion({ latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 });
                }}
                placeholder="Search for your kitchen address..."
              />

              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  region={region}
                  onPress={(e: any) => {
                    const { latitude, longitude } = e.nativeEvent.coordinate;
                    setCoordinates({ latitude, longitude });
                    setRegion({ ...region, latitude, longitude });
                    Location.reverseGeocodeAsync({ latitude, longitude }).then(r => {
                      if (r.length > 0) {
                        const a = r[0];
                        const f = `${a.name || ''} ${a.street || ''}, ${a.city || ''}, ${a.region || ''} ${a.postalCode || ''}`.trim().replace(/^ ,/, '');
                        setAddress(f);
                        setAddressQuery(f);
                      }
                    });
                  }}
                >
                  <Marker
                    coordinate={coordinates}
                    draggable
                    onDragEnd={(e: any) => {
                      const { latitude, longitude } = e.nativeEvent.coordinate;
                      setCoordinates({ latitude, longitude });
                      Location.reverseGeocodeAsync({ latitude, longitude }).then(r => {
                        if (r.length > 0) {
                          const a = r[0];
                          const f = `${a.name || ''} ${a.street || ''}, ${a.city || ''}, ${a.region || ''} ${a.postalCode || ''}`.trim().replace(/^ ,/, '');
                          setAddress(f);
                          setAddressQuery(f);
                        }
                      });
                    }}
                    title="Kitchen Location"
                  />
                </MapView>
              </View>
              {address ? (
                <View style={styles.locationBar}>
                  <MapPin size={16} color={Colors.primary} />
                  <Text style={styles.locationText} numberOfLines={2}>{address}</Text>
                </View>
              ) : null}
            </View>

            {/* Capacity */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>CAPACITY</Text>
              <View style={styles.capacityWrapper}>
                <View style={styles.capacityIconContainer}>
                  <Utensils size={24} color={Colors.primary} />
                </View>
                <View style={styles.capacityInputContainer}>
                  <TextInput
                    style={styles.capacityValue}
                    value={capacity}
                    onChangeText={setCapacity}
                    keyboardType="numeric"
                  />
                  <Text style={styles.capacityLabel}>meals / slot</Text>
                </View>
              </View>
            </View>

            {/* Appliances */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>APPLIANCES</Text>
              <Text style={styles.applianceHint}>Tap to select - tap again to deselect</Text>

              {/* Preset grid */}
              <View style={styles.chipGrid}>
                {PRESET_APPLIANCES.map((item) => {
                  const selected = appliances.includes(item);
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[
                        styles.chip,
                        selected && styles.chipActive,
                      ]}
                      onPress={() => toggleAppliance(item)}
                      activeOpacity={0.7}
                    >
                      {selected && (
                        <Check size={11} color={Colors.primary} style={{ marginRight: 4 }} />
                      )}
                      <Text style={[styles.chipLabel, selected && styles.chipLabelActive]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom tags (non-preset selected) */}
              {appliances.filter(a => !PRESET_APPLIANCES.includes(a)).length > 0 && (
                <View style={styles.customRow}>
                  <Text style={styles.customRowLabel}>CUSTOM</Text>
                  <View style={styles.chipGrid}>
                    {appliances
                      .filter(a => !PRESET_APPLIANCES.includes(a))
                      .map(item => (
                        <TouchableOpacity
                          key={item}
                          style={[
                            styles.chip,
                            styles.chipActive,
                          ]}
                          onPress={() => toggleAppliance(item)}
                          activeOpacity={0.7}
                        >
                          <Check size={11} color={Colors.primary} style={{ marginRight: 4 }} />
                          <Text style={[styles.chipLabel, styles.chipLabelActive]}>{item}</Text>
                          <X size={10} color={Colors.primary} style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                      ))}
                  </View>
                </View>
              )}

              {/* Add custom input */}
              <View style={styles.addRow}>
                <TextInput
                  ref={inputRef}
                  style={styles.addInput}
                  value={newAppliance}
                  onChangeText={setNewAppliance}
                  placeholder="Add appliance, e.g. ROTISSERIE"
                  placeholderTextColor={Colors.textSecondary}
                  autoCapitalize="characters"
                  returnKeyType="done"
                  onSubmitEditing={addCustomAppliance}
                />
                {newAppliance.length > 0 && (
                  <TouchableOpacity
                    style={styles.addCancelBtn}
                    onPress={() => setNewAppliance('')}
                    activeOpacity={0.8}
                  >
                    <X size={16} color={Colors.textSecondary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.addConfirmBtn,
                    !newAppliance.trim() && styles.addConfirmBtnDisabled,
                  ]}
                  onPress={addCustomAppliance}
                  disabled={!newAppliance.trim()}
                  activeOpacity={0.8}
                >
                  <Plus size={14} color={Colors.background} style={{ marginRight: 6 }} />
                  <Text style={styles.addConfirmText}>ADD</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.prevBtn}>
              <Text style={styles.prevBtnText}>PREVIOUS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nextBtn, loading && { opacity: 0.7 }]}
              onPress={handleNext}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.background} size="small" />
              ) : (
                <>
                  <Text style={styles.nextBtnText}>NEXT</Text>
                  <ArrowRight size={18} color={Colors.background} style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.body,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  stepBadge: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  stepText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  introSection: {
    marginBottom: 32,
  },
  subtitle: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    ...Typography.h1,
    fontSize: 32,
    marginBottom: 12,
  },
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  form: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: 'bold',
    marginBottom: 12,
    fontSize: 10,
    letterSpacing: 1,
  },
  inputWrapper: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    height: 60,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
  },
  input: {
    ...Typography.body,
    color: Colors.text,
  },
  locationBar: {
    marginTop: 12,
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  locationText: {
    color: Colors.text,
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  capacityWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 16,
    height: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  capacityIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
  },
  capacityInputContainer: {
    flex: 1,
  },
  capacityValue: {
    ...Typography.h1,
    color: Colors.text,
    fontSize: 32,
    lineHeight: 40,
  },
  capacityLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  // Appliances
  applianceHint: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginBottom: 14,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    borderColor: Colors.primary,
  },
  chipLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  chipLabelActive: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  customRow: {
    marginBottom: 8,
  },
  customRowLabel: {
    color: Colors.textSecondary,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.primary,
    overflow: 'hidden',
    height: 50,
  },
  addInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 16,
    color: Colors.text,
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  addConfirmBtn: {
    backgroundColor: Colors.primary,
    height: 50,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addConfirmBtnDisabled: {
    opacity: 0.5,
  },
  addConfirmText: {
    color: Colors.background,
    fontWeight: 'bold',
    fontSize: 11,
    letterSpacing: 1,
  },
  addCancelBtn: {
    height: 50,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },
  addCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  addCustomText: {
    color: Colors.background,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  prevBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  prevBtnText: {
    color: Colors.textSecondary,
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  nextBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  nextBtnText: {
    color: Colors.background,
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 1,
  },
  mapContainer: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});
