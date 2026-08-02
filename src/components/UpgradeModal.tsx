import { useState } from 'react';
import { Sparkles, X, Check, Loader as Loader2, CircleAlert as AlertCircle, Crown, Lock } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/lib/AppContext';
import {
  initiateCheckout,
  initiateFeatureCheckout,
  demoActivatePremium,
  demoActivateFeature,
} from '@/lib/subscription';

const BUNDLE_BENEFITS = [
  'Offline Mode — study without internet',
  'Personal Mentor — dedicated human guidance',
  'Live Video Class — join real-time classes',
  'Notes by Professionals — expert-prepared notes',
];

const FEATURE_ID_MAP: Record<string, string> = {
  'Offline Mode — PRO': 'offline',
  'Personal Mentor — PRO': 'mentoring',
  'Live Video Class — PRO': 'video-classes',
  'Notes by Professionals — PRO': 'pro-notes',
  'Offline Mode': 'offline',
  'Personal Mentor': 'mentoring',
  'Live Video Class': 'video-classes',
  'Notes by Professionals': 'pro-notes',
  'Premium': 'bundle',
};

export function UpgradeModal({ open, onClose, featureName }: { open: boolean; onClose: () => void; featureName?: string }) {
  const { refreshPremium } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isBundle = !featureName || featureName === 'Premium' || featureName === 'bundle';
  const featureId = isBundle ? null : FEATURE_ID_MAP[featureName] ?? null;

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);

    try {
      if (isBundle) {
        // Bundle checkout (₹499)
        const result = await initiateCheckout();
        if (result.success && result.checkoutUrl) {
          window.location.href = result.checkoutUrl;
          return;
        }
        if (result.stripeConfigured === false || (result.error && result.error.includes('not configured'))) {
          const demoResult = await demoActivatePremium();
          if (demoResult.success) {
            setSuccess(true);
            await refreshPremium();
            setTimeout(() => { onClose(); setSuccess(false); }, 2500);
          } else {
            setError(demoResult.error || 'Unable to activate. Please try again.');
          }
        } else {
          setError(result.error || 'Payment could not be initiated. Please try again.');
        }
      } else if (featureId) {
        // Individual feature checkout (₹99)
        const result = await initiateFeatureCheckout(featureId);
        if (result.success && result.checkoutUrl) {
          window.location.href = result.checkoutUrl;
          return;
        }
        if (result.stripeConfigured === false || (result.error && result.error.includes('not configured'))) {
          const demoResult = await demoActivateFeature(featureId);
          if (demoResult.success) {
            setSuccess(true);
            await refreshPremium();
            setTimeout(() => { onClose(); setSuccess(false); }, 2500);
          } else {
            setError(demoResult.error || 'Unable to activate. Please try again.');
          }
        } else {
          setError(result.error || 'Payment could not be initiated. Please try again.');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md overflow-hidden p-0">
        <div className="relative bg-gradient-to-br from-amber-500 to-orange-500 p-6 text-white">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1 text-white/80 transition hover:bg-white/20 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Crown className="h-3.5 w-3.5" />
            Padanamithra Pro
          </div>
          <h2 className="text-2xl font-bold">
            {isBundle ? 'Unlock All Features' : `Unlock ${featureName}`}
          </h2>
          {isBundle ? (
            <p className="mt-1 text-sm text-white/90">Get every Pro feature in one bundle.</p>
          ) : (
            <p className="mt-1 text-sm text-white/90">{featureName} is a Pro feature.</p>
          )}
        </div>

        <div className="p-6">
          {success ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {isBundle ? 'Welcome to Pro!' : 'Feature Unlocked!'}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {isBundle
                  ? 'All Pro features are now active on your account.'
                  : `${featureName} is now active on your account.`}
              </p>
            </div>
          ) : (
            <>
              {isBundle ? (
                <>
                  <ul className="mb-5 space-y-2.5">
                    {BUNDLE_BENEFITS.map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-sm">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                          <Check className="h-3 w-3" />
                        </span>
                        <span className="text-slate-700">{b}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-center">
                    <p className="text-xs font-medium text-slate-500">All Access Bundle</p>
                    <div className="mt-1 flex items-center justify-center gap-2">
                      <span className="text-3xl font-bold text-amber-600">₹499</span>
                      <span className="text-sm text-muted-foreground">/month</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Unlocks ALL Pro features together</p>
                  </div>
                </>
              ) : (
                <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-center">
                  <p className="text-xs font-medium text-slate-500">Individual Feature</p>
                  <div className="mt-1 flex items-center justify-center gap-2">
                    <span className="text-3xl font-bold text-amber-600">₹99</span>
                    <span className="text-sm text-muted-foreground">/month</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Unlocks only this feature</p>
                </div>
              )}

              {error && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                className="mt-4 w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                onClick={handleUpgrade}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : isBundle ? (
                  <>
                    <Crown className="mr-1.5 h-4 w-4" />
                    Unlock All Premium Features — ₹499
                  </>
                ) : (
                  <>
                    <Lock className="mr-1.5 h-3.5 w-3.5" />
                    Unlock for ₹99
                  </>
                )}
              </Button>

              {isBundle && (
                <p className="mt-3 text-center text-xs text-slate-400">
                  Or unlock individual features for ₹99 each from the dashboard.
                </p>
              )}

              <Button variant="ghost" className="mt-2 w-full text-slate-500" onClick={onClose} disabled={loading}>
                Maybe later
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ProBadge() {
  return (
    <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm hover:from-amber-400 hover:to-orange-500">
      PRO
    </Badge>
  );
}
