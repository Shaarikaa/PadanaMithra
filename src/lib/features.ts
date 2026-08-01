import {
  Bot,
  ScanLine,
  FileText,
  Timer,
  Layers,
  TrendingUp,
  Compass,
  CalendarDays,
  Users,
  Video,
  MessageSquareHeart,
  Download,
  NotebookPen,
  Route,
  Mic,
  type LucideIcon,
} from 'lucide-react';
import type { FeatureId } from './types';

export interface FeatureConfig {
  id: FeatureId;
  title: string;
  description: string;
  icon: LucideIcon;
  premium: boolean;
  accent: string;
}

export const FEATURES: FeatureConfig[] = [
  {
    id: 'ai-tutor',
    title: 'AI Tutor Chatbot',
    description: 'Ask any topic and get an instant explanation.',
    icon: Bot,
    premium: false,
    accent: 'bg-indigo-100 text-indigo-600',
  },
  {
    id: 'doubt-solver',
    title: 'Scanned Doubt Solver',
    description: 'Upload a photo of your solution for instant feedback.',
    icon: ScanLine,
    premium: false,
    accent: 'bg-rose-100 text-rose-600',
  },
  {
    id: 'short-notes',
    title: 'AI Short Notes',
    description: 'Generate 10 bullet notes for any chapter.',
    icon: FileText,
    premium: false,
    accent: 'bg-emerald-100 text-emerald-600',
  },
  {
    id: 'mock-test',
    title: 'Free Mock Test',
    description: '10 MCQs with a 10-minute timer and score.',
    icon: Timer,
    premium: false,
    accent: 'bg-sky-100 text-sky-600',
  },
  {
    id: 'flashcards',
    title: 'Revision Flashcards',
    description: 'Swipe through question-answer flashcards.',
    icon: Layers,
    premium: false,
    accent: 'bg-violet-100 text-violet-600',
  },
  {
    id: 'pyq-predictor',
    title: 'PYQ Predictor',
    description: 'Top 10 most likely exam questions.',
    icon: TrendingUp,
    premium: false,
    accent: 'bg-teal-100 text-teal-600',
  },
  {
    id: 'career',
    title: 'Career Guidance',
    description: 'Advice for after 10th, 12th, and engineering.',
    icon: Compass,
    premium: false,
    accent: 'bg-amber-100 text-amber-600',
  },
  {
    id: 'timetable',
    title: 'Time Table Setter',
    description: 'Plan your week and save it automatically.',
    icon: CalendarDays,
    premium: false,
    accent: 'bg-cyan-100 text-cyan-600',
  },
  {
    id: 'peer-rooms',
    title: 'Peer Study Rooms',
    description: 'Join a room and chat with study buddies.',
    icon: Users,
    premium: false,
    accent: 'bg-fuchsia-100 text-fuchsia-600',
  },
  {
    id: 'video-classes',
    title: 'Recorded Video Classes',
    description: 'Watch expert video lessons anytime.',
    icon: Video,
    premium: true,
    accent: 'bg-indigo-100 text-indigo-600',
  },
  {
    id: 'mentoring',
    title: 'AI + Human Mentoring',
    description: 'Book a 1-on-1 mentor session.',
    icon: MessageSquareHeart,
    premium: true,
    accent: 'bg-rose-100 text-rose-600',
  },
  {
    id: 'offline',
    title: 'Offline Mode',
    description: 'Download chats, voice, and videos.',
    icon: Download,
    premium: true,
    accent: 'bg-emerald-100 text-emerald-600',
  },
  {
    id: 'pro-notes',
    title: 'Notes by Professionals',
    description: 'Curated PDF notes from expert teachers.',
    icon: NotebookPen,
    premium: true,
    accent: 'bg-amber-100 text-amber-600',
  },
  {
    id: 'learning-path',
    title: 'My Learning Path',
    description: 'Your adaptive path — mastered, current, and next topics.',
    icon: Route,
    premium: false,
    accent: 'bg-indigo-100 text-indigo-600',
  },
  {
    id: 'teach-back',
    title: 'Teach It Back',
    description: 'Explain a concept in your own words to check understanding.',
    icon: Mic,
    premium: false,
    accent: 'bg-violet-100 text-violet-600',
  },
];
