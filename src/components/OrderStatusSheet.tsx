import React, { useState } from 'react';
import { CheckCircle2, ChefHat, CircleX, PackageCheck } from 'lucide-react-native';
import { ActionSheet } from './ui';
import type { SheetOption } from './ui';
import { nextStatuses, orderNumber, orderTitle } from '../utils/orders';

const ICON_FOR: Record<string, SheetOption['icon']> = {
  CONFIRMED: CheckCircle2,
  PREPARING: ChefHat,
  READY_FOR_PICKUP: PackageCheck,
  CANCELLED: CircleX,
};

/** "Change Status" bottom sheet for an order; returns an opener and the sheet element. */
export const useOrderStatusSheet = (updateStatus: (orderId: string, status: string) => void) => {
  const [order, setOrder] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  const open = (o: any) => {
    if (nextStatuses(o?.status).length === 0) return;
    setOrder(o);
    setVisible(true);
  };

  const options: SheetOption[] = order
    ? nextStatuses(order.status).map(({ status, label }) => ({
        label,
        icon: ICON_FOR[status] ?? CheckCircle2,
        onPress: () => updateStatus(order.id, status),
      }))
    : [];

  const sheet = (
    <ActionSheet
      visible={visible}
      title={order ? `${orderNumber(order)} · ${orderTitle(order)}` : ''}
      subtitle="Update the order status"
      options={options}
      onClose={() => setVisible(false)}
    />
  );

  return { openStatusSheet: open, statusSheet: sheet };
};
