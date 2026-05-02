import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '../theme';
import { OrderCard } from '../components/OrderCard';
import { ChefTip } from '../components/ChefTip';
import { ShoppingBag, X, Check, AlertCircle } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';

export const OrdersScreen = () => {
  const [activeTab, setActiveTab] = useState<'Active' | 'Completed'>('Active');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    setError(null);
    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}orders/chef`;
      console.log('API Request: GET', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('API Error:', response.status, errorText);
        throw new Error('Failed to fetch orders');
      }

      const result = await response.json();
      console.log('API Response:', JSON.stringify(result, null, 2));
      
      if (result.status === 'success') {
        const allOrders = result.data;
        // Filter orders based on active tab
        const filtered = allOrders.filter((order: any) => {
          if (activeTab === 'Active') {
            return ['RECEIVED', 'COOKING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'].includes(order.status);
          } else {
            return ['DELIVERED', 'CANCELLED'].includes(order.status);
          }
        });
        setOrders(filtered);
      } else {
        throw new Error(result.message || 'Something went wrong');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, token]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}orders/${orderId}/status`;
      console.log('API Request: PATCH', url, { status: newStatus });
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      const result = await response.json();
      console.log('API Response:', JSON.stringify(result, null, 2));

      if (response.ok) {
        // Refresh orders after update
        fetchOrders(true);
      } else {
        alert(result.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Status update error:', error);
      alert('Network error while updating status');
    }
  };

  const getItemsText = (items: any[]) => {
    return items.map(item => `${item.quantity}x ${item.meal_name}`).join(', ');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <Text style={styles.screenTitle}>Orders</Text>
        {/* Tab Toggle */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'Active' && styles.activeTab]}
            onPress={() => setActiveTab('Active')}
          >
            <Text style={[styles.tabText, activeTab === 'Active' && styles.activeTabText]}>Active</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'Completed' && styles.activeTab]}
            onPress={() => setActiveTab('Completed')}
          >
            <Text style={[styles.tabText, activeTab === 'Completed' && styles.activeTabText]}>Completed</Text>
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Fetching orders...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <AlertCircle size={40} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchOrders()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={() => fetchOrders(true)} 
                tintColor={Colors.primary}
              />
            }
          >
            {orders.length > 0 ? (
              <>
                {orders.map(order => (
                  <OrderCard 
                    key={order.id}
                    orderId={`#${order.id.split('-')[0].toUpperCase()}`}
                    items={getItemsText(order.items)}
                    status={order.status}
                    deliveryTime={new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    location={order.user?.name || 'Customer'}
                    onActionPress={() => {
                      if (order.status === 'RECEIVED') handleStatusUpdate(order.id, 'COOKING');
                      else if (order.status === 'COOKING') handleStatusUpdate(order.id, 'READY_FOR_PICKUP');
                    }}
                  />
                ))}

                {activeTab === 'Active' && (
                  <ChefTip tip="Ensure all active orders are being prepared to meet delivery timelines." />
                )}
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {activeTab === 'Active' ? 'No active orders at the moment.' : 'No completed orders found.'}
                </Text>
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
  screenTitle: {
    ...Typography.h1,
    marginBottom: Spacing.lg,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: 4,
    borderRadius: 25,
    marginBottom: Spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 22,
  },
  activeTab: {
    backgroundColor: Colors.primaryDark,
  },
  tabText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: 'bold',
  },
  activeTabText: {
    color: Colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  incomingRequest: {
    backgroundColor: '#1A2E1A', // dark green tint
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.3)',
    marginBottom: Spacing.md,
  },
  incomingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  incomingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  incomingTitle: {
    ...Typography.h3,
    fontSize: 16,
  },
  incomingSubtitle: {
    ...Typography.caption,
  },
  incomingActions: {
    flexDirection: 'row',
    gap: 12,
  },
  ignoreBtn: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  ignoreBtnText: {
    color: Colors.textSecondary,
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 12,
  },
  acceptBtn: {
    flex: 2,
    height: 40,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  acceptBtnText: {
    color: Colors.background,
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
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
  },
  errorText: {
    ...Typography.body,
    color: Colors.danger,
    textAlign: 'center',
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
});

