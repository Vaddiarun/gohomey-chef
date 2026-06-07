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
  Platform
} from 'react-native';
import { Colors, Spacing, Typography } from '../theme';
import { ChefTip } from '../components/ChefTip';
import { StatusModal } from '../components/StatusModal';
import { Camera, Plus, Minus, Image as ImageIcon, Calendar } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { normalizeSlot, SlotType } from '../utils/dateTime';

import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator } from 'react-native';
import { getRequiredPrice, isPriceAboveLimit, MAX_PRICE } from '../utils/price';

export const CreateSlotScreen = () => {
  const navigation = useNavigation();
  const { token } = useAuth();
  
  const [dishTitle, setDishTitle] = useState('');
  const [dietaryType, setDietaryType] = useState<'Veg' | 'Non-Veg'>('Veg');
  
  // Slot Logic States
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null); // null means AUTO
  const [customSlot, setCustomSlot] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  
  const [price, setPrice] = useState('');
  const [capacity, setCapacity] = useState(10);
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const parsedPrice = getRequiredPrice(price);
  const priceAboveLimit = isPriceAboveLimit(price);

  // Date Selection
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Modal State
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

  // Derived slot value
  const currentSlot = selectedSlot;

  const handleSubmit = async () => {
    if (!dishTitle || parsedPrice === null) {
      setModalConfig({
        visible: true,
        type: 'error',
        title: 'Missing Details',
        message: 'Please fill in dish title and a valid price before creating the slot.',
        onClose: () => setModalConfig(prev => ({ ...prev, visible: false })),
      });
      return;
    }

    setLoading(true);
    try {
      const timestamp = selectedDate.toISOString();
      const finalSlot = selectedSlot === 'CUSTOM' ? normalizeSlot(customSlot) : currentSlot;
      
      if (!finalSlot) {
        setModalConfig({
          visible: true,
          type: 'error',
          title: 'Invalid Slot',
          message: 'Meal slot choice cannot be empty. Please select one or enter a custom name.',
          onClose: () => setModalConfig(prev => ({ ...prev, visible: false })),
        });
        return;
      }

      const formData = new FormData();
      formData.append('meal_name', dishTitle);
      formData.append('type', dietaryType === 'Veg' ? 'VEG' : 'NON_VEG');
      formData.append('service_window', finalSlot); // Changed from 'slot' to 'service_window'
      formData.append('price', String(parsedPrice));
      formData.append('slots_total', capacity.toString());
      formData.append('date', timestamp); // Changed from YYYY-MM-DD to full timestamp as per API docs
      // Note: isAutoAssigned and createdBy are kept only if supported by backend, 
      // but based on Prisma error, they might need to be removed if the next error occurs.
      // For now, removing them to match the provided API screenshot exactly.
      // formData.append('isAutoAssigned', isAutoAssigned.toString());
      // formData.append('createdBy', isAutoAssigned ? 'SYSTEM' : 'CHEF');

      if (image) {
        const uriParts = image.split('.');
        const fileType = uriParts[uriParts.length - 1];
        
        formData.append('meal_image', {
          uri: image,
          name: `meal_${Date.now()}.${fileType}`,
          type: `image/${fileType}`,
        } as any);
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}meals`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Note: fetch will automatically set multipart/form-data with boundary for FormData
        },
        body: formData,
      });

      const result = await response.json();
      
      if (response.ok && result.status === 'success') {
        setModalConfig({
          visible: true,
          type: 'success',
          title: 'Crafted Successfully!',
          message: 'Your masterpiece is now available for diners to enjoy.',
          onClose: () => {
            setModalConfig(prev => ({ ...prev, visible: false }));
            navigation.goBack();
          },
        });
      } else {
        throw new Error(result.message || 'Failed to create meal slot');
      }
    } catch (error: any) {
      setModalConfig({
        visible: true,
        type: 'error',
        title: 'Crafting Failed',
        message: error.message || 'Something went wrong while preparing your slot.',
        onClose: () => setModalConfig(prev => ({ ...prev, visible: false })),
      });
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setModalConfig({
        visible: true,
        type: 'error',
        title: 'Permission Denied',
        message: 'We need camera roll permissions to upload images of your dishes.',
        onClose: () => setModalConfig(prev => ({ ...prev, visible: false })),
      });
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
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
        message: 'We need camera permissions to capture your dish masterpieces.',
        onClose: () => setModalConfig(prev => ({ ...prev, visible: false })),
      });
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const getDisabledSlots = (date: Date) => {
    const now = new Date();
    // Only check times if the selected date is today
    if (date.toDateString() !== now.toDateString()) {
      return [];
    }
    
    const currentHour = now.getHours();
    const disabled = [];
    
    if (currentHour >= 5) disabled.push('BREAKFAST');
    if (currentHour >= 11) disabled.push('LUNCH');
    if (currentHour >= 17) disabled.push('DINNER');
    
    return disabled;
  };

  const renderDateOptions = () => {
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today); dayAfter.setDate(dayAfter.getDate() + 2);
    
    const dates = [
      { label: 'Today', date: today },
      { label: 'Tomorrow', date: tomorrow },
      { label: dayAfter.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), date: dayAfter }
    ];

    return (
      <View style={styles.inputSection}>
        <Text style={styles.label}>SERVICE DATE (UP TO 3 DAYS)</Text>
        <View style={styles.slotContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.slotScroll}>
            {dates.map((d, idx) => {
              const isSelected = selectedDate.toDateString() === d.date.toDateString();
              return (
                <TouchableOpacity 
                  key={idx}
                  style={[styles.slotChip, isSelected && styles.activeSlotChip]}
                  onPress={() => {
                    setSelectedDate(d.date);
                    // Reset selected slot if it becomes disabled on the new date
                    const newlyDisabled = getDisabledSlots(d.date);
                    if (selectedSlot && newlyDisabled.includes(selectedSlot)) {
                      setSelectedSlot(null);
                    }
                  }}
                >
                  <Calendar size={14} color={isSelected ? Colors.background : Colors.textSecondary} style={{ marginRight: 6 }} />
                  <Text style={[styles.slotChipText, isSelected && styles.activeSlotChipText]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    );
  };

  const renderSlotOptions = () => {
    const predefinedSlots = ['BREAKFAST', 'LUNCH', 'DINNER'];
    const disabledSlots = getDisabledSlots(selectedDate);
    
    return (
      <View style={styles.inputSection}>
        <Text style={styles.label}>MEAL SLOT</Text>
        <View style={styles.slotContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.slotScroll}>
            {predefinedSlots.map((s) => {
              const isDisabled = disabledSlots.includes(s);
              return (
                <TouchableOpacity 
                  key={s}
                  style={[
                    styles.slotChip, 
                    selectedSlot === s && styles.activeSlotChip,
                    isDisabled && { opacity: 0.5, backgroundColor: Colors.surface, borderColor: Colors.border }
                  ]}
                  disabled={isDisabled}
                  onPress={() => {
                    setSelectedSlot(s);
                    setShowCustomInput(false);
                  }}
                >
                  <Text style={[
                    styles.slotChipText, 
                    selectedSlot === s && styles.activeSlotChipText,
                    isDisabled && { color: Colors.textSecondary, textDecorationLine: 'line-through' }
                  ]}>{s}</Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity 
              style={[styles.slotChip, selectedSlot === 'CUSTOM' && styles.activeSlotChip]}
              onPress={() => {
                setSelectedSlot('CUSTOM');
                setShowCustomInput(true);
              }}
            >
              <Text style={[styles.slotChipText, selectedSlot === 'CUSTOM' && styles.activeSlotChipText]}>+ Custom</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {showCustomInput && (
          <TextInput 
            style={[styles.input, { marginTop: 12 }]}
            placeholder="Enter custom slot (e.g. SNACKS)"
            placeholderTextColor={Colors.textSecondary}
            value={customSlot}
            onChangeText={setCustomSlot}
            autoCapitalize="characters"
          />
        )}
      </View>
    );
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
        {/* Greeting Section */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingTitle}>Good Morning, Chef</Text>
          <Text style={styles.greetingSubtitle}>Let's prepare your kitchen for today's masterpieces. Define your availability and craft your menu.</Text>
        </View>

        {/* Image Upload Option Expansion */}
        <View style={styles.imageOptionsRow}>
          <TouchableOpacity style={[styles.imageUploadHalf, image ? styles.imageUploadWithPreview : null]} onPress={takePhoto}>
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

          <TouchableOpacity style={[styles.imageUploadHalf, !image ? null : { display: 'none' }]} onPress={pickImage}>
            <View style={styles.uploadPlaceholderCompact}>
              <ImageIcon size={20} color={Colors.primary} />
              <Text style={styles.uploadTitleCompact}>Gallery</Text>
            </View>
          </TouchableOpacity>
        </View>

        {!image && (
           <Text style={styles.imageHint}>High-res JPEG or PNG preferred (Max 5MB)</Text>
        )}

        {/* Dish Identity */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>DISH IDENTITY</Text>
          <TextInput 
            style={styles.input}
            placeholder="e.g. Truffle Mushroom Risotto"
            placeholderTextColor={Colors.textSecondary}
            value={dishTitle}
            onChangeText={setDishTitle}
          />
        </View>

        {/* Dietary Type */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>DIETARY TYPE</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity 
              style={[styles.toggleBtn, dietaryType === 'Veg' && styles.activeToggle]}
              onPress={() => setDietaryType('Veg')}
            >
              <View style={[styles.dot, { backgroundColor: '#22C55E' }]} />
              <Text style={[styles.toggleBtnText, dietaryType === 'Veg' && styles.activeToggleText]}>Veg</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleBtn, dietaryType === 'Non-Veg' && styles.activeToggle]}
              onPress={() => setDietaryType('Non-Veg')}
            >
              <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
              <Text style={[styles.toggleBtnText, dietaryType === 'Non-Veg' && styles.activeToggleText]}>Non-Veg</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Selection */}
        {renderDateOptions()}

        {/* Meal Slot Selection */}
        {renderSlotOptions()}

        {/* Price per Meal */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>PRICE PER MEAL</Text>
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
          <Text style={styles.hint}>ⓘ Recommended: ₹220-₹250</Text>
        </View>

        {/* Kitchen Capacity */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>KITCHEN CAPACITY</Text>
          <View style={styles.stepper}>
            <TouchableOpacity 
              style={styles.stepperBtn}
              onPress={() => setCapacity(Math.max(1, capacity - 1))}
            >
              <Minus size={20} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.capacityText}>{capacity} Meals</Text>
            <TouchableOpacity 
              style={styles.stepperBtn}
              onPress={() => setCapacity(capacity + 1)}
            >
              <Plus size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>Total portions you can serve</Text>
        </View>

        <ChefTip tip="Dishes with high-quality imagery and realistic meal capacities tend to see 40% higher engagement from diners." />

        <TouchableOpacity 
          style={[styles.submitBtn, (loading || parsedPrice === null) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading || parsedPrice === null}
        >
          {loading ? (
            <ActivityIndicator color={Colors.background} size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Create Meal Slot</Text>
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
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 40,
    backgroundColor: Colors.background,
  },
  scrollView: {
    backgroundColor: Colors.background,
  },
  greetingSection: {
    marginBottom: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  greetingTitle: {
    ...Typography.h1,
    fontSize: 28,
    marginBottom: 8,
  },
  greetingSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  imageUpload: {
    height: 180,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  cameraIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  uploadTitle: {
    ...Typography.h3,
    fontSize: 16,
    marginBottom: 4,
  },
  uploadSubtitle: {
    ...Typography.caption,
    textAlign: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
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
  imageHint: {
    ...Typography.caption,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    color: Colors.textSecondary,
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
  slotContainer: {
    marginTop: 4,
  },
  slotScroll: {
    paddingRight: 20,
    paddingBottom: 4,
  },
  slotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  activeSlotChip: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  slotChipText: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  activeSlotChipText: {
    color: Colors.background,
    fontWeight: 'bold',
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
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleBtn: {
    flex: 1,
    height: 48,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeToggle: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primary,
  },
  toggleBtnText: {
    ...Typography.body,
    fontWeight: 'bold',
    color: Colors.textSecondary,
  },
  activeToggleText: {
    color: Colors.background,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
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
  capacityText: {
    ...Typography.body,
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
