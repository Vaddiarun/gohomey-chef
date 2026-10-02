import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { Calendar, Camera, Clock, Image as ImageIcon, IndianRupee } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { C, F, Radius } from '../theme';
import { ActionSheet, FadeInView, FormField, KitchenHeader, PrimaryButton, Toggle, UploadTile } from '../components/ui';
import type { PickedFile } from '../components/ui';
import MapView, { Marker, Region } from '../components/PlatformMap';
import { LocationSearchInput } from '../components/LocationSearchInput';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import { getRequiredPrice, isPriceAboveLimit, MAX_PRICE } from '../utils/price';
import { compressImage } from '../utils/compressImage';
import { KeyboardAware } from '../components/ui/KeyboardAware';
import { errorText } from '../utils/apiErrors';

const uploadImageToCloudinary = async (imageUri: string) => {
  const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    return null;
  }

  const filename = imageUri.split('/').pop() || `social_event_${Date.now()}.jpg`;
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';
  const formData = new FormData();

  formData.append('file', {
    uri: imageUri,
    name: filename,
    type,
  } as any);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', 'homey/social-events');

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.secure_url) {
    throw new Error(result.error?.message || 'Failed to upload social image');
  }

  return result.secure_url as string;
};

const formatReverse = (a: Location.LocationGeocodedAddress) =>
  `${a.name || ''} ${a.street || ''}, ${a.city || ''}, ${a.region || ''}`.trim().replace(/^ ,/, '');

type PickerTarget = 'date' | 'start' | 'end' | null;

/** Pressable field that opens a native date/time picker (Figma "Date" / "Start Time"). */
const PickerField = ({ label, value, placeholder, icon, onPress }: { label: string; value?: string; placeholder: string; icon: React.ReactNode; onPress: () => void }) => (
  <View style={styles.group}>
    <Text style={styles.label}>{label}</Text>
    <Pressable style={styles.box} onPress={onPress}>
      {icon}
      <Text style={[styles.boxText, !value && styles.boxPlaceholder]}>{value || placeholder}</Text>
    </Pressable>
  </View>
);

/** Add Social Table (Figma 76:14267). Creates via the existing POST social. */
export const CreateEventScreen = ({ navigation }: any) => {
  const { createEvent } = useSocial();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [caption, setCaption] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [maleSlots, setMaleSlots] = useState('5');
  const [femaleSlots, setFemaleSlots] = useState('5');
  const [socialBalance, setSocialBalance] = useState(true);
  const [image, setImage] = useState<PickedFile | null>(null);
  const [day, setDay] = useState<Date | null>(null);
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);
  const [picker, setPicker] = useState<PickerTarget>(null);
  const [location, setLocation] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [coordinates, setCoordinates] = useState({ latitude: 19.076, longitude: 72.8777 });
  const [region, setRegion] = useState<Region>({ latitude: 19.076, longitude: 72.8777, latitudeDelta: 0.05, longitudeDelta: 0.05 });
  const [photoSheet, setPhotoSheet] = useState(false);
  const [loading, setLoading] = useState(false);

  const parsedPrice = getRequiredPrice(price);
  const priceAboveLimit = isPriceAboveLimit(price);

  const pick = async (useCamera: boolean) => {
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'Allow access to add a cover photo.' });
      return;
    }
    const opts = { allowsEditing: true, aspect: [16, 9] as [number, number], quality: 0.8 };
    const result = useCamera
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync({ ...opts, mediaTypes: ['images'] });
    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];
      setImage(await compressImage(asset.uri, asset.width));
    }
  };

  const setFromCoordinate = (latitude: number, longitude: number) => {
    setCoordinates({ latitude, longitude });
    setRegion((r) => ({ ...r, latitude, longitude }));
    Location.reverseGeocodeAsync({ latitude, longitude }).then((r) => {
      if (r.length > 0) {
        const f = formatReverse(r[0]);
        setLocation(f);
        setLocationQuery(f);
      }
    });
  };

  const combine = (d: Date, t: Date) => {
    const out = new Date(d);
    out.setHours(t.getHours(), t.getMinutes(), 0, 0);
    return out;
  };

  const handleSave = async () => {
    if (!caption.trim() || !description.trim() || !location.trim() || parsedPrice === null) {
      Toast.show({
        type: 'error',
        text1: 'Missing Details',
        text2: priceAboveLimit ? `Price can't be more than ₹${MAX_PRICE}.` : 'Please add a caption, description, price and location.',
      });
      return;
    }
    if (!day || !start || !end) {
      Toast.show({ type: 'error', text1: 'Date & time', text2: 'Pick the date, start time and end time.' });
      return;
    }
    const startDate = combine(day, start);
    const endDate = combine(day, end);
    if (endDate <= startDate) endDate.setDate(endDate.getDate() + 1); // runs past midnight
    if (startDate.getTime() < Date.now()) {
      Toast.show({ type: 'error', text1: 'Start time', text2: 'The start time has already passed.' });
      return;
    }
    const slotsTotal = (parseInt(maleSlots, 10) || 0) + (parseInt(femaleSlots, 10) || 0);
    if (slotsTotal < 1) {
      Toast.show({ type: 'error', text1: 'Slot distribution', text2: 'Add at least one seat.' });
      return;
    }

    setLoading(true);
    try {
      let imageUrlToSend = '';
      if (image) {
        const uploadedUrl = await uploadImageToCloudinary(image.uri);
        imageUrlToSend = uploadedUrl || user?.kitchen_photo_url || '';
        if (!uploadedUrl && imageUrlToSend) {
          console.log('Cloudinary upload env missing; using chef kitchen_photo_url for social image_url');
        }
      }

      const eventData = {
        title: caption.trim(),
        description: description.trim(),
        date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        location: location.trim(),
        price: parsedPrice,
        slots_total: slotsTotal,
        social_balance: socialBalance,
        image_url: imageUrlToSend,
      };
      console.log('Sending Event Data:', JSON.stringify(eventData, null, 2));
      const success = await createEvent(eventData);
      if (success) {
        navigation.replace('Success', { kind: 'social' });
      } else {
        Toast.show({ type: 'error', text1: 'Publishing failed', text2: 'Could not create the Social Table. Please try again.' });
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Upload failed', text2: errorText(err, 'Please try again.') });
    } finally {
      setLoading(false);
    }
  };

  const pickerValue = picker === 'date' ? day ?? new Date() : picker === 'start' ? start ?? new Date() : end ?? start ?? new Date();

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={{ paddingTop: insets.top }}>
        <KitchenHeader
          kitchenName="Add Social Table"
          subtitle="GoHomeyy Chef"
          ownerName={user?.name}
          onBack={() => navigation.goBack()}
          onWallet={() => navigation.navigate('Wallet')}
          onProfile={() => navigation.navigate('Profile')}
        />
      </View>

      <KeyboardAware style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <FadeInView>
            <UploadTile tone="cream" icon="coral" file={image} onPress={() => setPhotoSheet(true)} />
          </FadeInView>

          <FadeInView delay={50}>
            <FormField label="Caption" value={caption} onChangeText={setCaption} placeholder="Fresh lunch is ready for tomorrow ✦" />
          </FadeInView>
          <FadeInView delay={90}>
            <FormField
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="What guests should expect"
              multiline
              style={styles.multiline}
            />
          </FadeInView>
          <FadeInView delay={130}>
            <FormField
              label="Base price"
              value={price}
              onChangeText={(v) => setPrice(v.replace(/[^\d.]/g, ''))}
              placeholder="220"
              keyboardType="numeric"
              icon={<IndianRupee size={16} color={C.iconMuted} strokeWidth={1.33} />}
            />
            {priceAboveLimit && <Text style={styles.error}>Price can't be more than ₹{MAX_PRICE}.</Text>}
          </FadeInView>

          <FadeInView delay={170} style={styles.group}>
            <Text style={styles.label}>Slot Distribution</Text>
            <View style={styles.slotCard}>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <FormField label="Male" value={maleSlots} onChangeText={(v) => setMaleSlots(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="Enter Number" />
                </View>
                <View style={styles.flex}>
                  <FormField label="Female" value={femaleSlots} onChangeText={(v) => setFemaleSlots(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="Enter Number" />
                </View>
              </View>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceText}>Maintain social Balance</Text>
                <Toggle value={socialBalance} onValueChange={setSocialBalance} activeColor="#E64611" />
              </View>
            </View>
          </FadeInView>

          <FadeInView delay={210}>
            <PickerField
              label="Date"
              value={day ? format(day, 'EEE, d MMM yyyy') : undefined}
              placeholder="Select Date"
              icon={<Calendar size={16} color={C.textStrong} strokeWidth={1.33} />}
              onPress={() => setPicker('date')}
            />
          </FadeInView>
          <FadeInView delay={250} style={styles.row}>
            <View style={styles.flex}>
              <PickerField label="Start Time" value={start ? format(start, 'h:mm a') : undefined} placeholder="Enter Time" icon={<Clock size={16} color={C.textStrong} strokeWidth={1.33} />} onPress={() => setPicker('start')} />
            </View>
            <View style={styles.flex}>
              <PickerField label="End Time" value={end ? format(end, 'h:mm a') : undefined} placeholder="Enter Time" icon={<Clock size={16} color={C.textStrong} strokeWidth={1.33} />} onPress={() => setPicker('end')} />
            </View>
          </FadeInView>

          <FadeInView delay={290} style={[styles.group, { zIndex: 10 }]}>
            <Text style={styles.label}>Add Location</Text>
            <LocationSearchInput
              variant="light"
              value={locationQuery}
              onChangeText={setLocationQuery}
              onLocationSelected={({ address, latitude, longitude }) => {
                setLocation(address);
                setCoordinates({ latitude, longitude });
                setRegion({ latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 });
              }}
              placeholder="Search options"
            />
            <View style={styles.map}>
              <MapView
                style={StyleSheet.absoluteFill}
                region={region}
                onPress={(e: any) => setFromCoordinate(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)}
              >
                <Marker
                  coordinate={coordinates}
                  draggable
                  onDragEnd={(e: any) => setFromCoordinate(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)}
                  title="Social Table"
                />
              </MapView>
            </View>
          </FadeInView>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          <PrimaryButton label="Publish" onPress={handleSave} loading={loading} />
        </View>
      </KeyboardAware>

      {picker && (
        <DateTimePicker
          value={pickerValue}
          mode={picker === 'date' ? 'date' : 'time'}
          display="default"
          minimumDate={picker === 'date' ? new Date() : undefined}
          onChange={(_, selected) => {
            const target = picker;
            setPicker(null);
            if (!selected) return;
            if (target === 'date') setDay(selected);
            else if (target === 'start') setStart(selected);
            else setEnd(selected);
          }}
        />
      )}

      <ActionSheet
        visible={photoSheet}
        title="Cover photo"
        subtitle="Show guests the table, the food or the venue"
        options={[
          { label: 'Take Photo', description: 'Use your camera', icon: Camera, onPress: () => pick(true) },
          { label: 'Choose from Gallery', description: 'JPG or PNG from your phone', icon: ImageIcon, onPress: () => pick(false) },
        ]}
        onClose={() => setPhotoSheet(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 1, paddingBottom: 32, gap: 15 },
  row: { flexDirection: 'row', gap: 16 },
  group: { gap: 6 },
  label: { fontFamily: F.jakartaBold, fontSize: 11, lineHeight: 16.5, color: C.textMuted },
  box: {
    height: 52,
    borderRadius: Radius.field,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  boxText: { fontFamily: F.jakartaSemiBold, fontSize: 13, color: C.textStrong },
  boxPlaceholder: { color: C.textStrong },
  multiline: { paddingTop: 0, textAlignVertical: 'center' },
  error: { fontFamily: F.jakartaSemiBold, fontSize: 11, color: C.danger, marginTop: 4 },
  slotCard: { backgroundColor: C.surface, borderRadius: Radius.field, padding: 15, gap: 8 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 33 },
  balanceText: { fontFamily: F.interBold, fontSize: 12, lineHeight: 22.5, color: C.textInk },
  map: { height: 174, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: C.bg },
});
