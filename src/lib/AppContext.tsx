import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadJSON, removeKey, saveJSON, STORAGE_KEYS } from './storage';
import { isPremium as checkIsPremium, hasFeatureAccess as checkFeatureAccess } from './subscription';
import type { Language } from './i18n';
import type { TutorContextPayload } from './textbooks';
export type { TutorContextPayload };
import type { User, StudentProfile } from './types';
import {
  signup as authSignup,
  login as authLogin,
  verifySession,
  logout as authLogout,
  saveSession,
  getSessionToken,
  clearSession,
  fetchProfile,
  saveProfileToBackend,
  loadLocalProfile,
} from './authService';

// Module-level pending tutor context — set by Textbook Hub, consumed by AI Tutor on mount.
let _pendingTutorContext: TutorContextPayload | null = null;
export function setPendingTutorContext(ctx: TutorContextPayload | null) {
  _pendingTutorContext = ctx;
}
export function consumePendingTutorContext(): TutorContextPayload | null {
  const ctx = _pendingTutorContext;
  _pendingTutorContext = null;
  return ctx;
}

type Page =
  | { name: 'landing' }
  | { name: 'login' }
  | { name: 'signup' }
  | { name: 'onboarding' }
  | { name: 'dashboard' }
  | { name: 'profile' }
  | { name: 'feature'; id: string }
  | { name: 'parent-login' }
  | { name: 'parent-dashboard' };

interface AppContextValue {
  user: User | null;
  profile: StudentProfile | null;
  isPremium: boolean;
  premiumLoading: boolean;
  authLoading: boolean;
  refreshPremium: () => Promise<void>;
  hasFeatureAccess: (featureId: string) => Promise<boolean>;
  language: Language;
  setLanguage: (lang: Language) => void;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string; accountExists?: boolean }>;
  logout: () => Promise<void>;
  completeOnboarding: (profile: Omit<StudentProfile, 'userId' | 'onboardingCompleted' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProfile: (updates: Partial<StudentProfile>) => Promise<void>;
  page: Page;
  navigate: (page: Page) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function emailToUserId(email: string): string {
  return email.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [page, setPage] = useState<Page>({ name: 'landing' });
  const [premium, setPremium] = useState(false);
  const [premiumLoading, setPremiumLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [language, setLanguageState] = useState<Language>(() => {
    return loadJSON<Language>(STORAGE_KEYS.language, 'en');
  });

  const updateProfile = useCallback(
    async (updates: Partial<StudentProfile>) => {
      if (!profile || !user) return;
      const updated: StudentProfile = {
        ...profile,
        ...updates,
        updatedAt: Date.now(),
      };
      setProfile(updated);
      await saveProfileToBackend(updated);
    },
    [profile, user],
  );

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    saveJSON(STORAGE_KEYS.language, lang);
    if (profile) {
      updateProfile({ preferredLanguage: lang });
    }
  }, [profile, updateProfile]);

  // Restore language from profile on login
  useEffect(() => {
    if (profile?.preferredLanguage) {
      setLanguageState(profile.preferredLanguage);
      saveJSON(STORAGE_KEYS.language, profile.preferredLanguage);
    }
  }, [profile?.preferredLanguage]);

  // ---- Session restoration on app startup ----
  // Check for a valid session token and restore the user if valid.
  useEffect(() => {
    const restoreSession = async () => {
      setAuthLoading(true);
      const sessionToken = getSessionToken();
      const savedUser = loadJSON<User | null>(STORAGE_KEYS.currentUser, null);

      if (sessionToken && savedUser) {
        // Verify the session token with the backend
        const result = await verifySession(sessionToken);
        if (result.valid && result.user) {
          const restoredUser: User = { email: result.user.email, name: result.user.name };
          const userId = emailToUserId(restoredUser.email);
          // Fetch profile from backend, fall back to local
          let backendProfile = await fetchProfile(userId);
          if (!backendProfile) {
            const local = loadLocalProfile(userId);
            if (local) {
              saveProfileToBackend(local).catch(() => {});
              backendProfile = local;
            }
          }
          setUser(restoredUser);
          setProfile(backendProfile);
          saveJSON(STORAGE_KEYS.currentUser, restoredUser);
          if (backendProfile && backendProfile.onboardingCompleted) {
            setPage({ name: 'dashboard' });
          } else {
            setPage({ name: 'onboarding' });
          }
          setAuthLoading(false);
          return;
        }
        // Session invalid/expired — clear it
        clearSession();
      } else if (savedUser) {
        // Old-style localStorage session without a backend token — try to migrate.
        // Check if this email has a backend account by attempting a silent verify.
        // If not, just clear and show landing.
        clearSession();
      }

      setAuthLoading(false);
    };

    restoreSession();
  }, []);

  // Check premium status when user changes.
  useEffect(() => {
    if (!user) {
      setPremium(false);
      setPremiumLoading(false);
      return;
    }
    setPremiumLoading(true);
    checkIsPremium().then((result) => {
      setPremium(result);
      setPremiumLoading(false);
    }).catch(() => {
      setPremium(false);
      setPremiumLoading(false);
    });
  }, [user]);

  const refreshPremium = useCallback(async () => {
    setPremiumLoading(true);
    try {
      const result = await checkIsPremium();
      setPremium(result);
    } catch {
      setPremium(false);
    }
    setPremiumLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    const result = await authLogin(email, password);
    if (!result.ok || !result.user || !result.sessionToken) {
      return { ok: false, error: result.error ?? 'Login failed.' };
    }

    const authUser: User = { email: result.user.email, name: result.user.name };
    const userId = emailToUserId(authUser.email);

    // Fetch existing profile from backend
    let existingProfile = await fetchProfile(userId);
    if (!existingProfile) {
      // Try local fallback (migration from old localStorage)
      const local = loadLocalProfile(userId);
      if (local) {
        saveProfileToBackend(local).catch(() => {});
        existingProfile = local;
      }
    }

    setUser(authUser);
    setProfile(existingProfile);
    saveSession(authUser, result.sessionToken);

    if (existingProfile && existingProfile.onboardingCompleted) {
      setPage({ name: 'dashboard' });
    } else {
      setPage({ name: 'onboarding' });
    }

    return { ok: true };
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string): Promise<{ ok: boolean; error?: string; accountExists?: boolean }> => {
    const result = await authSignup(name, email, password);
    if (!result.ok || !result.user || !result.sessionToken) {
      return { ok: false, error: result.error ?? 'Sign up failed.', accountExists: result.accountExists };
    }

    const authUser: User = { email: result.user.email, name: result.user.name };
    setUser(authUser);
    setProfile(null);
    saveSession(authUser, result.sessionToken);
    setPage({ name: 'onboarding' });

    return { ok: true };
  }, []);

  const completeOnboarding = useCallback(
    async (data: Omit<StudentProfile, 'userId' | 'onboardingCompleted' | 'createdAt' | 'updatedAt'>) => {
      if (!user) return;
      const userId = emailToUserId(user.email);
      const now = Date.now();
      const newProfile: StudentProfile = {
        ...data,
        userId,
        onboardingCompleted: true,
        createdAt: now,
        updatedAt: now,
      };
      await saveProfileToBackend(newProfile);
      setProfile(newProfile);
      setPage({ name: 'dashboard' });
    },
    [user],
  );

  const logout = useCallback(async () => {
    const sessionToken = getSessionToken();
    await authLogout(sessionToken);
    clearSession();
    setUser(null);
    setProfile(null);
    setPremium(false);
    setPage({ name: 'landing' });
  }, []);

  const navigate = useCallback((next: Page) => {
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const hasFeatureAccess = useCallback(async (featureId: string) => {
    if (premium) return true;
    return checkFeatureAccess(featureId);
  }, [premium]);

  const value = useMemo<AppContextValue>(
    () => ({ user, profile, isPremium: premium, premiumLoading, authLoading, refreshPremium, hasFeatureAccess, language, setLanguage, login, signup, logout, completeOnboarding, updateProfile, page, navigate }),
    [user, profile, premium, premiumLoading, authLoading, refreshPremium, hasFeatureAccess, language, setLanguage, login, signup, logout, completeOnboarding, updateProfile, page, navigate],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
