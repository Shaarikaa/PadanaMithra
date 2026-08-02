import { useMemo, useState } from 'react';
import { BookMarked, BookOpen, Bot, Search, Star, ExternalLink, GraduationCap, Filter, X } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/AppContext';
import { setPendingTutorContext } from '@/lib/AppContext';
import { TEXTBOOKS, SUBJECTS, MEDIUMS, CLASSES, type Textbook, type Subject, type Medium, type ClassName } from '@/lib/textbooks';
import { loadJSON, saveJSON, STORAGE_KEYS } from '@/lib/storage';

export function TextbookHubPage() {
  const { profile, language, setLanguage, navigate } = useApp();

  // Auto-prioritize from profile
  const profileMedium: Medium | 'all' = profile?.preferredLanguage === 'ml' ? 'Malayalam' : 'all';

  const [selectedClass, setSelectedClass] = useState<ClassName | 'all'>('Class 9');
  const [selectedMedium, setSelectedMedium] = useState<Medium | 'all'>(profileMedium);
  const [selectedSubject, setSelectedSubject] = useState<Subject | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [studyList, setStudyList] = useState<string[]>(() =>
    loadJSON<string[]>(STORAGE_KEYS.textbookStudyList, []),
  );

  const toggleStudyList = (id: string) => {
    setStudyList((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      saveJSON(STORAGE_KEYS.textbookStudyList, next);
      return next;
    });
  };

  const filtered = useMemo(() => {
    return TEXTBOOKS.filter((tb) => {
      if (selectedClass !== 'all' && tb.className !== selectedClass) return false;
      if (selectedMedium !== 'all' && tb.medium !== selectedMedium) return false;
      if (selectedSubject !== 'all' && tb.subject !== selectedSubject) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          tb.title.toLowerCase().includes(q) ||
          tb.subject.toLowerCase().includes(q) ||
          tb.className.toLowerCase().includes(q) ||
          tb.medium.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [selectedClass, selectedMedium, selectedSubject, searchQuery]);

  const handleAskPadanamithra = (tb: Textbook) => {
    // Set language based on medium
    if (tb.medium === 'Malayalam' && language !== 'ml') {
      setLanguage('ml');
    } else if (tb.medium === 'English' && language !== 'en') {
      setLanguage('en');
    }

    // Pass context to AI Tutor
    setPendingTutorContext({
      subject: tb.subject,
      medium: tb.medium,
      className: tb.className,
      textbookTitle: tb.title,
    });

    navigate({ name: 'feature', id: 'ai-tutor' });
  };

  const handleOpenTextbook = (tb: Textbook) => {
    window.open(tb.sourceUrl, '_blank', 'noopener,noreferrer');
  };

  const clearFilters = () => {
    setSelectedClass('all');
    setSelectedMedium('all');
    setSelectedSubject('all');
    setSearchQuery('');
  };

  const hasActiveFilters = selectedClass !== 'all' || selectedMedium !== 'all' || selectedSubject !== 'all' || searchQuery.trim() !== '';

  return (
    <AppShell title="Textbook Hub" subtitle={language === 'ml' ? 'ഔദ്യോഗിക SCERT കേരള പാഠ്യപുസ്തകങ്ങൾ' : 'Official SCERT Kerala Textbooks'}>
      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
              <BookMarked className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {language === 'ml' ? 'പാഠ്യപുസ്തക കേന്ദ്രം' : 'Textbook Hub'}
              </h1>
              <p className="text-sm text-slate-500">
                {language === 'ml' ? 'ഔദ്യോഗിക SCERT കേരള പാഠ്യപുസ്തകങ്ങൾ കണ്ടെത്തുക' : 'Find your official SCERT Kerala textbooks'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
            <GraduationCap className="h-4 w-4 shrink-0" />
            <span>
              {language === 'ml'
                ? 'സ്രോതസ്സ്: SCERT കേരള. പാഠ്യപുസ്തകങ്ങൾ SCERT കേരള വെബ്സൈറ്റിലാണ് ഹോസ്റ്റ് ചെയ്തിരിക്കുന്നത്.'
                : 'Source: SCERT Kerala. Textbooks are hosted on the official SCERT Kerala website.'}
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder={language === 'ml' ? 'പാഠ്യപുസ്തകങ്ങൾ തിരയുക...' : 'Search textbooks...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              {language === 'ml' ? 'ക്ലാസ്' : 'Class'}
            </label>
            <Select value={selectedClass} onValueChange={(v) => setSelectedClass(v as ClassName | 'all')}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ml' ? 'എല്ലാം' : 'All Classes'}</SelectItem>
                {CLASSES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              {language === 'ml' ? 'മീഡിയം' : 'Medium'}
            </label>
            <Select value={selectedMedium} onValueChange={(v) => setSelectedMedium(v as Medium | 'all')}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ml' ? 'എല്ലാം' : 'All Mediums'}</SelectItem>
                {MEDIUMS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              {language === 'ml' ? 'വിഷയം' : 'Subject'}
            </label>
            <Select value={selectedSubject} onValueChange={(v) => setSelectedSubject(v as Subject | 'all')}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ml' ? 'എല്ലാം' : 'All Subjects'}</SelectItem>
                {SUBJECTS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500">
              <X className="mr-1 h-3.5 w-3.5" />
              {language === 'ml' ? 'മായ്ക്കുക' : 'Clear'}
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2 text-sm text-slate-400">
            <Filter className="h-4 w-4" />
            {filtered.length} {language === 'ml' ? 'പുസ്തകങ്ങൾ' : 'textbooks'}
          </div>
        </div>

        {/* Study List indicator */}
        {studyList.length > 0 && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            {studyList.length} {language === 'ml' ? 'പുസ്തകങ്ങൾ നിങ്ങളുടെ പഠന പട്ടികയിൽ' : 'textbooks in your Study List'}
          </div>
        )}

        {/* Textbook cards */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <BookMarked className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <p className="text-slate-400">
              {language === 'ml' ? 'ഈ മാനദണ്ഡങ്ങളുമായി പൊരുത്തപ്പെടുന്ന പുസ്തകങ്ങളൊന്നുമില്ല.' : 'No textbooks match your filters.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((tb) => {
              const inStudyList = studyList.includes(tb.id);
              return (
                <Card key={tb.id} className="flex flex-col overflow-hidden border-slate-200 shadow-sm transition hover:shadow-md">
                  {/* Card header */}
                  <div className="flex items-start justify-between p-4 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                        <BookOpen className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="text-sm font-bold leading-tight text-slate-900">{tb.subject}</h3>
                        <p className="text-xs text-slate-500">{tb.className}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleStudyList(tb.id)}
                      className={cn(
                        'rounded-lg p-1.5 transition',
                        inStudyList ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-300 hover:bg-slate-100 hover:text-slate-400',
                      )}
                      title={inStudyList ? 'Remove from Study List' : 'Add to Study List'}
                    >
                      <Star className={cn('h-5 w-5', inStudyList && 'fill-amber-400 text-amber-400')} />
                    </button>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                    <Badge variant="secondary" className="text-xs">{tb.medium}</Badge>
                    <Badge variant="outline" className="text-xs">{tb.board}</Badge>
                  </div>

                  {/* Source label */}
                  <div className="px-4 pb-3">
                    <p className="text-xs text-slate-400">
                      {language === 'ml' ? 'സ്രോതസ്സ്: SCERT കേരള' : 'Source: SCERT Kerala'}
                    </p>
                  </div>

                  {/* Buttons */}
                  <div className="mt-auto flex gap-2 p-4 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenTextbook(tb)}
                      className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      {language === 'ml' ? 'പുസ്തകം തുറക്കുക' : 'Open Textbook'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAskPadanamithra(tb)}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Bot className="mr-1.5 h-3.5 w-3.5" />
                      {language === 'ml' ? 'ചോദിക്കുക' : 'Ask Padanamithra'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* My Study List section */}
        {studyList.length > 0 && (
          <div className="mt-10">
            <div className="mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              <h2 className="text-lg font-bold text-slate-900">
                {language === 'ml' ? 'എന്റെ പഠന പട്ടിക' : 'My Study List'}
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TEXTBOOKS.filter((tb) => studyList.includes(tb.id)).map((tb) => (
                <Card key={`sl-${tb.id}`} className="flex items-center justify-between border-amber-200 bg-amber-50/30 p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                      <BookOpen className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{tb.subject}</p>
                      <p className="text-xs text-slate-500">{tb.className} · {tb.medium}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="ghost" onClick={() => handleOpenTextbook(tb)} className="h-8 px-2 text-blue-600">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleStudyList(tb.id)} className="h-8 px-2 text-amber-500">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
