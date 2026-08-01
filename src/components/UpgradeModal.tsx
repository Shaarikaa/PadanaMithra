import { Sparkles, X, Check } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  featureName?: string;
}

const PRO_BENEFITS = [
  'Unlimited AI Tutor conversations every day',
  'Full step-by-step solutions for every doubt',
  'Recorded video classes from expert teachers',
  '1-on-1 mentoring with AI + human mentors',
  'Offline access to chats, voice, and videos',
  'Professionally written notes for every chapter',
];

export function UpgradeModal({ open, onClose, featureName }: UpgradeModalProps) {
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
            Padanamithra Pro
          </div>
          <h2 className="text-2xl font-bold">Upgrade to unlock</h2>
          {featureName && <p className="mt-1 text-sm text-white/90">{featureName} is a Premium feature.</p>}
        </div>

        <div className="p-6">
          <p className="mb-4 text-sm text-muted-foreground">
            This is a Premium feature. Upgrade to Pro to unlock it along with everything below.
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
              <span className="text-3xl font-bold text-indigo-600">₹299</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Demo pricing — no real payment</p>
          </div>

          <Button className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700" onClick={onClose}>
            Maybe later
          </Button>
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
