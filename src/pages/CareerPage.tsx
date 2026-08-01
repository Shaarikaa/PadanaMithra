import { useState } from 'react';
import { Atom, Briefcase, BookOpen, Wrench, Cpu, Stethoscope, TrendingUp, Palette, Code, CircuitBoard, Settings, Sparkles, Compass } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { CAREER_ADVICE } from '@/lib/mockData';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Atom, Briefcase, BookOpen, Wrench, Cpu, Stethoscope, TrendingUp, Palette, Code, CircuitBoard, Settings, Sparkles,
};

export function CareerPage() {
  const [tab, setTab] = useState('After 10th');

  return (
    <AppShell
      title="Career Guidance Corner"
      subtitle="Explore pathways after 10th, after 12th, and in engineering."
    >
      <div className="mx-auto max-w-4xl">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-xl bg-slate-100 p-1">
            <TabsTrigger value="After 10th" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              After 10th
            </TabsTrigger>
            <TabsTrigger value="After 12th" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              After 12th
            </TabsTrigger>
            <TabsTrigger value="Engineering" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Engineering
            </TabsTrigger>
          </TabsList>

          {Object.keys(CAREER_ADVICE).map((key) => (
            <TabsContent key={key} value={key} className="mt-6">
              <div className="mb-5 flex items-center gap-2.5">
                <Compass className="h-5 w-5 text-indigo-600" />
                <p className="text-sm text-slate-600">
                  {key === 'Engineering'
                    ? 'Branches and specializations to consider in engineering.'
                    : `Streams and courses to consider ${key.toLowerCase()}.`}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {CAREER_ADVICE[key].map((section) => {
                  const Icon = ICONS[section.icon] ?? BookOpen;
                  return (
                    <Card key={section.title} className="border-slate-200 p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md">
                      <div className="mb-3 flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                          <Icon className="h-5 w-5" />
                        </span>
                        <h3 className="font-semibold text-slate-900">{section.title}</h3>
                      </div>
                      <ul className="space-y-2">
                        {section.items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-slate-600">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppShell>
  );
}
