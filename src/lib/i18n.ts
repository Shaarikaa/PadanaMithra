// Internationalization (i18n) for PadanaMithra.
// Supports English and Malayalam. Translations are keyed by string ID.

export type Language = 'en' | 'ml';

export const LANGUAGES: { value: Language; label: string; nativeLabel: string; flag: string }[] = [
  { value: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { value: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം', flag: '🇮🇳' },
];

// Translation dictionary. Keys are UI string IDs.
// Values are { en: string, ml: string }.
type TranslationEntry = { en: string; ml: string };

const translations: Record<string, TranslationEntry> = {
  // ---- Navigation ----
  'nav.home': { en: 'Home', ml: 'ഹോം' },
  'nav.dashboard': { en: 'Dashboard', ml: 'ഡാഷ്ബോർഡ്' },
  'nav.aiTutor': { en: 'AI Tutor', ml: 'എഐ ട്യൂട്ടർ' },
  'nav.askQuestion': { en: 'Ask Question', ml: 'ചോദ്യം ചോദിക്കുക' },
  'nav.uploadImage': { en: 'Upload Image', ml: 'ചിത്രം അപ്ലോഡ് ചെയ്യുക' },
  'nav.solveQuestion': { en: 'Solve Question', ml: 'ചോദ്യം പരിഹരിക്കുക' },
  'nav.profile': { en: 'Profile', ml: 'പ്രൊഫൈൽ' },
  'nav.subjects': { en: 'Subjects', ml: 'വിഷയങ്ങൾ' },
  'nav.chapters': { en: 'Chapters', ml: 'അധ്യായങ്ങൾ' },
  'nav.studyMaterials': { en: 'Study Materials', ml: 'പഠന സാമഗ്രികൾ' },
  'nav.mockTest': { en: 'Mock Test', ml: 'മോക്ക് ടെസ്റ്റ്' },
  'nav.focusTimer': { en: 'Focus Timer', ml: 'ഫോക്കസ് ടൈമർ' },
  'nav.flashcards': { en: 'Flashcards', ml: 'ഫ്ലാഷ്കാർഡുകൾ' },
  'nav.parentDashboard': { en: 'Parent Dashboard', ml: 'രക്ഷിതാവിന്റെ ഡാഷ്ബോർഡ്' },
  'nav.settings': { en: 'Settings', ml: 'ക്രമീകരണങ്ങൾ' },
  'nav.login': { en: 'Login', ml: 'ലോഗിൻ' },
  'nav.logout': { en: 'Logout', ml: 'ലോഗൗട്ട്' },
  'nav.signup': { en: 'Sign Up', ml: 'സൈൻ അപ്പ്' },
  'nav.career': { en: 'Career Guidance', ml: 'കരിയർ മാർഗ്ഗനിർദ്ദേശം' },
  'nav.timetable': { en: 'Timetable', ml: 'സമയപട്ടിക' },
  'nav.peerRooms': { en: 'Peer Study Rooms', ml: 'പിയർ പഠന മുറികൾ' },
  'nav.videoClasses': { en: 'Video Classes', ml: 'വീഡിയോ ക്ലാസുകൾ' },
  'nav.proNotes': { en: 'Pro Notes', ml: 'പ്രോ നോട്ട്സ്' },
  'nav.shortNotes': { en: 'Short Notes', ml: 'ചെറുകുറിപ്പുകൾ' },
  'nav.pyqPredictor': { en: 'PYQ Predictor', ml: 'പിവൈക്യൂ പ്രഡിക്റ്റർ' },
  'nav.teachBack': { en: 'Teach Back', ml: 'ടീച്ച് ബാക്ക്' },
  'nav.mentoring': { en: 'Personal Mentor', ml: 'വ്യക്തിഗത മെന്റർ' },
  'nav.doubtSolver': { en: 'Doubt Solver', ml: 'ഡൗട്ട് സോൾവർ' },
  'nav.offline': { en: 'Offline Mode', ml: 'ഓഫ്ലൈൻ മോഡ്' },

  // ---- Common ----
  'common.loading': { en: 'Loading...', ml: 'ലോഡ് ചെയ്യുന്നു...' },
  'common.error': { en: 'Something went wrong', ml: 'എന്തോ തെറ്റായി' },
  'common.retry': { en: 'Try Again', ml: 'വീണ്ടും ശ്രമിക്കുക' },
  'common.cancel': { en: 'Cancel', ml: 'റദ്ദാക്കാൻ' },
  'common.save': { en: 'Save', ml: 'സേവ് ചെയ്യുക' },
  'common.edit': { en: 'Edit', ml: 'തിരുത്തുക' },
  'common.back': { en: 'Back', ml: 'തിരികെ' },
  'common.next': { en: 'Next', ml: 'അടുത്തത്' },
  'common.start': { en: 'Start', ml: 'തുടങ്ങുക' },
  'common.finish': { en: 'Finish', ml: 'പൂർത്തിയാക്കുക' },
  'common.search': { en: 'Search', ml: 'തിരയുക' },
  'common.welcome': { en: 'Welcome', ml: 'സ്വാഗതം' },
  'common.language': { en: 'Language', ml: 'ഭാഷ' },

  // ---- AI Tutor ----
  'aiTutor.title': { en: 'AI Tutor', ml: 'എഐ ട്യൂട്ടർ' },
  'aiTutor.subtitle': { en: 'Your personal AI learning companion', ml: 'നിങ്ങളുടെ വ്യക്തിഗത എഐ പഠന കൂട്ടാളി' },
  'aiTutor.placeholder': { en: 'Ask me anything about your studies...', ml: 'നിങ്ങളുടെ പഠനത്തെക്കുറിച്ച് എന്തും ചോദിക്കുക...' },
  'aiTutor.send': { en: 'Send', ml: 'അയയ്ക്കുക' },
  'aiTutor.listen': { en: 'Listen', ml: 'കേൾക്കുക' },
  'aiTutor.voiceLanguage': { en: 'Voice Language', ml: 'ശബ്ദ ഭാഷ' },
  'aiTutor.thinking': { en: 'Thinking...', ml: 'ചിന്തിക്കുന്നു...' },
  'aiTutor.greeting': { en: "Hi! I'm your AI tutor. Ask me about any topic and I'll help you understand it.", ml: 'നമസ്കാരം! ഞാൻ നിങ്ങളുടെ എഐ ട്യൂട്ടർ ആണ്. ഏത് വിഷയത്തെക്കുറിച്ചും ചോദിക്കുക, ഞാൻ സഹായിക്കാം.' },
  'aiTutor.hint': { en: 'Need a hint?', ml: 'സൂചന വേണോ?' },
  'aiTutor.practiceQuestion': { en: 'Practice Question', ml: 'അഭ്യാസ ചോദ്യം' },
  'aiTutor.showAnswer': { en: 'Show Answer', ml: 'ഉത്തരം കാണിക്കുക' },
  'aiTutor.correct': { en: 'Correct!', ml: 'ശരിയാണ്!' },
  'aiTutor.incorrect': { en: 'Not quite right', ml: 'പൂർണ്ണമല്ല' },

  // ---- Doubt Solver ----
  'doubt.title': { en: 'Doubt Solver', ml: 'ഡൗട്ട് സോൾവർ' },
  'doubt.subtitle': { en: "Upload a photo of your question, or type or speak it. I'll solve it step by step.", ml: 'നിങ്ങളുടെ ചോദ്യത്തിന്റെ ഫോട്ടോ അപ്ലോഡ് ചെയ്യുക, അല്ലെങ്കിൽ ടൈപ്പ് ചെയ്യുക അല്ലെങ്കിൽ സംസാരിക്കുക. ഞാൻ ഘട്ടം ഘട്ടമായി പരിഹരിക്കാം.' },
  'doubt.upload': { en: 'Upload a photo of your question', ml: 'നിങ്ങളുടെ ചോദ്യത്തിന്റെ ഫോട്ടോ അപ്ലോഡ് ചെയ്യുക' },
  'doubt.uploadHint': { en: "I'll automatically read the text from your image and solve the question.", ml: 'ഞാൻ ചിത്രത്തിൽ നിന്ന് സ്വയമേവ വാചകം വായിച്ച് ചോദ്യം പരിഹരിക്കും.' },
  'doubt.chooseImage': { en: 'Choose image', ml: 'ചിത്രം തിരഞ്ഞെടുക്കുക' },
  'doubt.questionDetected': { en: 'Question detected', ml: 'ചോദ്യം കണ്ടെത്തി' },
  'doubt.reading': { en: 'Reading your question...', ml: 'നിങ്ങളുടെ ചോദ്യം വായിക്കുന്നു...' },
  'doubt.readingHint': { en: 'Extracting text from the image using OCR.', ml: 'OCR ഉപയോഗിച്ച് ചിത്രത്തിൽ നിന്ന് വാചകം എടുക്കുന്നു.' },
  'doubt.yourQuestion': { en: 'Your question', ml: 'നിങ്ങളുടെ ചോദ്യം' },
  'doubt.questionPlaceholder': { en: 'Type your question, or upload an image above and I\'ll extract the text automatically...', ml: 'നിങ്ങളുടെ ചോദ്യം ടൈപ്പ് ചെയ്യുക, അല്ലെങ്കിൽ മുകളിൽ ചിത്രം അപ്ലോഡ് ചെയ്യുക, ഞാൻ സ്വയമേവ വാചകം എടുക്കാം...' },
  'doubt.solving': { en: 'Solving your question...', ml: 'നിങ്ങളുടെ ചോദ്യം പരിഹരിക്കുന്നു...' },
  'doubt.solvingHint': { en: 'Extracting given values, identifying the formula, and calculating the answer.', ml: 'നൽകിയ വിലകൾ എടുത്ത്, സൂത്രവാക്യം കണ്ടെത്തി, ഉത്തരം കണക്കാക്കുന്നു.' },
  'doubt.solveQuestion': { en: 'Solve Question', ml: 'ചോദ്യം പരിഹരിക്കുക' },
  'doubt.solving2': { en: 'Solving...', ml: 'പരിഹരിക്കുന്നു...' },
  'doubt.speak': { en: 'Speak', ml: 'സംസാരിക്കുക' },
  'doubt.stop': { en: 'Stop', ml: 'നിർത്തുക' },
  'doubt.listening': { en: 'Listening...', ml: 'കേൾക്കുന്നു...' },
  'doubt.processing': { en: 'Processing...', ml: 'പ്രോസസ്സ് ചെയ്യുന്നു...' },
  'doubt.howItWorks': { en: 'How it works', ml: 'എങ്ങനെ പ്രവർത്തിക്കുന്നു' },
  'doubt.step1': { en: 'Upload a photo of your question.', ml: 'നിങ്ങളുടെ ചോദ്യത്തിന്റെ ഫോട്ടോ അപ്ലോഡ് ചെയ്യുക.' },
  'doubt.step2': { en: 'I automatically read the text using OCR.', ml: 'OCR ഉപയോഗിച്ച് ഞാൻ സ്വയമേവ വാചകം വായിക്കും.' },
  'doubt.step3': { en: 'Edit the extracted text if needed.', ml: 'ആവശ്യമെങ്കിൽ എടുത്ത വാചകം തിരുത്തുക.' },
  'doubt.step4': { en: 'Click Solve Question.', ml: 'ചോദ്യം പരിഹരിക്കുക ക്ലിക്ക് ചെയ്യുക.' },
  'doubt.step5': { en: 'I identify the formula and solve step by step.', ml: 'ഞാൻ സൂത്രവാക്യം കണ്ടെത്തി ഘട്ടം ഘട്ടമായി പരിഹരിക്കും.' },
  'doubt.step6': { en: 'You get the answer with a clear explanation.', ml: 'നിങ്ങൾക്ക് വ്യക്തമായ വിശദീകരണത്തോടെ ഉത്തരം ലഭിക്കും.' },
  'doubt.supportedTopics': { en: 'Supported Topics', ml: 'പിന്തുണയ്ക്കുന്ന വിഷയങ്ങൾ' },
  'doubt.tryExamples': { en: 'Try these examples', ml: 'ഈ ഉദാഹരണങ്ങൾ പരീക്ഷിക്കുക' },
  'doubt.imageReady': { en: 'Image uploaded — ready to solve', ml: 'ചിത്രം അപ്ലോഡ് ചെയ്തു — പരിഹരിക്കാൻ തയ്യാർ' },
  'doubt.chars': { en: 'characters', ml: 'പ്രതീകങ്ങൾ' },
  'doubt.ocrFailed': { en: "I couldn't clearly read this question. Please upload a clearer image or edit the extracted text.", ml: 'ഈ ചോദ്യം എനിക്ക് വ്യക്തമായി വായിക്കാൻ കഴിഞ്ഞില്ല. ദയവായി വ്യക്തമായ ചിത്രം അപ്ലോഡ് ചെയ്യുക അല്ലെങ്കിൽ എടുത്ത വാചകം തിരുത്തുക.' },
  'doubt.ocrFailedHint': { en: 'You can edit the text below and try solving again.', ml: 'താഴെയുള്ള വാചകം തിരുത്തി വീണ്ടും പരിഹരിക്കാൻ ശ്രമിക്കാം.' },
  'doubt.ocrError': { en: 'OCR processing failed. Please type the question manually.', ml: 'OCR പ്രോസസ്സിങ് പരാജയപ്പെട്ടു. ദയവായി ചോദ്യം സ്വയം ടൈപ്പ് ചെയ്യുക.' },
  'doubt.noSolution': { en: "I couldn't solve this specific question", ml: 'ഈ പ്രത്യേക ചോദ്യം പരിഹരിക്കാൻ കഴിഞ്ഞില്ല' },
  'doubt.tryAnother': { en: 'Try another question', ml: 'മറ്റൊരു ചോദ്യം പരീക്ഷിക്കുക' },
  'doubt.solveAnother': { en: 'Solve another question', ml: 'മറ്റൊരു ചോദ്യം പരിഹരിക്കുക' },
  'doubt.stepByStep': { en: 'Step-by-Step Solution', ml: 'ഘട്ടം ഘട്ടമായുള്ള പരിഹാരം' },
  'doubt.answerExplanation': { en: 'Answer & Explanation', ml: 'ഉത്തരവും വിശദീകരണവും' },
  'doubt.finalAnswer': { en: 'Final Answer', ml: 'അന്തിമ ഉത്തരം' },
  'doubt.keyAnswer': { en: 'Key Answer', ml: 'പ്രധാന ഉത്തരം' },
  'doubt.whyWorks': { en: 'Why this works', ml: 'ഇത് എന്തുകൊണ്ട് പ്രവർത്തിക്കുന്നു' },
  'doubt.multiDetected': { en: 'questions detected — each solved separately below.', ml: 'ചോദ്യങ്ങൾ കണ്ടെത്തി — ഓരോന്നും പ്രത്യേകമായി താഴെ പരിഹരിച്ചിരിക്കുന്നു.' },

  // ---- Focus Timer ----
  'focus.title': { en: 'Focus Timer', ml: 'ഫോക്കസ് ടൈമർ' },
  'focus.startFocus': { en: 'Start Focus', ml: 'ഫോക്കസ് തുടങ്ങുക' },
  'focus.pause': { en: 'Pause', ml: 'താൽക്കാലികമായി നിർത്തുക' },
  'focus.resume': { en: 'Resume', ml: 'തുടരുക' },
  'focus.endSession': { en: 'End Session', ml: 'സെഷൻ അവസാനിപ്പിക്കുക' },
  'focus.complete': { en: 'Focus Session Complete!', ml: 'ഫോക്കസ് സെഷൻ പൂർത്തിയായി!' },
  'focus.completeMsg': { en: 'Great work! You completed your focus session.', ml: 'നന്നായി! നിങ്ങൾ ഫോക്കസ് സെഷൻ പൂർത്തിയാക്കി.' },
  'focus.dndHint': { en: "For complete device-wide blocking, turn on your phone's Do Not Disturb / Focus Mode.", ml: 'ഫോണിലെ ബുദ്ധിമുട്ടുള്ള അറിയിപുകൾ പൂർണ്ണമായും തടയാൻ, നിങ്ങളുടെ ഫോണിൽ ഡു നോട്ട് ഡിസ്റ്റർബ് / ഫോക്കസ് മോഡ് ഓൺ ചെയ്യുക.' },
  'focus.focusActive': { en: 'Focus Mode Active', ml: 'ഫോക്കസ് മോഡ് സജീവം' },

  // ---- Dashboard ----
  'dash.welcomeBack': { en: 'Welcome back', ml: 'തിരികെ വന്നതിൽ സ്വാഗതം' },
  'dash.continueLearning': { en: 'Continue Learning', ml: 'പഠനം തുടരുക' },
  'dash.todayProgress': { en: "Today's Progress", ml: 'ഇന്നത്തെ പുരോഗതി' },
  'dash.quickAccess': { en: 'Quick Access', ml: 'വേഗമുള്ള പ്രവേശനം' },

  // ---- Profile ----
  'profile.title': { en: 'Profile', ml: 'പ്രൊഫൈൽ' },
  'profile.basicInfo': { en: 'Basic Information', ml: 'അടിസ്ഥാന വിവരങ്ങൾ' },
  'profile.studyPrefs': { en: 'Study Preferences', ml: 'പഠന മുൻഗണനകൾ' },
  'profile.preferredLanguage': { en: 'Preferred Language', ml: 'മുൻഗണനാ ഭാഷ' },
};

export function t(key: string, lang: Language): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[lang] || entry.en || key;
}

// Detect if text is Malayalam (Unicode range U+0D00–U+0D7F)
export function isMalayalamText(text: string): boolean {
  return /[\u0D00-\u0D7F]/.test(text);
}

// Get the BCP-47 tag for voice APIs
export function getVoiceLanguageTag(lang: Language): string {
  return lang === 'ml' ? 'ml-IN' : 'en-US';
}
