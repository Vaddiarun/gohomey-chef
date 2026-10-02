import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, BackHandler } from 'react-native';
import { Plus } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import * as Location from 'expo-location';
import { C, F, Radius, T } from '../theme';
import { Chip, FadeInView, FormField, OnboardingLayout, PrimaryButton } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import MapView, { Marker, Region } from '../components/PlatformMap';
import { LocationSearchInput } from '../components/LocationSearchInput';
import { friendlyApiError } from '../utils/apiErrors';
import { REG_PROGRESS, stepLabel } from './registration/shared';

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

const toTitle = (s: string) => s.toLowerCase().replace(/(^|[\s-])\S/g, (m) => m.toUpperCase());

const formatReverse = (a: Location.LocationGeocodedAddress) =>
  `${a.name || ''} ${a.street || ''}, ${a.city || ''}, ${a.region || ''} ${a.postalCode || ''}`.trim().replace(/^ ,/, '');

export const RegisterStep2 = ({ navigation, route }: any) => {
  const { updateRegistrationStep } = useAuth();
  const [page, setPage] = useState<'kitchen' | 'location'>('kitchen');
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

  // Hardware back on the second page returns to the first.
  useEffect(() => {
    if (page !== 'location') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setPage('kitchen');
      return true;
    });
    return () => sub.remove();
  }, [page]);

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

  const updateFromCoordinate = (latitude: number, longitude: number) => {
    setCoordinates({ latitude, longitude });
    setRegion(r => ({ ...r, latitude, longitude }));
    Location.reverseGeocodeAsync({ latitude, longitude }).then(r => {
      if (r.length > 0) {
        const f = formatReverse(r[0]);
        setAddress(f);
        setAddressQuery(f);
      }
    });
  };

  const handleKitchenContinue = () => {
    if (!kitchenName.trim()) {
      Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Please enter your kitchen name.' });
      return;
    }
    setPage('location');
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
        throw new Error(friendlyApiError(response.status, errorData).message);
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

  if (page === 'kitchen') {
    return (
      <OnboardingLayout
        onBack={() => navigation.goBack()}
        progress={REG_PROGRESS.kitchen}
        progressFrom={REG_PROGRESS.cuisine}
        footer={<PrimaryButton label="Continue" onPress={handleKitchenContinue} />}
      >
        <FadeInView style={styles.titleTight}>
          <Text style={T.screenTitle}>Chef Onboarding Welcome</Text>
          <Text style={T.subtitle}>{stepLabel(2)}</Text>
        </FadeInView>

        <FadeInView delay={80}>
          <FormField
            label="Kitchen name"
            value={kitchenName}
            onChangeText={setKitchenName}
            placeholder="e.g. Maria's Home Kitchen"
            autoCapitalize="words"
          />
        </FadeInView>

        <FadeInView delay={140} style={styles.locationGroup}>
          <Text style={T.label}>Location</Text>
          <LocationSearchInput
            variant="light"
            value={addressQuery}
            onChangeText={setAddressQuery}
            onLocationSelected={({ address, latitude, longitude }) => {
              setAddress(address);
              setCoordinates({ latitude, longitude });
              setRegion({ latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 });
            }}
            placeholder="Search your area, e.g. Indiranagar"
          />
        </FadeInView>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      onBack={() => setPage('kitchen')}
      progress={REG_PROGRESS.location}
      progressFrom={REG_PROGRESS.kitchen}
      footer={<PrimaryButton label="Continue" onPress={handleNext} loading={loading} />}
    >
      <FadeInView style={styles.section}>
        <Text style={T.screenTitle}>Kitchen Location</Text>
        <View style={styles.fieldGroup}>
          <Text style={T.label}>Pin your kitchen</Text>
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              region={region}
              onPress={(e: any) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                updateFromCoordinate(latitude, longitude);
              }}
            >
              <Marker
                coordinate={coordinates}
                draggable
                onDragEnd={(e: any) => {
                  const { latitude, longitude } = e.nativeEvent.coordinate;
                  updateFromCoordinate(latitude, longitude);
                }}
                title="Kitchen Location"
              />
            </MapView>
          </View>
        </View>
        <FormField
          label="Address"
          value={address}
          onChangeText={setAddress}
          placeholder="House no., street, area"
        />
      </FadeInView>

      <FadeInView delay={80} style={styles.section}>
        <Text style={T.screenTitle}>Kitchen Capacity</Text>
        <FormField
          label="Meals per slot"
          value={capacity}
          onChangeText={(v) => setCapacity(v.replace(/\D/g, ''))}
          keyboardType="numeric"
          right={<Text style={styles.unit}>meals / slot</Text>}
        />
      </FadeInView>

      <FadeInView delay={140} style={styles.section}>
        <Text style={T.screenTitle}>Appliances</Text>
        <Text style={T.subtitle}>Tap to select — tap again to deselect</Text>
        <View style={styles.chips}>
          {[...PRESET_APPLIANCES, ...appliances.filter(a => !PRESET_APPLIANCES.includes(a))].map(item => (
            <Chip
              key={item}
              label={toTitle(item)}
              selected={appliances.includes(item)}
              onPress={() => toggleAppliance(item)}
            />
          ))}
        </View>
        <View style={styles.addRow}>
          <TextInput
            ref={inputRef}
            style={styles.addInput}
            value={newAppliance}
            onChangeText={setNewAppliance}
            placeholder="Add another appliance"
            placeholderTextColor={C.textMuted2}
            returnKeyType="done"
            onSubmitEditing={addCustomAppliance}
          />
          <Pressable
            style={[styles.addBtn, !newAppliance.trim() && styles.addBtnDisabled]}
            onPress={addCustomAppliance}
            disabled={!newAppliance.trim()}
            hitSlop={6}
          >
            <Plus size={16} color={C.white} />
          </Pressable>
        </View>
      </FadeInView>
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  titleTight: {
    gap: 4,
  },
  locationGroup: {
    gap: 6,
    zIndex: 10,
  },
  section: {
    gap: 8,
    marginTop: 20,
  },
  fieldGroup: {
    gap: 6,
  },
  mapContainer: {
    height: 180,
    borderRadius: Radius.tile,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  unit: {
    fontFamily: F.jakartaRegular,
    fontSize: 12,
    color: C.textMuted,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  addRow: {
    height: 44,
    marginTop: 4,
    borderRadius: Radius.field,
    borderWidth: 1,
    borderColor: C.searchBorder,
    backgroundColor: C.searchBg,
    paddingLeft: 16,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addInput: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
    fontFamily: F.jakartaRegular,
    fontSize: 12,
    color: C.text,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
});
