// Mock AI knowledge base.
// To Do: Replace with real Gemini API Key here — wire these generators to
// actual Gemini API calls using the uploaded Syllabus / Textbook / PYQ PDFs.

export const SUBJECTS = [
  "Physics",
  "Chemistry",
  "Mathematics",
  "Biology",
  "English",
  "Social Science",
] as const;

export const CHAPTERS: Record<string, string[]> = {
  Physics: ["Motion", "Laws of Motion", "Work & Energy", "Light", "Electricity", "Sound"],
  Chemistry: ["Matter", "Atoms & Molecules", "Chemical Reactions", "Acids & Bases", "Periodic Table"],
  Mathematics: ["Real Numbers", "Polynomials", "Linear Equations", "Triangles", "Trigonometry", "Statistics"],
  Biology: ["Cell", "Tissues", "Life Processes", "Reproduction", "Heredity & Evolution"],
  English: ["Prose", "Poetry", "Grammar", "Writing Skills"],
  "Social Science": ["History", "Geography", "Civics", "Economics"],
};

// Simulated "context from uploaded PDFs" — the AI tutor draws from this.
export const KNOWLEDGE_BASE: Record<string, string> = {
  Motion:
    "Motion is the change in position of an object with respect to its surroundings over time. Key concepts: distance (total path length, scalar), displacement (shortest path, vector), speed (distance/time), velocity (displacement/time), and acceleration (change in velocity/time). Uniform motion means equal distances in equal time intervals. The equations of motion (v = u + at, s = ut + 1/2 at squared, v squared = u squared + 2as) describe motion under constant acceleration.",
  "Laws of Motion":
    "Newton's three laws: (1) An object stays at rest or in uniform motion unless acted on by an external force (inertia). (2) Force equals mass times acceleration (F = ma). (3) Every action has an equal and opposite reaction. These laws explain how forces change the state of motion of objects.",
  "Work & Energy":
    "Work is done when a force moves an object through a distance (W = F x d x cos theta). Energy is the capacity to do work. Kinetic energy = 1/2 m v squared. Potential energy = m g h. The work-energy theorem states the work done equals the change in kinetic energy. Energy is conserved — it transforms between forms but is never created or destroyed.",
  Light:
    "Light travels in straight lines (rectilinear propagation). Reflection follows the law: angle of incidence equals angle of reflection. Refraction is the bending of light when it passes between media of different optical densities (Snell's law). Lenses form images by refraction — convex lenses converge, concave lenses diverge.",
  Electricity:
    "Ohm's Law: V = IR, where V is voltage, I is current, and R is resistance. Series circuits have the same current through all components; parallel circuits have the same voltage across each branch. Electrical power P = VI = I squared R = V squared / R. Resistance depends on material, length, cross-section, and temperature.",
  Sound:
    "Sound is a mechanical wave that needs a medium to travel. It propagates as longitudinal waves — compressions and rarefactions. Speed of sound in air at 20 degrees C is about 343 m/s. Pitch depends on frequency, loudness on amplitude, and quality on waveform. The human audible range is 20 Hz to 20,000 Hz.",
  Matter:
    "Matter is anything that has mass and occupies space. It exists as solids, liquids, gases, and plasma. The kinetic molecular theory explains states: particles are tightly packed in solids, loosely packed in liquids, and free-moving in gases. Changes of state (melting, freezing, evaporation, condensation, sublimation) involve energy exchange.",
  "Atoms & Molecules":
    "Atoms are the smallest unit of an element; molecules are groups of atoms bonded chemically. Dalton proposed atoms are indivisible; later discoveries (electrons, protons, neutrons) refined this. Atomic number = protons; mass number = protons + neutrons. Isotopes have the same protons but different neutrons.",
  "Chemical Reactions":
    "A chemical reaction rearranges atoms to form new substances. Types: combination, decomposition, single displacement, double displacement, oxidation-reduction. Signs of a reaction: color change, gas release, precipitate formation, temperature change. Balancing equations follows the law of conservation of mass.",
  "Acids & Bases":
    "Acids release H+ ions (sour, pH < 7); bases release OH- ions (bitter, pH > 7). The pH scale (0 to 14) measures acidity. Indicators like litmus, phenolphthalein, and universal indicator reveal pH. Neutralization: acid + base produces salt + water. Strong acids/bases fully ionize; weak ones partially ionize.",
  "Periodic Table":
    "Mendeleev arranged elements by atomic mass; Moseley corrected this to atomic number. The modern periodic table has 7 periods and 18 groups. Elements in a group share chemical properties due to the same valence electron count. Trends: atomic radius decreases across a period, increases down a group; metallic character follows the opposite trend.",
  "Real Numbers":
    "Real numbers include rational and irrational numbers. Euclid's division lemma: a = bq + r, 0 <= r < b. The Fundamental Theorem of Arithmetic states every composite number is a unique product of primes. HCF and LCM use prime factorization. Irrational numbers like root 2 cannot be written as p/q.",
  Polynomials:
    "A polynomial is an algebraic expression with variables raised to whole-number powers. Degree is the highest power. Linear (degree 1), quadratic (degree 2), cubic (degree 3). The Remainder Theorem: dividing p(x) by (x - a) leaves remainder p(a). The Factor Theorem: (x - a) is a factor if and only if p(a) = 0.",
  "Linear Equations":
    "A linear equation in two variables (ax + by + c = 0) has infinitely many solutions. A pair of linear equations can have a unique solution (intersecting lines), no solution (parallel lines), or infinitely many solutions (coincident lines). Solve by substitution, elimination, or cross-multiplication.",
  Triangles:
    "Triangles are classified by sides (scalene, isosceles, equilateral) and angles (acute, right, obtuse). The angle sum is 180 degrees. Pythagoras: in a right triangle, the square of the hypotenuse equals the sum of the squares of the other two sides. Similar triangles have equal corresponding angles and proportional sides (AAA, SAS, SSS similarity).",
  Trigonometry:
    "Trigonometry relates angles to side ratios in right triangles. sin = opposite/hypotenuse, cos = adjacent/hypotenuse, tan = opposite/adjacent. Reciprocal ratios: cosec, sec, cot. Standard values: sin 30 degrees = 1/2, cos 60 degrees = 1/2, tan 45 degrees = 1. The identity sin squared theta + cos squared theta = 1 is fundamental.",
  Statistics:
    "Statistics collects, organizes, and interprets data. Measures of central tendency: mean (average), median (middle value), mode (most frequent). For grouped data, use the direct, assumed-mean, or step-deviation method. Frequency distributions and histograms visualize data. Cumulative frequency gives ogives.",
  Cell:
    "The cell is the basic unit of life. Prokaryotic cells (bacteria) lack a nucleus; eukaryotic cells have one. The cell membrane controls entry and exit; the nucleus stores DNA; mitochondria produce energy (ATP); ribosomes make proteins; the endoplasmic reticulum transports materials. Plant cells have a cell wall and chloroplasts.",
  Tissues:
    "A tissue is a group of similar cells performing a specific function. Plant tissues: meristematic (growth) and permanent (parenchyma, collenchyma, sclerenchyma). Animal tissues: epithelial (covering), connective (support), muscular (movement), nervous (control). Xylem transports water; phloem transports food.",
  "Life Processes":
    "Life processes sustain life: nutrition (autotrophic in plants, heterotrophic in animals), respiration (release of energy from food), transportation (circulation in animals, xylem/phloem in plants), and excretion (removal of waste). Photosynthesis converts light energy into chemical energy (6CO2 + 6H2O to C6H12O6 + 6O2).",
  Reproduction:
    "Reproduction ensures species continuity. Asexual reproduction (binary fission, budding, fragmentation, spore formation) produces identical offspring. Sexual reproduction combines gametes, creating variation. In flowering plants, the flower is the reproductive organ; pollination and fertilization lead to seed formation.",
  "Heredity & Evolution":
    "Heredity transmits traits from parents to offspring via genes (DNA segments). Mendel's laws explain inheritance. Evolution is the gradual change in species over generations driven by natural selection. Speciation occurs when populations become reproductively isolated. Evidence comes from fossils, homologous organs, and molecular comparisons.",
  Prose:
    "Prose is written language without metrical structure. In literary analysis, examine plot, character, setting, theme, and point of view. Reading comprehension strategies include predicting, questioning, clarifying, and summarizing. Effective prose uses clear topic sentences and supporting details.",
  Poetry:
    "Poetry uses rhythm, rhyme, imagery, and figurative language to evoke emotion. Key devices: metaphor (direct comparison), simile (comparison using like or as), personification, alliteration, and onomatopoeia. Analyze a poem by its form, tone, theme, and the poet's word choice.",
  Grammar:
    "Grammar governs sentence structure. Parts of speech: noun, pronoun, verb, adjective, adverb, preposition, conjunction, interjection. Tenses express time: past, present, future, each with simple, continuous, perfect, and perfect continuous forms. Subject-verb agreement keeps verbs consistent with subjects.",
  "Writing Skills":
    "Effective writing follows purpose, audience, and structure. Essays have an introduction (hook + thesis), body paragraphs (one idea each, with evidence), and a conclusion (restatement + insight). Formal letters use a specific format: sender's address, date, salutation, subject, body, and closing.",
  History:
    "History studies past events and their causes. Key themes: the French Revolution (liberty, equality, fraternity), colonialism, the Indian freedom struggle, and the World Wars. Historians analyze primary and secondary sources to construct narratives. Understanding cause and effect is central to historical thinking.",
  Geography:
    "Geography studies Earth's physical features and human activity. Core concepts: latitude and longitude, climate, natural vegetation, population, and resources. India's diversity spans mountains, plains, plateaus, and coastlines. Sustainable resource management balances human needs with environmental protection.",
  Civics:
    "Civics explores government and citizenship. Democracy means rule by the people through elected representatives. The Indian Constitution guarantees fundamental rights and duties. The three branches — legislature, executive, judiciary — provide checks and balances. Active citizenship includes voting and civic participation.",
  Economics:
    "Economics studies production, distribution, and consumption. Scarcity forces choices. Supply and demand determine prices. GDP measures a country's output. Inflation is a general rise in prices. Microeconomics examines individuals and firms; macroeconomics examines whole economies.",
};

const UNKNOWN_TOPIC_REPLY =
  "I don't have detailed notes on that topic in the uploaded PDFs yet, but here is a general overview: break the topic into key definitions, core principles, formulas, and worked examples. Try asking about a specific chapter like Motion or Chemical Reactions for a detailed explanation.";

export function generateTutorReply(topic: string, context?: { name?: string; classLevel?: string; board?: string; subject?: string; chapter?: string; topic?: string }): string {
  const cleaned = topic.trim();
  if (!cleaned) return "Please type a topic or question and I will explain it for you.";

  // If the student asks "explain this" or similar with very little context,
  // use their current learning context as the topic.
  const lower = cleaned.toLowerCase();
  const isVague = ['explain this', 'explain it', 'what is this', 'can you explain', 'tell me about this', 'help me with this', 'i don\'t understand this', 'explain'].some((p) => lower === p || lower.startsWith(p + ' ') && lower.length < 30);

  let effectiveTopic = cleaned;
  if (isVague && context?.chapter) {
    effectiveTopic = context.chapter;
  }

  // Try to match a known chapter across all subjects.
  for (const chapters of Object.values(CHAPTERS)) {
    for (const chapter of chapters) {
      if (effectiveTopic.toLowerCase().includes(chapter.toLowerCase())) {
        let reply = KNOWLEDGE_BASE[chapter] ?? UNKNOWN_TOPIC_REPLY;
        // Add a personalized prefix when context is available.
        if (context?.subject && context?.chapter && chapter === context.chapter) {
          reply = `For your current chapter — ${context.chapter} (${context.subject}, ${context.classLevel ?? 'Class 9'}) — here is the explanation:\n\n${reply}`;
        }
        return reply;
      }
    }
  }

  // Keyword-based fallbacks — prioritize the student's current subject when possible.
  if (lower.includes("newton") || lower.includes("force")) {
    return KNOWLEDGE_BASE["Laws of Motion"];
  }
  if (lower.includes("energy") || lower.includes("work")) {
    return KNOWLEDGE_BASE["Work & Energy"];
  }
  if (lower.includes("atom") || lower.includes("molecule")) {
    return KNOWLEDGE_BASE["Atoms & Molecules"];
  }
  if (lower.includes("photosynth") || lower.includes("life process")) {
    return KNOWLEDGE_BASE["Life Processes"];
  }
  if (lower.includes("periodic") || lower.includes("element")) {
    return KNOWLEDGE_BASE["Periodic Table"];
  }

  // If nothing matched but we have a current chapter, give that chapter's content.
  if (context?.chapter && KNOWLEDGE_BASE[context.chapter]) {
    return `Here is what we have on ${context.chapter} from your ${context.subject ?? 'current subject'} material:\n\n${KNOWLEDGE_BASE[context.chapter]}`;
  }

  return UNKNOWN_TOPIC_REPLY;
}

export function generateShortNotes(chapter: string): string[] {
  const base = KNOWLEDGE_BASE[chapter];
  if (!base) {
    return [
      "Introduction to " + chapter + " — key terms and scope.",
      "Core principle of " + chapter + " and why it matters.",
      "Main formula or relationship used in " + chapter + ".",
      "Common worked example applying the concept.",
      "A typical exam question on " + chapter + ".",
      "Frequent mistake students make in this chapter.",
      "How " + chapter + " connects to the previous chapter.",
      "Real-life application of " + chapter + ".",
      "Important diagram to practice for " + chapter + ".",
      "One-line summary to memorize for the exam.",
    ];
  }
  // Split the knowledge paragraph into sentences and present as bullets.
  const sentences = base.split(/(?<=[.])\s+/).filter(Boolean);
  const bullets = sentences.slice(0, 10).map((s) => s.trim());
  while (bullets.length < 10) {
    bullets.push("Review the key formula and one worked example for " + chapter + ".");
  }
  return bullets;
}

export function generateMockQuestions(): import("./types").MockQuestion[] {
  return [
    {
      id: "q1",
      question: "The SI unit of acceleration is:",
      options: ["m/s", "m/s squared", "m times s", "m squared / s"],
      answerIndex: 1,
      explanation: "Acceleration is the rate of change of velocity per unit time, so its unit is metres per second squared.",
    },
    {
      id: "q2",
      question: "Newton's second law of motion is expressed as:",
      options: ["F = ma", "F = mv", "F = m/a", "F = a/m"],
      answerIndex: 0,
      explanation: "Force equals mass times acceleration (F = ma).",
    },
    {
      id: "q3",
      question: "Which of the following is a vector quantity?",
      options: ["Speed", "Distance", "Velocity", "Time"],
      answerIndex: 2,
      explanation: "Velocity has both magnitude and direction, making it a vector. Speed is a scalar.",
    },
    {
      id: "q4",
      question: "The pH of a neutral solution at 25 degrees C is:",
      options: ["0", "7", "14", "1"],
      answerIndex: 1,
      explanation: "A neutral solution has equal H+ and OH- concentrations, giving a pH of 7.",
    },
    {
      id: "q5",
      question: "Which gas is released when a metal reacts with an acid?",
      options: ["Oxygen", "Carbon dioxide", "Hydrogen", "Nitrogen"],
      answerIndex: 2,
      explanation: "Metals displace hydrogen from acids, producing hydrogen gas (e.g., Zn + 2HCl to ZnCl2 + H2).",
    },
    {
      id: "q6",
      question: "The number of electrons in a neutral atom is equal to the number of:",
      options: ["Protons", "Neutrons", "Nucleons", "Isotopes"],
      answerIndex: 0,
      explanation: "In a neutral atom, positive protons balance negative electrons, so their counts are equal.",
    },
    {
      id: "q7",
      question: "The value of sin 30 degrees is:",
      options: ["0", "1/2", "1", "root 3 / 2"],
      answerIndex: 1,
      explanation: "sin 30 degrees = 1/2 (or 0.5) — a standard trigonometric value.",
    },
    {
      id: "q8",
      question: "In a right triangle, the square of the hypotenuse equals:",
      options: [
        "Sum of the other two sides",
        "Sum of the squares of the other two sides",
        "Product of the other two sides",
        "Difference of the other two sides",
      ],
      answerIndex: 1,
      explanation: "This is the Pythagorean theorem: c squared = a squared + b squared.",
    },
    {
      id: "q9",
      question: "The powerhouse of the cell is the:",
      options: ["Nucleus", "Ribosome", "Mitochondria", "Vacuole"],
      answerIndex: 2,
      explanation: "Mitochondria produce ATP through respiration, earning the nickname powerhouse of the cell.",
    },
    {
      id: "q10",
      question: "Photosynthesis primarily takes place in the:",
      options: ["Roots", "Chloroplasts", "Mitochondria", "Cell wall"],
      answerIndex: 1,
      explanation: "Chloroplasts contain chlorophyll, which captures light energy to drive photosynthesis.",
    },
  ];
}

export const FLASHCARDS: import("./types").Flashcard[] = [
  { id: "f1", front: "State Newton's First Law of Motion.", back: "An object remains at rest or in uniform motion unless acted upon by an external force. (Law of Inertia)" },
  { id: "f2", front: "What is the formula for kinetic energy?", back: "KE = 1/2 m v squared, where m is mass and v is velocity." },
  { id: "f3", front: "Define Ohm's Law.", back: "V = IR — voltage equals current multiplied by resistance, when temperature is constant." },
  { id: "f4", front: "What is the pH of a neutral solution?", back: "pH = 7 at 25 degrees C, indicating equal H+ and OH- concentrations." },
  { id: "f5", front: "State the Fundamental Theorem of Arithmetic.", back: "Every composite number can be expressed as a unique product of prime factors (order aside)." },
  { id: "f6", front: "What is the Remainder Theorem?", back: "When p(x) is divided by (x - a), the remainder equals p(a)." },
  { id: "f7", front: "What is the value of sin squared theta + cos squared theta?", back: "It equals 1 — the fundamental Pythagorean trigonometric identity." },
  { id: "f8", front: "Name the powerhouse of the cell.", back: "Mitochondria — they produce ATP via cellular respiration." },
  { id: "f9", front: "What is photosynthesis in one line?", back: "6CO2 + 6H2O, using light and chlorophyll, produces C6H12O6 + 6O2." },
  { id: "f10", front: "What are Mendel's laws about?", back: "Inheritance of traits — the Law of Segregation and the Law of Independent Assortment." },
  { id: "f11", front: "What does Snell's Law describe?", back: "The relationship between angles of incidence and refraction: n1 sin theta1 = n2 sin theta2." },
  { id: "f12", front: "Define uniform motion.", back: "Motion in which an object covers equal distances in equal intervals of time." },
];

export function predictQuestions(subject: string, chapter: string): import("./types").PredictedQuestion[] {
  const base = KNOWLEDGE_BASE[chapter];
  const seed = (subject + chapter).length;
  const templates = base
    ? [
        "Explain the core principles of " + chapter + " with examples.",
        "State and derive the main formula used in " + chapter + ".",
        "Differentiate between the key terms in " + chapter + ".",
        "Solve a numerical problem based on " + chapter + ".",
        "Draw and label the important diagram for " + chapter + ".",
        "State the real-life applications of " + chapter + ".",
        "What are the common mistakes students make in " + chapter + "?",
        "Compare " + chapter + " with a related concept you have studied.",
        "Write short notes on the historical background of " + chapter + ".",
        "Why is " + chapter + " important for higher studies in " + subject + "?",
      ]
    : [
        "Define the key terms in " + chapter + ".",
        "Explain the scope of " + chapter + " within " + subject + ".",
        "State the main principle of " + chapter + ".",
        "Give a worked example for " + chapter + ".",
        "List the formulas used in " + chapter + ".",
        "Describe an experiment related to " + chapter + ".",
        "Compare two concepts within " + chapter + ".",
        "What are the applications of " + chapter + "?",
        "Write a short note on the history of " + chapter + ".",
        "How does " + chapter + " connect to other chapters in " + subject + "?",
      ];
  return templates.map((q, i) => ({
    id: "pq-" + i,
    question: q,
    frequency: Math.max(1, 10 - i + (seed % 3)),
  }));
}

export const CAREER_ADVICE: Record<string, { title: string; icon: string; items: string[] }[]> = {
  "After 10th": [
    {
      title: "Science Stream (PCM / PCB)",
      icon: "Atom",
      items: [
        "Choose Physics, Chemistry, Maths (PCM) for engineering, architecture, or aviation.",
        "Choose Physics, Chemistry, Biology (PCB) for medicine, dentistry, or veterinary science.",
        "Opens doors to research, biotechnology, and pure sciences.",
        "Best for students who enjoy problem-solving and logical reasoning.",
      ],
    },
    {
      title: "Commerce Stream",
      icon: "Briefcase",
      items: [
        "Leads to Chartered Accountancy, Company Secretary, and banking careers.",
        "Study accountancy, business studies, and economics.",
        "Great for students interested in finance, business, and entrepreneurship.",
        "Can combine with Maths for broader options like actuarial science.",
      ],
    },
    {
      title: "Humanities / Arts",
      icon: "BookOpen",
      items: [
        "Subjects: history, political science, sociology, psychology, literature.",
        "Pathways to law, civil services, journalism, and social work.",
        "Ideal for students curious about society, culture, and human behavior.",
        "Growing demand in public policy and design fields.",
      ],
    },
    {
      title: "Diploma & ITI",
      icon: "Wrench",
      items: [
        "Polytechnic diplomas in engineering branches (mechanical, civil, electrical, computer).",
        "ITI trades: electrician, fitter, welder, mechanic — quick job-ready skills.",
        "Can lateral-entry into the second year of a B.Tech after a diploma.",
        "Strong option for hands-on learners who want early employment.",
      ],
    },
  ],
  "After 12th": [
    {
      title: "Engineering (B.Tech / B.E.)",
      icon: "Cpu",
      items: [
        "Branches: Computer Science, Electronics, Mechanical, Civil, AI & Data Science.",
        "Admission via entrance exams like JEE Main, state CETs, or KEAM.",
        "Four-year program leading to roles in tech, manufacturing, and research.",
        "Specialize in emerging fields: AI, robotics, cybersecurity, renewable energy.",
      ],
    },
    {
      title: "Medicine (MBBS & Allied)",
      icon: "Stethoscope",
      items: [
        "MBBS via NEET — 5.5 years including internship.",
        "Allied options: BDS (dental), BAMS, BHMS, Veterinary, Nursing, Pharmacy.",
        "Long study path but high social impact and stable demand.",
        "Consider BSc Nursing or B Pharm for faster entry into healthcare.",
      ],
    },
    {
      title: "Management & Commerce",
      icon: "TrendingUp",
      items: [
        "BBA, B.Com, B.Com (Hons), BBA LLB (integrated law + management).",
        "Leads to MBA, CA, CFA, or direct corporate roles.",
        "Strong foundation for entrepreneurship and business analytics.",
        "IPM programs (5-year BBA+MBA) at IIMs for top students.",
      ],
    },
    {
      title: "Design, Law & Creative",
      icon: "Palette",
      items: [
        "NID, NIFT, and UCEED for design (product, fashion, communication).",
        "CLAT for 5-year integrated law (BA LLB).",
        "Film, animation, journalism, and architecture (B.Arch via NATA).",
        "Ideal for creative thinkers who want non-traditional careers.",
      ],
    },
  ],
  Engineering: [
    {
      title: "Computer Science & IT",
      icon: "Code",
      items: [
        "Software development, web/mobile apps, cloud, and DevOps.",
        "High-paying roles: SDE, data engineer, ML engineer, security analyst.",
        "Learn DSA, a backend stack, databases, and version control early.",
        "Internships and open-source contributions matter more than GPA.",
      ],
    },
    {
      title: "Electronics & Communication",
      icon: "CircuitBoard",
      items: [
        "Semiconductors, embedded systems, VLSI, and telecommunications.",
        "Bridge between hardware and software — IoT, robotics, signal processing.",
        "Core companies: ISRO, BEL, Qualcomm, Intel, Texas Instruments.",
        "Strong foundation for switching into AI hardware and chip design.",
      ],
    },
    {
      title: "Mechanical & Civil",
      icon: "Settings",
      items: [
        "Mechanical: automotive, aerospace, manufacturing, HVAC, robotics.",
        "Civil: construction, structural design, urban planning, infrastructure.",
        "Add CAD/CAM, BIM, and project management skills for better roles.",
        "Growing demand in green energy and sustainable infrastructure.",
      ],
    },
    {
      title: "Emerging Fields",
      icon: "Sparkles",
      items: [
        "Artificial Intelligence, Machine Learning, and Data Science.",
        "Cybersecurity, blockchain, and cloud architecture.",
        "Biotechnology, biomedical engineering, and bioinformatics.",
        "Renewable energy, EVs, and sustainability engineering.",
      ],
    },
  ],
};

export const PEER_ROOM_BOTS = [
  { id: "bot-1", name: "Aarya", avatar: "A", color: "bg-rose-500" },
  { id: "bot-2", name: "Rahul", avatar: "R", color: "bg-emerald-500" },
  { id: "bot-3", name: "Meera", avatar: "M", color: "bg-amber-500" },
];

const BOT_REPLIES = [
  "That's a great question! I think the key is to first write down what's given and what's asked.",
  "I solved a similar problem yesterday — remember to check your units before substituting.",
  "Yes! Newton's second law applies here. F = ma is your starting point.",
  "Can someone explain the difference between speed and velocity again? I keep mixing them up.",
  "Speed is just distance over time, but velocity also has a direction. Velocity is a vector.",
  "Thanks! That makes sense now. Let me try the next question.",
  "I'm stuck on the trigonometry one — how do I know which ratio to use?",
  "If it has the opposite and hypotenuse, use sine. Opposite and adjacent, use tangent.",
  "Oh nice, that rule of thumb helps a lot!",
  "Has everyone finished the mock test? My score was 7/10.",
  "I got 8/10! The pH question tricked me — I picked 14 instead of 7.",
  "Classic mistake. Neutral is always pH 7. Let's revise acids and bases together.",
];

export function generateBotReply(userText: string, history: string[]): string {
  const lower = userText.toLowerCase();
  if (lower.includes("velocity") || lower.includes("speed")) {
    return "Speed is distance over time (scalar), velocity is displacement over time (vector — it has direction). Hope that helps!";
  }
  if (lower.includes("newton") || lower.includes("force")) {
    return "Newton's second law: F = ma. Force equals mass times acceleration. What's the specific problem you're on?";
  }
  if (lower.includes("trig") || lower.includes("sine") || lower.includes("cosine")) {
    return "For trig: SOH CAH TOA. Sine = opposite/hypotenuse, Cosine = adjacent/hypotenuse, Tangent = opposite/adjacent.";
  }
  if (lower.includes("ph") || lower.includes("acid") || lower.includes("base")) {
    return "Neutral pH is 7. Below 7 is acidic, above 7 is basic. Acids release H+, bases release OH-.";
  }
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    return "Hey! Welcome to the study room. What topic are we working on today?";
  }
  const idx = history.length % BOT_REPLIES.length;
  return BOT_REPLIES[idx];
}

export function generateDoubtFeedback(attempt: number): { status: "correct" | "hint"; message: string } {
  if (attempt <= 2) {
    return {
      status: "correct",
      message:
        "Correct! Your approach is on the right track. The steps are logically ordered and the final answer matches the expected result. Well done.",
    };
  }
  const hints = [
    "Hint 1: Re-check step 2 — make sure you've applied the correct formula before substituting values.",
    "Hint 1: Look at the units in step 2. A unit mismatch often hides the error.",
    "Hint 1: Verify the sign of each term in step 2 before simplifying.",
  ];
  return { status: "hint", message: hints[attempt % hints.length] };
}

export function generateDoubtSolution(): string[] {
  return [
    "Step 1: Identify what is given and what is asked. List all known values and the unknown.",
    "Step 2: Select the correct formula from the syllabus that connects the knowns to the unknown.",
    "Step 3: Substitute the known values into the formula, keeping units consistent.",
    "Step 4: Simplify the equation step by step. Solve for the unknown variable.",
    "Step 5: Check the result — verify units, reasonableness of magnitude, and re-read the question.",
    "Step 6: Write the final answer with the correct unit and box it for the examiner.",
  ];
}

// Translate an English AI tutor reply into Malayalam.
// Preserves names, equations, formulas, and numerical values.
// This is a rule-based translator that maps known knowledge base content
// and common conversational phrases to natural Malayalam.
export function translateReplyToMalayalam(text: string): string {
  // If already Malayalam, return as-is
  if (/[\u0D00-\u0D7F]/.test(text)) return text;

  // Check if the text matches a known knowledge base entry
  const malayalamKnowledge: Record<string, string> = {
    Motion: 'ചലനം എന്നത് സമയത്തിനനുസരിച്ച് ഒരു വസ്തുവിന്റെ സ്ഥാനത്തിലുണ്ടാകുന്ന മാറ്റമാണ്. പ്രധാന ആശയങ്ങൾ: ദൂരം (മൊത്തം പാതയുടെ ദൈർഘ്യം, അദിശം), സ്ഥാനച്യുതി (ഏറ്റവും ചെറിയ പാത, സദിശം), വേഗത (ദൂരം/സമയം), പ്രവേഗം (സ്ഥാനച്യുതി/സമയം), ത്വരണം (പ്രവേഗത്തിലുണ്ടാകുന്ന മാറ്റം/സമയം). ഏകതാന ചലനം എന്നത് തുല്യ സമയ ഇടവേളകളിൽ തുല്യ ദൂരം സഞ്ചരിക്കുന്നതാണ്. ചലന സമവാക്യങ്ങൾ (v = u + at, s = ut + 1/2 at², v² = u² + 2as) സ്ഥിര ത്വരണത്തിലുള്ള ചലനത്തെ വിവരിക്കുന്നു.',
    'Laws of Motion': 'ന്യൂട്ടന്റെ മൂന്ന് നിയമങ്ങൾ: (1) ബാഹ്യ ബലം പ്രയോഗിക്കാത്തിടത്തോളം ഒരു വസ്തു വിശ്രമത്തിലോ ഏകതാന ചലനത്തിലോ തുടരും (ജഡത്വം). (2) ബലം = പിണ്ഡം × ത്വരണം (F = ma). (3) ഓരോ പ്രവർത്തനത്തിനും തുല്യവും വിപരീതവുമായ പ്രതിപ്രവർത്തനം ഉണ്ട്. ഈ നിയമങ്ങൾ ബലങ്ങൾ വസ്തുക്കളുടെ ചലന അവസ്ഥ എങ്ങനെ മാറ്റുന്നു എന്ന് വിശദീകരിക്കുന്നു.',
    'Work & Energy': 'പ്രവൃത്തി എന്നത് ഒരു ബലം വസ്തുവിനെ ഒരു ദൂരത്തിലൂടെ നീക്കുമ്പോൾ ആണ് ചെയ്യപ്പെടുന്നത് (W = F × d × cos θ). ഊർജ്ജം എന്നത് പ്രവൃത്തി ചെയ്യാനുള്ള ശേഷിയാണ്. ഗതിക ഊർജ്ജം = 1/2 m v². സ്ഥിതിക ഊർജ്ജം = m g h. പ്രവൃത്തി-ഊർജ്ജ സിദ്ധാന്തം പറയുന്നത് ചെയ്യപ്പെട്ട പ്രവൃത്തി ഗതിക ഊർജ്ജത്തിലെ മാറ്റത്തിന് തുല്യമാണ്. ഊർജ്ജം സംരക്ഷിക്കപ്പെടുന്നു — രൂപങ്ങൾക്കിടയിൽ മാറുമെങ്കിലും ഒരിക്കലും സൃഷ്ടിക്കപ്പെടുകയോ നശിപ്പിക്കപ്പെടുകയോ ഇല്ല.',
    Light: 'പ്രകാശം നേർരേഖകളിൽ സഞ്ചരിക്കുന്നു (നേർരേഖാ പ്രസരണം). പ്രതിഫലനം നിയമം പാലിക്കുന്നു: ആപതന കോൺ പ്രതിഫലന കോണിന് തുല്യമാണ്. വ്യത്യസ്ത ഒപ്റ്റിക്കൽ സാന്ദ്രതയുള്ള മാധ്യമങ്ങൾക്കിടയിൽ കടന്നുപോകുമ്പോൾ പ്രകാശം വളയുന്നതാണ് അപവർത്തനം (സ്നെൽ നിയമം). ലെൻസുകൾ അപവർത്തനം വഴി പ്രതിബിംബം രൂപപ്പെടുത്തുന്നു — കോൺവെക്സ് ലെൻസുകൾ കൺവർജ് ചെയ്യുന്നു, കോൺകേവ് ലെൻസുകൾ ഡൈവർജ് ചെയ്യുന്നു.',
    Electricity: 'ഓം നിയമം: V = IR, ഇവിടെ V വോൾട്ടേജ്, I കറന്റ്, R പ്രതിരോധം. സീരീസ് സർക്കിറ്റുകളിൽ എല്ലാ ഘടകങ്ങൾക്കും ഒരേ കറന്റ് ഉണ്ട്; സമാന്തര സർക്കിറ്റുകളിൽ ഓരോ ശാഖയിലും ഒരേ വോൾട്ടേജ് ഉണ്ട്. വൈദ്യുത പവർ P = VI = I²R = V²/R. പ്രതിരോധം പദാർഥം, ദൈർഘ്യം, ക്രോസ്-സെക്ഷൻ, താപനില എന്നിവയെ ആശ്രയിക്കുന്നു.',
    Sound: 'ശബ്ദം ഒരു യാന്ത്രിക തരംഗമാണ്, സഞ്ചാരത്തിന് മാധ്യമം ആവശ്യമാണ്. ഇത് ദീർഘ തരംഗങ്ങളായി പ്രസരിക്കുന്നു — സമ്മർദ്ദങ്ങളും വിരളിതങ്ങളും. 20°C യിൽ വായുവിൽ ശബ്ദത്തിന്റെ വേഗത ഏകദേശം 343 m/s ആണ്. പിച്ച് ആവൃത്തിയെ ആശ്രയിക്കുന്നു, ഉച്ചത ആയതിയെ ആശ്രയിക്കുന്നു. മനുഷ്യന് കേൾക്കാൻ കഴിയുന്ന ശ്രേണി 20 Hz മുതൽ 20,000 Hz വരെയാണ്.',
    Matter: 'പദാർഥം എന്നത് പിണ്ഡമുള്ളതും സ്ഥലം ഉപയോഗിക്കുന്നതുമായ എല്ലാറ്റിനെയും പറയുന്നു. ഖരം, ദ്രാവകം, വാതകം, പ്ലാസ്മ എന്നിങ്ങനെ നിലനിൽക്കുന്നു. കൈനറ്റിക് തന്മാത്രാ സിദ്ധാന്തം അവസ്ഥകളെ വിശദീകരിക്കുന്നു: ഖരങ്ങളിൽ കണികകൾ നെരുക്കം പാകപ്പെട്ടിരിക്കും, ദ്രാവകങ്ങളിൽ അയഞ്ചളമായി, വാതകങ്ങളിൽ സ്വതന്ത്രമായി ചലിക്കും. അവസ്ഥാ മാറ്റങ്ങൾ (ഉരുകൽ, ഘനീഭവനം, ബാഷ്പീകരണം, സാന്ദ്രീകരണം, ഉദ്ധാതനം) ഊർജ്ജ വിനിമയം ഉൾപ്പെടുന്നു.',
    'Atoms & Molecules': 'അണുക്കൾ ഒരു മൂലകത്തിന്റെ ഏറ്റവും ചെറിയ ഘടകമാണ്; തന്മാത്രകൾ രാസപരമായി ബന്ധിക്കപ്പെട്ട അണുക്കളുടെ ഗ്രൂപ്പാണ്. ഡാൽട്ടൺ അണുക്കൾ വിഭജ്യമാണെന്ന് നിർദ്ദേശിച്ചു; പിന്നീടുള്ള കണ്ടുപിടിത്തുകൾ (ഇലക്ട്രോണുകൾ, പ്രോട്ടോണുകൾ, ന്യൂട്രോണുകൾ) ഇത് പരിഷ്കരിച്ചു. അണു സംഖ്യ = പ്രോട്ടോണുകൾ; പിണ്ഡ സംഖ്യ = പ്രോട്ടോണുകൾ + ന്യൂട്രോണുകൾ. ഐസോട്ടോപ്പുകൾക്ക് ഒരേ പ്രോട്ടോണുകൾ ഉണ്ടെങ്കിലും വ്യത്യസ്ത ന്യൂട്രോണുകൾ ഉണ്ട്.',
    'Chemical Reactions': 'രാസ പ്രതിപ്രവർത്തനം പുതിയ പദാർഥങ്ങൾ രൂപപ്പെടുത്താൻ അണുക്കളെ പുനർക്രമീകരിക്കുന്നു. തരങ്ങൾ: സംയോജനം, വിഘടനം, ഏക സ്ഥാനച്യുതി, ദ്വിസ്ഥാനച്യുതി, ഓക്സിഡേഷൻ-റിഡക്ഷൻ. പ്രതിപ്രവർത്തനത്തിന്റെ ലക്ഷണങ്ങൾ: നിറം മാറുക, വാതകം പുറപ്പെടുക, അവക്ഷിപ്തം രൂപപ്പെടുക, താപനില മാറുക. സമവാക്യങ്ങൾ സന്തുലിതമാക്കുന്നത് പിണ്ഡ സംരക്ഷണ നിയമം പാലിക്കുന്നു.',
    'Acids & Bases': 'ആസിഡുകൾ H+ അയോണുകൾ നൽകുന്നു (പുളിരസം, pH < 7); ബേസുകൾ OH- അയോണുകൾ നൽകുന്നു (കയ്പുരസം, pH > 7). pH സ്കെയിൽ (0 മുതൽ 14 വരെ) അമ്ലത അളക്കുന്നു. ലിറ്റ്മസ്, ഫിനോൾഫ്തലീൻ, യൂണിവേഴ്സൽ ഇൻഡിക്കേറ്റർ എന്നിവ pH കാണിക്കുന്നു. ന്യൂട്രലൈസേഷൻ: ആസിഡ് + ബേസ് → ലവണം + ജലം. ശക്ത ആസിഡുകൾ/ബേസുകൾ പൂർണ്ണമായി അയണീകരിക്കുന്നു; ദുർബലങ്ങൾ ഭാഗികമായി.',
    'Periodic Table': 'മെൻഡലീവ് മൂലകങ്ങളെ അണു പിണ്ഡം അനുസരിച്ച് ക്രമീകരിച്ചു; മോസ്ലി ഇത് അണു സംഖ്യയായി തിരുത്തി. ആധുനിക പീരിയോഡിക് പട്ടികയിൽ 7 പീരിയഡുകളും 18 ഗ്രൂപ്പുകളും ഉണ്ട്. ഒരേ ഗ്രൂപ്പിലെ മൂലകങ്ങൾക്ക് ഒരേ വാലൻസ് ഇലക്ട്രോൺ എണ്ണം കാരണം ഒരേ രാസ ഗുണങ്ങൾ ഉണ്ട്. ട്രെൻഡുകൾ: ഒരു പീരിയഡിൽ അണു ആരം കുറയുന്നു, ഗ്രൂപ്പിൽ താഴേക്ക് വർദ്ധിക്കുന്നു.',
    Cell: 'കോശം ജീവന്റെ അടിസ്ഥാന ഘടകമാണ്. പ്രോകാരിയോട്ടിക് കോശങ്ങൾ (ബാക്ടീരിയ) ന്യൂക്ലിയസ് ഇല്ല; യൂകാരിയോട്ടിക് കോശങ്ങൾക്ക് ഉണ്ട്. കോശ സ്തരം പ്രവേശനവും നിർഗമനവും നിയന്ത്രിക്കുന്നു; ന്യൂക്ലിയസ് DNA സംഭരിക്കുന്നു; മൈറ്റോകോൺഡ്രിയ ഊർജ്ജം (ATP) ഉത്പാദിപ്പിക്കുന്നു; റൈബോസോമുകൾ മാംസ്യം നിർമ്മിക്കുന്നു. സസ്യ കോശങ്ങൾക്ക് കോശ ഭിത്തിയും ക്ലോറോപ്ലാസ്റ്റുകളും ഉണ്ട്.',
    'Life Processes': 'ജീവ പ്രക്രിയകൾ ജീവനെ നിലനിർത്തുന്നു: പോഷണം (സസ്യങ്ങളിൽ സ്വയം പോഷിതം, മൃഗങ്ങളിൽ പരാശ്രിതം), ശ്വസനം (ഭക്ഷണത്തിൽ നിന്ന് ഊർജ്ജം സ്വതന്ത്രമാക്കൽ), വിതരണം (മൃഗങ്ങളിൽ രക്തചംക്രമണം, സസ്യങ്ങളിൽ സൈലം/ഫ്ലോയം), വിസർജ്ജനം (വിസർജ്ജ്യം നീക്കൽ). പ്രകാശസംശ്ലേഷണം പ്രകാശ ഊർജ്ജത്തെ രാസ ഊർജ്ജമാക്കി മാറ്റുന്നു (6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂).',
    Photosynthesis: 'പ്രകാശസംശ്ലേഷണം എന്നത് സസ്യങ്ങൾ പ്രകാശം, CO₂, ജലം ഉപയോഗിച്ച് ഭക്ഷണം നിർമ്മിക്കുന്ന പ്രക്രിയയാണ്. ഇത് ക്ലോറോപ്ലാസ്റ്റുകളിൽ നടക്കുന്നു, അവയിൽ ക്ലോറോഫിൽ അടങ്ങിയിരിക്കുന്നു. സമവാക്യം: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂ (പ്രകാശ ഊർജ്ജം ഉപയോഗിച്ച്).',
  };

  // Try to match knowledge base content
  for (const [engKey, mlText] of Object.entries(malayalamKnowledge)) {
    if (text.includes(engKey) || text.toLowerCase().includes(engKey.toLowerCase())) {
      return mlText;
    }
  }

  // Common conversational phrase translations
  const phraseMap: { en: RegExp; ml: string }[] = [
    { en: /I don't have detailed notes on that topic/i, ml: 'ഈ വിഷയത്തെക്കുറിച്ച് എന്റെ പാഠ്യസാമഗ്രികളിൽ വിശദമായ കുറിപ്പുകൾ ഇല്ല, പക്ഷേ ഒരു പൊതു അവലോകനം താഴെ നൽകുന്നു:' },
    { en: /break the topic into key definitions/i, ml: 'വിഷയത്തെ പ്രധാന നിർവചനങ്ങൾ, അടിസ്ഥാന തത്വങ്ങൾ, സൂത്രവാക്യങ്ങൾ, ഉദാഹരണങ്ങൾ എന്നിങ്ങനെ വിഭജിക്കുക.' },
    { en: /Try asking about a specific chapter/i, ml: 'വിശദമായ വിശദീകരണത്തിന് ഒരു പ്രത്യേക അധ്യായത്തെക്കുറിച്ച് ചോദിക്കുക.' },
    { en: /Please type a topic or question/i, ml: 'ദയവായി ഒരു വിഷയം അല്ലെങ്കിൽ ചോദ്യം ടൈപ്പ് ചെയ്യുക, ഞാൻ വിശദീകരിക്കാം.' },
    { en: /For your current chapter/i, ml: 'നിങ്ങളുടെ നിലവിലെ അധ്യായത്തിന് —' },
    { en: /here is the explanation/i, ml: 'വിശദീകരണം താഴെ നൽകുന്നു:' },
    { en: /Here is what we have on/i, ml: 'നിങ്ങളുടെ പഠന സാമഗ്രികളിൽ ഇതിനെക്കുറിച്ച് ഉള്ളത് താഴെ:' },
    { en: /from your .* material/i, ml: 'പഠന സാമഗ്രികളിൽ നിന്ന്:' },
  ];

  let result = text;
  for (const { en, ml } of phraseMap) {
    result = result.replace(en, ml);
  }

  // If no significant translation happened, return a Malayalam wrapper
  if (!/[\u0D00-\u0D7F]/.test(result)) {
    return `ഈ വിഷയത്തെക്കുറിച്ച് വിശദീകരിക്കാൻ എനിക്ക് കഴിയും. ദയവായി കൂടുതൽ വ്യക്തമായി ചോദിക്കുക.\n\n${text}`;
  }

  return result;
}
