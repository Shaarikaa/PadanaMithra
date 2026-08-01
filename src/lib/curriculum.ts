import type { ClassInfo, SubjectInfo, ChapterInfo } from './types';

// Class options — architecture supports adding more classes later.
// For the MVP, Class 9 (Kerala SCERT) is fully functional.
export const CLASSES: ClassInfo[] = [
  { id: 'class-9', label: 'Class 9', board: 'Kerala SCERT', available: true },
  { id: 'class-10', label: 'Class 10', board: 'Kerala SCERT', available: false },
  { id: 'class-11', label: 'Class 11', board: 'Kerala SCERT', available: false },
  { id: 'class-12', label: 'Class 12', board: 'Kerala SCERT', available: false },
  { id: 'class-8', label: 'Class 8', board: 'Kerala SCERT', available: false },
];

export const SUBJECT_INFOS: SubjectInfo[] = [
  { id: 'Physics', label: 'Physics', icon: 'Zap', emoji: '⚡', accent: 'bg-indigo-100 text-indigo-600' },
  { id: 'Chemistry', label: 'Chemistry', icon: 'FlaskConical', emoji: '🧪', accent: 'bg-rose-100 text-rose-600' },
  { id: 'Biology', label: 'Biology', icon: 'Dna', emoji: '🧬', accent: 'bg-emerald-100 text-emerald-600' },
  { id: 'Mathematics', label: 'Mathematics', icon: 'Sigma', emoji: '📐', accent: 'bg-amber-100 text-amber-600' },
];

// Class 9 Kerala SCERT — chapters and topics per subject.
// Connected to the existing knowledge base in mockData.ts.
export const CURRICULUM: Record<string, Record<string, ChapterInfo[]>> = {
  'class-9': {
    Physics: [
      { name: 'Motion', topics: ['Distance & Displacement', 'Speed & Velocity', 'Acceleration', 'Equations of Motion'] },
      { name: 'Laws of Motion', topics: ['First Law (Inertia)', 'Second Law (F=ma)', 'Third Law', 'Momentum'] },
      { name: 'Work & Energy', topics: ['Work Done', 'Kinetic Energy', 'Potential Energy', 'Conservation of Energy'] },
      { name: 'Light', topics: ['Reflection', 'Refraction', 'Lenses', 'Dispersion'] },
      { name: 'Electricity', topics: ["Ohm's Law", 'Series & Parallel Circuits', 'Electric Power', 'Resistance'] },
      { name: 'Sound', topics: ['Nature of Sound', 'Speed of Sound', 'Pitch & Loudness', 'Echo'] },
    ],
    Chemistry: [
      { name: 'Matter', topics: ['States of Matter', 'Kinetic Theory', 'Changes of State', 'Density'] },
      { name: 'Atoms & Molecules', topics: ['Atomic Structure', 'Isotopes', 'Mole Concept', 'Chemical Formulae'] },
      { name: 'Chemical Reactions', topics: ['Types of Reactions', 'Balancing Equations', 'Oxidation & Reduction'] },
      { name: 'Acids & Bases', topics: ['pH Scale', 'Indicators', 'Neutralization', 'Salt Formation'] },
      { name: 'Periodic Table', topics: ['Periodic Trends', 'Groups & Periods', 'Properties of Elements'] },
    ],
    Mathematics: [
      { name: 'Real Numbers', topics: ['Euclids Division Lemma', 'Fundamental Theorem of Arithmetic', 'Irrational Numbers'] },
      { name: 'Polynomials', topics: ['Zeros of a Polynomial', 'Remainder Theorem', 'Factor Theorem'] },
      { name: 'Linear Equations', topics: ['Substitution Method', 'Elimination Method', 'Graphical Method'] },
      { name: 'Triangles', topics: ['Pythagoras Theorem', 'Similarity Criteria', 'Area of Similar Triangles'] },
      { name: 'Trigonometry', topics: ['Trigonometric Ratios', 'Standard Values', 'Trigonometric Identities'] },
      { name: 'Statistics', topics: ['Mean', 'Median', 'Mode', 'Cumulative Frequency'] },
    ],
    Biology: [
      { name: 'Cell', topics: ['Cell Structure', 'Organelles', 'Prokaryotic vs Eukaryotic', 'Plant vs Animal Cell'] },
      { name: 'Tissues', topics: ['Plant Tissues', 'Animal Tissues', 'Meristematic Tissue', 'Permanent Tissue'] },
      { name: 'Life Processes', topics: ['Nutrition', 'Respiration', 'Transportation', 'Excretion'] },
      { name: 'Reproduction', topics: ['Asexual Reproduction', 'Sexual Reproduction', 'Pollination', 'Fertilization'] },
      { name: 'Heredity & Evolution', topics: ['Mendels Laws', 'Variation', 'Natural Selection', 'Speciation'] },
    ],
  },
};

export function getChaptersForSubject(classId: string, subject: string): ChapterInfo[] {
  return CURRICULUM[classId]?.[subject] ?? [];
}

export function getTopicsForChapter(classId: string, subject: string, chapter: string): string[] {
  const chapters = CURRICULUM[classId]?.[subject] ?? [];
  return chapters.find((c) => c.name === chapter)?.topics ?? [];
}

export function isClassAvailable(classId: string): boolean {
  return CLASSES.find((c) => c.id === classId)?.available ?? false;
}
