import { useCallback, useState } from 'react';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { errorText, friendlyApiError } from '../utils/apiErrors';
import { sortOrders } from '../utils/orders';

/** GET orders/chef + PATCH orders/:id/status, shared by the Dashboard and Orders screens. */
export const useChefOrders = () => {
  const { token, handleUnauthorized } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const url = `${process.env.EXPO_PUBLIC_API_URL}orders/chef`;
        console.log('API Request: GET', url);
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (response.status === 401 || response.status === 403) {
          handleUnauthorized(await response.json().catch(() => ({})));
          return;
        }
        if (!response.ok) {
          console.log('API Error (Orders):', response.status, await response.text());
          throw new Error('Could not load orders.');
        }
        const result = await response.json();
        console.log('API Response (Orders):', JSON.stringify(result, null, 2));
        if (result.status === 'success') {
          setOrders(sortOrders(result.data ?? []));
        } else {
          throw new Error('Could not load orders.');
        }
      } catch (err: any) {
        setError(errorText(err, 'Could not load orders.'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  const updateStatus = useCallback(
    async (orderId: string, status: string) => {
      setUpdatingId(orderId);
      try {
        const url = `${process.env.EXPO_PUBLIC_API_URL}orders/${orderId}/status`;
        console.log('API Request: PATCH', url, { status });
        const response = await fetch(url, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        const result = await response.json().catch(() => ({}));
        console.log('API Response:', JSON.stringify(result, null, 2));
        if (response.status === 401 || response.status === 403) {
          handleUnauthorized(result);
          return;
        }
        if (!response.ok) {
          const friendly = friendlyApiError(response.status, result, 'Failed to update status.');
          Toast.show({ type: 'error', text1: friendly.title, text2: friendly.message });
          return;
        }
        // Optimistic local update, then refresh from the server.
        setOrders((prev) => sortOrders(prev.map((o) => (o.id === orderId ? { ...o, status } : o))));
        fetchOrders(true);
      } catch {
        Toast.show({ type: 'error', text1: 'Network error', text2: 'Could not update the order status.' });
      } finally {
        setUpdatingId(null);
      }
    },
    [token, fetchOrders]
  );

  return { orders, loading, refreshing, error, updatingId, fetchOrders, updateStatus };
};
