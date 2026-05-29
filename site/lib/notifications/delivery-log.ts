import type { SupabaseClient } from '@supabase/supabase-js';
import type { NotificationChannel, ProductNotificationType } from '@/lib/notifications/types';

export async function wasNotificationSent(
  admin: SupabaseClient,
  params: {
    userId: string;
    type: ProductNotificationType;
    entityId?: string;
    channel: NotificationChannel;
  }
): Promise<boolean> {
  if (!params.entityId) return false;

  const { data, error } = await admin
    .from('notification_deliveries')
    .select('id')
    .eq('user_id', params.userId)
    .eq('notification_type', params.type)
    .eq('entity_id', params.entityId)
    .eq('channel', params.channel)
    .eq('status', 'sent')
    .maybeSingle();

  if (error) {
    console.warn('[notification_deliveries] dedupe check failed', error.message);
    return false;
  }
  return !!data;
}

export async function logNotificationDelivery(
  admin: SupabaseClient,
  params: {
    userId: string;
    type: ProductNotificationType;
    entityId?: string;
    channel: NotificationChannel;
    status: 'sent' | 'failed' | 'skipped';
    providerId?: string;
    errorMessage?: string;
  }
): Promise<void> {
  const { error } = await admin.from('notification_deliveries').insert({
    user_id: params.userId,
    notification_type: params.type,
    entity_id: params.entityId ?? null,
    channel: params.channel,
    status: params.status,
    provider_id: params.providerId ?? null,
    error_message: params.errorMessage ?? null,
  });
  if (error) {
    console.warn('[notification_deliveries] insert failed', error.message);
  }
}
