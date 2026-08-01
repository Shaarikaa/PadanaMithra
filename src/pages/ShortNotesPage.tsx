import { useState } from 'react';
import { FileText, Sparkles, Copy, Check, Download } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// To Do: Replace with real Gemini API Key here — analyze Textbook + PYQ PDFs via Gemini.
import { generateShortNotes, CHAPTERS, SUBJECTS } from '@/lib/mockData';

export function ShortNotesPage() {
  const [subject, setSubject] = useState<string>('Physics');
  const [chapter, setChapter] = useState<string>('');
  const [customChapter, setCustomChapter] = useState('');
  const [notes, setNotes] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const chapters = CHAPTERS[subject] ?? [];
  const finalChapter = customChapter.trim() || chapter;

  const handleGenerate = () => {
    if (!finalChapter) return;
    setLoading(true);
    setNotes(null);
    setTimeout(() => {
      setNotes(generateShortNotes(finalChapter));
      setLoading(false);
    }, 1200);
  };

  const handleCopy = () => {
    if (!notes) return;
    const text = `Short Notes — ${finalChapter}\n\n${notes.map((n, i) => `${i + 1}. ${n}`).join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!notes) return;
    const text = `Short Notes — ${finalChapter}\n\n${notes.map((n, i) => `${i + 1}. ${n}`).join('\n')}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes-${finalChapter.toLowerCase().replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell
      title="AI Short Notes Generator"
      subtitle="Enter a chapter name and get 10 bullet-point notes instantly."
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subject} onValueChange={(v) => { setSubject(v); setChapter(''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Chapter (from syllabus)</Label>
              <Select value={chapter} onValueChange={setChapter}>
                <SelectTrigger><SelectValue placeholder="Select a chapter" /></SelectTrigger>
                <SelectContent>
                  {chapters.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <Label htmlFor="custom">Or type a custom chapter name</Label>
            <Input
              id="custom"
              placeholder="e.g. Thermodynamics"
              value={customChapter}
              onChange={(e) => { setCustomChapter(e.target.value); setChapter(''); }}
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!finalChapter || loading}
            className="mt-5 w-full bg-indigo-600 hover:bg-indigo-700"
          >
            {loading ? (
              <>
                <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                Analyzing Textbook & PYQ PDFs...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Notes
              </>
            )}
          </Button>
        </div>

        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
              <FileText className="h-6 w-6 animate-pulse text-indigo-600" />
            </div>
            <p className="font-medium text-slate-700">Generating your short notes...</p>
            <p className="mt-1 text-sm text-slate-500">Analyzing textbook and previous year questions.</p>
          </div>
        )}

        {notes && !loading && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold text-slate-900">Short Notes — {finalChapter}</h3>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={handleCopy} className="text-slate-600">
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  <span className="ml-1.5">{copied ? 'Copied' : 'Copy'}</span>
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDownload} className="text-slate-600">
                  <Download className="h-4 w-4" />
                  <span className="ml-1.5">Save</span>
                </Button>
              </div>
            </div>
            <ScrollArea className="h-auto max-h-[480px]">
              <ul className="space-y-3 p-5">
                {notes.map((note, i) => (
                  <li key={i} className="flex gap-3 rounded-lg p-2 transition hover:bg-slate-50">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                      {i + 1}
                    </span>
                    <span className="text-sm leading-relaxed text-slate-700">{note}</span>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        )}
      </div>
    </AppShell>
  );
}
