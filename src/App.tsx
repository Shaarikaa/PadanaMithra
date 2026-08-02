import { useEffect } from 'react';
import { AppProvider, useApp } from '@/lib/AppContext';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { AITutorPage } from '@/pages/AITutorPage';
import { DoubtSolverPage } from '@/pages/DoubtSolverPage';
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
import { ParentLoginPage } from '@/pages/ParentLoginPage';
import { ParentDashboardPage } from '@/pages/ParentDashboardPage';
import { FEATURES } from '@/lib/features';

const FEATURE_PAGES: Record<string, () => React.ReactElement | null> = {
  'ai-tutor': AITutorPage,
  'doubt-solver': DoubtSolverPage,
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
};

function Router() {
  const { page, refreshPremium } = useApp();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      refreshPremium();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refreshPremium]);

  if (page.name === 'landing') return <LandingPage />;
  if (page.name === 'login') return <LoginPage />;
  if (page.name === 'signup') return <SignupPage />;
  if (page.name === 'onboarding') return <OnboardingPage />;
  if (page.name === 'profile') return <ProfilePage />;
  if (page.name === 'dashboard') return <DashboardPage />;
  if (page.name === 'parent-login') return <ParentLoginPage />;
  if (page.name === 'parent-dashboard') return <ParentDashboardPage />;
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
