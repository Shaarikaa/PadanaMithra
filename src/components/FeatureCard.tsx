import { ArrowRight, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProBadge } from './UpgradeModal';
import type { FeatureConfig } from '@/lib/features';

interface FeatureCardProps {
  feature: FeatureConfig;
  onClick: () => void;
  index: number;
}

export function FeatureCard({ feature, onClick, index }: FeatureCardProps) {
  const Icon = feature.icon;
  return (
    <button
      onClick={onClick}
      style={{ animationDelay: `${index * 40}ms` }}
      className={cn(
        'group relative flex flex-col items-start rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-sm transition-all duration-300',
        'hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/50',
        'animate-fade-in-up focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
      )}
    >
      <div className="mb-4 flex w-full items-center justify-between">
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110', feature.accent)}>
          <Icon className="h-6 w-6" />
        </div>
        {feature.premium && <ProBadge />}
      </div>

      <h3 className="text-base font-semibold text-slate-900">{feature.title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">{feature.description}</p>

      <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-indigo-600 transition-all group-hover:gap-2.5">
        {feature.premium ? (
          <>
            <Lock className="h-3.5 w-3.5" />
            <span>Unlock with Pro</span>
          </>
        ) : (
          <>
            <span>Open</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </div>
    </button>
  );
}
