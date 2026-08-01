// Learning Curve Engine — spaced repetition system for long-term retention.
// Uses active recall and adaptive scheduling based on student performance.

import { supabase } from './supabaseClient';
import { loadJSON, saveJSON, STORAGE_KEYS } from './storage';
import type { StudentProfile } from './types';

// ---- Types ----

export type RetentionStatus = 'learning' | 'reviewing' | 'retained' | 'needs_reinforcement';
export type ReviewResult = 'correct' | 'incorrect' | 'partial';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface LearningCurveItem {
  id: string;
  user_id: string;
  subject: string;
  chapter: string;
  topic: string;
  reason: string;
  difficulty: Difficulty;
  created_at: string;
  next_review_at: string;
  review_interval_days: number;
  review_count: number;
  retention_status: RetentionStatus;
}

export interface LearningCurveReview {
  id: string;
  item_id: string;
  response: string;
  result: ReviewResult;
  reviewed_at: string;
  next_review_at: string;
}

export interface LearningCurveSummary {
  dueToday: number;
  needsPractice: number;
  mastered: number;
  total: number;
  dueItems: LearningCurveItem[];
  allItems: LearningCurveItem[];
}

// ---- Spaced Repetition Schedule ----
// Standard intervals: Day 1, 3, 7, 14, 30
// Adaptive intervals for struggling students: Day 1, 2, 4, 7, 14

const STANDARD_INTERVALS = [1, 3, 7, 14, 30];
const ACCELERATED_INTERVALS = [1, 2, 4, 7, 14];
const STRUGGLING_INTERVALS = [1, 1, 2, 4, 7];

function getNextInterval(reviewCount: number, performance: 'good' | 'average' | 'poor'): number {
  const intervals = performance === 'poor' ? STRUGGLING_INTERVALS
    : performance === 'average' ? ACCELERATED_INTERVALS
    : STANDARD_INTERVALS;

  const idx = Math.min(reviewCount, intervals.length - 1);
  return intervals[idx];
}

function computeRetentionStatus(reviewCount: number, lastResult: ReviewResult | null): RetentionStatus {
  if (reviewCount === 0) return 'learning';
  if (lastResult === 'incorrect') return 'needs_reinforcement';
  if (reviewCount >= 4 && lastResult === 'correct') return 'retained';
  if (reviewCount >= 1) return 'reviewing';
  return 'learning';
}

// ---- API Functions ----

function getUserId(): string | null {
  const user = loadJSON<{ email: string } | null>(STORAGE_KEYS.currentUser, null);
  if (!user) return null;
  return user.email.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function addToLearningCurve(params: {
  subject: string;
  chapter: string;
  topic: string;
  reason?: string;
  difficulty?: Difficulty;
}): Promise<{ ok: boolean; error?: string }> {
  const userId = getUserId();
  if (!userId) return { ok: false, error: 'Not logged in' };

  // Check if item already exists for this topic
  const { data: existing } = await supabase
    .from('learning_curve_items')
    .select('id')
    .eq('user_id', userId)
    .eq('topic', params.topic)
    .eq('chapter', params.chapter)
    .maybeSingle();

  if (existing) {
    // Already in learning curve — update difficulty if needed
    await supabase
      .from('learning_curve_items')
      .update({
        difficulty: params.difficulty || 'medium',
        next_review_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    return { ok: true };
  }

  const { error } = await supabase
    .from('learning_curve_items')
    .insert({
      user_id: userId,
      subject: params.subject,
      chapter: params.chapter,
      topic: params.topic,
      reason: params.reason || 'manual',
      difficulty: params.difficulty || 'medium',
      next_review_at: new Date().toISOString(),
      review_interval_days: 1,
      review_count: 0,
      retention_status: 'learning',
    });

  return { ok: !error, error: error?.message };
}

export async function getLearningCurveItems(): Promise<LearningCurveItem[]> {
  const userId = getUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('learning_curve_items')
    .select('*')
    .eq('user_id', userId)
    .order('next_review_at', { ascending: true });

  if (error || !data) return [];
  return data as LearningCurveItem[];
}

export async function getLearningCurveSummary(): Promise<LearningCurveSummary> {
  const items = await getLearningCurveItems();
  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const dueItems = items.filter((item) => new Date(item.next_review_at) <= todayEnd);
  const needsPractice = items.filter((item) =>
    item.retention_status === 'needs_reinforcement' || item.retention_status === 'reviewing'
  );
  const mastered = items.filter((item) => item.retention_status === 'retained');

  return {
    dueToday: dueItems.length,
    needsPractice: needsPractice.length,
    mastered: mastered.length,
    total: items.length,
    dueItems,
    allItems: items,
  };
}

export async function recordReview(params: {
  itemId: string;
  response: string;
  result: ReviewResult;
}): Promise<{ nextReviewAt: string; newStatus: RetentionStatus; ok: boolean }> {
  const userId = getUserId();
  if (!userId) return { nextReviewAt: new Date().toISOString(), newStatus: 'learning', ok: false };

  // Get current item
  const { data: item } = await supabase
    .from('learning_curve_items')
    .select('*')
    .eq('id', params.itemId)
    .maybeSingle();

  if (!item) return { nextReviewAt: new Date().toISOString(), newStatus: 'learning', ok: false };

  const newReviewCount = item.review_count + 1;

  // Determine performance level
  let performance: 'good' | 'average' | 'poor';
  if (params.result === 'correct') performance = 'good';
  else if (params.result === 'partial') performance = 'average';
  else performance = 'poor';

  // Calculate next interval
  const intervalDays = getNextInterval(newReviewCount - 1, performance);
  const nextReviewAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000).toISOString();

  // Determine new retention status
  const newStatus = computeRetentionStatus(newReviewCount, params.result);

  // Update the item
  await supabase
    .from('learning_curve_items')
    .update({
      review_count: newReviewCount,
      next_review_at: nextReviewAt,
      review_interval_days: intervalDays,
      retention_status: newStatus,
    })
    .eq('id', params.itemId);

  // Record the review
  await supabase
    .from('learning_curve_reviews')
    .insert({
      item_id: params.itemId,
      user_id: userId,
      response: params.response,
      result: params.result,
      reviewed_at: new Date().toISOString(),
      next_review_at: nextReviewAt,
    });

  return { nextReviewAt, newStatus, ok: true };
}

export async function removeFromLearningCurve(itemId: string): Promise<boolean> {
  const userId = getUserId();
  if (!userId) return false;

  const { error } = await supabase
    .from('learning_curve_items')
    .delete()
    .eq('id', itemId)
    .eq('user_id', userId);

  return !error;
}

// ---- Active Recall Questions ----
// Generate recall questions for each topic based on the concept database

export function generateRecallQuestion(subject: string, chapter: string, topic: string): string {
  const lower = topic.toLowerCase();

  if (lower.includes('velocity')) {
    return "Without looking at your notes: What is velocity, and how is it different from speed?";
  }
  if (lower.includes('speed')) {
    return "Without looking at your notes: What is speed? What is its formula?";
  }
  if (lower.includes('acceleration')) {
    return "Without looking at your notes: What is acceleration? What is its SI unit?";
  }
  if (lower.includes('gravity') || lower.includes('gravitation')) {
    return "Without looking at your notes: What is gravity? What is the value of g on Earth?";
  }
  if (lower.includes('newton') || lower.includes('force') || lower.includes('f=ma')) {
    return "Without looking at your notes: State Newton's Second Law of Motion. What is the formula?";
  }
  if (lower.includes('photosynthesis')) {
    return "Without looking at your notes: What is photosynthesis? Write the balanced equation.";
  }
  if (lower.includes('cell')) {
    return "Without looking at your notes: What is the cell? Name three organelles and their functions.";
  }
  if (lower.includes('ph')) {
    return "Without looking at your notes: What is the pH scale? What pH is neutral, acidic, and basic?";
  }
  if (lower.includes('atom')) {
    return "Without looking at your notes: What are the three subatomic particles? Where is each located?";
  }
  if (lower.includes('ohm')) {
    return "Without looking at your notes: State Ohm's Law. What is the formula?";
  }
  if (lower.includes('pythagoras')) {
    return "Without looking at your notes: State the Pythagorean theorem. What is the formula?";
  }
  if (lower.includes('trigon')) {
    return "Without looking at your notes: What are the three basic trigonometric ratios? Write their formulas.";
  }
  if (lower.includes('energy')) {
    return "Without looking at your notes: What is kinetic energy? What is potential energy? Write both formulas.";
  }
  if (lower.includes('sound')) {
    return "Without looking at your notes: What is sound? Does it need a medium? What is the speed of sound in air?";
  }

  return `Without looking at your notes: Explain what ${topic} is and state its key concept or formula.`;
}

// ---- Evaluate Recall Response ----

export function evaluateRecallResponse(topic: string, response: string): {
  result: ReviewResult;
  feedback: string;
  quickReview: string;
} {
  const lower = response.toLowerCase().trim();
  const words = lower.split(/\s+/).filter(Boolean);

  // Very short answers are likely incorrect
  if (words.length < 3) {
    return {
      result: 'incorrect',
      feedback: "Looks like this concept needs another review. That's okay — let's go through it again.",
      quickReview: getQuickReview(topic),
    };
  }

  // Check for key terms based on topic
  const keyTermsMap: Record<string, string[]> = {
    velocity: ['direction', 'vector', 'displacement', 'rate'],
    speed: ['distance', 'time', 'scalar', 'rate'],
    acceleration: ['change', 'velocity', 'rate', 'm/s', 'unit'],
    gravity: ['attraction', 'force', 'earth', 'mass', '9.8'],
    newton: ['force', 'mass', 'acceleration', 'f=ma', 'f = ma'],
    photosynthesis: ['light', 'chlorophyll', 'chloroplast', 'oxygen', 'glucose', 'carbon dioxide'],
    cell: ['nucleus', 'membrane', 'mitochondria', 'organelle', 'unit'],
    ph: ['7', 'neutral', 'acid', 'base', 'scale', 'hydrogen'],
    atom: ['proton', 'neutron', 'electron', 'nucleus'],
    ohm: ['voltage', 'current', 'resistance', 'v=ir', 'v = ir'],
    pythagoras: ['hypotenuse', 'square', 'right', 'triangle', 'c2', 'a2', 'b2'],
    trigon: ['sin', 'cos', 'tan', 'opposite', 'adjacent', 'hypotenuse', 'ratio'],
    energy: ['kinetic', 'potential', 'capacity', 'work', 'conservation'],
    sound: ['wave', 'medium', 'longitudinal', 'frequency', 'amplitude'],
  };

  const topicKey = Object.keys(keyTermsMap).find((k) => topic.toLowerCase().includes(k));
  const keyTerms = topicKey ? keyTermsMap[topicKey] : [];

  if (keyTerms.length > 0) {
    const matchedTerms = keyTerms.filter((t) => lower.includes(t.toLowerCase()));

    if (matchedTerms.length >= 3) {
      return {
        result: 'correct',
        feedback: "Great! You remembered it. 🎉 Your understanding is solid.",
        quickReview: '',
      };
    }
    if (matchedTerms.length >= 1) {
      return {
        result: 'partial',
        feedback: "You're on the right track, but some key points are missing. Let's review the full concept.",
        quickReview: getQuickReview(topic),
      };
    }
  }

  // Generic check: if the response is long and has some substance
  if (words.length >= 15) {
    return {
      result: 'partial',
      feedback: "You have some understanding, but let's make sure you have the key details right.",
      quickReview: getQuickReview(topic),
    };
  }

  return {
    result: 'incorrect',
    feedback: "Looks like this concept needs another review. That's okay — let's go through it again.",
    quickReview: getQuickReview(topic),
  };
}

export function getQuickReview(topic: string): string {
  const reviews: Record<string, string> = {
    velocity: 'Velocity = displacement ÷ time. It is a vector — it has both magnitude (speed) and direction. Speed is scalar (magnitude only).',
    speed: 'Speed = distance ÷ time. It is a scalar quantity — it only has magnitude, no direction.',
    acceleration: 'Acceleration = change in velocity ÷ time = (v - u) ÷ t. SI unit: m/s². Positive = speeding up, negative = slowing down.',
    gravity: 'Gravity is the force of attraction that Earth exerts on objects. g ≈ 9.8 m/s². Weight = mass × g.',
    newton: "Newton's Second Law: F = ma. Force equals mass times acceleration. SI unit of force: newton (N).",
    photosynthesis: '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂ (using sunlight and chlorophyll in chloroplasts). Produces glucose and oxygen.',
    cell: 'The cell is the basic unit of life. Key organelles: nucleus (DNA), mitochondria (energy/ATP), ribosomes (protein), membrane (controls entry/exit).',
    ph: 'pH scale: 0-14. pH 7 = neutral. Below 7 = acidic (more H⁺). Above 7 = basic (more OH⁻).',
    atom: 'Atoms have a nucleus (protons + neutrons) and electrons. Atomic number = protons. Mass number = protons + neutrons.',
    ohm: "Ohm's Law: V = IR. Voltage = Current × Resistance. Unit of resistance: ohm (Ω).",
    pythagoras: 'In a right triangle: c² = a² + b². The square of the hypotenuse = sum of squares of the other two sides.',
    trigon: 'sin = opposite/hypotenuse, cos = adjacent/hypotenuse, tan = opposite/adjacent. SOH CAH TOA.',
    energy: 'KE = ½mv² (kinetic). PE = mgh (potential). Energy is conserved — it transforms but is never created or destroyed.',
    sound: 'Sound is a longitudinal mechanical wave. It needs a medium. Speed in air ≈ 343 m/s. Pitch = frequency, loudness = amplitude.',
  };

  const key = Object.keys(reviews).find((k) => topic.toLowerCase().includes(k));
  return key ? reviews[key] : `Review the key concept and formula for ${topic}.`;
}

// ---- Difficulty Detection ----
// Check if a topic should be suggested for Learning Curve based on signals

export interface DifficultySignal {
  topic: string;
  chapter: string;
  subject: string;
  signal: string;
  shouldSuggest: boolean;
}

// Auto-add topics to Learning Curve based on difficulty signals.
// Called after mock tests, AI tutor sessions, and practice activities.
// Only adds topics with strong difficulty signals (not every wrong answer).

export async function autoAddFromDifficultySignals(): Promise<number> {
  const signals = checkDifficultySignals();
  let added = 0;

  for (const signal of signals) {
    if (signal.shouldSuggest && signal.topic) {
      const result = await addToLearningCurve({
        subject: signal.subject,
        chapter: signal.chapter,
        topic: signal.topic,
        reason: signal.signal,
        difficulty: 'hard',
      });
      if (result.ok) added++;
    }
  }

  return added;
}

export function checkDifficultySignals(): DifficultySignal[] {
  const signals: DifficultySignal[] = [];

  // Check answer history for repeated wrong answers
  const answerHistory = loadJSON<import('./types').AnswerRecord[]>(STORAGE_KEYS.answerHistory, []);
  const wrongByTopic: Record<string, import('./types').AnswerRecord[]> = {};

  for (const ans of answerHistory) {
    if (!ans.isCorrect) {
      const key = `${ans.subject}-${ans.chapter}-${ans.topic}`;
      if (!wrongByTopic[key]) wrongByTopic[key] = [];
      wrongByTopic[key].push(ans);
    }
  }

  for (const [key, records] of Object.entries(wrongByTopic)) {
    if (records.length >= 2) {
      const first = records[0];
      signals.push({
        topic: first.topic,
        chapter: first.chapter,
        subject: first.subject,
        signal: `You've gotten ${records.length} questions wrong on this topic`,
        shouldSuggest: true,
      });
    }
  }

  // Check concept gaps
  const conceptGaps = loadJSON<import('./types').ConceptGap[]>(STORAGE_KEYS.conceptGaps, []);
  for (const gap of conceptGaps) {
    signals.push({
      topic: gap.topic,
      chapter: gap.chapter,
      subject: gap.subject,
      signal: gap.description,
      shouldSuggest: true,
    });
  }

  // Check learning signals from guided learning
  const learningSignals = loadJSON<{ topic: string; chapter: string; subject: string; hintLevelsUsed: number; correct: boolean }[]>(STORAGE_KEYS.learningSignals, []);
  const signalsByTopic: Record<string, typeof learningSignals> = {};

  for (const sig of learningSignals) {
    const key = `${sig.subject}-${sig.topic}`;
    if (!signalsByTopic[key]) signalsByTopic[key] = [];
    signalsByTopic[key].push(sig);
  }

  for (const [key, sigs] of Object.entries(signalsByTopic)) {
    const totalHints = sigs.reduce((sum, s) => sum + s.hintLevelsUsed, 0);
    if (totalHints >= 3 || sigs.filter((s) => !s.correct).length >= 2) {
      const first = sigs[0];
      // Avoid duplicates
      if (!signals.find((s) => s.topic === first.topic && s.chapter === first.chapter)) {
        signals.push({
          topic: first.topic,
          chapter: first.chapter,
          subject: first.subject,
          signal: `You've needed multiple hints on this topic`,
          shouldSuggest: true,
        });
      }
    }
  }

  return signals;
}
