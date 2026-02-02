import { supabase } from './supabase';

// Generate a session ID per page load
const SESSION_ID = crypto.randomUUID();

export function trackEvent(event: string, properties?: Record<string, unknown>): void {
  supabase
    .from('analytics_events')
    .insert({
      event,
      properties: properties || {},
      session_id: SESSION_ID,
      created_at: Date.now(),
    })
    .then(({ error }) => {
      if (error) console.warn('Analytics error:', error.message);
    });
}

// Track feature usage once per session
const trackedFeatures = new Set<string>();
export function trackFeatureUsed(feature: string): void {
  if (trackedFeatures.has(feature)) return;
  trackedFeatures.add(feature);
  trackEvent('feature_used', { feature });
}

// Track session start
export function trackSessionStart(): void {
  trackEvent('session_start', {
    url: window.location.href,
    screen_width: window.innerWidth,
    screen_height: window.innerHeight,
    user_agent: navigator.userAgent,
  });
}
