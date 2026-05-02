import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Plus, Package, AlertCircle } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '../theme';
import { PantryCard } from '../components/PantryCard';
import { ChefTip } from '../components/ChefTip';
import { StatusModal } from '../components/StatusModal';
import { useAuth } from '../context/AuthContext';

type RootStackParamList = {
  Main: undefined;
  AddPantryItem: { item?: PantryItem };
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface PantryItem {
  id: string;
  name: string;
  category: string;
  price: number;
  inventory: number;
  image_url?: string;
}



export const PantryScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { token } = useAuth();

  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const fetchPantryItems = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError(null);
    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}pantry`;
      console.log('API Request: GET', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('API Error:', response.status, errorText);
        throw new Error('Failed to fetch pantry items');
      }

      const result = await response.json();

      let pantryItems: PantryItem[] = [];
      if (Array.isArray(result)) {
        pantryItems = result;
      } else if (result.status === 'success') {
        pantryItems = result.data || [];
      } else if (result.data && Array.isArray(result.data)) {
        pantryItems = result.data;
      } else {
        throw new Error(result.message || 'Something went wrong');
      }

      console.log(`\n===== PANTRY ITEMS (${pantryItems.length} total) =====`);
      pantryItems.forEach((item, index) => {
        console.log(
          `[${index + 1}] ${item.name} | Category: ${item.category} | Price: ₹${item.price} | Inventory: ${item.inventory}${item.image_url ? ' | Has Image' : ''}`
        );
      });
      console.log('==============================================\n');

      setItems(pantryItems);
    } catch (err: any) {
      console.log('Pantry fetch error:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchPantryItems();
    }, [fetchPantryItems])
  );

  const handleDelete = (id: string) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this pantry item? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => performDelete(id),
        },
      ]
    );
  };

  const performDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}pantry/${id}`;
      console.log('API Request: DELETE', url);

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('API Error:', response.status, errorText);
        throw new Error('Failed to delete item');
      }

      setItems(prev => prev.filter(item => item.id !== id));
      setModalConfig({
        visible: true,
        type: 'success',
        title: 'Item Removed',
        message: 'The pantry item has been removed successfully.',
        onClose: () => setModalConfig(prev => ({ ...prev, visible: false })),
      });
    } catch (err: any) {
      setModalConfig({
        visible: true,
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Could not remove the item. Please try again.',
        onClose: () => setModalConfig(prev => ({ ...prev, visible: false })),
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (id: string) => {
    const item = items.find(i => i.id === id);
    if (item) {
      navigation.navigate('AddPantryItem', { item });
    }
  };

  const totalItems = items.length;
  const lowStockCount = items.filter(i => i.inventory > 0 && i.inventory <= 5).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusModal
        visible={modalConfig.visible}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        onClose={modalConfig.onClose}
      />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.screenTitle}>Pantry</Text>
            <Text style={styles.subtitle}>{totalItems} items{lowStockCount > 0 ? ` · ${lowStockCount} low stock` : ''}</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('AddPantryItem', {})}
          >
            <Plus size={20} color={Colors.background} />
          </TouchableOpacity>
        </View>


        {/* Content */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading pantry...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <AlertCircle size={40} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchPantryItems()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchPantryItems(true)}
                tintColor={Colors.primary}
                colors={[Colors.primary]}
              />
            }
          >
            {items.length > 0 ? (
              <>
                {items.map(item => (
                  <PantryCard
                    key={item.id}
                    id={item.id}
                    name={item.name}
                    category={item.category}
                    price={item.price}
                    inventory={item.inventory}
                    image_url={item.image_url}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
                <ChefTip tip="Keep your pantry stocked! Low inventory items are highlighted so you never run out mid-service." />
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Package size={28} color={Colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>Your pantry is empty</Text>
                <Text style={styles.emptyText}>
                  Start adding ingredients and items to keep your kitchen organized.
                </Text>
                <TouchableOpacity
                  style={styles.emptyAction}
                  onPress={() => navigation.navigate('AddPantryItem', {})}
                >
                  <Plus size={16} color={Colors.primary} />
                  <Text style={styles.emptyLink}>Add First Item</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
      </View>
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
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  screenTitle: {
    ...Typography.h1,
  },
  subtitle: {
    ...Typography.caption,
    marginTop: 2,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
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
    marginTop: Spacing.xl,
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
    paddingVertical: 50,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 24,
    marginTop: Spacing.xl,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.h3,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 20,
    paddingHorizontal: Spacing.lg,
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  emptyLink: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
});
