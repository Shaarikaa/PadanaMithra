// Question Solver — parses text-based questions and provides step-by-step solutions.
// Supports common physics, math, and chemistry problems found in Class 9-10 curriculum.
// This is a pattern-matching solver, not an AI — it extracts given values, identifies
// the formula, substitutes, and produces a step-by-step solution.

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

  // Try each solver in order
  for (const solver of SOLVERS) {
    const result = solver(trimmed);
    if (result && result.solved) {
      return result;
    }
  }

  // If no solver matched, return a helpful fallback
  return {
    solved: false,
    given: {},
    formula: '',
    steps: [],
    answer: '',
    explanation: "I can solve problems involving: velocity, speed, acceleration, force (F=ma), weight, Ohm's law, Pythagorean theorem, kinetic/potential energy, density, pH classification, and pressure. Please type the full question with the given values (e.g., 'Calculate the velocity of a car that travels 100 m in 20 seconds').",
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
