// Reusable speech-to-text hook using the Web Speech API.
// Supports English (en-US) and Malayalam (ml-IN) recognition.
// Returns recognized text without translating it.

import { useCallback, useEffect, useRef, useState } from 'react';

type RecognitionState = 'idle' | 'listening' | 'processing' | 'error' | 'denied';

interface SpeechRecognitionResult {
  transcript: string;
}

interface UseVoiceInputOptions {
  language?: string;
  onTranscript?: (text: string) => void;
  continuous?: boolean;
}

interface UseVoiceInputReturn {
  state: RecognitionState;
  transcript: string;
  error: string | null;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
  setTranscript: (text: string) => void;
}

// Minimal type definitions for the Web Speech API (not in standard TS lib)
interface ISpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: {
    length: number;
    [index: number]: {
      length: number;
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

type SpeechRecognitionConstructor = new () => ISpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const { language = 'en-US', onTranscript, continuous = false } = options;
  const [state, setState] = useState<RecognitionState>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const shouldRestartRef = useRef(false);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const isSupported = getSpeechRecognition() !== null;

  const cleanup = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.onstart = null;
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const start = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) {
      setError('Speech recognition is not supported in this browser.');
      setState('error');
      return;
    }

    // Clean up any existing instance
    cleanup();
    setError(null);
    setTranscript('');
    setState('listening');

    const recognition = new SR();
    recognition.lang = language;
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setState('listening');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = '';
      let interimText = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      if (finalText) {
        const trimmed = finalText.trim();
        setTranscript(trimmed);
        setState('processing');
        // Small delay so the "processing" state is visible
        setTimeout(() => {
          setState('idle');
          onTranscriptRef.current?.(trimmed);
        }, 300);
      } else if (interimText) {
        setTranscript(interimText);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Microphone permission is required for voice input.');
        setState('denied');
      } else if (event.error === 'no-speech') {
        setError("Sorry, I couldn't understand that. Please try again.");
        setState('error');
      } else if (event.error === 'network') {
        setError('Network error during speech recognition. Please check your connection.');
        setState('error');
      } else {
        setError(`Speech recognition error: ${event.error}`);
        setState('error');
      }
    };

    recognition.onend = () => {
      // If we were listening and it ended without a final result, go back to idle
      setState((s) => (s === 'listening' ? 'idle' : s));
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      // Recognition may throw if already started — ignore
      setState('idle');
    }
  }, [language, continuous, cleanup]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
    setState('idle');
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setState('idle');
    setTranscript('');
    setError(null);
  }, [cleanup]);

  return {
    state,
    transcript,
    error,
    isSupported,
    start,
    stop,
    reset,
    setTranscript,
  };
}
