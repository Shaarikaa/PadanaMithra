import { loadJSON, saveJSON, STORAGE_KEYS } from './storage';
import { getTopicsForChapter } from './curriculum';
import { KNOWLEDGE_BASE } from './mockData';
import type {
  AnswerRecord,
  ConceptGap,
  TopicMastery,
  LearningPathStep,
  LearningDNASubject,
  NextBestStep,
  TeachBackEvaluation,
  TeachBackSession,
  StudentProfile,
} from './types';

// ---- Answer History ----

export function recordAnswer(rec: Omit<AnswerRecord, 'timestamp'>): AnswerRecord {
  const history = loadJSON<AnswerRecord[]>(STORAGE_KEYS.answerHistory, []);
  const entry: AnswerRecord = { ...rec, timestamp: Date.now() };
  history.push(entry);
  saveJSON(STORAGE_KEYS.answerHistory, history);
  detectAndSaveConceptGaps(history);
  return entry;
}

export function getAnswerHistory(): AnswerRecord[] {
  return loadJSON<AnswerRecord[]>(STORAGE_KEYS.answerHistory, []);
}

// ---- Misconception Detection ----

// Maps common wrong-answer patterns to likely misconceptions.
// Keys are question substrings; values describe the misconception.
const MISCONCEPTION_PATTERNS: { match: string[]; description: string }[] = [
  {
    match: ['velocity', 'speed', 'vector', 'scalar'],
    description: 'You may be mixing up speed and velocity. Speed is a scalar (distance/time, no direction). Velocity is a vector (displacement/time, with direction).',
  },
  {
    match: ['distance', 'displacement'],
    description: 'You may be confusing distance and displacement. Distance is the total path travelled (scalar). Displacement is the shortest path from start to end (vector).',
  },
  {
    match: ['acceleration', 'unit'],
    description: 'Check the units of acceleration. It is the rate of change of velocity per time, so the unit is m/s squared, not m/s.',
  },
  {
    match: ['ph', 'neutral', 'acid', 'base'],
    description: 'You may be mixing up pH values. A neutral solution has pH 7. Below 7 is acidic, above 7 is basic.',
  },
  {
    match: ['newton', 'second law', 'f = ma', 'force'],
    description: 'Recall Newtons second law: F = ma. Force equals mass times acceleration. Check that you are using the correct formula.',
  },
  {
    match: ['sin', 'trig', 'ratio', 'opposite', 'hypotenuse'],
    description: 'You may be mixing up trigonometric ratios. sin = opposite/hypotenuse, cos = adjacent/hypotenuse, tan = opposite/adjacent.',
  },
  {
    match: ['pythagoras', 'hypotenuse', 'square'],
    description: 'The Pythagorean theorem says the square of the hypotenuse equals the sum of the squares of the other two sides — not the sum of the sides themselves.',
  },
  {
    match: ['electron', 'proton', 'neutral atom'],
    description: 'In a neutral atom, the number of electrons equals the number of protons — not neutrons or nucleons.',
  },
  {
    match: ['photosynthesis', 'chloroplast', 'mitochondria'],
    description: 'Photosynthesis happens in chloroplasts (which have chlorophyll). Mitochondria are for respiration (the powerhouse).',
  },
  {
    match: ['hydrogen', 'metal', 'acid'],
    description: 'When a metal reacts with an acid, hydrogen gas is released — not oxygen or carbon dioxide.',
  },
];

export interface MisconceptionResult {
  detected: boolean;
  description: string;
  confidence: 'possible' | 'likely';
}

export function detectMisconception(question: string): MisconceptionResult {
  const lower = question.toLowerCase();

  for (const pattern of MISCONCEPTION_PATTERNS) {
    const matchCount = pattern.match.filter((m) => lower.includes(m)).length;
    if (matchCount >= 1) {
      // Check if the student has a history of similar mistakes.
      const history = getAnswerHistory();
      const relatedMistakes = history.filter(
        (a) => !a.isCorrect && pattern.match.some((m) => a.question.toLowerCase().includes(m)),
      );
      const confidence: 'possible' | 'likely' = relatedMistakes.length >= 2 ? 'likely' : 'possible';
      return {
        detected: true,
        description: pattern.description,
        confidence,
      };
    }
  }

  return { detected: false, description: '', confidence: 'possible' };
}

// ---- Concept Gap Tracking ----

function detectAndSaveConceptGaps(history: AnswerRecord[]): void {
  const wrongAnswers = history.filter((a) => !a.isCorrect);
  const gaps: Record<string, ConceptGap> = {};

  for (const ans of wrongAnswers) {
    const misconception = detectMisconception(ans.question);
    if (misconception.detected) {
      const key = `${ans.subject}-${ans.chapter}-${ans.topic}`;
      if (!gaps[key]) {
        gaps[key] = {
          subject: ans.subject,
          chapter: ans.chapter,
          topic: ans.topic || misconception.description.split('.')[0],
          description: misconception.description,
          relatedQuestionIds: [],
          missedCount: 0,
          firstDetected: ans.timestamp,
          lastDetected: ans.timestamp,
        };
      }
      gaps[key].relatedQuestionIds.push(ans.questionId);
      gaps[key].missedCount += 1;
      gaps[key].lastDetected = ans.timestamp;
    }
  }

  saveJSON(STORAGE_KEYS.conceptGaps, Object.values(gaps));
}

export function getConceptGaps(): ConceptGap[] {
  return loadJSON<ConceptGap[]>(STORAGE_KEYS.conceptGaps, []);
}

// ---- "Why Did I Get This Wrong?" ----

export interface WrongAnswerExplanation {
  whatYouTried: string;
  whereItWentWrong: string;
  relevantConcept: string;
  simpleExplanation: string;
  similarQuestion: string;
}

export function explainWrongAnswer(
  question: string,
  selectedOption: string,
  correctOption: string,
  explanation: string,
  chapter: string,
): WrongAnswerExplanation {
  const misconception = detectMisconception(question);

  return {
    whatYouTried: `You selected "${selectedOption}".`,
    whereItWentWrong: misconception.detected
      ? misconception.description
      : `The correct answer is "${correctOption}". The key is in the concept below.`,
    relevantConcept: chapter,
    simpleExplanation: explanation,
    similarQuestion: `Try this: ${generateSimilarQuestion(question, chapter)}`,
  };
}

export function generateSimilarQuestion(originalQuestion: string, chapter: string): string {
  const lower = originalQuestion.toLowerCase();

  if (lower.includes('acceleration') || lower.includes('unit')) {
    return 'What is the SI unit of velocity? (Hint: it includes direction)';
  }
  if (lower.includes('velocity') || lower.includes('vector')) {
    return 'Which quantity has both magnitude and direction: speed or velocity?';
  }
  if (lower.includes('ph') || lower.includes('neutral')) {
    return 'A solution has pH 3. Is it acidic, basic, or neutral?';
  }
  if (lower.includes('newton') || lower.includes('force')) {
    return 'If mass is 5 kg and acceleration is 2 m/s squared, what is the force?';
  }
  if (lower.includes('sin')) {
    return 'What is the value of cos 60 degrees?';
  }
  if (lower.includes('hypotenuse') || lower.includes('pythagoras')) {
    return 'In a right triangle with sides 3 and 4, what is the hypotenuse?';
  }
  if (lower.includes('electron') || lower.includes('proton')) {
    return 'In a neutral atom with 8 protons, how many electrons are there?';
  }
  if (lower.includes('photosynthesis')) {
    return 'Which pigment captures light energy for photosynthesis?';
  }
  if (lower.includes('hydrogen') || lower.includes('metal')) {
    return 'What gas is produced when zinc reacts with hydrochloric acid?';
  }
  return `Explain the main concept from the chapter "${chapter}".`;
}

// ---- Topic Mastery ----

export function computeTopicMastery(subject: string, chapter: string, profile: StudentProfile | null): TopicMastery[] {
  const history = getAnswerHistory();
  const topics = getTopicsForChapter('class-9', subject, chapter);
  const currentTopic = profile?.currentTopic ?? '';

  if (topics.length === 0) {
    // If no topics in curriculum, return a single chapter-level entry
    const chapterAnswers = history.filter((a) => a.subject === subject && a.chapter === chapter);
    const correct = chapterAnswers.filter((a) => a.isCorrect).length;
    const total = chapterAnswers.length;
    return [{
      subject,
      chapter,
      topic: chapter,
      status: total === 0 ? 'not-started' : correct / total >= 0.8 ? 'mastered' : correct / total >= 0.5 ? 'in-progress' : 'weak',
      correctCount: correct,
      totalCount: total,
    }];
  }

  return topics.map((topic) => {
    const topicAnswers = history.filter((a) => a.subject === subject && a.chapter === chapter && a.topic === topic);
    const correct = topicAnswers.filter((a) => a.isCorrect).length;
    const total = topicAnswers.length;
    const isCurrent = topic === currentTopic;

    let status: TopicMastery['status'] = 'not-started';
    if (total > 0) {
      const ratio = correct / total;
      if (ratio >= 0.8) status = 'mastered';
      else if (ratio >= 0.5) status = 'in-progress';
      else status = 'weak';
    }
    if (isCurrent && status === 'not-started') status = 'current';

    return { subject, chapter, topic, status, correctCount: correct, totalCount: total };
  });
}

// ---- Learning Path ----

export function computeLearningPath(profile: StudentProfile | null): LearningPathStep[] {
  if (!profile || !profile.currentSubject || !profile.currentChapter) return [];

  const mastery = computeTopicMastery(profile.currentSubject, profile.currentChapter, profile);
  const steps: LearningPathStep[] = mastery.map((m) => ({
    subject: m.subject,
    chapter: m.chapter,
    topic: m.topic,
    status: m.status === 'current' ? 'current' : m.status === 'in-progress' ? 'current' : m.status,
  }));

  // Find the first weak/not-started topic for recommendation
  const nextWeak = steps.find((s) => s.status === 'weak' || s.status === 'not-started');
  if (nextWeak) {
    nextWeak.recommendation = `Review ${nextWeak.topic}`;
  }

  return steps;
}

// ---- Learning DNA ----

export function computeLearningDNA(profile: StudentProfile | null): LearningDNASubject[] {
  if (!profile) return [];

  const history = getAnswerHistory();
  const teachBack = getTeachBackSessions();

  return profile.selectedSubjects.map((subject) => {
    const subjectAnswers = history.filter((a) => a.subject === subject);
    const subjectTeachBack = teachBack.filter((t) => t.subject === subject);

    // Concept Understanding: based on correct answer ratio
    const correct = subjectAnswers.filter((a) => a.isCorrect).length;
    const total = subjectAnswers.length;
    const conceptScore = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Problem Solving: based on total questions attempted (engagement)
    const problemScore = total > 0 ? Math.min(100, Math.round((total / 10) * 100)) : 0;

    // Revision: based on teach-back sessions and flashcard activity
    const teachBackScore = subjectTeachBack.length > 0
      ? Math.min(100, Math.round((subjectTeachBack.length / 3) * 100))
      : 0;

    const hasData = total > 0 || subjectTeachBack.length > 0;

    return {
      subject,
      hasData,
      indicators: [
        { label: 'Concept Understanding', score: conceptScore, hasData: total > 0 },
        { label: 'Problem Solving', score: problemScore, hasData: total > 0 },
        { label: 'Revision', score: teachBackScore, hasData: subjectTeachBack.length > 0 },
      ],
    };
  });
}

// ---- Next Best Step ----

export function computeNextBestStep(profile: StudentProfile | null): NextBestStep {
  if (!profile) return { hasData: false };

  const history = getAnswerHistory();
  const gaps = getConceptGaps();
  const subjectHistory = history.filter((a) => a.subject === profile.currentSubject);

  if (subjectHistory.length === 0 && gaps.length === 0) {
    return { hasData: false };
  }

  // Find the most recent improving topic (recently answered correctly)
  const recentCorrect = subjectHistory.filter((a) => a.isCorrect).slice(-3);
  const improvingTopic = recentCorrect.length > 0 ? recentCorrect[recentCorrect.length - 1].topic || recentCorrect[recentCorrect.length - 1].chapter : undefined;

  // Find the top gap for the current subject
  const subjectGaps = gaps.filter((g) => g.subject === profile.currentSubject);
  const topGap = subjectGaps.sort((a, b) => b.missedCount - a.missedCount)[0];

  return {
    hasData: true,
    improvingTopic,
    weakTopic: topGap?.topic || topGap?.chapter,
    missedCount: topGap?.missedCount,
    recommendation: topGap ? `Strengthen ${topGap.topic || topGap.chapter}` : undefined,
  };
}

// ---- Teach-Back Evaluation ----

const TOPIC_KEYWORDS: Record<string, string[]> = {
  Motion: ['distance', 'displacement', 'speed', 'velocity', 'acceleration', 'uniform', 'vector', 'scalar', 'equation'],
  'Laws of Motion': ['newton', 'force', 'inertia', 'mass', 'acceleration', 'action', 'reaction', 'momentum'],
  'Work & Energy': ['work', 'energy', 'kinetic', 'potential', 'conservation', 'force', 'distance', 'joule'],
  Light: ['reflection', 'refraction', 'lens', 'mirror', 'angle', 'incidence', 'convex', 'concave', 'light'],
  Electricity: ['voltage', 'current', 'resistance', 'ohm', 'circuit', 'series', 'parallel', 'power'],
  Sound: ['wave', 'frequency', 'amplitude', 'pitch', 'loudness', 'longitudinal', 'compression', 'medium'],
  Matter: ['solid', 'liquid', 'gas', 'particle', 'kinetic', 'state', 'melting', 'evaporation'],
  'Atoms & Molecules': ['atom', 'molecule', 'electron', 'proton', 'neutron', 'isotope', 'atomic'],
  'Chemical Reactions': ['reaction', 'combination', 'decomposition', 'oxidation', 'reduction', 'balance', 'mass'],
  'Acids & Bases': ['acid', 'base', 'ph', 'neutral', 'indicator', 'hydrogen', 'hydroxide', 'salt'],
  'Periodic Table': ['period', 'group', 'element', 'atomic', 'trend', 'metal', 'nonmetal'],
  'Real Numbers': ['rational', 'irrational', 'euclid', 'prime', 'factor', 'hcf', 'lcm'],
  Polynomials: ['polynomial', 'degree', 'zero', 'remainder', 'factor', 'coefficient'],
  'Linear Equations': ['linear', 'equation', 'variable', 'solution', 'substitution', 'elimination', 'graph'],
  Triangles: ['triangle', 'angle', 'side', 'similar', 'congruent', 'pythagoras', 'hypotenuse'],
  Trigonometry: ['sin', 'cos', 'tan', 'angle', 'ratio', 'opposite', 'adjacent', 'hypotenuse', 'identity'],
  Statistics: ['mean', 'median', 'mode', 'frequency', 'data', 'average', 'cumulative'],
  Cell: ['cell', 'nucleus', 'membrane', 'mitochondria', 'ribosome', 'prokaryotic', 'eukaryotic', 'organelle'],
  Tissues: ['tissue', 'meristematic', 'parenchyma', 'xylem', 'phloem', 'epithelial', 'connective'],
  'Life Processes': ['nutrition', 'respiration', 'transportation', 'excretion', 'photosynthesis', 'enzyme'],
  Reproduction: ['reproduction', 'asexual', 'sexual', 'gamete', 'pollination', 'fertilization', 'flower'],
  'Heredity & Evolution': ['heredity', 'gene', 'dna', 'mendel', 'evolution', 'natural selection', 'speciation'],
};

export function evaluateTeachBack(
  subject: string,
  chapter: string,
  topic: string,
  studentResponse: string,
): TeachBackEvaluation {
  const response = studentResponse.toLowerCase().trim();
  const wordCount = response.split(/\s+/).filter(Boolean).length;

  // Get the knowledge base text for comparison
  const knowledgeText = (KNOWLEDGE_BASE[chapter] ?? '').toLowerCase();
  const expectedKeywords = TOPIC_KEYWORDS[chapter] ?? [];

  // Check which key concepts the student mentioned
  const mentionedKeywords = expectedKeywords.filter((kw) => response.includes(kw.toLowerCase()));
  const coverageRatio = expectedKeywords.length > 0 ? mentionedKeywords.length / expectedKeywords.length : 0;

  // Check against knowledge base for concept overlap
  const knowledgeWords = knowledgeText.split(/\s+/).filter((w) => w.length > 4);
  const knowledgeSet = new Set(knowledgeWords);
  const responseWords = response.split(/\s+/).filter((w) => w.length > 4);
  const overlap = responseWords.filter((w) => knowledgeSet.has(w));
  const overlapRatio = responseWords.length > 0 ? overlap.length / responseWords.length : 0;

  // Combined coverage score
  const coverageScore = Math.round((coverageRatio * 0.6 + overlapRatio * 0.4) * 100);

  // Determine understanding level
  let understanding: TeachBackEvaluation['understanding'];
  if (coverageScore >= 60 && wordCount >= 20) understanding = 'Strong';
  else if (coverageScore >= 30 && wordCount >= 10) understanding = 'Developing';
  else understanding = 'Needs Review';

  // What they explained well
  const explainedWell = mentionedKeywords.slice(0, 3).map((kw) => kw.charAt(0).toUpperCase() + kw.slice(1));

  // What to improve — missing important keywords
  const missingKeywords = expectedKeywords.filter((kw) => !response.includes(kw.toLowerCase())).slice(0, 3);

  const toImprove = missingKeywords.map((kw) => `Include the concept of ${kw}`);

  // One thing to remember — pick from knowledge base
  const knowledgeSentences = knowledgeText.split(/(?<=[.])\s+/).filter(Boolean);
  const oneThingToRemember = knowledgeSentences.length > 0
    ? knowledgeSentences[0].charAt(0).toUpperCase() + knowledgeSentences[0].slice(1)
    : `Remember the key definition in ${chapter}.`;

  return {
    understanding,
    explainedWell: explainedWell.length > 0 ? explainedWell : ['You attempted the explanation'],
    toImprove: toImprove.length > 0 ? toImprove : ['Try to include more specific terms from the chapter'],
    oneThingToRemember,
    coverageScore,
  };
}

export function saveTeachBackSession(session: Omit<TeachBackSession, 'id' | 'timestamp'>): TeachBackSession {
  const sessions = getTeachBackSessions();
  const full: TeachBackSession = {
    ...session,
    id: `tb-${Date.now()}`,
    timestamp: Date.now(),
  };
  sessions.push(full);
  saveJSON(STORAGE_KEYS.teachBackSessions, sessions);
  return full;
}

export function getTeachBackSessions(): TeachBackSession[] {
  return loadJSON<TeachBackSession[]>(STORAGE_KEYS.teachBackSessions, []);
}

// ---- Profile Completion Check ----

export function hasEnoughDataForInsights(profile: StudentProfile | null): boolean {
  if (!profile) return false;
  const history = getAnswerHistory();
  const teachBack = getTeachBackSessions();
  return history.length >= 3 || teachBack.length >= 1;
}

// ---- Guided Learning Insights ----
// Aggregates data from the guided learning sessions (Socratic conversations in the AI Tutor)
// to power the "Your Learning Insight" dashboard section.

import type { LearningSignal } from './guidedLearning';

export interface TopicInsight {
  subject: string;
  topic: string;
  status: 'mastered' | 'developing' | 'needs-review' | 'not-enough-data';
  attempts: number;
  correctCount: number;
  avgHintsUsed: number;
  gaps: string[];
}

export interface LearningInsightSummary {
  hasData: boolean;
  topics: TopicInsight[];
  currentTopic?: string;
  currentTopicStatus?: string;
  nextStepRecommendation?: string;
  totalSessions: number;
}

export function computeLearningInsights(profile: StudentProfile | null): LearningInsightSummary {
  const signals = loadJSON<LearningSignal[]>(STORAGE_KEYS.learningSignals, []);

  if (signals.length === 0) {
    return { hasData: false, topics: [], totalSessions: 0 };
  }

  // Group signals by subject + topic
  const grouped: Record<string, LearningSignal[]> = {};
  for (const sig of signals) {
    const key = `${sig.subject}-${sig.topic}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(sig);
  }

  const topics: TopicInsight[] = Object.entries(grouped).map(([key, sigs]) => {
    const correct = sigs.filter((s) => s.correct).length;
    const total = sigs.length;
    const avgHints = sigs.reduce((sum, s) => sum + s.hintLevelsUsed, 0) / total;
    const allGaps = sigs.flatMap((s) => s.gapsIdentified);
    const uniqueGaps = [...new Set(allGaps)].slice(0, 3);

    let status: TopicInsight['status'];
    if (total >= 2 && correct / total >= 0.7 && avgHints <= 1.5) {
      status = 'mastered';
    } else if (total >= 1 && correct / total >= 0.5) {
      status = 'developing';
    } else if (total >= 1) {
      status = 'needs-review';
    } else {
      status = 'not-enough-data';
    }

    return {
      subject: sigs[0].subject,
      topic: sigs[0].topic,
      status,
      attempts: total,
      correctCount: correct,
      avgHintsUsed: Math.round(avgHints * 10) / 10,
      gaps: uniqueGaps,
    };
  });

  // Sort: needs-review first, then developing, then mastered
  const statusOrder: Record<string, number> = { 'needs-review': 0, 'developing': 1, 'mastered': 2, 'not-enough-data': 3 };
  topics.sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9));

  // Find the current topic from profile
  let currentTopic: string | undefined;
  let currentTopicStatus: string | undefined;
  if (profile?.currentTopic) {
    const match = topics.find((t) => t.topic.toLowerCase().includes(profile.currentTopic!.toLowerCase()));
    if (match) {
      currentTopic = match.topic;
      currentTopicStatus = match.status;
    }
  }

  // Next step recommendation
  const needsReview = topics.find((t) => t.status === 'needs-review');
  const developing = topics.find((t) => t.status === 'developing');
  let nextStepRecommendation: string | undefined;
  if (needsReview) {
    nextStepRecommendation = `Review ${needsReview.topic} — it needs strengthening. Try a 3-minute concept review.`;
  } else if (developing) {
    nextStepRecommendation = `Practice ${developing.topic} — you're making progress. Try 3 guided questions.`;
  } else if (topics.length > 0) {
    nextStepRecommendation = `Great work! Try a new challenge topic to keep growing.`;
  }

  return {
    hasData: true,
    topics,
    currentTopic,
    currentTopicStatus,
    nextStepRecommendation,
    totalSessions: signals.length,
  };
}
