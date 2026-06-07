import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Colors, Spacing, Typography } from '../theme';
import { ChefTip } from '../components/ChefTip';
import { StatusModal } from '../components/StatusModal';
import { Plus, Minus, Camera, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { getRequiredPrice, isPriceAboveLimit, MAX_PRICE } from '../utils/price';

type RouteParams = {
  AddPantryItem: {
    item?: {
      id: string;
      name: string;
      category: string;
      price: number;
      inventory: number;
      image_url?: string;
    };
  };
};

const CATEGORIES = ['Vegetables', 'Spices', 'Dairy', 'Grains', 'Meat', 'Other'];
const isLocalFileUri = (uri?: string | null) => typeof uri === 'string' && uri.startsWith('file://');

const getImageFile = (uri: string) => {
  const filename = uri.split('/').pop() || `pantry_${Date.now()}.jpg`;
  const extension = /\.(\w+)$/.exec(filename)?.[1]?.toLowerCase();
  const type = extension ? `image/${extension === 'jpg' ? 'jpeg' : extension}` : 'image/jpeg';

  return {
    uri,
    name: filename,
    type,
  };
};

const shellQuote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;

const buildPantryCurl = (
  url: string,
  method: string,
  token: string | null | undefined,
  values: {
    name: string;
    category: string;
    price: number;
    inventory: number;
    image?: ReturnType<typeof getImageFile> | null;
    imageUrl?: string | null;
  }
) => {
  const base = [
    `curl -X ${method}`,
    shellQuote(url),
    "-H 'Accept: application/json'",
    token ? `-H ${shellQuote(`Authorization: Bearer ${token}`)}` : '',
  ];

  if (values.image) {
    return [
      ...base,
      `-F ${shellQuote(`name=${values.name}`)}`,
      `-F ${shellQuote(`category=${values.category}`)}`,
      `-F ${shellQuote(`price=${values.price}`)}`,
      `-F ${shellQuote(`inventory=${values.inventory}`)}`,
      `-F ${shellQuote(`image=@${values.image.uri};filename=${values.image.name};type=${values.image.type}`)}`,
    ].filter(Boolean).join(' \\\n  ');
  }

  const jsonBody: Record<string, any> = {
    name: values.name,
    category: values.category,
    price: values.price,
    inventory: values.inventory,
  };

  if (values.imageUrl) {
    jsonBody.image_url = values.imageUrl;
  }

  return [
    ...base,
    "-H 'Content-Type: application/json'",
    `--data ${shellQuote(JSON.stringify(jsonBody))}`,
  ].filter(Boolean).join(' \\\n  ');
};

const logPantryCurl = (
  url: string,
  method: string,
  token: string | null | undefined,
  values: Parameters<typeof buildPantryCurl>[3]
) => {
  const curl = buildPantryCurl(url, method, token, values);
  console.log('========== PANTRY CURL START ==========');
  curl.split('\n').forEach((line) => console.log(line));
  console.log('========== PANTRY CURL END ==========');
};

export const AddPantryItemScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'AddPantryItem'>>();
  const { token } = useAuth();

  const editItem = route.params?.item;
  const isEditing = !!editItem;

  const [name, setName] = useState(editItem?.name || '');
  const [category, setCategory] = useState(editItem?.category || '');
  const [price, setPrice] = useState(editItem?.price?.toString() || '');
  const [inventory, setInventory] = useState(editItem?.inventory ?? 10);
  const [image, setImage] = useState<string | null>(editItem?.image_url || null);
  const [loading, setLoading] = useState(false);
  const parsedPrice = getRequiredPrice(price);
  const priceAboveLimit = isPriceAboveLimit(price);

  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
    onClose: () => void;
  }>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
    onClose: () => {},
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setModalConfig({
        visible: true,
        type: 'error',
        title: 'Permission Denied',
        message: 'We need photo library permissions to upload images.',
        onClose: () => setModalConfig(prev => ({ ...prev, visible: false })),
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setModalConfig({
        visible: true,
        type: 'error',
        title: 'Permission Denied',
        message: 'We need camera permissions to capture photos.',
        onClose: () => setModalConfig(prev => ({ ...prev, visible: false })),
      });
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!name || !category || parsedPrice === null) {
      setModalConfig({
        visible: true,
        type: 'error',
        title: 'Missing Details',
        message: 'Please fill in item name, category, and a valid price.',
        onClose: () => setModalConfig(prev => ({ ...prev, visible: false })),
      });
      return;
    }

    setLoading(true);
    try {
      const url = isEditing
        ? `${process.env.EXPO_PUBLIC_API_URL}pantry/${editItem!.id}`
        : `${process.env.EXPO_PUBLIC_API_URL}pantry`;

      const imageFile = image && isLocalFileUri(image) ? getImageFile(image) : null;

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      };

      let body: BodyInit;
      if (imageFile) {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('category', category);
        formData.append('price', String(parsedPrice));
        formData.append('inventory', String(inventory));
        formData.append('image', imageFile as any);
        body = formData;
      } else {
        headers['Content-Type'] = 'application/json';

        const jsonBody: Record<string, any> = {
          name,
          category,
          price: parsedPrice,
          inventory,
        };

        if (image) {
          jsonBody.image_url = image;
        }

        body = JSON.stringify(jsonBody);
      }

      const method = isEditing ? 'PATCH' : 'POST';
      console.log('========== PANTRY REQUEST START ==========');
      console.log('Pantry API Request:', {
        method,
        url,
        auth: token ? 'Bearer token attached' : 'No token',
        contentType: imageFile ? 'multipart/form-data (boundary set by React Native)' : headers['Content-Type'],
        body: imageFile
          ? {
              name,
              category,
              price: parsedPrice,
              inventory,
              image: imageFile,
            }
          : JSON.parse(body as string),
      });
      logPantryCurl(url, method, token, {
        name,
        category,
        price: parsedPrice,
        inventory,
        image: imageFile,
        imageUrl: !imageFile ? image : null,
      });
      console.log('========== PANTRY REQUEST END ==========');

      const response = await fetch(url, {
        method,
        headers,
        credentials: 'include',
        body,
      });

      console.log('========== PANTRY RESPONSE START ==========');
      console.log('Pantry API Response Status:', response.status);
      const result = await response.json();
      console.log('Pantry API Response Body:', JSON.stringify(result, null, 2));
      console.log('========== PANTRY RESPONSE END ==========');

      if (response.ok) {
        setModalConfig({
          visible: true,
          type: 'success',
          title: isEditing ? 'Item Updated!' : 'Item Added!',
          message: isEditing
            ? 'Your pantry item has been updated successfully.'
            : 'New item has been added to your pantry.',
          onClose: () => {
            setModalConfig(prev => ({ ...prev, visible: false }));
            navigation.goBack();
          },
        });
      } else {
        throw new Error(result.message || `Failed to ${isEditing ? 'update' : 'create'} item`);
      }
    } catch (error: any) {
      setModalConfig({
        visible: true,
        type: 'error',
        title: isEditing ? 'Update Failed' : 'Creation Failed',
        message: error.message || 'Something went wrong. Please try again.',
        onClose: () => setModalConfig(prev => ({ ...prev, visible: false })),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <StatusModal
          visible={modalConfig.visible}
          type={modalConfig.type}
          title={modalConfig.title}
          message={modalConfig.message}
          onClose={modalConfig.onClose}
        />

        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Edit Pantry Item' : 'Add New Item'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isEditing
              ? 'Update the details for this pantry item.'
              : 'Stock up your kitchen with essential ingredients.'}
          </Text>
        </View>

        {/* Image Upload */}
        <View style={styles.imageOptionsRow}>
          <TouchableOpacity
            style={[styles.imageUploadHalf, image ? styles.imageUploadWithPreview : null]}
            onPress={takePhoto}
          >
            {image ? (
              <Image source={{ uri: image }} style={styles.previewImage} />
            ) : (
              <View style={styles.uploadPlaceholderCompact}>
                <Camera size={20} color={Colors.primary} />
                <Text style={styles.uploadTitleCompact}>Take Photo</Text>
              </View>
            )}
            {image && (
              <TouchableOpacity style={styles.changeImageBtn} onPress={() => setImage(null)}>
                <Text style={styles.changeImageText}>Remove</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.imageUploadHalf, !image ? null : { display: 'none' }]}
            onPress={pickImage}
          >
            <View style={styles.uploadPlaceholderCompact}>
              <ImageIcon size={20} color={Colors.primary} />
              <Text style={styles.uploadTitleCompact}>Gallery</Text>
            </View>
          </TouchableOpacity>
        </View>

        {!image && (
          <Text style={styles.imageHint}>High-res JPEG or PNG preferred (Max 5MB)</Text>
        )}

        {/* Item Name */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>ITEM NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Basmati Rice, Turmeric Powder"
            placeholderTextColor={Colors.textSecondary}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Category Selection */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>CATEGORY</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryBtn, category === cat && styles.activeCategoryBtn]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.categoryBtnText, category === cat && styles.activeCategoryBtnText]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Price */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>PRICE PER UNIT</Text>
          <View style={styles.priceInputContainer}>
            <Text style={styles.currency}>₹</Text>
            <TextInput
              style={styles.priceInput}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={Colors.textSecondary}
              value={price}
              onChangeText={setPrice}
            />
          </View>
          {priceAboveLimit ? (
            <Text style={styles.errorHint}>Price cannot exceed ₹{MAX_PRICE.toLocaleString('en-IN')}.</Text>
          ) : null}
        </View>

        {/* Inventory */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>INVENTORY COUNT</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setInventory(Math.max(0, inventory - 1))}
            >
              <Minus size={20} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.inventoryText}>{inventory} units</Text>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setInventory(inventory + 1)}
            >
              <Plus size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>Total quantity available in stock</Text>
        </View>

        <ChefTip tip="Keep your pantry organized by category. This helps you quickly find what you need during busy service hours!" />

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, (loading || parsedPrice === null) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading || parsedPrice === null}
        >
          {loading ? (
            <ActivityIndicator color={Colors.background} size="small" />
          ) : (
            <Text style={styles.submitBtnText}>
              {isEditing ? 'Update Item' : 'Add to Pantry'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  headerSection: {
    marginBottom: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h1,
    fontSize: 28,
    marginBottom: 8,
  },
  headerSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  imageOptionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.sm,
  },
  imageUploadHalf: {
    flex: 1,
    height: 120,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  imageUploadWithPreview: {
    borderStyle: 'solid',
    height: 120,
  },
  uploadPlaceholderCompact: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadTitleCompact: {
    ...Typography.caption,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  changeImageBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  changeImageText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  imageHint: {
    ...Typography.caption,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    color: Colors.textSecondary,
  },
  inputSection: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surface,
    height: 50,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeCategoryBtn: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryBtnText: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  activeCategoryBtnText: {
    color: Colors.background,
    fontWeight: 'bold',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
  },
  currency: {
    ...Typography.h3,
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    height: 50,
    color: Colors.text,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inventoryText: {
    ...Typography.body,
    fontWeight: 'bold',
  },
  hint: {
    ...Typography.caption,
    fontSize: 10,
    marginTop: 6,
    fontStyle: 'italic',
  },
  errorHint: {
    ...Typography.caption,
    color: Colors.danger,
    fontSize: 11,
    marginTop: 6,
    fontWeight: 'bold',
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  submitBtnText: {
    color: Colors.background,
    fontWeight: 'bold',
    fontSize: 16,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
});
