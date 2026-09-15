// Memory Support service — handles data persistence to Supabase and
// curriculum-grounded content generation for memory-based learning.
// All content is generated from the real curriculum in curriculum.ts.
// No hardcoded sample content. No AI calls.

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { getChaptersForSubject, getTopicsForChapter } from './curriculum';
import type { ChapterInfo } from './types';
import type { Language } from './i18n';

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

// Convert a class label (e.g. "Class 9") to a class ID (e.g. "class-9").
// Also passes through if already an ID. Returns '' if unknown.
export function classLevelToClassId(classLevel: string): string {
  if (!classLevel) return '';
  const map: Record<string, string> = {
    'Class 9': 'class-9',
    'Class 10': 'class-10',
    'Class 11': 'class-11',
    'Class 12': 'class-12',
    'Class 8': 'class-8',
  };
  if (map[classLevel]) return map[classLevel];
  // Already an ID?
  if (classLevel.startsWith('class-')) return classLevel;
  return '';
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

// =====================================================
// CONTENT GENERATION — curriculum-grounded, deterministic
// All content is built from the real curriculum topics.
// No AI calls, no hardcoded sample content.
// =====================================================

// Per-topic content database. Keyed by subject|topic.
// Each entry has explanation, visual, question, options, answer, hints.
interface TopicContent {
  explanation: string;
  visual: string;
  question: string;
  options: string[];
  answerIndex: number;
  feedback: string;
  hints: string[];
  recallAnswer: string;
  recallQuestion: string;
}

const TOPIC_CONTENT: Record<string, TopicContent> = {
  // ---- Physics: Motion ----
  'Physics|Distance & Displacement': {
    explanation: 'Distance is the total path length travelled by an object, regardless of direction. Displacement is the straight-line distance from start to end with direction — it can be zero if you return to the start.',
    visual: 'Imagine walking from home to school (distance) versus drawing a straight arrow from home to school (displacement).',
    question: 'If you walk 5 m forward and 5 m back, what is your displacement?',
    options: ['10 m', '0 m', '5 m', '2.5 m'],
    answerIndex: 1,
    feedback: 'Displacement is zero because your start and end positions are the same, even though distance is 10 m.',
    hints: ['Think about where you started and where you ended.', 'Displacement depends on start and end position, not path length.', 'If start and end are the same point, displacement is zero.'],
    recallAnswer: 'Zero',
    recallQuestion: 'What is the displacement when you return to your starting point?',
  },
  'Physics|Speed & Velocity': {
    explanation: 'Speed is distance divided by time — it has no direction. Velocity is displacement divided by time — it includes direction, making it a vector quantity.',
    visual: 'A car speedometer shows speed (magnitude only). A GPS arrow shows velocity (magnitude plus direction).',
    question: 'Which quantity includes direction?',
    options: ['Speed', 'Velocity', 'Distance', 'Time'],
    answerIndex: 1,
    feedback: 'Velocity is a vector — it has both magnitude and direction. Speed is a scalar — magnitude only.',
    hints: ['One of these is a vector quantity.', 'Vectors have direction, scalars do not.', 'Velocity = displacement / time and includes direction.'],
    recallAnswer: 'Velocity',
    recallQuestion: 'Which quantity has both magnitude and direction — speed or velocity?',
  },
  'Physics|Acceleration': {
    explanation: 'Acceleration is the rate of change of velocity per unit time. If a car speeds up, it has positive acceleration. If it slows down, it has negative acceleration (deceleration).',
    visual: 'A car going from 0 to 60 km/h — the needle climbing on the speedometer shows acceleration.',
    question: 'The SI unit of acceleration is:',
    options: ['m/s', 'm/s squared', 'm times s', 'm squared/s'],
    answerIndex: 1,
    feedback: 'Acceleration = change in velocity / time, so the unit is metres per second squared.',
    hints: ['Acceleration is change in velocity per unit time.', 'Velocity unit is m/s, time unit is s.', 'So acceleration unit is m/s divided by s = m/s squared.'],
    recallAnswer: 'm/s squared',
    recallQuestion: 'What is the SI unit of acceleration?',
  },
  'Physics|Equations of Motion': {
    explanation: 'The three equations of motion relate velocity, acceleration, distance, and time: v = u + at, s = ut + 1/2 at squared, and v squared = u squared + 2as.',
    visual: 'A ball rolling down a ramp — you can find its final speed and distance using these equations.',
    question: 'Which equation gives final velocity from initial velocity, acceleration, and time?',
    options: ['v = u + at', 's = ut + 1/2 at squared', 'v squared = u squared + 2as', 's = vt'],
    answerIndex: 0,
    feedback: 'v = u + at gives final velocity (v) from initial velocity (u), acceleration (a), and time (t).',
    hints: ['You need velocity, not distance.', 'The equation relates v, u, a, and t — no distance.', 'v = u + at is the first equation of motion.'],
    recallAnswer: 'v = u + at',
    recallQuestion: 'Which equation of motion gives final velocity from initial velocity, acceleration, and time?',
  },
  // ---- Physics: Laws of Motion ----
  'Physics|First Law (Inertia)': {
    explanation: 'Newton\'s First Law states that an object stays at rest or in uniform motion unless acted on by an external force. This property is called inertia.',
    visual: 'A book on a table stays still until you push it. A bus passenger lurches forward when the bus brakes — both are inertia.',
    question: 'Why do you lurch forward when a bus suddenly stops?',
    options: ['The bus pulls you', 'Inertia keeps you moving', 'Gravity pushes you', 'Friction pulls you'],
    answerIndex: 1,
    feedback: 'Your body tends to keep moving due to inertia when the bus stops suddenly.',
    hints: ['Think about what your body wants to do when the bus stops.', 'Your body was moving and tends to keep moving.', 'Inertia is the tendency to resist changes in motion.'],
    recallAnswer: 'Inertia',
    recallQuestion: 'What property causes you to lurch forward when a bus stops suddenly?',
  },
  'Physics|Second Law (F=ma)': {
    explanation: 'Newton\'s Second Law states that force equals mass times acceleration (F = ma). More force means more acceleration; more mass means less acceleration for the same force.',
    visual: 'Pushing a light cart is easy, pushing a heavy cart with the same force gives less acceleration — F = ma.',
    question: 'Newton\'s second law is expressed as:',
    options: ['F = ma', 'F = mv', 'F = m/a', 'F = a/m'],
    answerIndex: 0,
    feedback: 'Force equals mass times acceleration (F = ma).',
    hints: ['Force is related to mass and acceleration.', 'The formula multiplies mass and acceleration.', 'F = ma is Newton\'s second law.'],
    recallAnswer: 'F = ma',
    recallQuestion: 'What is the formula for Newton\'s second law of motion?',
  },
  'Physics|Third Law': {
    explanation: 'Newton\'s Third Law states that for every action there is an equal and opposite reaction. When you push a wall, the wall pushes back on you with the same force.',
    visual: 'A swimmer pushes water backward and the water pushes the swimmer forward — action and reaction.',
    question: 'A rocket moves upward because:',
    options: ['It pushes air up', 'Exhaust gases push down, rocket pushes up', 'Gravity lifts it', 'Fuel disappears'],
    answerIndex: 1,
    feedback: 'The rocket pushes exhaust gases downward; the gases push the rocket upward — action and reaction.',
    hints: ['Think about what comes out of the bottom of a rocket.', 'Hot gases are pushed downward.', 'By Newton\'s third law, the gases push the rocket upward.'],
    recallAnswer: 'Action and reaction',
    recallQuestion: 'What principle explains how a rocket moves upward?',
  },
  'Physics|Momentum': {
    explanation: 'Momentum is mass times velocity (p = mv). It is a vector quantity. The more mass or speed an object has, the more momentum it carries.',
    visual: 'A heavy truck moving slowly can have the same momentum as a light car moving fast — p = mv.',
    question: 'Momentum is calculated as:',
    options: ['p = mv', 'p = m/v', 'p = m + v', 'p = m - v'],
    answerIndex: 0,
    feedback: 'Momentum = mass times velocity (p = mv).',
    hints: ['Momentum depends on mass and velocity.', 'It multiplies them together.', 'p = mv is the formula for momentum.'],
    recallAnswer: 'p = mv',
    recallQuestion: 'What is the formula for momentum?',
  },
  // ---- Physics: Work & Energy ----
  'Physics|Work Done': {
    explanation: 'Work is done when a force moves an object through a distance. Work = force times distance (W = Fd). The unit of work is the joule (J).',
    visual: 'Lifting a box: your upward force moves the box upward — work is done. Carrying it horizontally at constant height does no work on the box.',
    question: 'Work is zero when:',
    options: ['Force is zero or distance is zero', 'Force is maximum', 'Distance is large', 'Angle is zero'],
    answerIndex: 0,
    feedback: 'Work = F times d. If either force or distance is zero, work is zero.',
    hints: ['Work = force times distance.', 'If either factor is zero, the product is zero.', 'No force or no movement means no work.'],
    recallAnswer: 'Joule',
    recallQuestion: 'What is the SI unit of work?',
  },
  'Physics|Kinetic Energy': {
    explanation: 'Kinetic energy is the energy of motion. KE = 1/2 m v squared. A heavier or faster object has more kinetic energy.',
    visual: 'A rolling ball hits a pin — the faster and heavier the ball, the more pins it can knock down.',
    question: 'Kinetic energy is given by:',
    options: ['KE = 1/2 mv squared', 'KE = mv', 'KE = mgh', 'KE = Fd'],
    answerIndex: 0,
    feedback: 'KE = 1/2 m v squared — half of mass times velocity squared.',
    hints: ['Kinetic energy involves mass and velocity.', 'Velocity is squared in the formula.', 'KE = 1/2 m v squared.'],
    recallAnswer: 'KE = 1/2 mv squared',
    recallQuestion: 'What is the formula for kinetic energy?',
  },
  'Physics|Potential Energy': {
    explanation: 'Potential energy is stored energy due to position. Gravitational PE = mgh, where m is mass, g is gravity, and h is height.',
    visual: 'A book on a high shelf has more potential energy than the same book on a low shelf — PE = mgh.',
    question: 'Gravitational potential energy is given by:',
    options: ['PE = mgh', 'PE = 1/2 mv squared', 'PE = Fd', 'PE = mc squared'],
    answerIndex: 0,
    feedback: 'PE = mgh — mass times gravity times height.',
    hints: ['It depends on mass and height.', 'Gravity (g) is also a factor.', 'PE = mgh is the formula.'],
    recallAnswer: 'PE = mgh',
    recallQuestion: 'What is the formula for gravitational potential energy?',
  },
  'Physics|Conservation of Energy': {
    explanation: 'The law of conservation of energy states that energy can neither be created nor destroyed — it only changes from one form to another. Total energy stays constant.',
    visual: 'A pendulum swinging: at the top it has max PE, at the bottom it has max KE — energy converts back and forth but total stays the same.',
    question: 'The law of conservation of energy states that:',
    options: ['Energy can be created', 'Energy can be destroyed', 'Energy only transforms', 'Energy decreases over time'],
    answerIndex: 2,
    feedback: 'Energy can neither be created nor destroyed, only transformed from one form to another.',
    hints: ['Energy is never lost.', 'It changes form but the total stays the same.', 'Energy can only be transformed, not created or destroyed.'],
    recallAnswer: 'Transformed',
    recallQuestion: 'Energy can neither be created nor destroyed — it can only be what?',
  },
  // ---- Physics: Light ----
  'Physics|Reflection': {
    explanation: 'Reflection is when light bounces off a surface. The angle of incidence equals the angle of reflection, both measured from the normal (perpendicular line).',
    visual: 'A mirror reflecting your image — light hits the mirror and bounces back at the same angle from the normal.',
    question: 'The angle of incidence equals the:',
    options: ['Angle of reflection', 'Angle of refraction', 'Normal angle', 'Critical angle'],
    answerIndex: 0,
    feedback: 'By the law of reflection, the angle of incidence equals the angle of reflection.',
    hints: ['Think about light bouncing off a mirror.', 'Both angles are measured from the normal.', 'The angle of incidence equals the angle of reflection.'],
    recallAnswer: 'Angle of reflection',
    recallQuestion: 'In reflection, the angle of incidence equals what other angle?',
  },
  'Physics|Refraction': {
    explanation: 'Refraction is the bending of light when it passes from one medium to another with different density. Light slows down in denser media, causing the bend.',
    visual: 'A straw in a glass of water looks bent at the water surface — light bends as it passes from water to air.',
    question: 'Light bends when passing from air to glass because:',
    options: ['It speeds up', 'It slows down', 'It reflects', 'It disappears'],
    answerIndex: 1,
    feedback: 'Light slows down in the denser glass, causing it to bend — this is refraction.',
    hints: ['Glass is denser than air.', 'Light travels slower in denser media.', 'The speed change causes the light to bend.'],
    recallAnswer: 'Slows down',
    recallQuestion: 'Why does light bend when entering glass from air?',
  },
  'Physics|Lenses': {
    explanation: 'A convex lens converges light rays to a focal point. A concave lens diverges light rays. Convex lenses are used in magnifying glasses and cameras.',
    visual: 'A magnifying glass (convex) makes text look bigger by converging light to a focal point.',
    question: 'Which lens converges light rays?',
    options: ['Concave lens', 'Convex lens', 'Cylindrical lens', 'Plane lens'],
    answerIndex: 1,
    feedback: 'A convex lens converges light rays to a focal point. A concave lens diverges them.',
    hints: ['One type brings rays together.', 'Convex means curved outward.', 'A convex lens converges light to a focal point.'],
    recallAnswer: 'Convex lens',
    recallQuestion: 'Which type of lens converges light rays?',
  },
  'Physics|Dispersion': {
    explanation: 'Dispersion is the splitting of white light into its component colors (VIBGYOR) when passing through a prism. Different colors travel at different speeds in glass.',
    visual: 'White light entering a prism comes out as a rainbow band — violet bends most, red bends least.',
    question: 'White light splitting into colors through a prism is called:',
    options: ['Reflection', 'Dispersion', 'Refraction', 'Diffraction'],
    answerIndex: 1,
    feedback: 'Dispersion is the splitting of white light into its colors by a prism.',
    hints: ['A prism splits white light.', 'You see a rainbow of colors.', 'This splitting is called dispersion.'],
    recallAnswer: 'Dispersion',
    recallQuestion: 'What is the splitting of white light into colors called?',
  },
  // ---- Physics: Electricity ----
  'Physics|Ohm\'s Law': {
    explanation: 'Ohm\'s Law states that voltage equals current times resistance (V = IR). If resistance increases, current decreases for the same voltage.',
    visual: 'A battery, wire, and resistor: increasing resistance reduces the current flowing through the wire.',
    question: 'Ohm\'s Law is expressed as:',
    options: ['V = IR', 'V = I/R', 'V = I + R', 'V = I - R'],
    answerIndex: 0,
    feedback: 'V = IR — voltage equals current times resistance.',
    hints: ['It relates voltage, current, and resistance.', 'Voltage equals current multiplied by resistance.', 'V = IR is Ohm\'s Law.'],
    recallAnswer: 'V = IR',
    recallQuestion: 'What is the formula for Ohm\'s Law?',
  },
  'Physics|Series & Parallel Circuits': {
    explanation: 'In a series circuit, components are in one path — if one breaks, all stop. In parallel, each component has its own path — if one breaks, others keep working.',
    visual: 'Christmas lights in series all go dark if one bulb breaks. In parallel, the rest stay lit.',
    question: 'In a series circuit, if one bulb breaks:',
    options: ['Others stay on', 'All bulbs go off', 'Only one goes off', 'Brightness increases'],
    answerIndex: 1,
    feedback: 'In series, all bulbs share one path — if one breaks, the circuit is open and all go off.',
    hints: ['Series means one path for current.', 'If that path is broken, current stops everywhere.', 'In series, all bulbs go off if one breaks.'],
    recallAnswer: 'All go off',
    recallQuestion: 'In a series circuit, what happens to other bulbs if one breaks?',
  },
  'Physics|Electric Power': {
    explanation: 'Electric power is the rate at which electrical energy is used. P = VI, where P is power, V is voltage, and I is current. The unit is the watt (W).',
    visual: 'A 100W bulb uses more energy per second than a 40W bulb — P = VI.',
    question: 'Electric power is calculated as:',
    options: ['P = VI', 'P = V/I', 'P = V + I', 'P = V - I'],
    answerIndex: 0,
    feedback: 'Power = voltage times current (P = VI). The unit is the watt.',
    hints: ['Power relates voltage and current.', 'It multiplies them.', 'P = VI is the formula for electric power.'],
    recallAnswer: 'Watt',
    recallQuestion: 'What is the SI unit of electric power?',
  },
  'Physics|Resistance': {
    explanation: 'Resistance is the opposition to current flow in a circuit. It depends on material, length, thickness, and temperature. Unit is the ohm.',
    visual: 'A thin wire has more resistance than a thick wire of the same material — like a narrow pipe restricting water flow.',
    question: 'The SI unit of resistance is:',
    options: ['Ampere', 'Volt', 'Ohm', 'Watt'],
    answerIndex: 2,
    feedback: 'Resistance is measured in ohms. It opposes the flow of current.',
    hints: ['Resistance opposes current flow.', 'It is named after the scientist Georg Ohm.', 'The unit of resistance is the ohm.'],
    recallAnswer: 'Ohm',
    recallQuestion: 'What is the SI unit of electrical resistance?',
  },
  // ---- Physics: Sound ----
  'Physics|Nature of Sound': {
    explanation: 'Sound is a longitudinal wave that travels through a medium by compressions and rarefactions. It cannot travel through a vacuum — it needs matter.',
    visual: 'A tuning fork vibrating creates compressions and rarefactions in air — sound travels as a longitudinal wave.',
    question: 'Sound cannot travel through:',
    options: ['Air', 'Water', 'A vacuum', 'Steel'],
    answerIndex: 2,
    feedback: 'Sound needs a medium. In a vacuum there is no matter, so sound cannot travel.',
    hints: ['Sound needs something to travel through.', 'It needs molecules to vibrate.', 'A vacuum has no molecules, so sound cannot travel.'],
    recallAnswer: 'Vacuum',
    recallQuestion: 'Through what can sound not travel?',
  },
  'Physics|Speed of Sound': {
    explanation: 'The speed of sound depends on the medium. It is about 343 m/s in air at 20 degrees C, faster in water, and fastest in solids like steel.',
    visual: 'You see lightning before you hear thunder — light travels much faster than sound.',
    question: 'Sound travels fastest in:',
    options: ['Air', 'Water', 'Steel', 'Vacuum'],
    answerIndex: 2,
    feedback: 'Sound travels fastest in solids (steel) because particles are closer together, transmitting vibrations quicker.',
    hints: ['Sound needs particles to vibrate.', 'Closer particles mean faster transmission.', 'Solids have the closest particles, so sound is fastest in steel.'],
    recallAnswer: 'Steel',
    recallQuestion: 'In which medium does sound travel fastest?',
  },
  'Physics|Pitch & Loudness': {
    explanation: 'Pitch is how high or low a sound is — it depends on frequency. Loudness is how strong a sound is — it depends on amplitude.',
    visual: 'A whistle has high pitch (high frequency). A drum beat has high loudness (high amplitude) but low pitch.',
    question: 'Pitch of a sound depends on its:',
    options: ['Amplitude', 'Frequency', 'Speed', 'Medium'],
    answerIndex: 1,
    feedback: 'Pitch depends on frequency — higher frequency means higher pitch. Loudness depends on amplitude.',
    hints: ['Pitch is how high or low a sound is.', 'It relates to how many vibrations per second.', 'Pitch depends on frequency.'],
    recallAnswer: 'Frequency',
    recallQuestion: 'What does the pitch of a sound depend on?',
  },
  'Physics|Echo': {
    explanation: 'An echo is a reflected sound that reaches the ear after a delay. The minimum distance for an echo to be heard is about 17 m (so sound takes 0.1 s to return).',
    visual: 'Shouting in a large empty hall — you hear your voice bounce back after a short delay.',
    question: 'An echo is caused by:',
    options: ['Reflection of sound', 'Refraction of sound', 'Absorption of sound', 'Diffraction of sound'],
    answerIndex: 0,
    feedback: 'An echo is a reflected sound wave that returns to the listener after bouncing off a surface.',
    hints: ['An echo is hearing your voice again.', 'Sound bounces off distant surfaces.', 'An echo is caused by reflection of sound.'],
    recallAnswer: 'Reflection',
    recallQuestion: 'What causes an echo?',
  },

  // ---- Chemistry: Matter ----
  'Chemistry|States of Matter': {
    explanation: 'Matter exists in three main states: solid, liquid, and gas. Solids have fixed shape and volume. Liquids have fixed volume but take the shape of the container. Gases fill any container.',
    visual: 'Ice (solid) melts to water (liquid) which evaporates to steam (gas) — same substance, different states.',
    question: 'Which state of matter has a fixed shape and volume?',
    options: ['Solid', 'Liquid', 'Gas', 'Plasma'],
    answerIndex: 0,
    feedback: 'Solids have both fixed shape and fixed volume because particles are tightly packed.',
    hints: ['Think about a block of wood.', 'It keeps its shape and size.', 'Solids have fixed shape and volume.'],
    recallAnswer: 'Solid',
    recallQuestion: 'Which state of matter has both fixed shape and fixed volume?',
  },
  'Chemistry|Kinetic Theory': {
    explanation: 'The kinetic theory says that matter is made of particles that are always moving. More energy means faster particle movement — solids have slow particles, gases have fast ones.',
    visual: 'Particles in ice barely vibrate, in water they move around, in steam they zip freely — kinetic energy increases.',
    question: 'According to kinetic theory, particles move fastest in:',
    options: ['Solids', 'Liquids', 'Gases', 'All the same'],
    answerIndex: 2,
    feedback: 'Gas particles have the most kinetic energy and move freely and fast.',
    hints: ['More energy means faster particles.', 'Gases have the most energy.', 'Particles move fastest in gases.'],
    recallAnswer: 'Gases',
    recallQuestion: 'In which state do particles move fastest according to kinetic theory?',
  },
  'Chemistry|Changes of State': {
    explanation: 'Changes of state include melting (solid to liquid), freezing (liquid to solid), evaporation (liquid to gas), and condensation (gas to liquid). These are physical changes — no new substance is formed.',
    visual: 'Water freezing to ice, melting back to water, evaporating to steam — the substance stays H2O throughout.',
    question: 'Melting is the change from:',
    options: ['Solid to liquid', 'Liquid to solid', 'Gas to liquid', 'Liquid to gas'],
    answerIndex: 0,
    feedback: 'Melting is the change from solid to liquid, like ice melting to water.',
    hints: ['Think about ice becoming water.', 'It goes from solid to liquid.', 'Melting is solid to liquid.'],
    recallAnswer: 'Solid to liquid',
    recallQuestion: 'What change of state is melting?',
  },
  'Chemistry|Density': {
    explanation: 'Density is mass per unit volume (density = mass / volume). Objects with higher density sink in liquids with lower density. Oil floats on water because oil is less dense.',
    visual: 'A cork floats on water (low density) while a stone sinks (high density) — density = mass / volume.',
    question: 'Density is calculated as:',
    options: ['Mass / Volume', 'Mass times Volume', 'Volume / Mass', 'Mass + Volume'],
    answerIndex: 0,
    feedback: 'Density = mass / volume. A denser object has more mass packed in the same volume.',
    hints: ['Density tells you how tightly packed matter is.', 'It relates mass and volume.', 'Density = mass divided by volume.'],
    recallAnswer: 'Mass / Volume',
    recallQuestion: 'What is the formula for density?',
  },
  // ---- Chemistry: Atoms & Molecules ----
  'Chemistry|Atomic Structure': {
    explanation: 'An atom has a nucleus containing protons (positive) and neutrons (neutral), with electrons (negative) orbiting in shells. In a neutral atom, protons equal electrons.',
    visual: 'A tiny center (nucleus) with protons and neutrons, and electrons orbiting around in rings (shells).',
    question: 'In a neutral atom, the number of protons equals the number of:',
    options: ['Neutrons', 'Electrons', 'Nucleons', 'Isotopes'],
    answerIndex: 1,
    feedback: 'In a neutral atom, positive protons balance negative electrons, so their counts are equal.',
    hints: ['Positive and negative charges must balance.', 'Protons are positive, electrons are negative.', 'In a neutral atom, protons equal electrons.'],
    recallAnswer: 'Electrons',
    recallQuestion: 'In a neutral atom, the number of protons equals the number of what?',
  },
  'Chemistry|Isotopes': {
    explanation: 'Isotopes are atoms of the same element with the same number of protons but different numbers of neutrons. For example, hydrogen has isotopes with 0, 1, and 2 neutrons.',
    visual: 'Three hydrogen atoms: one with no neutron, one with one neutron (deuterium), one with two (tritium) — same element, different mass.',
    question: 'Isotopes of an element have the same number of:',
    options: ['Neutrons', 'Protons', 'Mass number', 'Nucleons'],
    answerIndex: 1,
    feedback: 'Isotopes have the same number of protons (same element) but different numbers of neutrons.',
    hints: ['Isotopes are the same element.', 'Same element means same number of protons.', 'Isotopes have the same protons but different neutrons.'],
    recallAnswer: 'Protons',
    recallQuestion: 'What do isotopes of the same element have the same number of?',
  },
  'Chemistry|Mole Concept': {
    explanation: 'One mole of any substance contains Avogadro\'s number of particles (6.022 times 10 to the 23). One mole of carbon atoms weighs 12 grams.',
    visual: 'A mole is like a dozen — but instead of 12, it is 6.022 times 10 to the 23 particles. One mole of water weighs 18 g.',
    question: 'One mole contains how many particles?',
    options: ['6.022 times 10 to the 23', '12', '100', '1 million'],
    answerIndex: 0,
    feedback: 'Avogadro\'s number is 6.022 times 10 to the 23 particles per mole.',
    hints: ['A mole is a counting unit.', 'It is a very large number.', 'Avogadro\'s number is 6.022 times 10 to the 23.'],
    recallAnswer: 'Avogadro\'s number',
    recallQuestion: 'What is the number of particles in one mole called?',
  },
  'Chemistry|Chemical Formulae': {
    explanation: 'A chemical formula shows the elements and their ratio in a compound. For example, H2O means 2 hydrogen atoms and 1 oxygen atom. CO2 means 1 carbon and 2 oxygen atoms.',
    visual: 'H2O = two H atoms bonded to one O atom. The subscript numbers tell you how many of each atom.',
    question: 'In the formula H2O, the number 2 means:',
    options: ['Two oxygen atoms', 'Two hydrogen atoms', 'Two molecules', 'Two bonds'],
    answerIndex: 1,
    feedback: 'The subscript 2 in H2O means there are 2 hydrogen atoms for every 1 oxygen atom.',
    hints: ['The number after a symbol tells how many atoms of that element.', 'H2 means 2 hydrogen atoms.', 'In H2O, the 2 refers to hydrogen atoms.'],
    recallAnswer: 'Two hydrogen atoms',
    recallQuestion: 'In H2O, what does the 2 mean?',
  },
  // ---- Chemistry: Chemical Reactions ----
  'Chemistry|Types of Reactions': {
    explanation: 'The main types of chemical reactions are: combination (A + B gives AB), decomposition (AB gives A + B), displacement (A + BC gives AC + B), and neutralization (acid + base gives salt + water).',
    visual: 'Combination: two chemicals join. Decomposition: one breaks apart. Displacement: one swaps places with another.',
    question: 'When acid reacts with base, it is called:',
    options: ['Combination', 'Decomposition', 'Neutralization', 'Displacement'],
    answerIndex: 2,
    feedback: 'Acid + base produces salt and water — this is a neutralization reaction.',
    hints: ['Acid and base react together.', 'They produce salt and water.', 'This is called neutralization.'],
    recallAnswer: 'Neutralization',
    recallQuestion: 'What type of reaction is acid plus base?',
  },
  'Chemistry|Balancing Equations': {
    explanation: 'Balancing equations follows the law of conservation of mass — the number of atoms of each element must be equal on both sides. Adjust coefficients (not subscripts) to balance.',
    visual: 'Like a seesaw: the number of atoms on the left (reactants) must equal the number on the right (products).',
    question: 'A balanced equation follows which law?',
    options: ['Conservation of mass', 'Conservation of energy', 'Ohm\'s law', 'Newton\'s law'],
    answerIndex: 0,
    feedback: 'Balancing follows the law of conservation of mass — atoms are neither created nor destroyed.',
    hints: ['Atoms must be equal on both sides.', 'No atoms are lost or gained.', 'This follows the law of conservation of mass.'],
    recallAnswer: 'Conservation of mass',
    recallQuestion: 'Which law do balanced chemical equations follow?',
  },
  'Chemistry|Oxidation & Reduction': {
    explanation: 'Oxidation is gaining oxygen or losing electrons. Reduction is losing oxygen or gaining electrons. OIL RIG: Oxidation Is Loss, Reduction Is Gain (of electrons).',
    visual: 'OIL RIG — remember: Oxidation Is Loss of electrons, Reduction Is Gain of electrons.',
    question: 'Gain of electrons is called:',
    options: ['Oxidation', 'Reduction', 'Neutralization', 'Combination'],
    answerIndex: 1,
    feedback: 'Reduction is the gain of electrons. Oxidation is the loss of electrons (OIL RIG).',
    hints: ['Remember OIL RIG.', 'RIG = Reduction Is Gain.', 'Gain of electrons is reduction.'],
    recallAnswer: 'Reduction',
    recallQuestion: 'What is the gain of electrons called?',
  },
  // ---- Chemistry: Acids & Bases ----
  'Chemistry|pH Scale': {
    explanation: 'The pH scale measures how acidic or basic a solution is. pH 7 is neutral, below 7 is acidic, above 7 is basic. Lower pH means stronger acid.',
    visual: 'A number line from 0 to 14: 0-6 is red (acidic), 7 is green (neutral), 8-14 is blue (basic).',
    question: 'A solution with pH 3 is:',
    options: ['Neutral', 'Acidic', 'Basic', 'Strongly basic'],
    answerIndex: 1,
    feedback: 'pH below 7 is acidic. pH 3 is a strong acid.',
    hints: ['pH 7 is neutral.', 'Below 7 is on the acidic side.', 'pH 3 is acidic.'],
    recallAnswer: 'Acidic',
    recallQuestion: 'A solution with pH below 7 is what?',
  },
  'Chemistry|Indicators': {
    explanation: 'Indicators change color in acid or base. Litmus turns red in acid and blue in base. Phenolphthalein is colorless in acid and pink in base.',
    visual: 'Blue litmus paper dipped in lemon juice turns red — it indicates an acid.',
    question: 'Litmus turns what color in acid?',
    options: ['Blue', 'Red', 'Green', 'Yellow'],
    answerIndex: 1,
    feedback: 'Litmus turns red in acidic solutions and blue in basic solutions.',
    hints: ['Litmus has two colors: red and blue.', 'In acid it turns one specific color.', 'Litmus turns red in acid.'],
    recallAnswer: 'Red',
    recallQuestion: 'What color does litmus turn in acid?',
  },
  'Chemistry|Neutralization': {
    explanation: 'Neutralization is the reaction of an acid with a base to produce salt and water. For example: HCl + NaOH gives NaCl + H2O.',
    visual: 'Mixing an acid and a base: the solution becomes neutral (pH 7), producing salt water.',
    question: 'Neutralization produces:',
    options: ['Acid and base', 'Salt and water', 'Salt and gas', 'Water and gas'],
    answerIndex: 1,
    feedback: 'Acid + base gives salt + water. For example, HCl + NaOH gives NaCl + H2O.',
    hints: ['Acid and base react together.', 'They neutralize each other.', 'The products are salt and water.'],
    recallAnswer: 'Salt and water',
    recallQuestion: 'What does a neutralization reaction produce?',
  },
  'Chemistry|Salt Formation': {
    explanation: 'Salts are formed when the hydrogen of an acid is replaced by a metal. For example, HCl + Na gives NaCl (common salt) + H2.',
    visual: 'Sodium metal reacting with hydrochloric acid produces sodium chloride (table salt) and hydrogen gas.',
    question: 'Common salt (NaCl) is formed by reacting HCl with:',
    options: ['Oxygen', 'Sodium', 'Carbon', 'Nitrogen'],
    answerIndex: 1,
    feedback: 'HCl + Na gives NaCl (salt) + H2. The metal (sodium) replaces hydrogen.',
    hints: ['Salt has a metal in it.', 'NaCl contains sodium.', 'HCl reacts with sodium to form NaCl.'],
    recallAnswer: 'Sodium',
    recallQuestion: 'What metal reacts with HCl to form common salt?',
  },
  // ---- Chemistry: Periodic Table ----
  'Chemistry|Periodic Trends': {
    explanation: 'Across a period (left to right), atomic size decreases and metallic character decreases. Down a group, atomic size increases and metallic character increases.',
    visual: 'Atoms get smaller as you go right across a row, and bigger as you go down a column.',
    question: 'Across a period, atomic size generally:',
    options: ['Increases', 'Decreases', 'Stays the same', 'Doubles'],
    answerIndex: 1,
    feedback: 'Across a period, atomic size decreases because more protons pull electrons closer.',
    hints: ['Going left to right across a period.', 'More protons means stronger pull on electrons.', 'Atomic size decreases across a period.'],
    recallAnswer: 'Decreases',
    recallQuestion: 'Does atomic size increase or decrease across a period?',
  },
  'Chemistry|Groups & Periods': {
    explanation: 'Groups are vertical columns in the periodic table — elements in the same group have similar properties. Periods are horizontal rows — elements in the same period have the same number of electron shells.',
    visual: 'The periodic table: columns going down are groups (1-18), rows going across are periods (1-7).',
    question: 'Vertical columns in the periodic table are called:',
    options: ['Periods', 'Groups', 'Blocks', 'Series'],
    answerIndex: 1,
    feedback: 'Groups are vertical columns. Elements in the same group share similar chemical properties.',
    hints: ['Columns go up and down.', 'Elements in the same column have similar properties.', 'Vertical columns are called groups.'],
    recallAnswer: 'Groups',
    recallQuestion: 'What are the vertical columns in the periodic table called?',
  },
  'Chemistry|Properties of Elements': {
    explanation: 'Metals are shiny, malleable, ductile, and conduct electricity. Non-metals are dull, brittle, and poor conductors. Metalloids have properties of both.',
    visual: 'Copper (metal) is shiny and conducts electricity. Sulfur (non-metal) is dull and brittle. Silicon (metalloid) is in between.',
    question: 'Which is a property of metals?',
    options: ['Brittle', 'Dull appearance', 'Good conductor', 'Poor conductor'],
    answerIndex: 2,
    feedback: 'Metals are good conductors of heat and electricity. They are also shiny, malleable, and ductile.',
    hints: ['Think about copper wire.', 'Metals conduct electricity well.', 'Good conductor is a property of metals.'],
    recallAnswer: 'Good conductor',
    recallQuestion: 'What is a key property of metals?',
  },

  // ---- Mathematics: Real Numbers ----
  'Mathematics|Euclids Division Lemma': {
    explanation: 'Euclid\'s division lemma states that for any positive integers a and b, there exist unique integers q and r such that a = bq + r, where 0 <= r < b.',
    visual: 'Dividing 17 by 5: 17 = 5 times 3 + 2. Here a=17, b=5, q=3, r=2, and 0 <= 2 < 5.',
    question: 'Euclid\'s division lemma: a = bq + r where:',
    options: ['0 <= r < b', '0 < r <= b', 'r = b', 'r > b'],
    answerIndex: 0,
    feedback: 'The remainder r satisfies 0 <= r < b in Euclid\'s division lemma.',
    hints: ['Think about remainders in division.', 'The remainder must be less than the divisor.', '0 <= r < b is the condition.'],
    recallAnswer: '0 <= r < b',
    recallQuestion: 'In Euclid\'s division lemma, what is the condition on r?',
  },
  'Mathematics|Fundamental Theorem of Arithmetic': {
    explanation: 'Every composite number can be expressed as a unique product of prime factors (order aside). For example, 12 = 2 times 2 times 3.',
    visual: 'Factor tree: 12 splits into 2 and 6, 6 splits into 2 and 3 — so 12 = 2 times 2 times 3.',
    question: 'Every composite number is a unique product of:',
    options: ['Even numbers', 'Prime factors', 'Odd numbers', 'Square numbers'],
    answerIndex: 1,
    feedback: 'The Fundamental Theorem of Arithmetic: every composite number is a unique product of primes.',
    hints: ['Think about breaking a number down.', 'You break it into prime numbers.', 'Every composite is a unique product of prime factors.'],
    recallAnswer: 'Prime factors',
    recallQuestion: 'Every composite number is a unique product of what?',
  },
  'Mathematics|Irrational Numbers': {
    explanation: 'Irrational numbers cannot be written as p/q where p and q are integers. Examples: root 2, root 3, and pi. Their decimal expansions are non-terminating and non-recurring.',
    visual: 'Pi = 3.14159... goes on forever without repeating. Root 2 = 1.41421... also never repeats.',
    question: 'Which of these is irrational?',
    options: ['1/2', '0.75', 'Root 2', '3'],
    answerIndex: 2,
    feedback: 'Root 2 is irrational — it cannot be written as p/q and its decimal never terminates or repeats.',
    hints: ['Irrational means not a fraction of integers.', 'The decimal goes on forever without repeating.', 'Root 2 is irrational.'],
    recallAnswer: 'Root 2',
    recallQuestion: 'Give an example of an irrational number.',
  },
  // ---- Mathematics: Polynomials ----
  'Mathematics|Zeros of a Polynomial': {
    explanation: 'A zero of a polynomial p(x) is a value of x for which p(x) = 0. For example, if p(x) = x - 3, then x = 3 is a zero because p(3) = 0.',
    visual: 'The graph of p(x) crosses the x-axis at the zeros — where y = 0.',
    question: 'A zero of p(x) is a value where:',
    options: ['p(x) = 1', 'p(x) = 0', 'p(x) = x', 'p(x) = infinity'],
    answerIndex: 1,
    feedback: 'A zero of a polynomial is the value of x that makes p(x) = 0.',
    hints: ['Think about where the graph crosses the x-axis.', 'At that point, y = 0.', 'A zero is where p(x) = 0.'],
    recallAnswer: 'p(x) = 0',
    recallQuestion: 'What is a zero of a polynomial?',
  },
  'Mathematics|Remainder Theorem': {
    explanation: 'The Remainder Theorem says: when p(x) is divided by (x - a), the remainder is p(a). For example, dividing p(x) by (x - 2) leaves remainder p(2).',
    visual: 'Divide x squared - 1 by (x - 1): remainder = p(1) = 1 - 1 = 0. So (x - 1) is a factor.',
    question: 'Dividing p(x) by (x - a) gives remainder:',
    options: ['p(0)', 'p(a)', 'p(1)', 'a'],
    answerIndex: 1,
    feedback: 'The Remainder Theorem: remainder = p(a) when dividing by (x - a).',
    hints: ['The remainder relates to evaluating the polynomial.', 'You evaluate at the value a.', 'The remainder is p(a).'],
    recallAnswer: 'p(a)',
    recallQuestion: 'What is the remainder when p(x) is divided by (x - a)?',
  },
  'Mathematics|Factor Theorem': {
    explanation: 'The Factor Theorem says: (x - a) is a factor of p(x) if and only if p(a) = 0. This follows from the Remainder Theorem — if remainder is 0, it is a factor.',
    visual: 'If p(2) = 0, then (x - 2) is a factor of p(x). If p(3) is not 0, then (x - 3) is not a factor.',
    question: '(x - a) is a factor of p(x) when:',
    options: ['p(a) = 0', 'p(a) = 1', 'p(0) = a', 'p(a) = a'],
    answerIndex: 0,
    feedback: 'By the Factor Theorem, (x - a) is a factor if and only if p(a) = 0.',
    hints: ['It relates to the Remainder Theorem.', 'If the remainder is 0, it is a factor.', '(x - a) is a factor when p(a) = 0.'],
    recallAnswer: 'p(a) = 0',
    recallQuestion: 'When is (x - a) a factor of p(x)?',
  },
  // ---- Mathematics: Linear Equations ----
  'Mathematics|Substitution Method': {
    explanation: 'In the substitution method, solve one equation for one variable and substitute into the other. Example: if y = 2x, substitute into x + y = 6 to get x + 2x = 6, so x = 2.',
    visual: 'Solve y = 2x, then plug into x + y = 6: x + 2x = 6, x = 2, y = 4.',
    question: 'In substitution, you solve one equation for one variable and:',
    options: ['Eliminate it', 'Substitute into the other', 'Add both', 'Multiply both'],
    answerIndex: 1,
    feedback: 'Substitution: solve for one variable, then substitute that expression into the other equation.',
    hints: ['You express one variable in terms of another.', 'Then you plug it into the other equation.', 'You substitute into the other equation.'],
    recallAnswer: 'Substitute into the other',
    recallQuestion: 'In the substitution method, what do you do after solving for one variable?',
  },
  'Mathematics|Elimination Method': {
    explanation: 'In the elimination method, multiply equations so that adding or subtracting eliminates one variable. Example: 2x + y = 5 and x - y = 1 — add both to get 3x = 6, x = 2.',
    visual: 'Two equations stacked: add them so one variable cancels out, leaving one equation with one variable.',
    question: 'The elimination method works by:',
    options: ['Adding/subtracting to remove a variable', 'Substituting one into the other', 'Graphing both', 'Guessing'],
    answerIndex: 0,
    feedback: 'Elimination adds or subtracts equations to cancel out one variable.',
    hints: ['You want one variable to disappear.', 'You add or subtract the equations.', 'Elimination removes a variable by adding or subtracting.'],
    recallAnswer: 'Adding or subtracting',
    recallQuestion: 'How does the elimination method remove a variable?',
  },
  'Mathematics|Graphical Method': {
    explanation: 'In the graphical method, plot both equations on a graph. The point where the two lines intersect is the solution (x, y).',
    visual: 'Two lines on a graph crossing at a point — that intersection is the solution to both equations.',
    question: 'In the graphical method, the solution is the:',
    options: ['Slope of the line', 'Intersection point', 'Y-intercept', 'Origin'],
    answerIndex: 1,
    feedback: 'The intersection point of the two lines gives the solution (x, y) that satisfies both equations.',
    hints: ['You draw both lines on a graph.', 'They meet at one point.', 'The intersection point is the solution.'],
    recallAnswer: 'Intersection point',
    recallQuestion: 'In the graphical method, what is the solution?',
  },
  // ---- Mathematics: Triangles ----
  'Mathematics|Pythagoras Theorem': {
    explanation: 'In a right triangle, the square of the hypotenuse equals the sum of the squares of the other two sides: c squared = a squared + b squared.',
    visual: 'A right triangle with sides 3, 4, 5: 3 squared + 4 squared = 9 + 16 = 25 = 5 squared.',
    question: 'In a right triangle, c squared = a squared + b squared is:',
    options: ['Pythagoras theorem', 'Thales theorem', 'Euclid\'s lemma', 'Remainder theorem'],
    answerIndex: 0,
    feedback: 'The Pythagorean theorem: c squared = a squared + b squared for right triangles.',
    hints: ['It is about right triangles.', 'It relates the three sides.', 'It is the Pythagoras theorem.'],
    recallAnswer: 'Pythagoras theorem',
    recallQuestion: 'What theorem states c squared = a squared + b squared?',
  },
  'Mathematics|Similarity Criteria': {
    explanation: 'Two triangles are similar if: AA (two angles equal), SSS (all three sides proportional), or SAS (two sides proportional and the included angle equal).',
    visual: 'Two triangles of different sizes but same shape — all angles match and sides are proportional.',
    question: 'Which is NOT a similarity criterion for triangles?',
    options: ['AA', 'SSS', 'SAS', 'AAA-all-sides-equal'],
    answerIndex: 3,
    feedback: 'AA, SSS (proportional), and SAS (proportional) are similarity criteria. AAA-all-sides-equal is not standard notation.',
    hints: ['Similar triangles have the same shape.', 'The criteria are AA, SSS, and SAS.', 'AAA-all-sides-equal is not a standard similarity criterion.'],
    recallAnswer: 'AA',
    recallQuestion: 'Name one similarity criterion for triangles.',
  },
  'Mathematics|Area of Similar Triangles': {
    explanation: 'The ratio of areas of two similar triangles equals the square of the ratio of their corresponding sides. If sides are in ratio 1:2, areas are in ratio 1:4.',
    visual: 'Two similar triangles with sides in ratio 1:3 — their areas are in ratio 1:9 (the square).',
    question: 'If sides of similar triangles are in ratio 1:3, areas are in ratio:',
    options: ['1:3', '1:6', '1:9', '1:12'],
    answerIndex: 2,
    feedback: 'Area ratio = (side ratio) squared. So 1:3 sides gives 1:9 areas.',
    hints: ['Area ratio is the square of the side ratio.', 'Side ratio is 1:3.', 'Square it: 1:9.'],
    recallAnswer: 'Square of side ratio',
    recallQuestion: 'The ratio of areas of similar triangles equals what?',
  },
  // ---- Mathematics: Trigonometry ----
  'Mathematics|Trigonometric Ratios': {
    explanation: 'In a right triangle, sin = opposite/hypotenuse, cos = adjacent/hypotenuse, tan = opposite/adjacent. Remember SOH-CAH-TOA.',
    visual: 'SOH-CAH-TOA: sin = Opp/Hyp, cos = Adj/Hyp, tan = Opp/Adj in a right triangle.',
    question: 'sin theta equals:',
    options: ['Opposite / Hypotenuse', 'Adjacent / Hypotenuse', 'Opposite / Adjacent', 'Hypotenuse / Opposite'],
    answerIndex: 0,
    feedback: 'sin = opposite / hypotenuse (SOH from SOH-CAH-TOA).',
    hints: ['Remember SOH-CAH-TOA.', 'S is for sin, O is opposite, H is hypotenuse.', 'sin = opposite / hypotenuse.'],
    recallAnswer: 'Opposite / Hypotenuse',
    recallQuestion: 'What is sin theta in a right triangle?',
  },
  'Mathematics|Standard Values': {
    explanation: 'Standard trigonometric values: sin 30 = 1/2, sin 60 = root 3/2, sin 90 = 1, cos 0 = 1, cos 60 = 1/2, tan 45 = 1.',
    visual: 'A table: 0, 30, 45, 60, 90 degrees with their sin, cos, and tan values — memorize these.',
    question: 'The value of sin 30 degrees is:',
    options: ['0', '1/2', '1', 'root 3 / 2'],
    answerIndex: 1,
    feedback: 'sin 30 degrees = 1/2 (or 0.5) — a standard trigonometric value.',
    hints: ['Think about the standard values table.', 'sin 30 is one of the simplest values.', 'sin 30 degrees = 1/2.'],
    recallAnswer: '1/2',
    recallQuestion: 'What is the value of sin 30 degrees?',
  },
  'Mathematics|Trigonometric Identities': {
    explanation: 'The fundamental identity: sin squared theta + cos squared theta = 1. This is true for all values of theta. Other identities can be derived from it.',
    visual: 'A right triangle inscribed in a unit circle — sin and cos are the sides, and their squares always add to 1.',
    question: 'sin squared theta + cos squared theta equals:',
    options: ['0', '1', '2', 'theta'],
    answerIndex: 1,
    feedback: 'The Pythagorean identity: sin squared theta + cos squared theta = 1, always true.',
    hints: ['This is the most famous trig identity.', 'It is always true for any angle.', 'sin squared + cos squared = 1.'],
    recallAnswer: '1',
    recallQuestion: 'What does sin squared theta + cos squared theta equal?',
  },
  // ---- Mathematics: Statistics ----
  'Mathematics|Mean': {
    explanation: 'The mean is the average: sum of all values divided by the number of values. For 2, 4, 6: mean = (2+4+6)/3 = 4.',
    visual: 'Add all numbers, then divide by how many there are — that is the mean.',
    question: 'The mean of 2, 4, 6 is:',
    options: ['3', '4', '5', '6'],
    answerIndex: 1,
    feedback: 'Mean = (2 + 4 + 6) / 3 = 12 / 3 = 4.',
    hints: ['Add all the numbers first.', '2 + 4 + 6 = 12.', 'Divide by 3: 12 / 3 = 4.'],
    recallAnswer: 'Sum divided by count',
    recallQuestion: 'How do you calculate the mean?',
  },
  'Mathematics|Median': {
    explanation: 'The median is the middle value when data is arranged in order. For 1, 3, 5, 7, 9: median = 5. For an even number of values, take the average of the two middle ones.',
    visual: 'Line up 5 students by height — the median is the height of the student in the middle.',
    question: 'The median of 1, 3, 5, 7, 9 is:',
    options: ['3', '5', '7', '4'],
    answerIndex: 1,
    feedback: 'When arranged in order, 5 is the middle value (third of five).',
    hints: ['First arrange the numbers in order.', 'They are already in order: 1, 3, 5, 7, 9.', 'The middle value is 5.'],
    recallAnswer: 'Middle value',
    recallQuestion: 'What is the median of a data set?',
  },
  'Mathematics|Mode': {
    explanation: 'The mode is the value that appears most often. In 1, 2, 2, 3, 4: the mode is 2 because it appears twice, more than any other value.',
    visual: 'In a survey of favorite colors, if blue appears most often, blue is the mode.',
    question: 'The mode of 1, 2, 2, 3, 4 is:',
    options: ['1', '2', '3', '4'],
    answerIndex: 1,
    feedback: '2 appears most often (twice), so the mode is 2.',
    hints: ['Look for the number that appears most.', '2 appears twice, others appear once.', 'The mode is 2.'],
    recallAnswer: 'Most frequent value',
    recallQuestion: 'What is the mode of a data set?',
  },
  'Mathematics|Cumulative Frequency': {
    explanation: 'Cumulative frequency is the running total of frequencies. For each class interval, add the frequency of all intervals up to and including that one.',
    visual: 'A table where each row adds the previous total: 5, then 5+8=13, then 13+7=20 — cumulative frequency builds up.',
    question: 'Cumulative frequency is:',
    options: ['The most frequent value', 'A running total of frequencies', 'The average frequency', 'The middle frequency'],
    answerIndex: 1,
    feedback: 'Cumulative frequency is the running total — each entry adds the previous frequencies.',
    hints: ['Cumulative means building up.', 'Each value adds the previous total.', 'It is a running total of frequencies.'],
    recallAnswer: 'Running total',
    recallQuestion: 'What is cumulative frequency?',
  },

  // ---- Biology: Cell ----
  'Biology|Cell Structure': {
    explanation: 'A cell has three main parts: the cell membrane (outer boundary), cytoplasm (jelly-like interior), and nucleus (control center containing DNA).',
    visual: 'A cell looks like a balloon: the membrane is the skin, cytoplasm is the air inside, and the nucleus is a smaller balloon in the center.',
    question: 'The control center of the cell is the:',
    options: ['Cell membrane', 'Cytoplasm', 'Nucleus', 'Vacuole'],
    answerIndex: 2,
    feedback: 'The nucleus contains DNA and controls all activities of the cell.',
    hints: ['It is inside the cell.', 'It contains the genetic material (DNA).', 'The nucleus is the control center.'],
    recallAnswer: 'Nucleus',
    recallQuestion: 'What is the control center of the cell?',
  },
  'Biology|Organelles': {
    explanation: 'Organelles are specialized structures in a cell. Mitochondria produce energy (ATP), ribosomes make proteins, and chloroplasts do photosynthesis in plant cells.',
    visual: 'A cell is like a factory: mitochondria are the power plant, ribosomes are the assembly line, chloroplasts are the solar panels.',
    question: 'The powerhouse of the cell is the:',
    options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Vacuole'],
    answerIndex: 2,
    feedback: 'Mitochondria produce ATP through respiration — the energy currency of the cell.',
    hints: ['It produces energy.', 'It is called the powerhouse.', 'Mitochondria is the powerhouse of the cell.'],
    recallAnswer: 'Mitochondria',
    recallQuestion: 'Which organelle is the powerhouse of the cell?',
  },
  'Biology|Prokaryotic vs Eukaryotic': {
    explanation: 'Prokaryotic cells (like bacteria) have no true nucleus — their DNA is free in the cytoplasm. Eukaryotic cells (like plants and animals) have a nucleus that contains DNA.',
    visual: 'A bacteria cell (prokaryotic) has DNA floating loose. A plant cell (eukaryotic) has DNA inside a nucleus.',
    question: 'Prokaryotic cells differ from eukaryotic because they lack a:',
    options: ['Cell membrane', 'Nucleus', 'Cytoplasm', 'DNA'],
    answerIndex: 1,
    feedback: 'Prokaryotic cells lack a true nucleus; their DNA is free in the cytoplasm. Eukaryotic cells have a nucleus.',
    hints: ['Pro means before, eu means true.', 'Prokaryotic cells have no organized nucleus.', 'They lack a nucleus.'],
    recallAnswer: 'Nucleus',
    recallQuestion: 'What do prokaryotic cells lack that eukaryotic cells have?',
  },
  'Biology|Plant vs Animal Cell': {
    explanation: 'Plant cells have a cell wall, chloroplasts, and a large vacuole — animal cells do not. Both have a nucleus, cell membrane, and mitochondria.',
    visual: 'Plant cell: rectangular with green chloroplasts and a wall. Animal cell: round, no wall, no chloroplasts.',
    question: 'Which is found in plant cells but NOT animal cells?',
    options: ['Nucleus', 'Mitochondria', 'Chloroplasts', 'Cell membrane'],
    answerIndex: 2,
    feedback: 'Chloroplasts (for photosynthesis) and cell walls are found only in plant cells, not animal cells.',
    hints: ['Plant cells can make food from sunlight.', 'They need a special organelle for that.', 'Chloroplasts are only in plant cells.'],
    recallAnswer: 'Chloroplasts',
    recallQuestion: 'What organelle is found in plant cells but not animal cells?',
  },
  // ---- Biology: Tissues ----
  'Biology|Plant Tissues': {
    explanation: 'Plant tissues include meristematic (actively dividing) and permanent (done dividing). Xylem transports water, phloem transports food.',
    visual: 'A tree trunk: the outer layer (phloem) carries food, the inner layer (xylem) carries water up from roots.',
    question: 'Which plant tissue transports water?',
    options: ['Phloem', 'Xylem', 'Parenchyma', 'Collenchyma'],
    answerIndex: 1,
    feedback: 'Xylem transports water and minerals from roots to leaves. Phloem transports food.',
    hints: ['One tissue carries water up from the roots.', 'The other carries food.', 'Xylem transports water.'],
    recallAnswer: 'Xylem',
    recallQuestion: 'Which plant tissue transports water?',
  },
  'Biology|Animal Tissues': {
    explanation: 'Animal tissues include epithelial (covering), connective (support), muscular (movement), and nervous (signaling). Each has a specific function.',
    visual: 'Skin = epithelial, bone = connective, biceps = muscular, brain = nervous — four types of animal tissue.',
    question: 'Which tissue covers body surfaces?',
    options: ['Connective', 'Epithelial', 'Muscular', 'Nervous'],
    answerIndex: 1,
    feedback: 'Epithelial tissue covers body surfaces and lines organs. Skin is an example.',
    hints: ['Think about the outer layer of your body.', 'Skin is made of this tissue.', 'Epithelial tissue covers surfaces.'],
    recallAnswer: 'Epithelial',
    recallQuestion: 'Which animal tissue covers body surfaces?',
  },
  'Biology|Meristematic Tissue': {
    explanation: 'Meristematic tissue is made of actively dividing cells found at the tips of roots and shoots. It produces new cells for growth.',
    visual: 'The growing tip of a root — cells there are constantly dividing to make the root grow longer.',
    question: 'Meristematic tissue is found at:',
    options: ['The center of the stem', 'Tips of roots and shoots', 'Leaf surfaces', 'Bark'],
    answerIndex: 1,
    feedback: 'Meristematic tissue is at the growing tips of roots and shoots where cells actively divide.',
    hints: ['It is where growth happens.', 'Growth happens at the tips.', 'Meristematic tissue is at the tips of roots and shoots.'],
    recallAnswer: 'Tips of roots and shoots',
    recallQuestion: 'Where is meristematic tissue found?',
  },
  'Biology|Permanent Tissue': {
    explanation: 'Permanent tissue is formed when meristematic cells stop dividing and take on a specific function. Examples: parenchyma (storage), collenchyma (flexibility), sclerenchyma (strength).',
    visual: 'Once cells stop dividing, they specialize — like workers trained for specific jobs.',
    question: 'Permanent tissue is formed when cells:',
    options: ['Start dividing', 'Stop dividing and specialize', 'Die', 'Merge together'],
    answerIndex: 1,
    feedback: 'Permanent tissue forms when meristematic cells stop dividing and take on specific functions.',
    hints: ['Meristematic cells eventually stop dividing.', 'They then take on a specific job.', 'Permanent tissue is formed when cells stop dividing and specialize.'],
    recallAnswer: 'Stop dividing and specialize',
    recallQuestion: 'How is permanent tissue formed?',
  },
  // ---- Biology: Life Processes ----
  'Biology|Nutrition': {
    explanation: 'Nutrition is how organisms obtain food. Autotrophs (like plants) make their own food via photosynthesis. Heterotrophs (like animals) eat other organisms.',
    visual: 'A plant uses sunlight to make food (autotroph). A cow eats grass (heterotroph). Two different nutrition modes.',
    question: 'Organisms that make their own food are called:',
    options: ['Heterotrophs', 'Autotrophs', 'Decomposers', 'Parasites'],
    answerIndex: 1,
    feedback: 'Autotrophs like plants make their own food using sunlight (photosynthesis). Heterotrophs eat others.',
    hints: ['Auto means self.', 'These organisms make their own food.', 'They are called autotrophs.'],
    recallAnswer: 'Autotrophs',
    recallQuestion: 'What do we call organisms that make their own food?',
  },
  'Biology|Respiration': {
    explanation: 'Respiration is the process of breaking down glucose to release energy (ATP). It uses oxygen (aerobic) or not (anaerobic). Equation: glucose + oxygen gives CO2 + water + energy.',
    visual: 'You breathe in oxygen, which cells use to break down food and release energy. ATP is the energy currency.',
    question: 'Respiration produces which energy molecule?',
    options: ['DNA', 'Protein', 'ATP', 'Glucose'],
    answerIndex: 2,
    feedback: 'Respiration breaks down glucose to produce ATP, the energy currency of cells.',
    hints: ['Respiration releases energy.', 'The energy is stored in a molecule.', 'ATP is the energy molecule produced.'],
    recallAnswer: 'ATP',
    recallQuestion: 'What energy molecule does respiration produce?',
  },
  'Biology|Transportation': {
    explanation: 'In humans, the circulatory system transports materials: arteries carry oxygen-rich blood away from the heart, veins carry it back. In plants, xylem and phloem transport water and food.',
    visual: 'A map of blood vessels: arteries (red, away from heart) and veins (blue, back to heart) — like roads carrying goods.',
    question: 'Arteries carry blood:',
    options: ['To the heart', 'Away from the heart', 'Only in the brain', 'Only in the legs'],
    answerIndex: 1,
    feedback: 'Arteries carry oxygen-rich blood away from the heart. Veins carry blood back to the heart.',
    hints: ['Arteries (A) = Away.', 'They carry blood from the heart to the body.', 'Arteries carry blood away from the heart.'],
    recallAnswer: 'Away from the heart',
    recallQuestion: 'In which direction do arteries carry blood?',
  },
  'Biology|Excretion': {
    explanation: 'Excretion is the removal of waste. In humans, kidneys filter blood and produce urine. In plants, waste is removed through stomata (leaf pores).',
    visual: 'Kidneys are like filters — they remove waste from blood and make urine. Plants use leaf pores.',
    question: 'In humans, which organ filters blood for excretion?',
    options: ['Heart', 'Lungs', 'Kidneys', 'Liver'],
    answerIndex: 2,
    feedback: 'Kidneys filter waste from blood and produce urine. Lungs excrete CO2, but kidneys are the main excretory organ.',
    hints: ['Think about urine production.', 'Which organ makes urine?', 'The kidneys filter blood.'],
    recallAnswer: 'Kidneys',
    recallQuestion: 'Which organ filters blood for excretion in humans?',
  },
  // ---- Biology: Reproduction ----
  'Biology|Asexual Reproduction': {
    explanation: 'Asexual reproduction involves one parent and produces genetically identical offspring. Types include binary fission (bacteria), budding (yeast), and fragmentation (starfish).',
    visual: 'A bacterium splitting into two identical copies — one parent, no mixing of genes.',
    question: 'Asexual reproduction produces offspring that are:',
    options: ['Different from parent', 'Genetically identical', 'Larger', 'Smaller'],
    answerIndex: 1,
    feedback: 'Asexual reproduction uses one parent, so offspring are genetically identical clones.',
    hints: ['Only one parent is involved.', 'No mixing of genes.', 'Offspring are genetically identical.'],
    recallAnswer: 'Genetically identical',
    recallQuestion: 'What kind of offspring does asexual reproduction produce?',
  },
  'Biology|Sexual Reproduction': {
    explanation: 'Sexual reproduction involves two parents and produces genetically varied offspring. Male and female gametes fuse to form a zygote, which develops into a new organism.',
    visual: 'A sperm and egg fuse to form a zygote — combining genes from two parents creates variation.',
    question: 'Sexual reproduction involves:',
    options: ['One parent', 'Two parents', 'No parents', 'Three parents'],
    answerIndex: 1,
    feedback: 'Sexual reproduction involves two parents whose gametes fuse, creating genetic variation.',
    hints: ['It involves male and female gametes.', 'Two parents contribute genes.', 'Sexual reproduction involves two parents.'],
    recallAnswer: 'Two parents',
    recallQuestion: 'How many parents are involved in sexual reproduction?',
  },
  'Biology|Pollination': {
    explanation: 'Pollination is the transfer of pollen from the male part (anther) to the female part (stigma) of a flower. It can be by wind, water, or animals like bees.',
    visual: 'A bee carrying pollen from one flower\'s anther to another flower\'s stigma — pollination in action.',
    question: 'Pollination is the transfer of pollen from:',
    options: ['Stigma to anther', 'Anther to stigma', 'Root to leaf', 'Stem to flower'],
    answerIndex: 1,
    feedback: 'Pollination: pollen moves from the anther (male) to the stigma (female) of a flower.',
    hints: ['Pollen comes from the male part.', 'It goes to the female part.', 'Pollen goes from anther to stigma.'],
    recallAnswer: 'Anther to stigma',
    recallQuestion: 'What is the direction of pollen transfer in pollination?',
  },
  'Biology|Fertilization': {
    explanation: 'Fertilization is the fusion of male and female gametes to form a zygote. In humans, sperm and egg fuse. In plants, pollen and ovule fuse.',
    visual: 'A sperm cell entering an egg cell — they merge to form a single zygote, the first cell of a new life.',
    question: 'Fertilization results in the formation of a:',
    options: ['Gamete', 'Zygote', 'Tissue', 'Organ'],
    answerIndex: 1,
    feedback: 'Fertilization: male and female gametes fuse to form a zygote, the first cell of a new organism.',
    hints: ['Two gametes fuse together.', 'The result is a single cell.', 'That cell is called a zygote.'],
    recallAnswer: 'Zygote',
    recallQuestion: 'What does fertilization produce?',
  },
  // ---- Biology: Heredity & Evolution ----
  'Biology|Mendels Laws': {
    explanation: 'Mendel\'s Law of Segregation: allele pairs separate during gamete formation. Law of Independent Assortment: genes for different traits are inherited independently.',
    visual: 'A Punnett square showing how traits from two parents combine — each parent gives one allele.',
    question: 'Mendel\'s Law of Segregation states that alleles:',
    options: ['Blend together', 'Separate during gamete formation', 'Are always dominant', 'Are acquired'],
    answerIndex: 1,
    feedback: 'The Law of Segregation: allele pairs separate during gamete formation, each gamete gets one allele.',
    hints: ['Think about how parents pass traits.', 'Each parent gives one allele.', 'Alleles separate during gamete formation.'],
    recallAnswer: 'Separate',
    recallQuestion: 'What does Mendel\'s Law of Segregation say alleles do?',
  },
  'Biology|Variation': {
    explanation: 'Variation is the difference in traits among individuals of the same species. It arises from mutations, recombination during sexual reproduction, and environmental factors.',
    visual: 'A family where children have different eye colors and heights — variation from gene combinations.',
    question: 'Variation in traits arises from:',
    options: ['Only environment', 'Mutations and recombination', 'Only diet', 'Only exercise'],
    answerIndex: 1,
    feedback: 'Variation comes from mutations (new genes) and recombination (mixing of parent genes during sexual reproduction).',
    hints: ['Children are not identical to parents.', 'Genes change and mix.', 'Variation arises from mutations and recombination.'],
    recallAnswer: 'Mutations and recombination',
    recallQuestion: 'What causes variation in traits?',
  },
  'Biology|Natural Selection': {
    explanation: 'Natural selection is Darwin\'s theory: organisms with traits better suited to their environment survive and reproduce more. Over time, favorable traits become more common.',
    visual: 'Giraffes with longer necks reach more leaves, survive better, and have more long-necked offspring.',
    question: 'Natural selection means organisms with favorable traits:',
    options: ['Die faster', 'Survive and reproduce more', 'Change color', 'Move away'],
    answerIndex: 1,
    feedback: 'Natural selection: better-suited organisms survive and reproduce more, passing on their traits.',
    hints: ['Think about survival of the fittest.', 'Favorable traits help survival.', 'They survive and reproduce more.'],
    recallAnswer: 'Survive and reproduce more',
    recallQuestion: 'What happens to organisms with favorable traits in natural selection?',
  },
  'Biology|Speciation': {
    explanation: 'Speciation is the formation of new species when populations become reproductively isolated — often by geographic barriers like rivers or mountains — over many generations.',
    visual: 'A river splits a bird population into two groups. Over time, each group changes so much they can no longer interbreed — new species.',
    question: 'Speciation occurs when populations become:',
    options: ['Larger', 'Reproductively isolated', 'Extinct', 'Identical'],
    answerIndex: 1,
    feedback: 'Speciation happens when populations become reproductively isolated and can no longer interbreed.',
    hints: ['New species form when groups separate.', 'They can no longer mate with each other.', 'They become reproductively isolated.'],
    recallAnswer: 'Reproductively isolated',
    recallQuestion: 'What causes speciation?',
  },
};

// ---- Content lookup ----
function getTopicContent(subject: MemorySubject, topic: string): TopicContent | null {
  return TOPIC_CONTENT[`${subject}|${topic}`] ?? null;
}

// ---- Daily activity generation ----
export function generateDailyActivity(
  classLevel: string,
  subject: MemorySubject,
  chapter: string,
  topic: string,
  _language: Language,
): DailyActivity {
  const content = getTopicContent(subject, topic);
  if (content) {
    return {
      chapter,
      topic,
      visualDescription: content.visual,
      explanation: content.explanation,
      question: content.question,
      options: content.options,
      answerIndex: content.answerIndex,
      feedback: content.feedback,
    };
  }
  // Fallback: generate from topic name (still curriculum-grounded, not hardcoded)
  return {
    chapter,
    topic,
    visualDescription: `Imagine the concept of ${topic} in ${chapter}.`,
    explanation: `${topic} is an important topic in ${chapter} for ${classLevel} ${subject}. Understanding it helps you build a foundation for more advanced concepts.`,
    question: `Which best describes ${topic}?`,
    options: [
      `A key concept in ${chapter}`,
      `An unrelated topic`,
      `A type of measurement`,
    ],
    answerIndex: 0,
    feedback: `${topic} is a key concept in ${chapter}. Keep reviewing to strengthen your understanding.`,
  };
}

// ---- Memory cards generation ----
export function generateMemoryCards(
  classLevel: string,
  subject: MemorySubject,
  chapter: string,
  topic: string,
  _language: Language,
  count = 5,
): MemoryCard[] {
  const cards: MemoryCard[] = [];
  // Get all topics from the chapter so cards cover the chapter, not just one topic
  const topics = getTopicsForChapter(classIdFromClassLevel(classLevel), subject, chapter);
  const topicList = topics.length > 0 ? topics : [topic];

  // Shuffle topics so each session gets different cards
  const shuffled = [...topicList].sort(() => Math.random() - 0.5);
  const selectedTopics = shuffled.slice(0, Math.min(count, shuffled.length));

  for (let i = 0; i < selectedTopics.length; i++) {
    const cardTopic = selectedTopics[i];
    const content = getTopicContent(subject, cardTopic);
    if (content) {
      cards.push({
        id: `card-${i}-${Date.now()}`,
        chapter,
        topic: cardTopic,
        front: content.question,
        back: content.options[content.answerIndex] + ' — ' + content.feedback,
        visualDescription: content.visual,
        hint: content.hints[0],
      });
    } else {
      cards.push({
        id: `card-${i}-${Date.now()}`,
        chapter,
        topic: cardTopic,
        front: `What is ${cardTopic}?`,
        back: `${cardTopic} is a key concept in ${chapter}.`,
        visualDescription: `Visualize ${cardTopic} in the context of ${chapter}.`,
        hint: `Think about what ${cardTopic} relates to in ${chapter}.`,
      });
    }
  }

  // If we still don't have enough cards (chapter has fewer topics), repeat with different content
  while (cards.length < count && topicList.length > 0) {
    const cardTopic = topicList[cards.length % topicList.length];
    const content = getTopicContent(subject, cardTopic);
    if (content) {
      cards.push({
        id: `card-${cards.length}-${Date.now()}`,
        chapter,
        topic: cardTopic,
        front: content.recallQuestion,
        back: content.recallAnswer,
        visualDescription: content.visual,
        hint: content.hints[1] ?? content.hints[0],
      });
    } else {
      cards.push({
        id: `card-${cards.length}-${Date.now()}`,
        chapter,
        topic: cardTopic,
        front: `Explain ${cardTopic}.`,
        back: `${cardTopic} relates to ${chapter}.`,
        visualDescription: `Think about ${cardTopic} in ${chapter}.`,
        hint: `Consider how ${cardTopic} fits in ${chapter}.`,
      });
    }
  }

  return cards.slice(0, count);
}

// ---- Recall question generation ----
export function generateRecallQuestion(
  classLevel: string,
  subject: MemorySubject,
  chapter: string,
  topic: string,
  _language: Language,
): RecallQuestion {
  const content = getTopicContent(subject, topic);
  if (content) {
    return {
      id: `recall-${Date.now()}`,
      chapter,
      topic,
      question: content.recallQuestion,
      answer: content.recallAnswer,
      hints: content.hints,
    };
  }
  return {
    id: `recall-${Date.now()}`,
    chapter,
    topic,
    question: `What is the key concept in ${topic}?`,
    answer: topic,
    hints: [
      `Think about what ${topic} looks like.`,
      `It relates to ${chapter}.`,
      `It starts with "${topic.charAt(0)}".`,
    ],
  };
}

// ---- Visual learning generation ----
export function generateVisualLearningItems(
  classLevel: string,
  subject: MemorySubject,
  chapter: string,
  _language: Language,
  count = 4,
): VisualLearningItem[] {
  const items: VisualLearningItem[] = [];
  const topics = getTopicsForChapter(classIdFromClassLevel(classLevel), subject, chapter);
  const topicList = topics.length > 0 ? topics : ['Key concept'];

  for (let i = 0; i < Math.min(count, topicList.length); i++) {
    const t = topicList[i];
    const content = getTopicContent(subject, t);
    if (content) {
      items.push({
        chapter,
        topic: t,
        title: t,
        visualDescription: content.visual,
        explanation: content.explanation,
      });
    } else {
      items.push({
        chapter,
        topic: t,
        title: t,
        visualDescription: `Draw a diagram showing ${t} in ${chapter}.`,
        explanation: `This visual helps you understand ${t} in ${chapter}.`,
      });
    }
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
function classIdFromClassLevel(classLevel: string): string {
  const id = classLevelToClassId(classLevel);
  return id || 'class-9';
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
