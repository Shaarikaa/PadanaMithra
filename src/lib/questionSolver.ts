// Question Solver — parses text-based questions and provides step-by-step solutions.
// Supports common physics, math, and chemistry problems found in Class 9-10 curriculum.
// Also supports conceptual questions by matching against the knowledge base.

import { KNOWLEDGE_BASE, CHAPTERS } from './mockData';

export interface SolutionStep {
  label: string;
  content: string;
}

export interface SolveResult {
  solved: boolean;
  subject?: string;
  chapter?: string;
  topic?: string;
  given: Record<string, string>;
  formula: string;
  steps: SolutionStep[];
  answer: string;
  explanation: string;
  isConceptual?: boolean;
}

// ---- Conceptual question answering ----

function solveConceptual(text: string): SolveResult | null {
  const lower = text.toLowerCase().trim();

  // Remove common question prefixes for matching
  const cleaned = lower
    .replace(/^(why|what|how|when|where|who|explain|describe|define|state|list|name|give)\s+/i, '')
    .replace(/\?+$/g, '')
    .trim();

  // Try to match against knowledge base by chapter name
  for (const [chapter, content] of Object.entries(KNOWLEDGE_BASE)) {
    const chapterLower = chapter.toLowerCase();
    if (cleaned.includes(chapterLower) || lower.includes(chapterLower)) {
      const subject = Object.entries(CHAPTERS).find(([, chapters]) => chapters.includes(chapter))?.[0] || 'General';
      return {
        solved: true,
        subject,
        chapter,
        topic: chapter,
        given: {},
        formula: '',
        steps: [
          { label: 'Answer', content: content },
        ],
        answer: content.split('.')[0] + '.',
        explanation: content,
        isConceptual: true,
      };
    }
  }

  // Try keyword-based matching for common conceptual topics
  const CONCEPTUAL_MATCHES: { keywords: string[]; chapter: string; subject: string; answer: string; explanation: string }[] = [
    {
      keywords: ['ice float', 'ice floats', 'why does ice float', 'density of ice'],
      chapter: 'Matter',
      subject: 'Physics',
      answer: 'Ice floats because it is less dense than liquid water.',
      explanation: 'Ice floats because solid water has a lower density than liquid water. When water freezes, the hydrogen bonds form a hexagonal crystal structure that keeps water molecules farther apart. This makes ice about 9% less dense than liquid water, so it floats. This is why lakes freeze from the top down, allowing aquatic life to survive underneath.',
    },
    {
      keywords: ['photosynthesis'],
      chapter: 'Life Processes',
      subject: 'Biology',
      answer: 'Photosynthesis is the process by which plants make food using sunlight, CO₂, and water.',
      explanation: 'Photosynthesis is the process by which green plants use sunlight, carbon dioxide, and water to produce glucose (food) and oxygen. It takes place in the chloroplasts, which contain chlorophyll. The balanced equation is: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂ (using sunlight energy). Chlorophyll captures light energy, which converts carbon dioxide and water into glucose and oxygen.',
    },
    {
      keywords: ['newton\'s first law', 'first law of motion', 'law of inertia', 'inertia'],
      chapter: 'Laws of Motion',
      subject: 'Physics',
      answer: "Newton's First Law states that an object stays at rest or in uniform motion unless acted on by an external force.",
      explanation: "Newton's First Law of Motion (the Law of Inertia) states that an object will remain at rest or continue moving at a constant velocity in a straight line unless acted upon by an unbalanced external force. This means things don't start moving, stop, or change direction on their own — a force is always needed to change their state of motion. For example, a book on a table stays at rest because no net force acts on it.",
    },
    {
      keywords: ['newton\'s second law', 'second law of motion'],
      chapter: 'Laws of Motion',
      subject: 'Physics',
      answer: "Newton's Second Law states that Force = mass × acceleration (F = ma).",
      explanation: "Newton's Second Law of Motion states that the acceleration of an object is directly proportional to the net force acting on it and inversely proportional to its mass. The formula is F = ma, where F is force (in newtons), m is mass (in kg), and a is acceleration (in m/s²). This means a heavier object needs more force to accelerate at the same rate as a lighter one.",
    },
    {
      keywords: ['newton\'s third law', 'third law of motion', 'action reaction'],
      chapter: 'Laws of Motion',
      subject: 'Physics',
      answer: "Newton's Third Law states that every action has an equal and opposite reaction.",
      explanation: "Newton's Third Law of Motion states that for every action, there is an equal and opposite reaction. This means forces always come in pairs — when you push on a wall, the wall pushes back on you with the same force. For example, when a rocket expels gas downward, the gas pushes the rocket upward with an equal force.",
    },
    {
      keywords: ['why does sound', 'sound travel', 'sound need a medium', 'sound vacuum'],
      chapter: 'Sound',
      subject: 'Physics',
      answer: 'Sound needs a medium to travel because it is a mechanical wave.',
      explanation: 'Sound is a mechanical longitudinal wave — it travels by vibrating particles of a medium (solid, liquid, or gas). In a vacuum, there are no particles to vibrate, so sound cannot travel through it. This is why sound cannot travel in space. Light, however, is an electromagnetic wave and does not need a medium, so it can travel through a vacuum.',
    },
    {
      keywords: ['why is the sky blue', 'sky blue', 'scattering of light'],
      chapter: 'Light',
      subject: 'Physics',
      answer: 'The sky appears blue because of scattering of sunlight by air molecules.',
      explanation: 'The sky appears blue due to Rayleigh scattering. Sunlight contains all colors, but blue light has a shorter wavelength and is scattered more by air molecules in the atmosphere than longer wavelengths like red. This scattered blue light reaches our eyes from all directions, making the sky look blue.',
    },
    {
      keywords: ['water boils', 'boiling point of water', 'evaporation'],
      chapter: 'Matter',
      subject: 'Physics',
      answer: 'Water boils at 100°C at sea level pressure.',
      explanation: 'Boiling is the process where a liquid turns into a gas throughout the liquid, not just at the surface. Water boils at 100°C (212°F) at standard atmospheric pressure (1 atm). At higher altitudes, where air pressure is lower, water boils at a lower temperature. Evaporation, in contrast, happens only at the surface and at any temperature.',
    },
    {
      keywords: ['why do we sweat', 'sweating', 'sweat cool'],
      chapter: 'Life Processes',
      subject: 'Biology',
      answer: 'Sweating cools the body through evaporation.',
      explanation: 'Sweating is the body\'s way of cooling itself. When sweat (mostly water) evaporates from the skin surface, it absorbs heat from the body. This is called evaporative cooling. The heat energy breaks the bonds between water molecules, turning liquid sweat into vapor, which removes heat from the skin and lowers body temperature.',
    },
    {
      keywords: ['why do leaves', 'leaves green', 'chlorophyll'],
      chapter: 'Life Processes',
      subject: 'Biology',
      answer: 'Leaves are green because of chlorophyll, which absorbs red and blue light but reflects green light.',
      explanation: 'Leaves appear green because they contain chlorophyll, a green pigment in chloroplasts. Chlorophyll absorbs red and blue wavelengths of light for photosynthesis but reflects green light, which is why we see leaves as green. In autumn, chlorophyll breaks down, revealing other pigments like yellow and orange carotenoids.',
    },
    {
      keywords: ['why is dna', 'dna important', 'dna function', 'dna do'],
      chapter: 'Heredity & Evolution',
      subject: 'Biology',
      answer: 'DNA carries the genetic instructions for life.',
      explanation: 'DNA (Deoxyribonucleic Acid) is a molecule that carries the genetic instructions for the development, functioning, and reproduction of all known living organisms. It is passed from parents to offspring and determines inherited traits. DNA is structured as a double helix, with bases (A, T, G, C) that pair in a specific way to encode genetic information.',
    },
    {
      keywords: ['why do we need oxygen', 'oxygen important', 'respiration', 'cellular respiration'],
      chapter: 'Life Processes',
      subject: 'Biology',
      answer: 'Oxygen is needed for cellular respiration, which produces energy.',
      explanation: 'Oxygen is essential for cellular respiration — the process by which cells break down glucose to produce ATP (energy). The simplified equation is: Glucose + Oxygen → Carbon Dioxide + Water + Energy (ATP). Without oxygen, our cells cannot produce enough energy to sustain life processes like muscle contraction, nerve signaling, and growth.',
    },
    {
      keywords: ['acid rain', 'what is acid rain'],
      chapter: 'Acids & Bases',
      subject: 'Chemistry',
      answer: 'Acid rain is rain made acidic by pollutants like sulfur dioxide and nitrogen oxides.',
      explanation: 'Acid rain is caused when sulfur dioxide (SO₂) and nitrogen oxides (NOₓ) from burning fossil fuels react with water vapor in the atmosphere to form sulfuric acid and nitric acid. These acids mix with rain and fall as acid rain, which can harm plants, aquatic life, and buildings. The pH of acid rain is typically below 5.6.',
    },
  ];

  for (const match of CONCEPTUAL_MATCHES) {
    if (match.keywords.some((kw) => cleaned.includes(kw) || lower.includes(kw))) {
      return {
        solved: true,
        subject: match.subject,
        chapter: match.chapter,
        topic: match.chapter,
        given: {},
        formula: '',
        steps: [
          { label: 'Answer', content: match.answer },
          { label: 'Explanation', content: match.explanation },
          { label: 'Key Point', content: match.answer },
        ],
        answer: match.answer,
        explanation: match.explanation,
        isConceptual: true,
      };
    }
  }

  // Try keyword fallbacks from the knowledge base
  if (lower.includes('newton') || lower.includes('force')) {
    return buildConceptualResult('Laws of Motion', 'Physics', KNOWLEDGE_BASE['Laws of Motion']);
  }
  if (lower.includes('energy') || lower.includes('work')) {
    return buildConceptualResult('Work & Energy', 'Physics', KNOWLEDGE_BASE['Work & Energy']);
  }
  if (lower.includes('atom') || lower.includes('molecule')) {
    return buildConceptualResult('Atoms & Molecules', 'Chemistry', KNOWLEDGE_BASE['Atoms & Molecules']);
  }
  if (lower.includes('photosynth') || lower.includes('life process')) {
    return buildConceptualResult('Life Processes', 'Biology', KNOWLEDGE_BASE['Life Processes']);
  }
  if (lower.includes('periodic') || lower.includes('element')) {
    return buildConceptualResult('Periodic Table', 'Chemistry', KNOWLEDGE_BASE['Periodic Table']);
  }
  if (lower.includes('cell') || lower.includes('organelle')) {
    return buildConceptualResult('Cell', 'Biology', KNOWLEDGE_BASE['Cell']);
  }
  if (lower.includes('tissue')) {
    return buildConceptualResult('Tissues', 'Biology', KNOWLEDGE_BASE['Tissues']);
  }
  if (lower.includes('reproduction') || lower.includes('reproduce')) {
    return buildConceptualResult('Reproduction', 'Biology', KNOWLEDGE_BASE['Reproduction']);
  }
  if (lower.includes('heredity') || lower.includes('evolution') || lower.includes('gene')) {
    return buildConceptualResult('Heredity & Evolution', 'Biology', KNOWLEDGE_BASE['Heredity & Evolution']);
  }
  if (lower.includes('electric') || lower.includes('circuit') || lower.includes('ohm')) {
    return buildConceptualResult('Electricity', 'Physics', KNOWLEDGE_BASE['Electricity']);
  }
  if (lower.includes('light') || lower.includes('reflection') || lower.includes('refraction') || lower.includes('lens')) {
    return buildConceptualResult('Light', 'Physics', KNOWLEDGE_BASE['Light']);
  }
  if (lower.includes('sound') || lower.includes('wave') || lower.includes('frequency')) {
    return buildConceptualResult('Sound', 'Physics', KNOWLEDGE_BASE['Sound']);
  }
  if (lower.includes('matter') || lower.includes('state of') || lower.includes('solid') || lower.includes('liquid') || lower.includes('gas')) {
    return buildConceptualResult('Matter', 'Physics', KNOWLEDGE_BASE['Matter']);
  }
  if (lower.includes('chemical reaction') || lower.includes('chemical equation')) {
    return buildConceptualResult('Chemical Reactions', 'Chemistry', KNOWLEDGE_BASE['Chemical Reactions']);
  }
  if (lower.includes('acid') || lower.includes('base') || lower.includes('ph scale') || lower.includes('indicator')) {
    return buildConceptualResult('Acids & Bases', 'Chemistry', KNOWLEDGE_BASE['Acids & Bases']);
  }
  if (lower.includes('polynomial')) {
    return buildConceptualResult('Polynomials', 'Mathematics', KNOWLEDGE_BASE['Polynomials']);
  }
  if (lower.includes('linear equation')) {
    return buildConceptualResult('Linear Equations', 'Mathematics', KNOWLEDGE_BASE['Linear Equations']);
  }
  if (lower.includes('triangle') || lower.includes('pythagoras') || lower.includes('similar triangle')) {
    return buildConceptualResult('Triangles', 'Mathematics', KNOWLEDGE_BASE['Triangles']);
  }
  if (lower.includes('trigonometry') || lower.includes('sin') || lower.includes('cos') || lower.includes('tan')) {
    return buildConceptualResult('Trigonometry', 'Mathematics', KNOWLEDGE_BASE['Trigonometry']);
  }
  if (lower.includes('statistics') || lower.includes('mean') || lower.includes('median') || lower.includes('mode')) {
    return buildConceptualResult('Statistics', 'Mathematics', KNOWLEDGE_BASE['Statistics']);
  }
  if (lower.includes('real number') || lower.includes('irrational') || lower.includes('hcf') || lower.includes('lcm')) {
    return buildConceptualResult('Real Numbers', 'Mathematics', KNOWLEDGE_BASE['Real Numbers']);
  }

  return null;
}

function buildConceptualResult(chapter: string, subject: string, content: string): SolveResult {
  return {
    solved: true,
    subject,
    chapter,
    topic: chapter,
    given: {},
    formula: '',
    steps: [
      { label: 'Answer', content: content.split('.')[0] + '.' },
      { label: 'Explanation', content: content },
      { label: 'Key Point', content: content.split('.')[0] + '.' },
    ],
    answer: content.split('.')[0] + '.',
    explanation: content,
    isConceptual: true,
  };
}

// ---- Multi-question detection ----

export function splitMultipleQuestions(text: string): string[] {
  // Split by numbered questions: "1.", "2.", "Q1", "Q2", etc.
  const numbered = text.match(/(?:^|\n)\s*(?:Q?\d+\.?\s*|\(?[a-z]\)[\s.])[\s\S]*?(?=\n\s*(?:Q?\d+\.?\s*|\(?[a-z]\)[\s.])|$)/gi);
  if (numbered && numbered.length > 1) {
    return numbered.map((q) => q.trim()).filter((q) => q.length > 5);
  }

  // Split by question marks if there are multiple
  const byQuestionMark = text.split(/\?\s+/).filter((s) => s.trim().length > 5);
  if (byQuestionMark.length > 1) {
    return byQuestionMark.map((q, i) => (i < byQuestionMark.length - 1 ? q + '?' : q).trim());
  }

  return [text.trim()];
}

// ---- Number extraction helpers ----

function extractNumbers(text: string): number[] {
  const matches = text.match(/-?\d+(?:\.\d+)?/g);
  return matches ? matches.map(Number) : [];
}

function extractValue(text: string, keywords: string[]): number | null {
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    // Pattern: "distance = 100" or "distance is 100" or "distance of 100"
    const patterns = [
      new RegExp(`${kw}\\s*(?:=|is|of|:)\\s*(-?\\d+(?:\\.\\d+)?)`, 'i'),
      new RegExp(`(-?\\d+(?:\\.\\d+)?)\\s*(?:m|kg|s|n|m\\/s|m\\/s²|Ω|v|a|cm|km|g)\\b[^]*?${kw}`, 'i'),
      new RegExp(`${kw}[^]*?(-?\\d+(?:\\.\\d+)?)`, 'i'),
    ];
    for (const pattern of patterns) {
      const match = lower.match(pattern);
      if (match) {
        const num = parseFloat(match[1]);
        if (!isNaN(num)) return num;
      }
    }
  }
  return null;
}

// ---- Solvers by category ----

function solveVelocity(text: string): SolveResult | null {
  const lower = text.toLowerCase();
  if (!lower.includes('velocity') && !(lower.includes('speed') && lower.includes('distance') && lower.includes('time'))) {
    if (!lower.includes('velocity')) return null;
  }

  const distance = extractValue(text, ['distance', 'displacement']);
  const time = extractValue(text, ['time']);
  const velocity = extractValue(text, ['velocity']);

  if (distance !== null && time !== null && time !== 0) {
    const result = distance / time;
    return {
      solved: true,
      subject: 'Physics',
      chapter: 'Motion',
      topic: 'Velocity',
      given: { 'Distance': `${distance} m`, 'Time': `${time} s` },
      formula: 'Velocity = Distance / Time',
      steps: [
        { label: 'Given', content: `Distance = ${distance} m\nTime = ${time} s` },
        { label: 'Formula', content: 'Velocity = Distance / Time' },
        { label: 'Substitution', content: `Velocity = ${distance} / ${time}` },
        { label: 'Answer', content: `Velocity = ${result} m/s` },
      ],
      answer: `${result} m/s`,
      explanation: 'Velocity is the rate of change of displacement. When distance and time are given, divide distance by time to get velocity.',
    };
  }

  if (velocity !== null && time !== null && time !== 0) {
    const result = velocity * time;
    return {
      solved: true,
      subject: 'Physics',
      chapter: 'Motion',
      topic: 'Velocity',
      given: { 'Velocity': `${velocity} m/s`, 'Time': `${time} s` },
      formula: 'Distance = Velocity × Time',
      steps: [
        { label: 'Given', content: `Velocity = ${velocity} m/s\nTime = ${time} s` },
        { label: 'Formula', content: 'Distance = Velocity × Time' },
        { label: 'Substitution', content: `Distance = ${velocity} × ${time}` },
        { label: 'Answer', content: `Distance = ${result} m` },
      ],
      answer: `${result} m`,
      explanation: 'When velocity and time are known, multiply them to find the distance traveled.',
    };
  }

  return null;
}

function solveSpeed(text: string): SolveResult | null {
  const lower = text.toLowerCase();
  if (!lower.includes('speed')) return null;

  const distance = extractValue(text, ['distance']);
  const time = extractValue(text, ['time']);

  if (distance !== null && time !== null && time !== 0) {
    const result = distance / time;
    return {
      solved: true,
      subject: 'Physics',
      chapter: 'Motion',
      topic: 'Speed',
      given: { 'Distance': `${distance} m`, 'Time': `${time} s` },
      formula: 'Speed = Distance / Time',
      steps: [
        { label: 'Given', content: `Distance = ${distance} m\nTime = ${time} s` },
        { label: 'Formula', content: 'Speed = Distance / Time' },
        { label: 'Substitution', content: `Speed = ${distance} / ${time}` },
        { label: 'Answer', content: `Speed = ${result} m/s` },
      ],
      answer: `${result} m/s`,
      explanation: 'Speed is the rate of change of distance. Divide the total distance by the total time to get the average speed.',
    };
  }

  return null;
}

function solveAcceleration(text: string): SolveResult | null {
  const lower = text.toLowerCase();
  if (!lower.includes('acceleration')) return null;

  const initial = extractValue(text, ['initial velocity', 'u', 'starts from rest']);
  const final = extractValue(text, ['final velocity', 'v']);
  const time = extractValue(text, ['time', 't']);

  // Handle "starts from rest" → initial velocity = 0
  const u = lower.includes('rest') ? (initial ?? 0) : initial;
  const v = final;
  const t = time;

  if (u !== null && v !== null && t !== null && t !== 0) {
    const result = (v - u) / t;
    return {
      solved: true,
      subject: 'Physics',
      chapter: 'Motion',
      topic: 'Acceleration',
      given: { 'Initial velocity (u)': `${u} m/s`, 'Final velocity (v)': `${v} m/s`, 'Time (t)': `${t} s` },
      formula: 'Acceleration = (v - u) / t',
      steps: [
        { label: 'Given', content: `Initial velocity (u) = ${u} m/s\nFinal velocity (v) = ${v} m/s\nTime (t) = ${t} s` },
        { label: 'Formula', content: 'a = (v - u) / t' },
        { label: 'Substitution', content: `a = (${v} - ${u}) / ${t}` },
        { label: 'Simplification', content: `a = ${v - u} / ${t}` },
        { label: 'Answer', content: `a = ${result} m/s²` },
      ],
      answer: `${result} m/s²`,
      explanation: 'Acceleration is the rate of change of velocity. Subtract the initial velocity from the final velocity, then divide by the time taken.',
    };
  }

  return null;
}

function solveForce(text: string): SolveResult | null {
  const lower = text.toLowerCase();
  if (!lower.includes('force') && !lower.includes('f = ma') && !lower.includes('f=ma')) return null;

  const mass = extractValue(text, ['mass']);
  const acceleration = extractValue(text, ['acceleration', 'a']);

  if (mass !== null && acceleration !== null) {
    const result = mass * acceleration;
    return {
      solved: true,
      subject: 'Physics',
      chapter: 'Laws of Motion',
      topic: "Newton's Second Law",
      given: { 'Mass (m)': `${mass} kg`, 'Acceleration (a)': `${acceleration} m/s²` },
      formula: 'Force = mass × acceleration (F = ma)',
      steps: [
        { label: 'Given', content: `Mass (m) = ${mass} kg\nAcceleration (a) = ${acceleration} m/s²` },
        { label: 'Formula', content: 'F = m × a' },
        { label: 'Substitution', content: `F = ${mass} × ${acceleration}` },
        { label: 'Answer', content: `F = ${result} N` },
      ],
      answer: `${result} N`,
      explanation: "Newton's Second Law states that force equals mass times acceleration. The unit of force is the newton (N).",
    };
  }

  return null;
}

function solveWeight(text: string): SolveResult | null {
  const lower = text.toLowerCase();
  if (!lower.includes('weight')) return null;

  const mass = extractValue(text, ['mass']);
  const g = extractValue(text, ['g']) ?? 9.8;

  if (mass !== null) {
    const result = mass * g;
    return {
      solved: true,
      subject: 'Physics',
      chapter: 'Laws of Motion',
      topic: 'Gravity & Weight',
      given: { 'Mass (m)': `${mass} kg`, 'g': `${g} m/s²` },
      formula: 'Weight = mass × g (W = mg)',
      steps: [
        { label: 'Given', content: `Mass (m) = ${mass} kg\ng = ${g} m/s²` },
        { label: 'Formula', content: 'W = m × g' },
        { label: 'Substitution', content: `W = ${mass} × ${g}` },
        { label: 'Answer', content: `W = ${result} N` },
      ],
      answer: `${result} N`,
      explanation: 'Weight is the force of gravity acting on an object. It equals mass multiplied by the acceleration due to gravity (g ≈ 9.8 m/s²).',
    };
  }

  return null;
}

function solveOhmsLaw(text: string): SolveResult | null {
  const lower = text.toLowerCase();
  if (!lower.includes('ohm') && !lower.includes('voltage') && !lower.includes('current') && !lower.includes('resistance')) return null;

  const voltage = extractValue(text, ['voltage', 'v']);
  const current = extractValue(text, ['current', 'i']);
  const resistance = extractValue(text, ['resistance', 'r']);

  // V = IR → find V
  if (current !== null && resistance !== null) {
    const result = current * resistance;
    return {
      solved: true,
      subject: 'Physics',
      chapter: 'Electricity',
      topic: "Ohm's Law",
      given: { 'Current (I)': `${current} A`, 'Resistance (R)': `${resistance} Ω` },
      formula: 'V = I × R',
      steps: [
        { label: 'Given', content: `Current (I) = ${current} A\nResistance (R) = ${resistance} Ω` },
        { label: 'Formula', content: 'V = I × R' },
        { label: 'Substitution', content: `V = ${current} × ${resistance}` },
        { label: 'Answer', content: `V = ${result} V` },
      ],
      answer: `${result} V`,
      explanation: "Ohm's Law states that voltage equals current multiplied by resistance.",
    };
  }

  // I = V/R → find I
  if (voltage !== null && resistance !== null && resistance !== 0) {
    const result = voltage / resistance;
    return {
      solved: true,
      subject: 'Physics',
      chapter: 'Electricity',
      topic: "Ohm's Law",
      given: { 'Voltage (V)': `${voltage} V`, 'Resistance (R)': `${resistance} Ω` },
      formula: 'I = V / R',
      steps: [
        { label: 'Given', content: `Voltage (V) = ${voltage} V\nResistance (R) = ${resistance} Ω` },
        { label: 'Formula', content: 'I = V / R' },
        { label: 'Substitution', content: `I = ${voltage} / ${resistance}` },
        { label: 'Answer', content: `I = ${result} A` },
      ],
      answer: `${result} A`,
      explanation: "Ohm's Law can be rearranged to find current: I = V / R.",
    };
  }

  // R = V/I → find R
  if (voltage !== null && current !== null && current !== 0) {
    const result = voltage / current;
    return {
      solved: true,
      subject: 'Physics',
      chapter: 'Electricity',
      topic: "Ohm's Law",
      given: { 'Voltage (V)': `${voltage} V`, 'Current (I)': `${current} A` },
      formula: 'R = V / I',
      steps: [
        { label: 'Given', content: `Voltage (V) = ${voltage} V\nCurrent (I) = ${current} A` },
        { label: 'Formula', content: 'R = V / I' },
        { label: 'Substitution', content: `R = ${voltage} / ${current}` },
        { label: 'Answer', content: `R = ${result} Ω` },
      ],
      answer: `${result} Ω`,
      explanation: "Ohm's Law can be rearranged to find resistance: R = V / I.",
    };
  }

  return null;
}

function solvePythagoras(text: string): SolveResult | null {
  const lower = text.toLowerCase();
  if (!lower.includes('hypotenuse') && !lower.includes('right triangle') && !lower.includes('pythagoras')) return null;

  const numbers = extractNumbers(text);
  if (numbers.length < 2) return null;

  const a = numbers[0];
  const b = numbers[1];
  const c = Math.sqrt(a * a + b * b);

  return {
    solved: true,
    subject: 'Mathematics',
    chapter: 'Triangles',
    topic: 'Pythagorean Theorem',
    given: { 'Side a': `${a}`, 'Side b': `${b}` },
    formula: 'c² = a² + b² → c = √(a² + b²)',
    steps: [
      { label: 'Given', content: `Side a = ${a}\nSide b = ${b}` },
      { label: 'Formula', content: 'c² = a² + b²' },
      { label: 'Substitution', content: `c² = ${a}² + ${b}²` },
      { label: 'Simplification', content: `c² = ${a * a} + ${b * b} = ${a * a + b * b}` },
      { label: 'Answer', content: `c = √${a * a + b * b} = ${c.toFixed(2)}` },
    ],
    answer: `${c.toFixed(2)}`,
    explanation: 'In a right triangle, the square of the hypotenuse equals the sum of the squares of the other two sides. Take the square root to find the hypotenuse.',
  };
}

function solveEnergy(text: string): SolveResult | null {
  const lower = text.toLowerCase();

  if (lower.includes('kinetic') || (lower.includes('energy') && lower.includes('mass') && lower.includes('velocity'))) {
    const mass = extractValue(text, ['mass']);
    const velocity = extractValue(text, ['velocity', 'speed']);

    if (mass !== null && velocity !== null) {
      const result = 0.5 * mass * velocity * velocity;
      return {
        solved: true,
        subject: 'Physics',
        chapter: 'Work & Energy',
        topic: 'Kinetic Energy',
        given: { 'Mass (m)': `${mass} kg`, 'Velocity (v)': `${velocity} m/s` },
        formula: 'KE = ½ × m × v²',
        steps: [
          { label: 'Given', content: `Mass (m) = ${mass} kg\nVelocity (v) = ${velocity} m/s` },
          { label: 'Formula', content: 'KE = ½ × m × v²' },
          { label: 'Substitution', content: `KE = ½ × ${mass} × ${velocity}²` },
          { label: 'Simplification', content: `KE = 0.5 × ${mass} × ${velocity * velocity}` },
          { label: 'Answer', content: `KE = ${result} J` },
        ],
        answer: `${result} J`,
        explanation: 'Kinetic energy is the energy of motion. It equals half the mass times the square of velocity.',
      };
    }
  }

  if (lower.includes('potential') || (lower.includes('energy') && lower.includes('height'))) {
    const mass = extractValue(text, ['mass']);
    const height = extractValue(text, ['height', 'h']);
    const g = extractValue(text, ['g']) ?? 9.8;

    if (mass !== null && height !== null) {
      const result = mass * g * height;
      return {
        solved: true,
        subject: 'Physics',
        chapter: 'Work & Energy',
        topic: 'Potential Energy',
        given: { 'Mass (m)': `${mass} kg`, 'Height (h)': `${height} m`, 'g': `${g} m/s²` },
        formula: 'PE = m × g × h',
        steps: [
          { label: 'Given', content: `Mass (m) = ${mass} kg\nHeight (h) = ${height} m\ng = ${g} m/s²` },
          { label: 'Formula', content: 'PE = m × g × h' },
          { label: 'Substitution', content: `PE = ${mass} × ${g} × ${height}` },
          { label: 'Answer', content: `PE = ${result} J` },
        ],
        answer: `${result} J`,
        explanation: 'Potential energy is the energy stored due to an object\'s position (height). It equals mass times gravity times height.',
      };
    }
  }

  return null;
}

function solveDensity(text: string): SolveResult | null {
  const lower = text.toLowerCase();
  if (!lower.includes('density')) return null;

  const mass = extractValue(text, ['mass']);
  const volume = extractValue(text, ['volume']);

  if (mass !== null && volume !== null && volume !== 0) {
    const result = mass / volume;
    return {
      solved: true,
      subject: 'Physics',
      chapter: 'Matter',
      topic: 'Density',
      given: { 'Mass': `${mass} kg`, 'Volume': `${volume} m³` },
      formula: 'Density = Mass / Volume',
      steps: [
        { label: 'Given', content: `Mass = ${mass} kg\nVolume = ${volume} m³` },
        { label: 'Formula', content: 'Density = Mass / Volume' },
        { label: 'Substitution', content: `Density = ${mass} / ${volume}` },
        { label: 'Answer', content: `Density = ${result} kg/m³` },
      ],
      answer: `${result} kg/m³`,
      explanation: 'Density is mass per unit volume. Divide the mass of an object by its volume to find its density.',
    };
  }

  return null;
}

function solvePH(text: string): SolveResult | null {
  const lower = text.toLowerCase();
  if (!lower.includes('ph') && !lower.includes('acidic') && !lower.includes('basic') && !lower.includes('neutral')) return null;

  // Check if it's asking to classify a pH value
  const phMatch = lower.match(/ph\s*(?:=|is|of|:)\s*(\d+(?:\.\d+)?)/);
  if (phMatch) {
    const ph = parseFloat(phMatch[1]);
    let classification: string;
    let explanation: string;

    if (ph < 7) {
      classification = 'Acidic';
      explanation = `pH ${ph} is below 7, which means the solution is acidic. Acids have a higher concentration of H⁺ ions.`;
    } else if (ph === 7) {
      classification = 'Neutral';
      explanation = `pH 7 is neutral, meaning the concentration of H⁺ and OH⁻ ions is equal, like pure water.`;
    } else {
      classification = 'Basic (Alkaline)';
      explanation = `pH ${ph} is above 7, which means the solution is basic. Bases have a higher concentration of OH⁻ ions.`;
    }

    return {
      solved: true,
      subject: 'Chemistry',
      chapter: 'Acids & Bases',
      topic: 'pH Scale',
      given: { 'pH': String(ph) },
      formula: 'pH < 7 = Acidic, pH = 7 = Neutral, pH > 7 = Basic',
      steps: [
        { label: 'Given', content: `pH = ${ph}` },
        { label: 'Rule', content: 'pH < 7 → Acidic\npH = 7 → Neutral\npH > 7 → Basic' },
        { label: 'Answer', content: `The solution is ${classification}.` },
      ],
      answer: classification,
      explanation,
    };
  }

  return null;
}

function solvePressure(text: string): SolveResult | null {
  const lower = text.toLowerCase();
  if (!lower.includes('pressure')) return null;

  const force = extractValue(text, ['force']);
  const area = extractValue(text, ['area']);

  if (force !== null && area !== null && area !== 0) {
    const result = force / area;
    return {
      solved: true,
      subject: 'Physics',
      chapter: 'Laws of Motion',
      topic: 'Pressure',
      given: { 'Force': `${force} N`, 'Area': `${area} m²` },
      formula: 'Pressure = Force / Area',
      steps: [
        { label: 'Given', content: `Force = ${force} N\nArea = ${area} m²` },
        { label: 'Formula', content: 'Pressure = Force / Area' },
        { label: 'Substitution', content: `Pressure = ${force} / ${area}` },
        { label: 'Answer', content: `Pressure = ${result} Pa` },
      ],
      answer: `${result} Pa`,
      explanation: 'Pressure is force applied per unit area. Divide the force by the area over which it is applied.',
    };
  }

  return null;
}

// ---- Main solver function ----

const SOLVERS = [
  solveVelocity,
  solveSpeed,
  solveAcceleration,
  solveForce,
  solveWeight,
  solveOhmsLaw,
  solvePythagoras,
  solveEnergy,
  solveDensity,
  solvePH,
  solvePressure,
];

export function solveQuestion(question: string): SolveResult {
  const trimmed = question.trim();

  if (!trimmed) {
    return {
      solved: false,
      given: {},
      formula: '',
      steps: [],
      answer: '',
      explanation: 'Please provide a question to solve.',
    };
  }

  // Try numerical solvers first (they are more specific)
  for (const solver of SOLVERS) {
    const result = solver(trimmed);
    if (result && result.solved) {
      return result;
    }
  }

  // Try conceptual solver
  const conceptual = solveConceptual(trimmed);
  if (conceptual && conceptual.solved) {
    return conceptual;
  }

  // If no solver matched, return a helpful fallback
  return {
    solved: false,
    given: {},
    formula: '',
    steps: [],
    answer: '',
    explanation: "I can solve numerical problems (velocity, speed, acceleration, force, weight, Ohm's law, Pythagoras, energy, density, pH, pressure) and answer conceptual questions about Physics, Chemistry, Biology, and Mathematics topics from your syllabus. Please make sure your question is clear and includes all given values for numerical problems.",
  };
}

// ---- Identify subject from question text ----

export function identifySubject(question: string): { subject: string; chapter: string } | null {
  const lower = question.toLowerCase();

  if (lower.match(/velocity|speed|acceleration|motion|distance|displacement/)) {
    return { subject: 'Physics', chapter: 'Motion' };
  }
  if (lower.match(/force|newton|momentum|inertia/)) {
    return { subject: 'Physics', chapter: 'Laws of Motion' };
  }
  if (lower.match(/energy|work|power|joule/)) {
    return { subject: 'Physics', chapter: 'Work & Energy' };
  }
  if (lower.match(/voltage|current|resistance|ohm|circuit/)) {
    return { subject: 'Physics', chapter: 'Electricity' };
  }
  if (lower.match(/ph|acid|base|neutral|indicator/)) {
    return { subject: 'Chemistry', chapter: 'Acids & Bases' };
  }
  if (lower.match(/atom|electron|proton|neutron|nucleus/)) {
    return { subject: 'Chemistry', chapter: 'Atoms & Molecules' };
  }
  if (lower.match(/triangle|hypotenuse|pythagoras|angle/)) {
    return { subject: 'Mathematics', chapter: 'Triangles' };
  }
  if (lower.match(/sin|cos|tan|trigon/)) {
    return { subject: 'Mathematics', chapter: 'Trigonometry' };
  }
  if (lower.match(/polynomial|degree|zero|coefficient/)) {
    return { subject: 'Mathematics', chapter: 'Polynomials' };
  }
  if (lower.match(/cell|tissue|organ|organelle/)) {
    return { subject: 'Biology', chapter: 'Cell' };
  }
  if (lower.match(/photosynthesis|respiration|nutrition|life process/)) {
    return { subject: 'Biology', chapter: 'Life Processes' };
  }

  return null;
}
