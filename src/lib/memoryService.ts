// Memory Support service — handles data persistence to Supabase and
// curriculum-grounded content generation for memory-based learning.

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { getChaptersForSubject, getTopicsForChapter } from './curriculum';
import type { ChapterInfo } from './types';
import { generateTutorReply, translateReplyToMalayalam } from './mockData';
import { isMalayalamText, type Language } from './i18n';

export type MemorySubject = 'Physics' | 'Chemistry' | 'Biology' | 'Mathematics';
export const MEMORY_SUBJECTS: MemorySubject[] = ['Physics', 'Chemistry', 'Biology', 'Mathematics'];

export type MemoryStatus = 'learning' | 'remembered' | 'needs_review';
export type ActivityType = 'daily_activity' | 'review' | 'memory_cards' | 'visual_learning' | 'recall_practice' | 'progress';
export type RecallResult = 'correct' | 'correct_with_hint' | 'revealed' | 'incorrect';

export interface MemoryTopic {
  id: string;
  user_id: string;
  subject: string;
  class_level: string;
  chapter: string;
  topic: string;
  status: MemoryStatus;
  hint_count: number;
  correct_count: number;
  correct_after_hint: number;
  revealed_count: number;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  review_interval_days: number;
}

export interface MemorySession {
  id: string;
  user_id: string;
  subject: string;
  class_level: string;
  activity_type: ActivityType;
  topics_covered: string[];
  score: number;
  total: number;
  hints_used: number;
  created_at: string;
}

export interface MemoryProgressEntry {
  id: string;
  user_id: string;
  subject: string;
  topic_id: string;
  activity_type: ActivityType;
  result: RecallResult;
  hint_level_used: number;
  created_at: string;
}

export interface MemoryReview {
  id: string;
  user_id: string;
  topic_id: string;
  subject: string;
  scheduled_date: string;
  completed: boolean;
  result: string | null;
  completed_at: string | null;
}

export interface DailyActivity {
  chapter: string;
  topic: string;
  visualDescription: string;
  explanation: string;
  question: string;
  options: string[];
  answerIndex: number;
  feedback: string;
}

export interface MemoryCard {
  id: string;
  chapter: string;
  topic: string;
  front: string;
  back: string;
  visualDescription: string;
  hint: string;
}

export interface RecallQuestion {
  id: string;
  chapter: string;
  topic: string;
  question: string;
  answer: string;
  hints: string[];
}

export interface VisualLearningItem {
  chapter: string;
  topic: string;
  title: string;
  visualDescription: string;
  explanation: string;
}

// ---- User ID helper ----
function getUserId(): string | null {
  try {
    const raw = localStorage.getItem('padanamithra:currentUser');
    if (!raw) return null;
    const user = JSON.parse(raw) as { email: string };
    if (!user.email) return null;
    return user.email.toLowerCase().replace(/[^a-z0-9]/g, '');
  } catch {
    return null;
  }
}

// ---- Class level mapping ----
export function getClassLevelLabel(classId: string): string {
  const map: Record<string, string> = {
    'class-9': 'Class 9',
    'class-10': 'Class 10',
    'class-11': 'Class 11',
    'class-12': 'Class 12',
    'class-8': 'Class 8',
  };
  return map[classId] ?? classId;
}

// ---- Curriculum helpers ----
export function getChaptersForMemorySubject(classId: string, subject: MemorySubject): ChapterInfo[] {
  return getChaptersForSubject(classId, subject);
}

export function getAllTopicsForSubject(classId: string, subject: MemorySubject): { chapter: string; topic: string }[] {
  const chapters = getChaptersForSubject(classId, subject);
  const result: { chapter: string; topic: string }[] = [];
  for (const ch of chapters) {
    for (const t of ch.topics) {
      result.push({ chapter: ch.name, topic: t });
    }
  }
  return result;
}

// ---- Topic persistence ----
export async function fetchMemoryTopics(userId: string, subject?: MemorySubject): Promise<MemoryTopic[]> {
  if (!isSupabaseConfigured) return [];
  let query = supabase.from('memory_topics').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
  if (subject) query = query.eq('subject', subject);
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as MemoryTopic[];
}

export async function upsertMemoryTopic(
  userId: string,
  subject: MemorySubject,
  classLevel: string,
  chapter: string,
  topic: string,
): Promise<MemoryTopic | null> {
  if (!isSupabaseConfigured) return null;
  const { data: existing } = await supabase
    .from('memory_topics')
    .select('*')
    .eq('user_id', userId)
    .eq('subject', subject)
    .eq('chapter', chapter)
    .eq('topic', topic)
    .maybeSingle();

  if (existing) return existing as MemoryTopic;

  const { data, error } = await supabase
    .from('memory_topics')
    .insert({
      user_id: userId,
      subject,
      class_level: classLevel,
      chapter,
      topic,
      status: 'learning',
      next_review_at: new Date(Date.now() + 86400000).toISOString(),
    })
    .select('*')
    .maybeSingle();

  if (error || !data) return null;
  return data as MemoryTopic;
}

export async function updateMemoryTopic(
  topicId: string,
  updates: Partial<Pick<MemoryTopic, 'status' | 'hint_count' | 'correct_count' | 'correct_after_hint' | 'revealed_count' | 'last_reviewed_at' | 'next_review_at' | 'review_interval_days'>>,
): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase.from('memory_topics').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', topicId);
}

// ---- Progress recording ----
export async function recordProgress(
  userId: string,
  subject: MemorySubject,
  topicId: string,
  activityType: ActivityType,
  result: RecallResult,
  hintLevelUsed: number,
): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase.from('memory_progress').insert({
    user_id: userId,
    subject,
    topic_id: topicId,
    activity_type: activityType,
    result,
    hint_level_used: hintLevelUsed,
  });
}

// ---- Session recording ----
export async function recordSession(
  userId: string,
  subject: MemorySubject,
  classLevel: string,
  activityType: ActivityType,
  topicsCovered: string[],
  score: number,
  total: number,
  hintsUsed: number,
): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase.from('memory_sessions').insert({
    user_id: userId,
    subject,
    class_level: classLevel,
    activity_type: activityType,
    topics_covered: topicsCovered,
    score,
    total,
    hints_used: hintsUsed,
  });
}

// ---- Spaced review scheduling ----
export function computeNextReviewDate(intervalDays: number): string {
  return new Date(Date.now() + intervalDays * 86400000).toISOString();
}

export function getReviewInterval(status: MemoryStatus, currentInterval: number, result: RecallResult): number {
  if (result === 'correct') {
    return Math.min(Math.max(currentInterval * 2, 1), 30);
  }
  if (result === 'correct_with_hint') {
    return Math.max(currentInterval, 1);
  }
  if (result === 'revealed' || result === 'incorrect') {
    return 1;
  }
  return currentInterval;
}

export async function scheduleReview(
  userId: string,
  topicId: string,
  subject: MemorySubject,
  scheduledDate: string,
): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase.from('memory_reviews').insert({
    user_id: userId,
    topic_id: topicId,
    subject,
    scheduled_date: scheduledDate,
    completed: false,
  });
}

export async function fetchDueReviews(userId: string): Promise<MemoryReview[]> {
  if (!isSupabaseConfigured) return [];
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('memory_reviews')
    .select('*')
    .eq('user_id', userId)
    .eq('completed', false)
    .lte('scheduled_date', today)
    .order('scheduled_date', { ascending: true });
  if (error) return [];
  return (data ?? []) as MemoryReview[];
}

export async function fetchRecentSessions(userId: string, limit = 10): Promise<MemorySession[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('memory_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as MemorySession[];
}

// ---- Content generation ----
// Uses the existing AI system (generateTutorReply) to produce curriculum-grounded
// content. The context (class, subject, chapter, topic) is always passed so
// the AI stays within the correct subject and class.

export function generateDailyActivity(
  classLevel: string,
  subject: MemorySubject,
  chapter: string,
  topic: string,
  language: Language,
): DailyActivity {
  const context = { classLevel, subject, chapter, topic };
  const prompt = `Create a simple daily memory activity for a ${classLevel} student studying ${subject}.
Chapter: ${chapter}
Topic: ${topic}

Provide:
1. A simple visual description (what to visualize or draw)
2. A short, age-appropriate explanation (2-3 sentences)
3. A simple recognition/recall question with 3 options and the correct answer

Format:
VISUAL: ...
EXPLANATION: ...
QUESTION: ...
OPTION A: ...
OPTION B: ...
OPTION C: ...
ANSWER: (A|B|C)
FEEDBACK: ...`;

  const reply = generateTutorReply(prompt, context);

  const visual = extractField(reply, 'VISUAL');
  const explanation = extractField(reply, 'EXPLANATION');
  const question = extractField(reply, 'QUESTION');
  const options = [
    extractField(reply, 'OPTION A'),
    extractField(reply, 'OPTION B'),
    extractField(reply, 'OPTION C'),
  ].filter((o) => o.length > 0);
  const answerLetter = extractField(reply, 'ANSWER').trim().toUpperCase().charAt(0);
  const feedback = extractField(reply, 'FEEDBACK');

  const answerIndex = answerLetter === 'B' ? 1 : answerLetter === 'C' ? 2 : 0;

  const result: DailyActivity = {
    chapter,
    topic,
    visualDescription: visual || `Imagine the concept of ${topic} in ${chapter}.`,
    explanation: explanation || `This topic covers key ideas in ${chapter}.`,
    question: question || `Which best describes ${topic}?`,
    options: options.length >= 3 ? options : [`Option related to ${topic}`, `A different aspect`, `An unrelated concept`],
    answerIndex: options.length >= 3 ? answerIndex : 0,
    feedback: feedback || `Great effort! Keep practicing this topic.`,
  };

  if (language === 'ml') {
    result.explanation = translateToMalayalam(result.explanation);
    result.question = translateToMalayalam(result.question);
    result.options = result.options.map(translateToMalayalam);
    result.feedback = translateToMalayalam(result.feedback);
    result.visualDescription = translateToMalayalam(result.visualDescription);
  }

  return result;
}

export function generateMemoryCards(
  classLevel: string,
  subject: MemorySubject,
  chapter: string,
  topic: string,
  language: Language,
  count = 5,
): MemoryCard[] {
  const context = { classLevel, subject, chapter, topic };
  const cards: MemoryCard[] = [];
  const topics = getTopicsForChapter(classIdFromClassLevel(classLevel), subject, chapter);
  const topicList = topics.length > 0 ? topics : [topic];

  for (let i = 0; i < count; i++) {
    const cardTopic = topicList[i % topicList.length];
    const prompt = `Create a memory card for ${classLevel} ${subject}, chapter ${chapter}, topic ${cardTopic}.
Front: A simple question or term
Back: A clear, short answer (1-2 sentences)
Hint: A gentle hint that helps without revealing the answer

Format:
FRONT: ...
BACK: ...
HINT: ...
VISUAL: ...`;

    const reply = generateTutorReply(prompt, context);
    const front = extractField(reply, 'FRONT') || `What is ${cardTopic}?`;
    const back = extractField(reply, 'BACK') || `${cardTopic} is an important concept in ${chapter}.`;
    const hint = extractField(reply, 'HINT') || `Think about what ${cardTopic} relates to.`;
    const visual = extractField(reply, 'VISUAL') || `Visualize ${cardTopic} in context of ${chapter}.`;

    cards.push({
      id: `card-${i}-${Date.now()}`,
      chapter,
      topic: cardTopic,
      front: language === 'ml' ? translateToMalayalam(front) : front,
      back: language === 'ml' ? translateToMalayalam(back) : back,
      hint: language === 'ml' ? translateToMalayalam(hint) : hint,
      visualDescription: language === 'ml' ? translateToMalayalam(visual) : visual,
    });
  }

  return cards;
}

export function generateRecallQuestion(
  classLevel: string,
  subject: MemorySubject,
  chapter: string,
  topic: string,
  language: Language,
): RecallQuestion {
  const context = { classLevel, subject, chapter, topic };
  const prompt = `Create a recall practice question for ${classLevel} ${subject}, chapter ${chapter}, topic ${topic}.
Question: A question asking to identify or name something
Answer: The correct answer
Hint 1: A visual clue
Hint 2: A simple clue
Hint 3: A keyword or first letter

Format:
QUESTION: ...
ANSWER: ...
HINT 1: ...
HINT 2: ...
HINT 3: ...`;

  const reply = generateTutorReply(prompt, context);

  const question = extractField(reply, 'QUESTION') || `What is the key concept in ${topic}?`;
  const answer = extractField(reply, 'ANSWER') || topic;
  const hint1 = extractField(reply, 'HINT 1') || `Think about what ${topic} looks like.`;
  const hint2 = extractField(reply, 'HINT 2') || `It relates to ${chapter}.`;
  const hint3 = extractField(reply, 'HINT 3') || `It starts with "${answer.charAt(0)}".`;

  return {
    id: `recall-${Date.now()}`,
    chapter,
    topic,
    question: language === 'ml' ? translateToMalayalam(question) : question,
    answer: language === 'ml' ? translateToMalayalam(answer) : answer,
    hints: [
      language === 'ml' ? translateToMalayalam(hint1) : hint1,
      language === 'ml' ? translateToMalayalam(hint2) : hint2,
      language === 'ml' ? translateToMalayalam(hint3) : hint3,
    ],
  };
}

export function generateVisualLearningItems(
  classLevel: string,
  subject: MemorySubject,
  chapter: string,
  language: Language,
  count = 4,
): VisualLearningItem[] {
  const context = { classLevel, subject, chapter };
  const items: VisualLearningItem[] = [];
  const topics = getTopicsForChapter(classIdFromClassLevel(classLevel), subject, chapter);
  const topicList = topics.length > 0 ? topics : ['Key concept'];

  for (let i = 0; i < count; i++) {
    const t = topicList[i % topicList.length];
    const prompt = `Create a visual learning description for ${classLevel} ${subject}, chapter ${chapter}, topic ${t}.
Title: A short title
Visual: A description of what diagram or visual to imagine/draw
Explanation: How the visual helps understand the concept (2 sentences)

Format:
TITLE: ...
VISUAL: ...
EXPLANATION: ...`;

    const reply = generateTutorReply(prompt, context);
    const title = extractField(reply, 'TITLE') || t;
    const visual = extractField(reply, 'VISUAL') || `Draw a diagram showing ${t}.`;
    const explanation = extractField(reply, 'EXPLANATION') || `This visual helps you understand ${t} in ${chapter}.`;

    items.push({
      chapter,
      topic: t,
      title: language === 'ml' ? translateToMalayalam(title) : title,
      visualDescription: language === 'ml' ? translateToMalayalam(visual) : visual,
      explanation: language === 'ml' ? translateToMalayalam(explanation) : explanation,
    });
  }

  return items;
}

// ---- Adaptive logic ----
export function computeAdaptiveStatus(topic: MemoryTopic): MemoryStatus {
  if (topic.correct_count >= 3 && topic.hint_count === 0) return 'remembered';
  if (topic.revealed_count > 2 || topic.hint_count > topic.correct_count + 2) return 'needs_review';
  return 'learning';
}

export function getAdaptiveRecommendation(topic: MemoryTopic): string {
  const status = computeAdaptiveStatus(topic);
  if (status === 'remembered') {
    return 'This topic is well-remembered. Increasing review interval.';
  }
  if (status === 'needs_review') {
    return 'This topic needs more practice. Scheduling earlier review with simpler content.';
  }
  return 'This topic is progressing. Continue regular practice.';
}

// ---- Helpers ----
function extractField(text: string, field: string): string {
  const regex = new RegExp(`${field}:\\s*(.+?)(?=\\n[A-Z]|$)`, 's');
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

function translateToMalayalam(text: string): string {
  if (isMalayalamText(text)) return text;
  return translateReplyToMalayalam(text);
}

function classIdFromClassLevel(classLevel: string): string {
  const map: Record<string, string> = {
    'Class 9': 'class-9',
    'Class 10': 'class-10',
    'Class 11': 'class-11',
    'Class 12': 'class-12',
    'Class 8': 'class-8',
  };
  return map[classLevel] ?? 'class-9';
}

// ---- Progress summary ----
export interface MemoryProgressSummary {
  remembered: number;
  needsReview: number;
  learning: number;
  reviewStreak: number;
  recentSessions: MemorySession[];
}

export async function fetchProgressSummary(userId: string): Promise<MemoryProgressSummary> {
  const topics = await fetchMemoryTopics(userId);
  const recentSessions = await fetchRecentSessions(userId, 5);

  const remembered = topics.filter((t) => computeAdaptiveStatus(t) === 'remembered').length;
  const needsReview = topics.filter((t) => computeAdaptiveStatus(t) === 'needs_review').length;
  const learning = topics.filter((t) => computeAdaptiveStatus(t) === 'learning').length;

  // Review streak: count consecutive days with at least one session
  let reviewStreak = 0;
  const sessionDays = new Set(
    recentSessions.map((s) => new Date(s.created_at).toISOString().split('T')[0]),
  );
  const today = new Date();
  for (let d = 0; d < 30; d++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - d);
    const dateStr = checkDate.toISOString().split('T')[0];
    if (sessionDays.has(dateStr)) {
      reviewStreak++;
    } else if (d > 0) {
      break;
    }
  }

  return { remembered, needsReview, learning, reviewStreak, recentSessions };
}
