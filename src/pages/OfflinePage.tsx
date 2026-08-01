import { Lock, Download, MessageSquare, Volume2, Video, CloudOff } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ProBadge } from '@/components/UpgradeModal';

const DOWNLOADS = [
  { id: 'chats', icon: MessageSquare, title: 'Download Chats', desc: 'Save your AI Tutor conversations for offline reading.', size: '12 MB' },
  { id: 'voice', icon: Volume2, title: 'Download Voice', desc: 'Pre-download voice explanations in your chosen language.', size: '48 MB' },
  { id: 'videos', icon: Video, title: 'Download Videos', desc: 'Save recorded classes to watch without internet.', size: '320 MB' },
];

export function OfflinePage() {
  return (
    <AppShell
      title="Offline Mode"
      subtitle="Download your study material and keep learning without internet."
    >
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-800">
        <Lock className="h-4 w-4 shrink-0" />
        Offline downloads are a Premium feature. Upgrade to Pro to enable them.
      </div>

      <div className="mx-auto max-w-2xl space-y-5">
        <Card className="flex items-center gap-4 border-slate-200 p-5 shadow-sm">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
            <CloudOff className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">Offline mode is off</h3>
            <p className="text-sm text-slate-500">Toggle downloads below to enable offline access.</p>
          </div>
          <ProBadge />
        </Card>

        <div className="space-y-3">
          {DOWNLOADS.map((d) => {
            const Icon = d.icon;
            return (
              <Card key={d.id} className="border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-semibold text-slate-900">{d.title}</Label>
                        <ProBadge />
                      </div>
                      <p className="mt-0.5 text-sm text-slate-500">{d.desc}</p>
                      <p className="mt-1 text-xs text-slate-400">Est. size: {d.size}</p>
                    </div>
                  </div>
                  <Switch disabled aria-label={d.title} />
                </div>
                <div className="mt-3 flex items-center gap-2 opacity-40">
                  <Download className="h-3.5 w-3.5 text-slate-400" />
                  <Progress value={0} className="h-1.5 flex-1" />
                  <span className="text-xs text-slate-400">0%</span>
                </div>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-xs text-slate-400">
          Toggles are disabled in the free plan. Upgrade to Pro to download content for offline use.
        </p>
      </div>
    </AppShell>
  );
}
