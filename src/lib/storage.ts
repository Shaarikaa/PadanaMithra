// Lightweight localStorage helpers used across the app.
// The app is a prototype — localStorage simulates login + persistence.

const PREFIX = 'padanamithra:';

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore quota errors in prototype */
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

export const STORAGE_KEYS = {
  users: 'users',
  currentUser: 'currentUser',
  timetable: 'timetable',
  flashcardProgress: 'flashcardProgress',
  mockTestScores: 'mockTestScores',
  profiles: 'profiles',
  answerHistory: 'answerHistory',
  conceptGaps: 'conceptGaps',
  teachBackSessions: 'teachBackSessions',
  learningSignals: 'learningSignals',
  whatDoYouKnowEnabled: 'whatDoYouKnowEnabled',
  language: 'language',
} as const;
