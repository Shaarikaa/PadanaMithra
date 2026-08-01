// Subscription Service — manages premium subscription state via Supabase.
// Payment is handled through the stripe-checkout edge function.
// Premium status is verified server-side — never trusted from frontend-only flags.

import { supabase } from './supabaseClient';
import { loadJSON, STORAGE_KEYS } from './storage';

export type SubscriptionStatus = 'active' | 'inactive' | 'pending' | 'expired' | 'cancelled';
export type SubscriptionPlan = 'free' | 'premium';

export interface Subscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  provider: string | null;
  subscription_id: string | null;
  started_at: string | null;
  expires_at: string | null;
}

function getUserId(): string | null {
  const user = loadJSON<{ email: string } | null>(STORAGE_KEYS.currentUser, null);
  if (!user) return null;
  return user.email.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function getSubscription(): Promise<Subscription | null> {
  const userId = getUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Subscription;
}

export async function isPremium(): Promise<boolean> {
  const sub = await getSubscription();
  if (!sub) return false;
  if (sub.status !== 'active') return false;
  if (sub.expires_at && new Date(sub.expires_at) < new Date()) return false;
  return sub.plan === 'premium';
}

export interface CheckoutResult {
  success: boolean;
  checkoutUrl?: string;
  error?: string;
  stripeConfigured?: boolean;
}

export async function initiateCheckout(): Promise<CheckoutResult> {
  const userId = getUserId();
  if (!userId) return { success: false, error: 'Not logged in' };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/stripe-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
        'x-user-id': userId,
      },
      body: JSON.stringify({ userId, action: 'create_checkout' }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        success: false,
        error: err.error || `Request failed (${response.status})`,
        stripeConfigured: err.stripeConfigured,
      };
    }

    const data = await response.json();

    if (data.checkoutUrl) {
      return { success: true, checkoutUrl: data.checkoutUrl };
    }

    return { success: false, error: data.error || 'Unknown response' };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export interface DemoActivateResult {
  success: boolean;
  error?: string;
}

export async function demoActivatePremium(): Promise<DemoActivateResult> {
  const userId = getUserId();
  if (!userId) return { success: false, error: 'Not logged in' };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/stripe-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
        'x-user-id': userId,
      },
      body: JSON.stringify({ userId, action: 'demo_activate' }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.error || `Request failed (${response.status})` };
    }

    const data = await response.json();
    return { success: data.success === true, error: data.error };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function checkPaymentStatus(): Promise<Subscription | null> {
  const userId = getUserId();
  if (!userId) return null;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/stripe-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
        'x-user-id': userId,
      },
      body: JSON.stringify({ userId, action: 'check_status' }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.subscription as Subscription | null;
  } catch {
    return null;
  }
}
