export type ProductNotificationType =
  | 'request_paid_reviewer'
  | 'request_accepted_reviewee'
  | 'review_completed_reviewee'
  | 'request_declined_reviewee'
  | 'payment_receipt_reviewee'
  | 'payout_sent_reviewer'
  | 'deadline_warning_reviewer'
  | 'timeout_refund_reviewee'
  | 'timeout_refund_reviewer'
  | 'reviewer_application_decision'
  | 'reviewer_rating_received';

export type NotificationChannel = 'email' | 'sms' | 'push';

export type NotifyUserPayload = {
  userId: string;
  type: ProductNotificationType;
  entityId?: string;
  data?: Record<string, string | number | undefined>;
  /** Skip idempotency check (e.g. testing). */
  force?: boolean;
};
