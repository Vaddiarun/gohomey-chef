import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { Boxes, Camera, Check, Image as ImageIcon, IndianRupee, Package, Trash2 } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { C, F, Radius } from '../theme';
import { ActionSheet, Chip, FadeInView, FormField, KitchenHeader, PressableScale, PrimaryButton, UploadTile } from '../components/ui';
import type { PickedFile } from '../components/ui';
import { FeeBreakdown } from '../components/MealFormParts';
import { useAuth } from '../context/AuthContext';
import { getRequiredPrice, isPriceAboveLimit, MAX_PRICE } from '../utils/price';
import { compressImage } from '../utils/compressImage';
import { friendlyApiError } from '../utils/apiErrors';
import { resolveBackendMediaUrl } from '../utils/media';
import { platformFee } from '../utils/meals';
import type { PantryItem } from './PantryScreen';
import { KeyboardAware } from '../components/ui/KeyboardAware';

type UnitType = 'ITEM' | 'CONTAINER';

/** Backend limit for pieces_per_unit. */
const MAX_PIECES = 100;

const UNIT_OPTIONS: { key: UnitType; title: string; sub: string; Icon: typeof Package }[] = [
  { key: 'ITEM', title: 'Each item', sub: 'Price per piece', Icon: Package },
  { key: 'CONTAINER', title: 'Container', sub: 'Price per pack', Icon: Boxes },
];

// Figma chips (76:14206); any other category can be typed in the field above them.
const CATEGORIES = ['Indian', 'Asian', 'Continental', 'Healthy', 'Comfort Food', 'Desserts'];

/** Add / edit pantry item (Figma "New pANTRY mneu" 76:14162 and "Edit pantry mneu" 76:14400). */
export const AddPantryItemScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const editItem: PantryItem | undefined = route.params?.item;
  const isEditing = !!editItem;

  const [name, setName] = useState(editItem?.name || '');
  const [category, setCategory] = useState(editItem?.category || '');
  const [price, setPrice] = useState(editItem?.price?.toString() || '');
  const [inventory, setInventory] = useState(String(editItem?.inventory ?? 10));
  const [unitType, setUnitType] = useState<UnitType>(String(editItem?.unit_type).toUpperCase() === 'CONTAINER' ? 'CONTAINER' : 'ITEM');
  const [piecesPerUnit, setPiecesPerUnit] = useState(editItem?.pieces_per_unit ? String(editItem.pieces_per_unit) : '');
  const [image, setImage] = useState<PickedFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [photoSheet, setPhotoSheet] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const parsedPrice = getRequiredPrice(price);
  const isContainer = unitType === 'CONTAINER';
  const scrollRef = useRef<ScrollView>(null);
  // Keep the last fields visible above the keyboard once it has opened.
  const revealBottom = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250);
  const pieceCount = parseInt(piecesPerUnit, 10) || 0;
  const priceAboveLimit = isPriceAboveLimit(price);
  const existingImage = editItem?.image_url || null;

  const pick = async (useCamera: boolean) => {
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Toast.show({ type: 'error', text1: 'Permission Denied', text2: useCamera ? 'Camera access is needed to take a photo.' : 'Photo access is needed to upload an image.' });
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
    const units = parseInt(inventory, 10);
    if (!name.trim() || !category.trim() || parsedPrice === null) {
      Toast.show({
        type: 'error',
        text1: 'Missing Details',
        text2: priceAboveLimit ? `Price can't be more than ₹${MAX_PRICE}.` : 'Please add a name, category and a valid price.',
      });
      return;
    }
    if (isNaN(units) || units < 0) {
      Toast.show({ type: 'error', text1: 'Available units', text2: 'Enter how many units you have in stock.' });
      return;
    }
    const pieces = parseInt(piecesPerUnit, 10);
    if (unitType === 'CONTAINER' && (isNaN(pieces) || pieces < 1 || pieces > MAX_PIECES)) {
      Toast.show({ type: 'error', text1: 'Pieces per container', text2: `Enter between 1 and ${MAX_PIECES} pieces per container.` });
      return;
    }

    setLoading(true);
    try {
      const url = isEditing
        ? `${process.env.EXPO_PUBLIC_API_URL}pantry/${editItem!.id}`
        : `${process.env.EXPO_PUBLIC_API_URL}pantry`;
      const method = isEditing ? 'PATCH' : 'POST';
      const headers: Record<string, string> = { Authorization: `Bearer ${token}`, Accept: 'application/json' };

      // Pantry unit fields (new). Sent with every save; if the server does not
      // accept them yet, the save is retried without them so it never blocks.
      const unitFields: Record<string, string | number> = {
        unit_type: unitType,
        pieces_per_unit: unitType === 'CONTAINER' ? pieces : 1,
      };

      const send = async (withUnits: boolean) => {
        const fields: Record<string, string | number> = {
          name: name.trim(),
          category: category.trim(),
          price: parsedPrice,
          inventory: units,
          ...(withUnits ? unitFields : {}),
        };
        const reqHeaders = { ...headers };
        let body: BodyInit;
        // Multipart only when a new photo was picked; otherwise JSON (same as before).
        if (image) {
          const formData = new FormData();
          Object.entries(fields).forEach(([k, v]) => formData.append(k, String(v)));
          formData.append('image', { uri: image.uri, name: image.name, type: image.type } as any);
          body = formData;
        } else {
          reqHeaders['Content-Type'] = 'application/json';
          body = JSON.stringify(existingImage ? { ...fields, image_url: existingImage } : fields);
        }
        console.log('Pantry API Request:', method, url, fields);
        const res = await fetch(url, { method, headers: reqHeaders, credentials: 'include', body });
        const json = await res.json().catch(() => ({}));
        console.log('Pantry API Response:', res.status, JSON.stringify(json, null, 2));
        return { res, json };
      };

      let { res: response, json: result } = await send(true);
      // Only for a server that predates container support (field rejected as
      // unknown). Real validation errors (e.g. "pieces_per_unit must be at most
      // 100") must reach the chef, not be silently retried as a single item.
      const rejectedUnitFields =
        (response.status === 400 || response.status === 422) &&
        /(unit_type|pieces_per_unit)[^"]*(should not exist|not allowed|unknown|unrecognized)/i.test(JSON.stringify(result));
      if (rejectedUnitFields) {
        ({ res: response, json: result } = await send(false));
        if (response.ok && unitType === 'CONTAINER') {
          Toast.show({ type: 'info', text1: 'Saved without pack size', text2: 'Container details will show once the server supports them.' });
        }
      }

      if (!response.ok) {
        // Backend pantry validation (400) and the unit_type lock (409) send
        // chef-readable messages — show them as-is.
        const serverMessage = typeof result?.message === 'string' ? result.message : undefined;
        const message =
          (response.status === 400 || response.status === 409) && serverMessage
            ? serverMessage
            : friendlyApiError(response.status, result, `Could not ${isEditing ? 'update' : 'add'} this item.`).message;
        Toast.show({ type: 'error', text1: isEditing ? 'Update failed' : 'Publishing failed', text2: message });
        return;
      }
      if (isEditing) {
        Toast.show({ type: 'success', text1: 'Item updated', text2: `${name.trim()} has been saved.` });
        navigation.goBack();
      } else {
        navigation.replace('Success', { kind: 'pantry' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Network error', text2: 'Please check your connection and try again.' });
    } finally {
      setLoading(false);
    }
  };

  const performDelete = async () => {
    if (!editItem) return;
    setDeleting(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}pantry/${editItem.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        console.log('Pantry delete error:', response.status, await response.text());
        throw new Error();
      }
      Toast.show({ type: 'success', text1: 'Item removed', text2: `${editItem.name} is no longer in your pantry.` });
      navigation.goBack();
    } catch {
      Toast.show({ type: 'error', text1: 'Delete failed', text2: 'Could not remove the item. Please try again.' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={{ paddingTop: insets.top }}>
        <KitchenHeader
          kitchenName={isEditing ? 'Edit Item' : 'Add New Item'}
          subtitle="GoHomeyy Chef"
          ownerName={user?.name}
          onBack={() => navigation.goBack()}
          onWallet={() => navigation.navigate('Wallet')}
          onProfile={() => navigation.navigate('Profile')}
        />
      </View>

      {/* Edge-to-edge Android doesn't resize the window for the keyboard, so pad on both platforms. */}
      <KeyboardAware style={styles.flex}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <FadeInView>
            <UploadTile tone="cream" icon="coral" file={image} previewUri={resolveBackendMediaUrl(existingImage)} onPress={() => setPhotoSheet(true)} />
          </FadeInView>

          <View style={styles.fields}>
            <FadeInView delay={60}>
              <FormField label="Name" value={name} onChangeText={setName} placeholder="e.g. Mango Pickle" autoCapitalize="words" />
            </FadeInView>

            <FadeInView delay={100} style={styles.categoryBlock}>
              <View style={styles.categoryBox}>
                <TextInput
                  value={category}
                  onChangeText={setCategory}
                  placeholder="Enter Category"
                  placeholderTextColor={C.textStrong}
                  style={styles.categoryInput}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.chips}>
                {CATEGORIES.map((c) => (
                  <Chip key={c} label={c} selected={category.trim().toLowerCase() === c.toLowerCase()} onPress={() => setCategory(c)} />
                ))}
              </View>
            </FadeInView>

            {/* 1. How is it sold? Everything below adapts to this choice. */}
            <FadeInView delay={140} style={styles.unitsWrap}>
              <Text style={styles.label}>Sold as</Text>
              <View style={styles.segment}>
                {UNIT_OPTIONS.map((o) => {
                  const active = unitType === o.key;
                  return (
                    <PressableScale key={o.key} style={[styles.segmentItem, active && styles.segmentActive]} onPress={() => setUnitType(o.key)} pressedScale={0.97}>
                      <View style={[styles.segmentIcon, active && styles.segmentIconActive]}>
                        <o.Icon size={18} color={active ? C.white : C.textMuted} strokeWidth={1.67} />
                      </View>
                      <Text style={[styles.segmentTitle, active && { color: C.primary }]}>{o.title}</Text>
                      <Text style={styles.segmentSub}>{o.sub}</Text>
                      {active && (
                        <View style={styles.segmentCheck}>
                          <Check size={10} color={C.white} strokeWidth={3} />
                        </View>
                      )}
                    </PressableScale>
                  );
                })}
              </View>
            </FadeInView>

            {/* 2. Container size (container only). */}
            {isContainer && (
              <FadeInView offset={8} style={styles.unitsWrap}>
                <FormField
                  label="Pieces in one container"
                  value={piecesPerUnit}
                  onChangeText={(v) => setPiecesPerUnit(v.replace(/\D/g, '').slice(0, 3))}
                  keyboardType="number-pad"
                  placeholder="e.g. 6"
                  icon={<Boxes size={16} color={C.iconMuted} strokeWidth={1.33} />}
                  right={<Text style={styles.unit}>pieces</Text>}
                />
              </FadeInView>
            )}

            {/* 3. Price — per item, or total for the whole container. */}
            <FadeInView delay={180}>
              <FormField
                label={isContainer ? 'Total price per container' : 'Price per item'}
                value={price}
                onChangeText={(v) => setPrice(v.replace(/[^\d.]/g, ''))}
                placeholder={isContainer ? 'e.g. 220 for the whole container' : 'e.g. 40'}
                keyboardType="numeric"
                icon={<IndianRupee size={16} color={C.iconMuted} strokeWidth={1.33} />}
                right={<Text style={styles.unit}>{isContainer ? '/ container' : '/ item'}</Text>}
              />
              {priceAboveLimit && <Text style={styles.error}>Price can't be more than ₹{MAX_PRICE}.</Text>}
            </FadeInView>

            {isContainer && !!parsedPrice && pieceCount > 0 && (
              <FadeInView offset={6} style={styles.summary}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{pieceCount}</Text>
                  <Text style={styles.summaryLabel}>pieces / container</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>₹{parsedPrice}</Text>
                  <Text style={styles.summaryLabel}>per container</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>₹{(parsedPrice / pieceCount).toFixed(2)}</Text>
                  <Text style={styles.summaryLabel}>per piece</Text>
                </View>
              </FadeInView>
            )}

            <FadeInView delay={200} style={styles.feeWrap}>
              <FeeBreakdown price={parsedPrice ?? 0} fee={platformFee(user)} />
            </FadeInView>

            {/* 4. Stock, counted in sellable units. */}
            <FadeInView delay={220} style={styles.unitsWrap}>
              <FormField
                label={isContainer ? 'Containers in stock' : 'Items in stock'}
                value={inventory}
                onChangeText={(v) => setInventory(v.replace(/\D/g, ''))}
                keyboardType="number-pad"
                placeholder="10"
                selectTextOnFocus
                onFocus={revealBottom}
                right={<Text style={styles.unit}>{isContainer ? 'containers' : 'items'}</Text>}
              />
            </FadeInView>

            {isEditing && (
              <FadeInView delay={260}>
                <PressableScale style={styles.remove} onPress={() => setConfirmDelete(true)} disabled={deleting}>
                  <Trash2 size={15} color={C.danger} />
                  <Text style={styles.removeText}>{deleting ? 'Removing…' : 'Remove item'}</Text>
                </PressableScale>
              </FadeInView>
            )}
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          <PrimaryButton label={isEditing ? 'Save' : 'Publish'} onPress={handleSubmit} loading={loading} />
        </View>
      </KeyboardAware>

      <ActionSheet
        visible={photoSheet}
        title="Item photo"
        subtitle="Add a clear photo of the product"
        options={[
          { label: 'Take Photo', description: 'Use your camera', icon: Camera, onPress: () => pick(true) },
          { label: 'Choose from Gallery', description: 'JPG or PNG from your phone', icon: ImageIcon, onPress: () => pick(false) },
        ]}
        onClose={() => setPhotoSheet(false)}
      />
      <ActionSheet
        visible={confirmDelete}
        title="Remove this item?"
        subtitle="Customers won't be able to order it any more."
        options={[{ label: 'Yes, remove item', description: editItem?.name, icon: Trash2, onPress: performDelete }]}
        onClose={() => setConfirmDelete(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 1, paddingBottom: 32, gap: 15 },
  fields: { gap: 12, marginHorizontal: -5 },
  categoryBlock: { gap: 16, marginTop: 4 },
  categoryBox: {
    height: 52,
    borderRadius: Radius.field,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  categoryInput: { height: '100%', paddingVertical: 0, fontFamily: F.jakartaSemiBold, fontSize: 13, color: C.textStrong },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  error: { fontFamily: F.jakartaSemiBold, fontSize: 11, color: C.danger, marginTop: 4 },
  feeWrap: { paddingHorizontal: 7 },
  unitsWrap: { paddingHorizontal: 8, gap: 10 },
  label: { fontFamily: F.jakartaBold, fontSize: 11, lineHeight: 16.5, color: C.textMuted },
  segment: { flexDirection: 'row', gap: 10 },
  segmentItem: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 2,
    padding: 12,
    borderRadius: Radius.field,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  segmentActive: { borderColor: C.primary, backgroundColor: '#FFF5ED' },
  segmentIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#F1F1F4', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  segmentIconActive: { backgroundColor: C.primary },
  segmentTitle: { fontFamily: F.jakartaBold, fontSize: 13, color: C.textStrong },
  segmentSub: { fontFamily: F.jakartaRegular, fontSize: 11, color: C.textMuted },
  segmentCheck: { position: 'absolute', top: 10, right: 10, width: 18, height: 18, borderRadius: 9, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  unit: { fontFamily: F.jakartaSemiBold, fontSize: 11, color: C.textMuted },
  summary: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.softOrange, borderRadius: 14, paddingVertical: 12, marginHorizontal: 8 },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryValue: { fontFamily: F.jakartaBold, fontSize: 15, color: C.primary },
  summaryLabel: { fontFamily: F.jakartaSemiBold, fontSize: 10, color: C.textMuted },
  summaryDivider: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(252,65,0,0.18)' },
  remove: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  removeText: { fontFamily: F.jakartaBold, fontSize: 13, color: C.danger },
  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: C.bg },
});
