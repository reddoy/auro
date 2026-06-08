declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function getMeasurementId(): string | undefined {
  return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
}

/** Track a GA4 page view (for client-side route changes). */
export function pageview(url: string) {
  const measurementId = getMeasurementId();
  if (typeof window === 'undefined' || !window.gtag || !measurementId) return;
  window.gtag('config', measurementId, { page_path: url });
}

/** Track a GA4 custom event. */
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean | undefined>,
) {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', eventName, params);
}

/** @deprecated Use trackEvent instead. */
export const event = ({
  action,
  category,
  label,
  value,
}: {
  action: string;
  category: string;
  label?: string;
  value?: number;
}) => {
  trackEvent(action, {
    event_category: category,
    event_label: label,
    value,
  });
};

export function trackCtaClick(ctaId: string, location: string) {
  trackEvent('cta_click', { cta_id: ctaId, cta_location: location });
}

export function trackFunnelStep(funnel: string, step: string) {
  trackEvent('funnel_step_view', { funnel, step });
}

export function trackPurchase(params: { transactionId?: string; value?: number; currency?: string }) {
  trackEvent('purchase', {
    transaction_id: params.transactionId,
    value: params.value,
    currency: params.currency ?? 'USD',
  });
}
