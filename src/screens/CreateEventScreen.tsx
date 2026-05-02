import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
  Image
} from 'react-native';
import { MapPin, Calendar, Clock, ChevronLeft, Info, Camera, Users } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '../theme';
import { useSocial } from '../context/SocialContext';
import MapView, { Marker, Region } from '../components/PlatformMap';
import { LocationSearchInput } from '../components/LocationSearchInput';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';

export const CreateEventScreen = ({ navigation }: any) => {
  const { createEvent } = useSocial();
  const [loading, setLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString());
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('0');
  const [maleSlots, setMaleSlots] = useState('5');
  const [femaleSlots, setFemaleSlots] = useState('5');
  const [socialBalance, setSocialBalance] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [region, setRegion] = useState<Region>({
    latitude: 19.0760,
    longitude: 72.8777,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [coordinates, setCoordinates] = useState({
    latitude: 19.0760,
    longitude: 72.8777,
  });


  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUrl(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!title || !description || !location) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);

    const startDate = new Date(date);
    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 3);

    const eventData = {
      title,
      description,
      date,
      end_date: endDate.toISOString(),
      location,
      price: parseFloat(price) || 0,
      slots_total: parseInt(maleSlots) + parseInt(femaleSlots) || 10,
      social_balance: socialBalance,
      image_url: imageUrl,
    };

    console.log('Sending Event Data:', JSON.stringify(eventData, null, 2));
    const success = await createEvent(eventData);
    setLoading(false);

    if (success) {
      Alert.alert('Success', 'Social event created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } else {
      Alert.alert('Error', 'Failed to create event. Please try again.');
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.form}>
        {/* Image Picker */}
        <TouchableOpacity 
          style={styles.imagePicker} 
          onPress={handlePickImage}
          activeOpacity={0.7}
        >
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.pickedImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Camera size={32} color={Colors.textSecondary} />
              <Text style={styles.imagePlaceholderText}>Add Event Cover Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Basic Info */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Event Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Backyard BBQ Night"
            placeholderTextColor={Colors.textSecondary}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Tell participants what to expect..."
            placeholderTextColor={Colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity style={styles.pickerTrigger} onPress={() => setShowDatePicker(true)}>
              <Calendar size={18} color={Colors.primary} />
              <Text style={styles.pickerValue}>{new Date(date).toLocaleDateString()}</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: Spacing.md }]}>
            <Text style={styles.label}>Time</Text>
            <TouchableOpacity style={styles.pickerTrigger} onPress={() => setShowTimePicker(true)}>
              <Clock size={18} color={Colors.primary} />
              <Text style={styles.pickerValue}>
                {new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Price (₹)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
          />
        </View>

        {/* Slots Distribution */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Slot Distribution</Text>
          </View>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Male Slots</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={maleSlots}
                onChangeText={setMaleSlots}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: Spacing.md }]}>
              <Text style={styles.label}>Female Slots</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={femaleSlots}
                onChangeText={setFemaleSlots}
              />
            </View>
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Maintain Social Balance</Text>
              <Text style={styles.switchSubLabel}>Ensure equal gender participation</Text>
            </View>
            <Switch
              value={socialBalance}
              onValueChange={setSocialBalance}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Platform.OS === 'ios' ? '#fff' : socialBalance ? Colors.primaryDark : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Location */}
        <View style={styles.inputGroup}>
          <View style={styles.sectionHeader}>
            <MapPin size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Location Selection</Text>
          </View>
          
          <Text style={styles.label}>Search Location *</Text>
          <LocationSearchInput
            value={location}
            onChangeText={setLocation}
            onLocationSelected={({ address, latitude, longitude }) => {
              setLocation(address);
              setCoordinates({ latitude, longitude });
              setRegion({ latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 });
            }}
            placeholder="Search for a place..."
          />

          <View style={styles.mapSelectionContainer}>
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
                    setLocation(`${a.name || ''} ${a.street || ''}, ${a.city || ''}, ${a.region || ''}`.replace(/^ , /, '').trim());
                  }
                }).catch(() => {});
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
                      setLocation(`${a.name || ''} ${a.street || ''}, ${a.city || ''}, ${a.region || ''}`.replace(/^ , /, '').trim());
                    }
                  }).catch(() => {});
                }}
              />
            </MapView>
            <View style={styles.mapOverlay}>
              <Text style={styles.mapHint}>Tap on map or drag marker to set location</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.submitBtn}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.background} />
          ) : (
            <Text style={styles.submitBtnText}>Publish Event</Text>
          )}
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={new Date(date)}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                const currentDate = new Date(date);
                currentDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                setDate(currentDate.toISOString());
              }
            }}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={new Date(date)}
            mode="time"
            display="default"
            onChange={(event, selectedDate) => {
              setShowTimePicker(false);
              if (selectedDate) {
                const currentDate = new Date(date);
                currentDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
                setDate(currentDate.toISOString());
              }
            }}
          />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  form: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  imagePicker: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  pickedImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
  },
  imagePlaceholderText: {
    ...Typography.caption,
    marginTop: 8,
    color: Colors.textSecondary,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: Colors.surface,
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 16,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
  },
  row: {
    flexDirection: 'row',
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pickerValue: {
    color: Colors.text,
    marginLeft: 8,
  },
  section: {
    backgroundColor: Colors.surface + '40',
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h3,
    marginLeft: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  switchLabel: {
    ...Typography.body,
    fontWeight: '600',
  },
  switchSubLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  mapSelectionContainer: {
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: 4,
  },
  mapHint: {
    color: '#fff',
    fontSize: 10,
    textAlign: 'center',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  submitBtnText: {
    color: Colors.background,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
