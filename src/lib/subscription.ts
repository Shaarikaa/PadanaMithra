// Subscription Service — manages premium subscription state via Supabase.
// Payment is handled through the stripe-checkout edge function.
// Premium status is verified server-side — never trusted from frontend-only flags.
//
// Two pricing tiers:
//   - Individual feature: ₹99/month (one premium feature unlocked)
//   - Complete bundle: ₹449/month (all premium features unlocked)

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

export interface FeatureEntitlement {
  id: string;
  user_id: string;
  feature_id: string;
  status: SubscriptionStatus;
  provider: string | null;
  entitlement_id: string | null;
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

export async function getEntitlements(): Promise<FeatureEntitlement[]> {
  const userId = getUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('feature_entitlements')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error || !data) return [];
  return data as FeatureEntitlement[];
}

export async function hasFeatureAccess(featureId: string): Promise<boolean> {
  // Bundle subscribers get everything
  const premium = await isPremium();
  if (premium) return true;

  // Check individual entitlement
  const entitlements = await getEntitlements();
  return entitlements.some((e) => e.feature_id === featureId && e.status === 'active');
}

export interface CheckoutResult {
  success: boolean;
  checkoutUrl?: string;
  error?: string;
  stripeConfigured?: boolean;
}

async function postAction(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const userId = getUserId();
  if (!userId) throw new Error('Not logged in');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const response = await fetch(`${supabaseUrl}/functions/v1/stripe-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
      'x-user-id': userId,
    },
    body: JSON.stringify({ userId, ...body }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    return { success: false, error: err.error || `Request failed (${response.status})`, stripeConfigured: err.stripeConfigured };
  }

  return response.json();
}

export async function initiateCheckout(): Promise<CheckoutResult> {
  try {
    const data = await postAction({ action: 'create_checkout' });
    if (data.checkoutUrl) return { success: true, checkoutUrl: data.checkoutUrl as string };
    return { success: false, error: data.error as string, stripeConfigured: data.stripeConfigured as boolean };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function initiateFeatureCheckout(featureId: string): Promise<CheckoutResult> {
  try {
    const data = await postAction({ action: 'create_feature_checkout', featureId });
    if (data.checkoutUrl) return { success: true, checkoutUrl: data.checkoutUrl as string };
    return { success: false, error: data.error as string, stripeConfigured: data.stripeConfigured as boolean };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export interface DemoActivateResult {
  success: boolean;
  error?: string;
}

export async function demoActivatePremium(): Promise<DemoActivateResult> {
  try {
    const data = await postAction({ action: 'demo_activate' });
    return { success: data.success === true, error: data.error as string };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function demoActivateFeature(featureId: string): Promise<DemoActivateResult> {
  try {
    const data = await postAction({ action: 'demo_activate_feature', featureId });
    return { success: data.success === true, error: data.error as string };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function checkPaymentStatus(): Promise<{ subscription: Subscription | null; entitlements: FeatureEntitlement[] }> {
  try {
    const data = await postAction({ action: 'check_status' });
    return {
      subscription: (data.subscription as Subscription) ?? null,
      entitlements: (data.entitlements as FeatureEntitlement[]) ?? [],
    };
  } catch {
    return { subscription: null, entitlements: [] };
  }
}
