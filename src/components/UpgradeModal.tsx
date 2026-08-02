import { useState } from 'react';
import { Sparkles, X, Check, Loader as Loader2, CircleAlert as AlertCircle } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useApp } from '@/lib/AppContext';
import { initiateCheckout, demoActivatePremium } from '@/lib/subscription';

const PRO_BENEFITS = [
  'Personal Mentor — continuous human guidance',
  'Mentor Chat — message your dedicated mentor',
  'Follow-up Support — mentor tracks your progress',
  'Personalized study guidance from your mentor',
  'Everything in Free — AI Tutor, Mock Tests, Flashcards',
];

export function UpgradeModal({ open, onClose, featureName }: { open: boolean; onClose: () => void; featureName?: string }) {
  const { refreshPremium } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);

    // Try real Stripe checkout first
    const result = await initiateCheckout();

    if (result.success && result.checkoutUrl) {
      // Redirect to Stripe Checkout
      window.location.href = result.checkoutUrl;
      return;
    }

    // If Stripe is not configured, use demo activation
    if (result.stripeConfigured === false || (result.error && result.error.includes('not configured'))) {
      const demoResult = await demoActivatePremium();
      if (demoResult.success) {
        setSuccess(true);
        await refreshPremium();
        setTimeout(() => {
          onClose();
          setSuccess(false);
        }, 2500);
      } else {
        setError(demoResult.error || 'Unable to activate. Please try again.');
      }
    } else {
      setError(result.error || 'Payment could not be initiated. Please try again.');
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md overflow-hidden p-0">
        <div className="relative bg-gradient-to-br from-indigo-600 to-indigo-500 p-6 text-white">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1 text-white/80 transition hover:bg-white/20 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            PadanaMithra Premium
          </div>
          <h2 className="text-2xl font-bold">Upgrade to unlock</h2>
          {featureName && <p className="mt-1 text-sm text-white/90">{featureName} is a Premium feature.</p>}
        </div>

        <div className="p-6">
          {success ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Welcome to Premium!</h3>
              <p className="mt-1 text-sm text-slate-600">Your Personal Mentor is ready to support your learning journey.</p>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                Your AI tutor + your personal human mentor.
              </p>
              <ul className="mb-6 space-y-2.5">
                {PRO_BENEFITS.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                      <Check className="h-3 w-3" />
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl font-bold text-indigo-600">₹99</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
              </div>

              {error && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700"
                onClick={handleUpgrade}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Upgrade to Premium — ₹99/month'
                )}
              </Button>

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

import { Badge } from '@/components/ui/badge';
