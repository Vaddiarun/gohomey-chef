import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '../theme';
import {
  ChevronLeft,
  MapPin,
  Utensils,
  ArrowRight,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import MapView, { Marker, Region } from '../components/PlatformMap';
import { LocationSearchInput } from '../components/LocationSearchInput';
import * as Location from 'expo-location';

export const RegisterStep2 = ({ navigation, route }: any) => {
  const [kitchenName, setKitchenName] = useState('');
  const [capacity, setCapacity] = useState('12');
  const [appliances, setAppliances] = useState(['SOUS-VIDE', 'CONVECTION']);
  const [loading, setLoading] = useState(false);

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

  const handleNext = async () => {
    if (!kitchenName || !capacity) {
      Toast.show({
        type: 'error',
        text1: 'Missing Fields',
        text2: 'Please fill out all the fields.',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}chefs/register/step-2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        credentials: 'include',
        body: JSON.stringify({
          kitchen_name: kitchenName,
          kitchen_address: address,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          max_capacity: parseInt(capacity) || 0,
          appliances: appliances
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('Step 2 API Failed. Status:', response.status);
        console.log('Error Data:', JSON.stringify(errorData, null, 2));
        throw new Error(errorData.message || `Failed to submit Step 2 (Status: ${response.status})`);
      }

      console.log('Step 2 API Success');
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
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.introSection}>
            <Text style={styles.subtitle}>WORKSPACE PROFILE</Text>
            <Text style={styles.title}>Your Kitchen Space</Text>
            <Text style={styles.description}>
              Tell us about where the magic happens. Your kitchen details help clients trust your craft.
            </Text>
          </View>

          <View style={styles.form}>
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>APPLIANCES</Text>
              <View style={styles.tagContainer}>
                {appliances.map((item) => (
                  <View key={item} style={styles.tag}>
                    <Text style={styles.tagText}>{item}</Text>
                  </View>
                ))}
                <TouchableOpacity style={styles.addTagBtn}>
                  <Text style={styles.addTagText}>+ ADD</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

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
                  <ArrowRight size={18} color={Colors.background} style={styles.nextIcon} />
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
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.2)',
  },
  tagText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  addTagBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  addTagText: {
    color: Colors.background,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
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
  nextIcon: {
    marginLeft: 8,
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
