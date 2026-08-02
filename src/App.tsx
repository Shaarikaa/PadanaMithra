import { useEffect } from 'react';
import { AppProvider, useApp } from '@/lib/AppContext';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { AITutorPage } from '@/pages/AITutorPage';
import { ShortNotesPage } from '@/pages/ShortNotesPage';
import { MockTestPage } from '@/pages/MockTestPage';
import { FlashcardsPage } from '@/pages/FlashcardsPage';
import { PYQPredictorPage } from '@/pages/PYQPredictorPage';
import { CareerPage } from '@/pages/CareerPage';
import { TimetablePage } from '@/pages/TimetablePage';
import { PeerRoomsPage } from '@/pages/PeerRoomsPage';
import { VideoClassesPage } from '@/pages/VideoClassesPage';
import { MentoringPage } from '@/pages/MentoringPage';
import { OfflinePage } from '@/pages/OfflinePage';
import { ProNotesPage } from '@/pages/ProNotesPage';
import { LearningPathPage } from '@/pages/LearningPathPage';
import { TeachBackPage } from '@/pages/TeachBackPage';
import { FocusTimerPage } from '@/pages/FocusTimerPage';
import { TextbookHubPage } from '@/pages/TextbookHubPage';
import { ParentLoginPage } from '@/pages/ParentLoginPage';
import { ParentDashboardPage } from '@/pages/ParentDashboardPage';
import { FEATURES } from '@/lib/features';
import { GraduationCap } from 'lucide-react';

const FEATURE_PAGES: Record<string, () => React.ReactElement | null> = {
  'ai-tutor': AITutorPage,
  'short-notes': ShortNotesPage,
  'mock-test': MockTestPage,
  'flashcards': FlashcardsPage,
  'pyq-predictor': PYQPredictorPage,
  'career': CareerPage,
  'timetable': TimetablePage,
  'peer-rooms': PeerRoomsPage,
  'video-classes': VideoClassesPage,
  'mentoring': MentoringPage,
  'offline': OfflinePage,
  'pro-notes': ProNotesPage,
  'learning-path': LearningPathPage,
  'teach-back': TeachBackPage,
  'focus-timer': FocusTimerPage,
  'textbook-hub': TextbookHubPage,
};

// Pages that require authentication
const PROTECTED_PAGES = new Set([
  'dashboard', 'profile', 'onboarding', 'feature',
]);

function Router() {
  const { page, refreshPremium, user, authLoading, navigate } = useApp();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      refreshPremium();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refreshPremium]);

  // Protected route guard: redirect to login if not authenticated
  useEffect(() => {
    if (authLoading) return;
    if (PROTECTED_PAGES.has(page.name) && !user) {
      navigate({ name: 'login' });
    }
  }, [page, user, authLoading, navigate]);

  // Show loading screen while restoring session
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 animate-pulse">
            <GraduationCap className="h-8 w-8" />
          </div>
          <p className="text-sm text-slate-500">Loading Padanamithra...</p>
        </div>
      </div>
    );
  }

  if (page.name === 'landing') return <LandingPage />;
  if (page.name === 'login') return <LoginPage />;
  if (page.name === 'signup') return <SignupPage />;
  if (page.name === 'parent-login') return <ParentLoginPage />;
  if (page.name === 'parent-dashboard') return <ParentDashboardPage />;

  // Protected pages — only render if logged in
  if (!user) return <LoginPage />;

  if (page.name === 'onboarding') return <OnboardingPage />;
  if (page.name === 'profile') return <ProfilePage />;
  if (page.name === 'dashboard') return <DashboardPage />;
  if (page.name === 'feature') {
    const feature = FEATURES.find((f) => f.id === page.id);
    if (feature) {
      const Page = FEATURE_PAGES[feature.id];
      if (Page) return <Page />;
    }
  }
  return <LandingPage />;
}

export default function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}
