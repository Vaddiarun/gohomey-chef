import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AlertCircle, Plus, ShoppingBasket } from 'lucide-react-native';
import { C, F } from '../theme';
import { FadeInView, KitchenHeader, PressableScale } from '../components/ui';
import { MenuTile, MenuTileSkeleton } from '../components/MenuTile';
import { QuickAddFab } from '../components/QuickAddFab';
import { useTabBarSpace } from '../navigation/FloatingTabBar';
import { useAuth } from '../context/AuthContext';
import { errorText } from '../utils/apiErrors';

export interface PantryItem {
  id: string;
  name: string;
  category: string;
  price: number;
  inventory: number;
  image_url?: string;
  imageUrl?: string;
  image?: string;
  /** New (pending backend): how the item is sold. */
  unit_type?: 'ITEM' | 'CONTAINER';
  pieces_per_unit?: number;
  /** From the API — use this rather than computing price / pieces. */
  price_per_piece?: number;
}

const LOW_STOCK = 5;

/** "Pickles · Pack of 12 · ₹20.83/pc" for containers, else just the category. */
const packTag = (item: PantryItem) => {
  if (String(item.unit_type).toUpperCase() !== 'CONTAINER' || !item.pieces_per_unit) return item.category;
  const perPiece = item.price_per_piece != null ? ` · ₹${Number(item.price_per_piece).toFixed(2)}/pc` : '';
  return `${item.category} · Pack of ${item.pieces_per_unit}${perPiece}`;
};

const stockLabel = (n: number) =>
  n <= 0
    ? { text: 'Out of stock', tone: 'out' as const }
    : n <= LOW_STOCK
    ? { text: `Only ${n} left`, tone: 'warn' as const }
    : { text: `Available · ${n} in stock`, tone: 'ok' as const };

/** Pantry tab (Figma "Pntry" 76:13566 — "Active Pantry" grid). */
export const PantryScreen = () => {
  const navigation = useNavigation<any>();
  const { token, user, handleUnauthorized } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomSpace = useTabBarSpace();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (response.status === 401 || response.status === 403) {
        handleUnauthorized(await response.json().catch(() => ({})));
        return;
      }
      if (!response.ok) {
        console.log('API Error:', response.status, await response.text());
        throw new Error('Could not load your pantry.');
      }

      const result = await response.json();
      console.log('Pantry Fetch Response Body:', JSON.stringify(result, null, 2));
      const raw: PantryItem[] = Array.isArray(result) ? result : result?.data ?? [];
      setItems(raw.map((item) => ({ ...item, image_url: item.image_url || item.imageUrl || item.image })));
    } catch (err: any) {
      setError(errorText(err, 'Could not load your pantry.'));
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

  const kitchenName = user?.kitchen_name || (user?.name ? `${user.name.split(' ')[0]}’s Kitchen` : 'My Kitchen');
  const lowStock = items.filter((i) => i.inventory <= LOW_STOCK).length;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={{ paddingTop: insets.top }}>
        <KitchenHeader
          kitchenName={kitchenName}
          ownerName={user?.name}
          onInbox={() => navigation.navigate('Orders')}
          onProfile={() => navigation.navigate('Profile')}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomSpace + 60 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPantryItems(true)} tintColor={C.primary} colors={[C.primary]} />}
      >
        <FadeInView style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.eyebrow}>KITCHEN OVERVIEW</Text>
            {lowStock > 0 && <Text style={styles.lowStock}>{lowStock} low on stock</Text>}
          </View>
          <Text style={styles.title}>Active Pantry</Text>

          {loading && items.length === 0 ? (
            <View style={styles.grid}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={styles.cell}>
                  <MenuTileSkeleton />
                </View>
              ))}
            </View>
          ) : error && items.length === 0 ? (
            <Pressable onPress={() => fetchPantryItems()} style={styles.empty}>
              <AlertCircle size={22} color={C.danger} />
              <Text style={styles.emptyText}>{error} Tap to retry.</Text>
            </Pressable>
          ) : items.length === 0 ? (
            <View style={styles.empty}>
              <ShoppingBasket size={24} color={C.iconMuted} />
              <Text style={styles.emptyText}>Your pantry is empty.</Text>
              <PressableScale style={styles.emptyCta} onPress={() => navigation.navigate('AddPantryItem', {})}>
                <Plus size={14} color={C.primary} />
                <Text style={styles.emptyCtaText}>Add your first item</Text>
              </PressableScale>
            </View>
          ) : (
            <View style={styles.grid}>
              {items.map((item, i) => {
                const stock = stockLabel(item.inventory);
                return (
                  <FadeInView key={item.id} delay={60 + Math.min(i, 8) * 50} style={styles.cell}>
                    <MenuTile
                      name={item.name}
                      price={item.price}
                      imageUrl={item.image_url}
                      tag={packTag(item)}
                      availability={stock.text}
                      tone={stock.tone}
                      onPress={() => navigation.navigate('AddPantryItem', { item })}
                    />
                  </FadeInView>
                );
              })}
            </View>
          )}
        </FadeInView>
      </ScrollView>

      <QuickAddFab />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 20, paddingTop: 4 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 3,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { fontFamily: F.jakartaBold, fontSize: 10, lineHeight: 15, letterSpacing: 0.5, color: C.primaryRing },
  lowStock: { fontFamily: F.jakartaBold, fontSize: 10, lineHeight: 15, color: C.warning },
  title: { fontFamily: F.jakartaBold, fontSize: 19, lineHeight: 28.5, color: C.textStrong, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  cell: { width: '48%' },
  empty: { paddingVertical: 28, alignItems: 'center', gap: 10 },
  emptyText: { fontFamily: F.jakartaSemiBold, fontSize: 12, color: C.textMuted, textAlign: 'center' },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: C.softOrange,
  },
  emptyCtaText: { fontFamily: F.jakartaBold, fontSize: 12, color: C.primary },
});
