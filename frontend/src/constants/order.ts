export const ORDER_STATUSES = ['NEW', 'PROCESSING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELED'] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];
