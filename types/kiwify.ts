export interface KiwifyWebhookEvent {
  event: 'order_paid' | 'subscription_renewed' | 'subscription_canceled';
  data: KiwifyWebhookData;
  id: string;
  created_at: string;
}

export interface KiwifyWebhookData {
  order_id: string;
  transaction_id?: string;
  subscription_id?: string;
  status: 'paid' | 'pending' | 'canceled' | 'refunded';
  amount: number;
  currency: string;
  customer: {
    name: string;
    email: string;
    document?: string;
    phone?: string;
  };
  product: {
    id: string;
    name: string;
    type: 'subscription' | 'one_time';
    recurring?: {
      interval: 'monthly' | 'yearly';
      interval_count: number;
    };
  };
  payment_method?: string;
  paid_at?: string;
  expires_at?: string;
  custom_fields?: Record<string, any>;
}

export interface KiwifyWebhookValidation {
  isValid: boolean;
  error?: string;
}

export interface KiwifyCustomer {
  id: string;
  name: string;
  email: string;
  document?: string;
  phone?: string;
  created_at: string;
}

export interface KiwifySubscription {
  id: string;
  customer_id: string;
  product_id: string;
  status: 'active' | 'canceled' | 'expired' | 'pending';
  current_period_start: string;
  current_period_end: string;
  canceled_at?: string;
  created_at: string;
}

export interface KiwifyOrder {
  id: string;
  customer_id: string;
  product_id: string;
  status: 'paid' | 'pending' | 'canceled' | 'refunded';
  amount: number;
  currency: string;
  payment_method?: string;
  paid_at?: string;
  created_at: string;
}

export type KiwifyEventStatus = 'processed' | 'failed' | 'pending';

export interface ProcessedKiwifyEvent {
  id: string;
  event_id: string;
  event_type: string;
  status: KiwifyEventStatus;
  processed_at: Date;
  error_message?: string;
  user_id?: string;
  order_id?: string;
  subscription_id?: string;
}
