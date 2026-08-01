// Guided Learning Engine — the Socratic "discover the answer" methodology.
// Instead of giving answers directly, this engine guides students through:
//   1. "What do you already know?" — elicit prior knowledge
//   2. Analyze the response — identify correct parts and concept gaps
//   3. Progressive hints — subtle → specific → strong
//   4. Student reaches the answer themselves
//   5. Confirm + explain + practice question
//   6. Record learning progress

import { loadJSON, saveJSON, STORAGE_KEYS } from './storage';
import { KNOWLEDGE_BASE, CHAPTERS } from './mockData';
import type { StudentProfile } from './types';

// ---- Types ----

export type MessageIntent = 'casual' | 'factual' | 'learning';
export type LearningPhase =
  | 'idle'
  | 'eliciting'      // asking "what do you know?"
  | 'analyzing'      // student gave their understanding
  | 'hinting'        // giving progressive hints
  | 'confirming'     // student reached the answer
  | 'practicing'     // offering a similar question
  | 'complete';

export type HelpAction =
  | 'hint'
  | 'smaller_clue'
  | 'explain_concept'
  | 'real_life_example'
  | 'try_again'
  | 'show_answer';

export interface ConceptEntry {
  topic: string;
  chapter: string;
  subject: string;
  keyTerms: string[];
  coreIdea: string;
  hintLevel1: string;
  hintLevel2: string;
  hintLevel3: string;
  realLifeExample: string;
  explanation: string;
  similarQuestion: string;
  prerequisite?: string;
}

export interface LearningSessionState {
  phase: LearningPhase;
  concept: ConceptEntry | null;
  hintLevel: number;        // 0 = no hints given yet, up to 3
  attemptCount: number;     // how many times the student tried
  studentKnowledge: string; // what the student said they know
  identifiedGaps: string[];  // concepts the student is missing
  correctPoints: string[];  // what the student got right
  whatDoYouKnowEnabled: boolean;
  showAnswerRequested: boolean;
}

export interface LearningSignal {
  subject: string;
  chapter: string;
  topic: string;
  question: string;
  correct: boolean;
  hintLevelsUsed: number;
  attempts: number;
  gapsIdentified: string[];
  timestamp: number;
}

// ---- Concept Database ----
// Maps key topics to structured guided-learning content.

const CONCEPT_DATABASE: ConceptEntry[] = [
  {
    topic: 'velocity',
    chapter: 'Motion',
    subject: 'Physics',
    keyTerms: ['velocity', 'displacement', 'direction', 'vector'],
    coreIdea: 'Velocity is the rate of change of displacement — it includes both speed and direction, making it a vector quantity.',
    hintLevel1: 'Think about what makes velocity different from speed. Is there something extra?',
    hintLevel2: 'One of them includes a direction. Which one do you think it is?',
    hintLevel3: 'Velocity is a vector — it has both magnitude (how fast) and direction (which way). Speed is only the magnitude.',
    realLifeExample: 'Think of two cars going 60 km/h — one north and one south. They have the same speed but different velocities because the directions are different.',
    explanation: 'Velocity = displacement ÷ time. Since displacement is a vector (shortest path from start to end, with direction), velocity is also a vector. Speed = distance ÷ time, and distance has no direction, so speed is a scalar.',
    similarQuestion: 'A car travels 100 m north in 10 seconds, then 100 m south in 10 seconds. What is its average velocity for the entire trip?',
    prerequisite: 'Distance vs Displacement',
  },
  {
    topic: 'speed',
    chapter: 'Motion',
    subject: 'Physics',
    keyTerms: ['speed', 'distance', 'scalar', 'time'],
    coreIdea: 'Speed is the rate of change of distance — it only tells how fast something moves, without direction. It is a scalar quantity.',
    hintLevel1: 'Think about what information speed gives you. Does it tell you which direction something is moving?',
    hintLevel2: 'Speed is related to distance and time. What formula connects them?',
    hintLevel3: 'Speed = distance ÷ time. It is a scalar — it has magnitude but no direction.',
    realLifeExample: 'When your speedometer reads 60 km/h, it tells you how fast you are going, but not which direction. That is speed.',
    explanation: 'Speed = distance ÷ time. Since distance is the total path length (a scalar), speed is also a scalar. It only has magnitude, not direction.',
    similarQuestion: 'A boy runs 400 m around a circular track in 80 seconds. What is his average speed?',
  },
  {
    topic: 'acceleration',
    chapter: 'Motion',
    subject: 'Physics',
    keyTerms: ['acceleration', 'velocity', 'change', 'rate', 'm/s squared'],
    coreIdea: 'Acceleration is the rate of change of velocity per unit time. Its SI unit is m/s².',
    hintLevel1: 'Acceleration is about how velocity changes. What does "rate of change" mean?',
    hintLevel2: 'If a car speeds up from 10 m/s to 30 m/s in 5 seconds, what is changing and how fast?',
    hintLevel3: 'Acceleration = (final velocity − initial velocity) ÷ time. The unit is m/s² because you are dividing a velocity (m/s) by time (s).',
    realLifeExample: 'When you press the gas pedal, your car speeds up — that positive change in velocity is acceleration. When you brake, it is negative acceleration (deceleration).',
    explanation: 'Acceleration = change in velocity ÷ time = (v − u) ÷ t. The SI unit is m/s². Positive acceleration means speeding up; negative means slowing down.',
    similarQuestion: 'A car accelerates from rest to 20 m/s in 4 seconds. What is its acceleration?',
    prerequisite: 'Velocity',
  },
  {
    topic: 'gravity',
    chapter: 'Laws of Motion',
    subject: 'Physics',
    keyTerms: ['gravity', 'force', 'attraction', 'earth', 'mass', 'weight'],
    coreIdea: 'Gravity is the force of attraction that Earth exerts on objects, pulling them toward its center.',
    hintLevel1: 'You said Earth pulls the object. What do we call this pulling force?',
    hintLevel2: 'This force is what keeps us on the ground and makes things fall. It is related to mass.',
    hintLevel3: 'Gravity is the force of attraction between any two masses. Earth\'s gravity pulls objects toward its center. Weight = mass × g (g ≈ 9.8 m/s²).',
    realLifeExample: 'When you drop a ball, it falls to the ground. That is gravity pulling it toward Earth. An apple falling from a tree is what inspired Newton.',
    explanation: 'Gravity is the attractive force between masses. Earth\'s gravity gives every object an acceleration of about 9.8 m/s². Weight is the force of gravity on an object: W = m × g.',
    similarQuestion: 'If an object has a mass of 5 kg, what is its weight on Earth? (Take g = 9.8 m/s²)',
    prerequisite: 'Force',
  },
  {
    topic: 'newton',
    chapter: 'Laws of Motion',
    subject: 'Physics',
    keyTerms: ['newton', 'force', 'mass', 'acceleration', 'f = ma', 'second law'],
    coreIdea: "Newton's second law: Force = mass × acceleration (F = ma). The SI unit of force is the newton (N).",
    hintLevel1: 'Newton\'s second law connects force, mass, and acceleration. What relationship do you think exists between them?',
    hintLevel2: 'If you push a heavier object with the same force, will it accelerate more or less?',
    hintLevel3: 'F = ma. Force equals mass times acceleration. 1 newton is the force needed to give a 1 kg mass an acceleration of 1 m/s².',
    realLifeExample: 'Pushing a shopping cart: a full cart (more mass) needs more force to accelerate at the same rate as an empty one. That is F = ma in action.',
    explanation: "Newton's second law states F = ma. Force is directly proportional to mass and acceleration. The SI unit of force is the newton (N = kg·m/s²).",
    similarQuestion: 'A 2 kg object accelerates at 5 m/s². What force is applied to it?',
    prerequisite: 'Acceleration',
  },
  {
    topic: 'photosynthesis',
    chapter: 'Life Processes',
    subject: 'Biology',
    keyTerms: ['photosynthesis', 'chloroplast', 'chlorophyll', 'sunlight', 'carbon dioxide', 'glucose', 'oxygen'],
    coreIdea: 'Photosynthesis is the process by which plants use sunlight, CO₂, and water to produce glucose and oxygen, in the presence of chlorophyll.',
    hintLevel1: 'You mentioned plants make food. What do they need from the environment to do this?',
    hintLevel2: 'Think about the ingredients: something from the air, something from the soil, and energy from somewhere. What are they?',
    hintLevel3: 'Photosynthesis: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂, using sunlight and chlorophyll in chloroplasts. The green pigment chlorophyll captures light energy.',
    realLifeExample: 'Leaves are green because of chlorophyll. It captures sunlight, just like solar panels capture light to make electricity — plants use it to make food.',
    explanation: 'Photosynthesis happens in chloroplasts, which contain chlorophyll. Plants take in CO₂ from the air and water from the soil, use sunlight energy, and produce glucose (food) and oxygen. The equation: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂.',
    similarQuestion: 'Which gas is released as a by-product during photosynthesis, and which organelle is responsible for it?',
    prerequisite: 'Cell Structure',
  },
  {
    topic: 'cell',
    chapter: 'Cell',
    subject: 'Biology',
    keyTerms: ['cell', 'nucleus', 'membrane', 'mitochondria', 'ribosome', 'organelle', 'prokaryotic', 'eukaryotic'],
    coreIdea: 'The cell is the basic unit of life. It has a membrane, cytoplasm, and organelles like the nucleus (DNA), mitochondria (energy), and ribosomes (protein).',
    hintLevel1: 'You know the cell is important. What are the main parts you can think of inside a cell?',
    hintLevel2: 'Think about what controls the cell, what produces energy, and what makes proteins. What are these structures called?',
    hintLevel3: 'The nucleus stores DNA and controls the cell. Mitochondria produce energy (ATP). Ribosomes make proteins. The cell membrane controls what enters and exits.',
    realLifeExample: 'A cell is like a factory: the nucleus is the manager (controls everything), mitochondria are the power plant (energy), ribosomes are the assembly line (make proteins), and the membrane is the gate (controls entry).',
    explanation: 'The cell is the basic unit of life. Prokaryotic cells (bacteria) have no nucleus; eukaryotic cells do. Key organelles: nucleus (DNA), mitochondria (ATP/energy), ribosomes (protein synthesis), cell membrane (controls entry/exit). Plant cells also have a cell wall and chloroplasts.',
    similarQuestion: 'Which organelle is called the "powerhouse of the cell" and why?',
  },
  {
    topic: 'ph',
    chapter: 'Acids & Bases',
    subject: 'Chemistry',
    keyTerms: ['ph', 'acid', 'base', 'neutral', 'hydrogen', 'indicator', 'scale'],
    coreIdea: 'The pH scale (0–14) measures how acidic or basic a solution is. pH 7 is neutral, below 7 is acidic, above 7 is basic.',
    hintLevel1: 'You mentioned pH. What does the pH scale tell us about a solution?',
    hintLevel2: 'Think about the numbers: what pH would a neutral solution have? And what happens below and above that number?',
    hintLevel3: 'pH 7 = neutral. Below 7 = acidic (more H⁺ ions). Above 7 = basic (more OH⁻ ions). The scale goes from 0 to 14.',
    realLifeExample: 'Lemon juice has a pH around 2 (very acidic). Pure water has pH 7 (neutral). Soap has a pH around 9–10 (basic). Indicators like litmus paper change color to show pH.',
    explanation: 'The pH scale ranges from 0 to 14. pH 7 is neutral (equal H⁺ and OH⁻). Below 7 is acidic (excess H⁺). Above 7 is basic (excess OH⁻). Indicators (litmus, phenolphthalein, universal indicator) change color to reveal pH.',
    similarQuestion: 'A solution turns red litmus paper blue. Is it acidic, basic, or neutral? What is its likely pH range?',
  },
  {
    topic: 'atom',
    chapter: 'Atoms & Molecules',
    subject: 'Chemistry',
    keyTerms: ['atom', 'electron', 'proton', 'neutron', 'nucleus', 'atomic number', 'mass number'],
    coreIdea: 'Atoms are the smallest unit of an element. They have a nucleus (protons + neutrons) and electrons orbiting it. Atomic number = protons; mass number = protons + neutrons.',
    hintLevel1: 'You know atoms are small. What particles make up an atom?',
    hintLevel2: 'Think about the center of the atom and what orbits around it. What are those particles called?',
    hintLevel3: 'The nucleus contains protons (positive) and neutrons (neutral). Electrons (negative) orbit the nucleus. Atomic number = number of protons. In a neutral atom, electrons = protons.',
    realLifeExample: 'Think of an atom like the solar system: the nucleus is the sun (center), and electrons are planets orbiting around it. The number of protons determines which element it is.',
    explanation: 'Atoms consist of a nucleus (protons + neutrons) and electrons. Atomic number = protons. Mass number = protons + neutrons. In a neutral atom, the number of electrons equals the number of protons. Isotopes have the same protons but different neutrons.',
    similarQuestion: 'An atom has 11 protons and 12 neutrons. What is its atomic number and mass number? How many electrons does it have if neutral?',
  },
  {
    topic: 'ohms law',
    chapter: 'Electricity',
    subject: 'Physics',
    keyTerms: ['ohm', 'voltage', 'current', 'resistance', 'v = ir', 'circuit'],
    coreIdea: "Ohm's Law: V = IR. Voltage equals current multiplied by resistance, when temperature is constant.",
    hintLevel1: 'You know Ohm\'s Law connects voltage, current, and resistance. What relationship do you think they have?',
    hintLevel2: 'If resistance increases, what happens to current for the same voltage?',
    hintLevel3: 'V = IR. Voltage (V) equals current (I) times resistance (R). If R increases, I decreases for the same V. The unit of resistance is the ohm (Ω).',
    realLifeExample: 'Think of water flowing through a pipe: voltage is the water pressure, current is the flow rate, and resistance is how narrow the pipe is. A narrower pipe (more resistance) means less water flows.',
    explanation: "Ohm's Law: V = IR. Voltage (V, in volts) = Current (I, in amperes) × Resistance (R, in ohms). If you know any two, you can find the third. Resistance depends on material, length, cross-section, and temperature.",
    similarQuestion: 'A circuit has a resistance of 10 Ω and a current of 2 A. What is the voltage across it?',
    prerequisite: 'Voltage and Current',
  },
  {
    topic: 'pythagoras',
    chapter: 'Triangles',
    subject: 'Mathematics',
    keyTerms: ['pythagoras', 'hypotenuse', 'right triangle', 'square', 'sides'],
    coreIdea: 'In a right triangle, the square of the hypotenuse equals the sum of the squares of the other two sides: c² = a² + b².',
    hintLevel1: 'You know it is about right triangles. Which side is the longest, and what is special about it?',
    hintLevel2: 'The hypotenuse is opposite the right angle. How do the squares of the other two sides relate to it?',
    hintLevel3: 'c² = a² + b². Square the two shorter sides, add them, and you get the square of the hypotenuse. Then take the square root to find c.',
    realLifeExample: 'If you lean a 5 m ladder against a wall, and the base is 3 m from the wall, the height it reaches is 4 m (3² + 4² = 5²). That is the Pythagorean theorem in action.',
    explanation: 'In a right triangle, c² = a² + b², where c is the hypotenuse (longest side, opposite the right angle). To find c: c = √(a² + b²). Example: sides 3 and 4 → c = √(9 + 16) = √25 = 5.',
    similarQuestion: 'A right triangle has sides of length 6 cm and 8 cm. What is the length of the hypotenuse?',
  },
  {
    topic: 'trigonometry',
    chapter: 'Trigonometry',
    subject: 'Mathematics',
    keyTerms: ['sin', 'cos', 'tan', 'opposite', 'adjacent', 'hypotenuse', 'ratio', 'angle'],
    coreIdea: 'Trigonometry relates angles to side ratios in right triangles: sin = opposite/hypotenuse, cos = adjacent/hypotenuse, tan = opposite/adjacent.',
    hintLevel1: 'Trigonometry is about ratios in right triangles. What sides of the triangle are involved?',
    hintLevel2: 'Remember SOH CAH TOA. What do S, C, and T stand for, and what are the ratios?',
    hintLevel3: 'sin = opposite ÷ hypotenuse, cos = adjacent ÷ hypotenuse, tan = opposite ÷ adjacent. The angle determines which sides are "opposite" and "adjacent".',
    realLifeExample: 'If you want to find the height of a tree, you can measure the angle to the top and your distance from the tree. Using tan(angle) = height ÷ distance, you can calculate the height without climbing it.',
    explanation: 'In a right triangle: sin θ = opposite/hypotenuse, cos θ = adjacent/hypotenuse, tan θ = opposite/adjacent. Standard values: sin 30° = 1/2, cos 60° = 1/2, tan 45° = 1. The identity sin²θ + cos²θ = 1 always holds.',
    similarQuestion: 'In a right triangle, the opposite side is 3 and the hypotenuse is 5. What is sin θ?',
  },
  {
    topic: 'energy',
    chapter: 'Work & Energy',
    subject: 'Physics',
    keyTerms: ['energy', 'kinetic', 'potential', 'conservation', 'work', 'joule'],
    coreIdea: 'Energy is the capacity to do work. Kinetic energy = ½mv², potential energy = mgh. Energy is conserved — it transforms but is never created or destroyed.',
    hintLevel1: 'You know energy is about doing work. What are the two main types of mechanical energy?',
    hintLevel2: 'One type is about motion, the other is about position. What are they called?',
    hintLevel3: 'Kinetic energy = ½mv² (energy of motion). Potential energy = mgh (energy of position/height). The law of conservation says energy transforms but the total stays constant.',
    realLifeExample: 'A roller coaster: at the top, it has maximum potential energy (height). As it drops, potential energy converts to kinetic energy (speed). At the bottom, it is mostly kinetic. Total energy stays the same.',
    explanation: 'Energy = capacity to do work. Kinetic energy (KE) = ½mv². Potential energy (PE) = mgh. The work-energy theorem says work done = change in KE. Conservation of energy: total energy is constant; it only transforms between forms.',
    similarQuestion: 'A 2 kg ball is dropped from a height of 10 m. What is its potential energy at the top? (Take g = 9.8 m/s²)',
    prerequisite: 'Work',
  },
  {
    topic: 'sound',
    chapter: 'Sound',
    subject: 'Physics',
    keyTerms: ['sound', 'wave', 'frequency', 'amplitude', 'pitch', 'longitudinal', 'medium'],
    coreIdea: 'Sound is a mechanical longitudinal wave that needs a medium to travel. Pitch depends on frequency; loudness depends on amplitude.',
    hintLevel1: 'You know sound travels. What does it need to travel through — can it go through a vacuum?',
    hintLevel2: 'Sound is a type of wave. What kind of wave is it, and what are its main properties?',
    hintLevel3: 'Sound is a longitudinal mechanical wave (compressions and rarefactions). It needs a medium. Pitch = frequency (high frequency = high pitch). Loudness = amplitude (large amplitude = loud). Speed in air ≈ 343 m/s.',
    realLifeExample: 'When you hear thunder, the lightning and thunder happen at the same time, but you see the light first because light travels faster than sound. The delay tells you how far away the storm is.',
    explanation: 'Sound is a longitudinal mechanical wave — it needs a medium (solid, liquid, or gas). It travels as compressions and rarefactions. Pitch depends on frequency (Hz), loudness on amplitude. Human audible range: 20 Hz to 20,000 Hz. Speed in air ≈ 343 m/s.',
    similarQuestion: 'Why can sound not travel through a vacuum, but light can?',
  },
];

// ---- Intent Classification ----

const CASUAL_PATTERNS = [
  'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening',
  'thank', 'thanks', 'bye', 'ok', 'okay', 'cool', 'nice', 'great',
  'haha', 'lol', 'yes', 'no', 'sure', 'maybe', 'wow', 'oh',
];

const FACTUAL_PATTERNS = [
  'what is the formula', 'formula for', 'what is the unit', 'si unit',
  'state the', 'define ', 'definition of', 'list the', 'name the',
  'what does', 'what does.*stand for',
];

export function classifyIntent(text: string): MessageIntent {
  const lower = text.toLowerCase().trim();

  // Casual — greetings, thanks, short acknowledgements
  if (CASUAL_PATTERNS.some((p) => lower === p || lower.startsWith(p) && lower.length < p.length + 5)) {
    return 'casual';
  }
  if (lower.length < 8 && !lower.includes('?')) return 'casual';

  // Direct factual request — "what is the formula for X"
  if (FACTUAL_PATTERNS.some((p) => {
    try { return new RegExp(p).test(lower); } catch { return lower.includes(p); }
  })) {
    return 'factual';
  }

  return 'learning';
}

// ---- Concept Matching ----

export function findConcept(text: string, profile?: StudentProfile | null): ConceptEntry | null {
  const lower = text.toLowerCase().trim();

  // 1. Try to match by topic keyword
  for (const concept of CONCEPT_DATABASE) {
    if (lower.includes(concept.topic)) {
      return concept;
    }
  }

  // 2. Try to match by key terms
  for (const concept of CONCEPT_DATABASE) {
    const matchedTerms = concept.keyTerms.filter((t) => lower.includes(t.toLowerCase()));
    if (matchedTerms.length >= 2) return concept;
  }

  // 3. Try to match by chapter name
  for (const concept of CONCEPT_DATABASE) {
    if (lower.includes(concept.chapter.toLowerCase())) {
      return concept;
    }
  }

  // 4. If we have profile context, match the current chapter
  if (profile?.currentChapter) {
    const byChapter = CONCEPT_DATABASE.find((c) => c.chapter === profile.currentChapter);
    if (byChapter) return byChapter;
  }

  return null;
}

// ---- Response Analysis ----

export interface AnalysisResult {
  correctPoints: string[];
  gaps: string[];
  isComplete: boolean;
  isPartiallyCorrect: boolean;
  encouragement: string;
}

export function analyzeStudentResponse(
  response: string,
  concept: ConceptEntry,
): AnalysisResult {
  const lower = response.toLowerCase().trim();
  const correctPoints: string[] = [];
  const gaps: string[] = [];

  // Check which key terms the student mentioned correctly
  const mentionedTerms = concept.keyTerms.filter((t) => lower.includes(t.toLowerCase()));

  // Determine correct points based on what they said
  if (lower.includes('fast') || lower.includes('speed') || lower.includes('rate') || lower.includes('quick')) {
    correctPoints.push('You correctly connected this to how fast something moves (speed/rate).');
  }
  if (lower.includes('direction') || lower.includes('vector')) {
    correctPoints.push('You correctly identified that direction is important.');
  }
  if (lower.includes('force') || lower.includes('pull') || lower.includes('attraction')) {
    correctPoints.push('You correctly identified the role of force.');
  }
  if (lower.includes('energy') || lower.includes('work') || lower.includes('capacity')) {
    correctPoints.push('You correctly connected this to energy or work.');
  }
  if (lower.includes('mass') || lower.includes('matter') || lower.includes('particle')) {
    correctPoints.push('You correctly connected this to mass or matter.');
  }
  if (lower.includes('wave') || lower.includes('frequency') || lower.includes('amplitude')) {
    correctPoints.push('You correctly identified wave-related properties.');
  }
  if (lower.includes('plant') || lower.includes('leaf') || lower.includes('green') || lower.includes('chlorophyll')) {
    correctPoints.push('You correctly connected this to plants and their green parts.');
  }
  if (lower.includes('sunlight') || lower.includes('light') || lower.includes('sun')) {
    correctPoints.push('You correctly identified the role of light/sunlight.');
  }
  if (mentionedTerms.length >= 2) {
    correctPoints.push(`You used key terms correctly: ${mentionedTerms.slice(0, 3).join(', ')}.`);
  }

  // Identify gaps — key terms NOT mentioned
  const missingTerms = concept.keyTerms.filter((t) => !lower.includes(t.toLowerCase()));

  if (concept.topic === 'velocity' || concept.topic === 'speed') {
    if (!lower.includes('direction') && !lower.includes('vector')) {
      gaps.push('The concept of direction (vector vs scalar) is missing.');
    }
  }
  if (concept.topic === 'acceleration') {
    if (!lower.includes('change') && !lower.includes('rate')) {
      gaps.push('The idea that acceleration is a rate of change is missing.');
    }
    if (!lower.includes('m/s') && !lower.includes('unit')) {
      gaps.push('The SI unit (m/s²) is missing.');
    }
  }
  if (concept.topic === 'gravity') {
    if (!lower.includes('mass') && !lower.includes('attraction')) {
      gaps.push('The connection between gravity and mass/attraction is missing.');
    }
  }
  if (concept.topic === 'photosynthesis') {
    if (!lower.includes('chlorophyll') && !lower.includes('chloroplast')) {
      gaps.push('The role of chlorophyll/chloroplasts is missing.');
    }
    if (!lower.includes('oxygen')) {
      gaps.push('Oxygen as a by-product is missing.');
    }
  }
  if (concept.topic === 'ph') {
    if (!lower.includes('7') && !lower.includes('neutral')) {
      gaps.push('The neutral value (pH 7) is missing.');
    }
  }
  if (concept.topic === 'atom') {
    if (!lower.includes('proton') && !lower.includes('nucleus')) {
      gaps.push('The structure of the nucleus (protons) is missing.');
    }
  }

  // Generic gap: if they mentioned very few key terms
  if (gaps.length === 0 && missingTerms.length > 2 && mentionedTerms.length < 2) {
    gaps.push(`Some key concepts are missing: ${missingTerms.slice(0, 3).join(', ')}.`);
  }

  const isComplete = gaps.length === 0 && correctPoints.length > 0;
  const isPartiallyCorrect = correctPoints.length > 0 && gaps.length > 0;

  let encouragement: string;
  if (isComplete) {
    encouragement = "Excellent! You've got the key idea. 🎉";
  } else if (isPartiallyCorrect) {
    encouragement = "You're on the right track! 👍";
  } else if (lower.length > 5) {
    encouragement = "Good attempt — let's build on what you have. 😊";
  } else {
    encouragement = "No worries — let's explore this together. 😊";
  }

  return { correctPoints, gaps, isComplete, isPartiallyCorrect, encouragement };
}

// ---- Hint System ----

export function getHint(concept: ConceptEntry, level: number): string {
  if (level >= 3) return concept.hintLevel3;
  if (level === 2) return concept.hintLevel2;
  return concept.hintLevel1;
}

// ---- Subject-Specific Opening Questions ----

export function getSubjectOpeningQuestion(concept: ConceptEntry): string {
  const subject = concept.subject;

  switch (subject) {
    case 'Physics':
      if (concept.topic === 'acceleration' || concept.topic === 'ohms law' || concept.topic === 'newton') {
        return `Before we work on this, what do you think is the key relationship or formula involved here?`;
      }
      return `Before I explain it, I'd like to know what you already understand. 😊\n\nIn your own words, what do you think ${concept.topic} means?`;
    case 'Chemistry':
      return `Before I explain, let's start with what you know. 😊\n\nWhat do you already understand about ${concept.topic}?`;
    case 'Biology':
      return `Great question! 🌱\n\nBefore I explain, tell me — what do you already know about ${concept.topic}?`;
    case 'Mathematics':
      return `Let's work through this together. 😊\n\nWhat have you tried so far, or what do you already know about ${concept.topic}?`;
    default:
      return `Before I explain, I'd like to know what you already understand. 😊\n\nWhat do you think about ${concept.topic}?`;
  }
}

// ---- Factual Response (for direct factual requests) ----

export function getFactualResponse(text: string, concept: ConceptEntry | null): string {
  if (concept) {
    return `${concept.coreIdea}\n\nWould you like to understand how this works, or try a guided question to discover it yourself?`;
  }
  // Fall back to knowledge base
  for (const chapter of Object.keys(KNOWLEDGE_BASE)) {
    if (text.toLowerCase().includes(chapter.toLowerCase())) {
      return `${KNOWLEDGE_BASE[chapter]}\n\nWould you like to explore this topic interactively?`;
    }
  }
  return "Here's a quick answer: I can explain this in detail. Would you like me to guide you through it step by step?";
}

// ---- Casual Response ----

export function getCasualResponse(text: string): string {
  const lower = text.toLowerCase().trim();
  if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey')) {
    return "Hi there! 😊 What would you like to learn about today?";
  }
  if (lower.includes('thank')) {
    return "You're welcome! Keep up the great work. 💪";
  }
  if (lower.includes('bye')) {
    return "See you soon! Happy learning. 👋";
  }
  return "I'm here to help you learn! What topic would you like to explore?";
}

// ---- Concept Unlocked Summary ----

export interface ConceptUnlockedSummary {
  whatYouKnew: string[];
  whatYouDiscovered: string[];
  keyTakeaway: string;
}

export function buildConceptUnlocked(
  concept: ConceptEntry,
  analysis: AnalysisResult,
  hintLevel: number,
): ConceptUnlockedSummary {
  const whatYouKnew = analysis.correctPoints.length > 0
    ? analysis.correctPoints.slice(0, 2)
    : ['You engaged with the topic and tried your best.'];

  const whatYouDiscovered: string[] = [];
  if (analysis.gaps.length > 0) {
    whatYouDiscovered.push(analysis.gaps[0].replace(/^The /, '').replace(/^Some key /, 'Key '));
  }
  whatYouDiscovered.push(concept.coreIdea.split('.')[0] + '.');

  return {
    whatYouKnew,
    whatYouDiscovered,
    keyTakeaway: concept.coreIdea,
  };
}

// ---- Learning Signal Storage ----

export function recordLearningSignal(signal: Omit<LearningSignal, 'timestamp'>): void {
  const signals = loadJSON<LearningSignal[]>('learningSignals', []);
  signals.push({ ...signal, timestamp: Date.now() });
  saveJSON('learningSignals', signals);
}

export function getLearningSignals(): LearningSignal[] {
  return loadJSON<LearningSignal[]>('learningSignals', []);
}

// ---- Help Action Responses ----

export function getHelpResponse(action: HelpAction, concept: ConceptEntry, currentHintLevel: number): { text: string; newHintLevel: number } {
  switch (action) {
    case 'hint': {
      const nextLevel = Math.min(currentHintLevel + 1, 3);
      return { text: getHint(concept, nextLevel), newHintLevel: nextLevel };
    }
    case 'smaller_clue': {
      const nextLevel = Math.min(currentHintLevel + 1, 3);
      const hint = getHint(concept, nextLevel);
      return { text: `Here's a smaller clue:\n\n💡 ${hint}`, newHintLevel: nextLevel };
    }
    case 'explain_concept':
      return { text: `📖 Here's the concept:\n\n${concept.explanation}`, newHintLevel: currentHintLevel };
    case 'real_life_example':
      return { text: `🌍 Real-life example:\n\n${concept.realLifeExample}`, newHintLevel: currentHintLevel };
    case 'try_again':
      return { text: "Go ahead and try again! Take your time. 😊", newHintLevel: currentHintLevel };
    case 'show_answer':
      return { text: `✅ Here's the answer:\n\n${concept.coreIdea}\n\n${concept.explanation}`, newHintLevel: currentHintLevel };
    default:
      return { text: "How would you like me to help?", newHintLevel: currentHintLevel };
  }
}

// ---- Initial Session State ----

export function createInitialSessionState(whatDoYouKnowEnabled: boolean): LearningSessionState {
  return {
    phase: 'idle',
    concept: null,
    hintLevel: 0,
    attemptCount: 0,
    studentKnowledge: '',
    identifiedGaps: [],
    correctPoints: [],
    whatDoYouKnowEnabled,
    showAnswerRequested: false,
  };
}
