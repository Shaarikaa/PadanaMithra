export interface User {
  name: string;
  email: string;
  password: string;
}

export interface StudentProfile {
  userId: string;
  fullName: string;
  dateOfBirth: string; // ISO date string
  board: string;
  classLevel: string;
  selectedSubjects: string[];
  currentSubject: string;
  currentChapter: string;
  currentTopic: string;
  onboardingCompleted: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ClassInfo {
  id: string;
  label: string;
  board: string;
  available: boolean;
}

export interface SubjectInfo {
  id: string;
  label: string;
  icon: string;
  emoji: string;
  accent: string;
}

export interface ChapterInfo {
  name: string;
  topics: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: number;
}

export interface TimetableEntry {
  id: string;
  day: string;
  subject: string;
  startTime: string;
  endTime: string;
}

export interface MockQuestion {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
}

export interface PredictedQuestion {
  id: string;
  question: string;
  frequency: number;
}

export type FeatureId =
  | 'ai-tutor'
  | 'doubt-solver'
  | 'short-notes'
  | 'mock-test'
  | 'flashcards'
  | 'pyq-predictor'
  | 'career'
  | 'timetable'
  | 'peer-rooms'
  | 'video-classes'
  | 'mentoring'
  | 'offline'
  | 'pro-notes'
  | 'learning-path'
  | 'teach-back'
  | 'learning-curve'
  | 'focus-timer';

// ---- Learning Intelligence Types ----

export interface AnswerRecord {
  questionId: string;
  subject: string;
  chapter: string;
  topic: string;
  question: string;
  selectedOption: number;
  correctOption: number;
  isCorrect: boolean;
  timestamp: number;
}

export interface ConceptGap {
  subject: string;
  chapter: string;
  topic: string;
  description: string;
  relatedQuestionIds: string[];
  missedCount: number;
  firstDetected: number;
  lastDetected: number;
}

export interface TopicMastery {
  subject: string;
  chapter: string;
  topic: string;
  status: 'mastered' | 'current' | 'in-progress' | 'weak' | 'not-started';
  correctCount: number;
  totalCount: number;
}

export interface LearningDNAIndicator {
  label: string;
  score: number; // 0-100, only from real data
  hasData: boolean;
}

export interface LearningDNASubject {
  subject: string;
  indicators: LearningDNAIndicator[];
  hasData: boolean;
}

export interface LearningPathStep {
  subject: string;
  chapter: string;
  topic: string;
  status: 'mastered' | 'current' | 'weak' | 'not-started';
  recommendation?: string;
}

export interface NextBestStep {
  hasData: boolean;
  improvingTopic?: string;
  weakTopic?: string;
  missedCount?: number;
  recommendation?: string;
}

export interface TeachBackEvaluation {
  understanding: 'Strong' | 'Developing' | 'Needs Review';
  explainedWell: string[];
  toImprove: string[];
  oneThingToRemember: string;
  coverageScore: number; // 0-100
}

export interface TeachBackSession {
  id: string;
  subject: string;
  chapter: string;
  topic: string;
  studentResponse: string;
  evaluation: TeachBackEvaluation;
  timestamp: number;
}

// ---- Parent Dashboard Types ----

export interface ParentProfile {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface ParentStudentConnection {
  id: string;
  parentId: string;
  studentId: string;
  studentName: string;
  status: 'active' | 'disconnected';
  createdAt: string;
}

export interface MonthlyReport {
  id: string;
  studentUserId: string;
  studentName: string;
  parentId: string;
  month: number;
  year: number;
  studyTimeMinutes: number;
  subjectsStudied: number;
  topicsStudied: number;
  questionsPracticed: number;
  practiceSessions: number;
  revisionSessions: number;
  subjectActivity: Record<string, number>;
  summary: string;
  reportStatus: 'pending' | 'sent' | 'failed';
  emailSentAt: string | null;
  createdAt: string;
}
