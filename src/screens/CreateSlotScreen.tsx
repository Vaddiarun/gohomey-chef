import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, IndianRupee } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { C, F } from '../theme';
import { ActionSheet, Chip, FadeInView, FormField, KitchenHeader, PrimaryButton, UploadTile } from '../components/ui';
import type { PickedFile } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { getRequiredPrice, isPriceAboveLimit, MAX_PRICE } from '../utils/price';
import { compressImage } from '../utils/compressImage';
import { friendlyApiError } from '../utils/apiErrors';
import { isWindowClosed, MEAL_WINDOWS, MealWindow, platformFee } from '../utils/meals';
import { AvailabilityRow, FeeBreakdown } from '../components/MealFormParts';
import { KeyboardAware } from '../components/ui/KeyboardAware';

export const CreateSlotScreen = () => {
  const navigation = useNavigation<any>();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();

  const [dishTitle, setDishTitle] = useState('');
  const [dietaryType, setDietaryType] = useState<'Veg' | 'Non-Veg'>('Veg');
  const [price, setPrice] = useState('');
  const [capacity, setCapacity] = useState('10');
  const [image, setImage] = useState<PickedFile | null>(null);
  const [windows, setWindows] = useState<MealWindow[]>([]);
  const [tomorrow, setTomorrow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const parsedPrice = getRequiredPrice(price);
  const priceAboveLimit = isPriceAboveLimit(price);
  const fee = platformFee(user);

  const serviceDate = (() => {
    const d = new Date();
    if (tomorrow) d.setDate(d.getDate() + 1);
    return d;
  })();

  const toggleWindow = (id: MealWindow, on: boolean) =>
    setWindows((prev) => (on ? [...prev.filter((w) => w !== id), id] : prev.filter((w) => w !== id)));

  const onTomorrow = (on: boolean) => {
    setTomorrow(on);
    // Windows already closed for today become available again tomorrow, and vice versa.
    if (!on) {
      const today = new Date();
      setWindows((prev) => prev.filter((w) => !isWindowClosed(MEAL_WINDOWS.find((x) => x.id === w)!, today)));
    }
  };

  const pick = async (useCamera: boolean) => {
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Toast.show({
        type: 'error',
        text1: 'Permission Denied',
        text2: useCamera ? 'Camera access is needed to photograph your dish.' : 'Photo access is needed to upload your dish.',
      });
      return;
    }
    const opts = { allowsEditing: true, aspect: [4, 3] as [number, number], quality: 0.7 };
    const result = useCamera
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync({ ...opts, mediaTypes: ['images'] });
    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];
      setImage(await compressImage(asset.uri, asset.width));
    }
  };

  const handleSubmit = async () => {
    if (!dishTitle.trim() || parsedPrice === null) {
      Toast.show({
        type: 'error',
        text1: 'Missing Details',
        text2: priceAboveLimit ? `Price can't be more than ₹${MAX_PRICE}.` : 'Please add a dish name and a valid price.',
      });
      return;
    }
    const slots = parseInt(capacity, 10);
    if (!slots || slots < 1) {
      Toast.show({ type: 'error', text1: 'Number of slots', text2: 'Enter at least 1 slot.' });
      return;
    }
    if (windows.length === 0) {
      Toast.show({ type: 'error', text1: 'Availability', text2: 'Turn on at least one meal window.' });
      return;
    }

    setLoading(true);
    const failed: string[] = [];
    try {
      // One meal per enabled window — the API takes a single service_window.
      for (const w of MEAL_WINDOWS.filter((x) => windows.includes(x.id))) {
        const formData = new FormData();
        formData.append('meal_name', dishTitle.trim());
        formData.append('type', dietaryType === 'Veg' ? 'VEG' : 'NON_VEG');
        formData.append('service_window', w.id);
        formData.append('price', String(parsedPrice));
        formData.append('slots_total', String(slots));
        formData.append('date', serviceDate.toISOString());
        if (image) {
          formData.append('meal_image', { uri: image.uri, name: image.name, type: image.type } as any);
        }

        const apiUrl = `${process.env.EXPO_PUBLIC_API_URL}meals`;
        console.log('CreateMeal: POST', apiUrl, { window: w.id, price: parsedPrice, slots });
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
          body: formData,
        });
        const result = await response.json().catch(() => null);
        console.log('CreateMeal: Response', response.status, JSON.stringify(result, null, 2));
        if (!(response.ok && (result?.status === 'success' || result?.id))) {
          failed.push(w.label);
          const friendly = friendlyApiError(response.status, result, 'Could not publish this meal.');
          console.log('CreateMeal failed for', w.id, friendly.message);
        }
      }

      if (failed.length === windows.length) {
        Toast.show({ type: 'error', text1: 'Publishing failed', text2: 'Please check your connection and try again.' });
        return;
      }
      if (failed.length > 0) {
        Toast.show({ type: 'info', text1: 'Partly published', text2: `Could not publish: ${failed.join(', ')}.` });
      }
      navigation.replace('Success', { kind: 'daily' });
    } catch {
      Toast.show({ type: 'error', text1: 'Network error', text2: 'Please check your connection and try again.' });
    } finally {
      setLoading(false);
    }
  };

  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={{ paddingTop: insets.top }}>
        <KitchenHeader
          kitchenName="Add New Meal"
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
            <UploadTile tone="cream" file={image} onPress={() => setSheetOpen(true)} />
          </FadeInView>

          <FadeInView delay={60}>
            <FormField label="Name" value={dishTitle} onChangeText={setDishTitle} placeholder="e.g. Chicken Curry" autoCapitalize="words" />
          </FadeInView>

          <FadeInView delay={100} style={styles.typeRow}>
            {(['Veg', 'Non-Veg'] as const).map((t) => (
              <Chip key={t} label={t} selected={dietaryType === t} onPress={() => setDietaryType(t)} />
            ))}
          </FadeInView>

          <FadeInView delay={140}>
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

          <FadeInView delay={180}>
            <FeeBreakdown price={parsedPrice ?? 0} fee={fee} />
          </FadeInView>

          <FadeInView delay={220}>
            <FormField
              label="Enter Number of slots"
              value={capacity}
              onChangeText={(v) => setCapacity(v.replace(/\D/g, ''))}
              keyboardType="number-pad"
              placeholder="10"
            />
          </FadeInView>

          <FadeInView delay={260} style={styles.availability}>
            <Text style={styles.sectionLabel}>Availability</Text>
            {MEAL_WINDOWS.map((w) => {
              const closed = isWindowClosed(w, serviceDate);
              return (
                <AvailabilityRow
                  key={w.id}
                  title={w.label}
                  subtitle={closed ? `${w.time} · Closed for today` : `${w.time} · ${parseInt(capacity, 10) || 0} slots`}
                  value={windows.includes(w.id) && !closed}
                  onChange={(on) => toggleWindow(w.id, on)}
                  disabled={closed}
                />
              );
            })}
            <AvailabilityRow
              icon="calendar"
              title="Tomorrow"
              subtitle={`${tomorrow ? 'Serving on' : 'Serve on'} ${tomorrowDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`}
              value={tomorrow}
              onChange={onTomorrow}
            />
          </FadeInView>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          <PrimaryButton label="Publish" onPress={handleSubmit} loading={loading} />
        </View>
      </KeyboardAware>

      <ActionSheet
        visible={sheetOpen}
        title="Meal photo"
        subtitle="Add a bright, appetising photo of the dish"
        options={[
          { label: 'Take Photo', description: 'Use your camera', icon: Camera, onPress: () => pick(true) },
          { label: 'Choose from Gallery', description: 'JPG or PNG from your phone', icon: ImageIcon, onPress: () => pick(false) },
        ]}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 32,
    gap: 16,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: -6,
  },
  error: {
    fontFamily: F.jakartaSemiBold,
    fontSize: 11,
    color: C.danger,
    marginTop: 4,
  },
  availability: {
    gap: 16,
    marginTop: 17,
  },
  sectionLabel: {
    fontFamily: F.jakartaBold,
    fontSize: 11,
    lineHeight: 16.5,
    color: C.textMuted,
    marginBottom: -10,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: C.bg,
  },
});
