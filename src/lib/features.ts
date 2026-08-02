import {
  Bot,
  Mic,
  BookMarked,
  Users,
  Route,
  Timer,
  FileText,
  Layers,
  CalendarDays,
  TrendingUp,
  Brain,
  Compass,
  Download,
  MessageSquareHeart,
  Video,
  NotebookPen,
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
  // ---- FREE LEARNING (1–12) ----
  {
    id: 'ai-tutor',
    title: 'AI Tutor Chatbot',
    description: 'Personalized guidance for any topic.',
    icon: Bot,
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
  {
    id: 'textbook-hub',
    title: 'Textbook Hub',
    description: 'Find official textbooks and ask questions.',
    icon: BookMarked,
    premium: false,
    accent: 'bg-blue-100 text-blue-600',
  },
  {
    id: 'peer-rooms',
    title: 'Peer Study Groups',
    description: 'Join a room and learn with study buddies.',
    icon: Users,
    premium: false,
    accent: 'bg-fuchsia-100 text-fuchsia-600',
  },
  {
    id: 'learning-path',
    title: 'My Learning Path',
    description: 'Your adaptive path through mastered and next topics.',
    icon: Route,
    premium: false,
    accent: 'bg-indigo-100 text-indigo-600',
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
    id: 'short-notes',
    title: 'AI Short Notes',
    description: 'Generate concise bullet notes for any chapter.',
    icon: FileText,
    premium: false,
    accent: 'bg-emerald-100 text-emerald-600',
  },
  {
    id: 'flashcards',
    title: 'Revision Flash Cards',
    description: 'Quickly revise important concepts with flash cards.',
    icon: Layers,
    premium: false,
    accent: 'bg-violet-100 text-violet-600',
  },
  {
    id: 'timetable',
    title: 'Time Table Setter',
    description: 'Create and manage your weekly study schedule.',
    icon: CalendarDays,
    premium: false,
    accent: 'bg-cyan-100 text-cyan-600',
  },
  {
    id: 'pyq-predictor',
    title: 'PYQ Predictor',
    description: 'Important topics based on previous-year trends.',
    icon: TrendingUp,
    premium: false,
    accent: 'bg-teal-100 text-teal-600',
  },
  {
    id: 'focus-timer',
    title: 'Focus Timer',
    description: 'Distraction-free study mode with timed sessions.',
    icon: Brain,
    premium: false,
    accent: 'bg-amber-100 text-amber-600',
  },
  {
    id: 'career',
    title: 'Career Guidance',
    description: 'Explore career paths based on your interests.',
    icon: Compass,
    premium: false,
    accent: 'bg-amber-100 text-amber-600',
  },

  // ---- PADANAMITHRA PRO (13–16) ----
  {
    id: 'offline',
    title: 'Offline Mode — PRO',
    description: 'Download chats, voice, and videos for offline study.',
    icon: Download,
    premium: true,
    accent: 'bg-emerald-100 text-emerald-600',
  },
  {
    id: 'mentoring',
    title: 'Personal Mentor — PRO',
    description: 'Continuous guidance from a dedicated mentor.',
    icon: MessageSquareHeart,
    premium: true,
    accent: 'bg-rose-100 text-rose-600',
  },
  {
    id: 'video-classes',
    title: 'Live Video Class — PRO',
    description: 'Join scheduled live classes with your teachers.',
    icon: Video,
    premium: true,
    accent: 'bg-indigo-100 text-indigo-600',
  },
  {
    id: 'pro-notes',
    title: 'Notes by Professionals — PRO',
    description: 'Professionally prepared study notes from expert teachers.',
    icon: NotebookPen,
    premium: true,
    accent: 'bg-amber-100 text-amber-600',
  },
];
