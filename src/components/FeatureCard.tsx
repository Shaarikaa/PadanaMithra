import { ArrowRight, Lock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProBadge } from './UpgradeModal';
import type { FeatureConfig } from '@/lib/features';

interface FeatureCardProps {
  feature: FeatureConfig;
  onClick: () => void;
  index: number;
}

function FreeBadge() {
  return (
    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
      FREE
    </span>
  );
}

export function FeatureCard({ feature, onClick, index }: FeatureCardProps) {
  const Icon = feature.icon;
  return (
    <button
      onClick={onClick}
      style={{ animationDelay: `${index * 40}ms` }}
      className={cn(
        'group relative flex flex-col items-start rounded-2xl border p-5 text-left shadow-sm transition-all duration-300',
        'animate-fade-in-up focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
        feature.premium
          ? 'border-amber-200/70 bg-gradient-to-br from-amber-50/40 to-white hover:border-amber-300 hover:shadow-lg hover:shadow-amber-100/50'
          : 'border-slate-200/80 bg-white hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/50',
      )}
    >
      <div className="mb-4 flex w-full items-center justify-between">
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110', feature.accent)}>
          <Icon className="h-6 w-6" />
        </div>
        {feature.premium ? (
          <span className="flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <ProBadge />
          </span>
        ) : (
          <FreeBadge />
        )}
      </div>

      <h3 className="text-base font-semibold text-slate-900">{feature.title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">{feature.description}</p>

      <div className="mt-4 flex items-center gap-1.5 text-sm font-medium transition-all group-hover:gap-2.5">
        {feature.premium ? (
          <>
            <Lock className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-amber-600">Unlock for ₹99</span>
          </>
        ) : (
          <>
            <span className="text-indigo-600">Open</span>
            <ArrowRight className="h-4 w-4 text-indigo-600 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </div>
    </button>
  );
}
