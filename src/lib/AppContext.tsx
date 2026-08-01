import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadJSON, removeKey, saveJSON, STORAGE_KEYS } from './storage';
import { isPremium as checkIsPremium } from './subscription';
import type { User, StudentProfile } from './types';

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
  refreshPremium: () => Promise<void>;
  login: (email: string, password: string) => { ok: boolean; error?: string };
  signup: (name: string, email: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  completeOnboarding: (profile: Omit<StudentProfile, 'userId' | 'onboardingCompleted' | 'createdAt' | 'updatedAt'>) => void;
  updateProfile: (updates: Partial<StudentProfile>) => void;
  page: Page;
  navigate: (page: Page) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function emailToUserId(email: string): string {
  return email.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function loadProfile(userId: string): StudentProfile | null {
  const all = loadJSON<Record<string, StudentProfile>>(STORAGE_KEYS.profiles, {});
  return all[userId] ?? null;
}

function saveProfile(profile: StudentProfile): void {
  const all = loadJSON<Record<string, StudentProfile>>(STORAGE_KEYS.profiles, {});
  all[profile.userId] = profile;
  saveJSON(STORAGE_KEYS.profiles, all);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [page, setPage] = useState<Page>({ name: 'landing' });
  const [premium, setPremium] = useState(false);
  const [premiumLoading, setPremiumLoading] = useState(true);

  // Restore session on first load — check both user and onboarding state.
  useEffect(() => {
    const savedUser = loadJSON<User | null>(STORAGE_KEYS.currentUser, null);
    if (savedUser) {
      const userId = emailToUserId(savedUser.email);
      const savedProfile = loadProfile(userId);
      setUser(savedUser);
      setProfile(savedProfile);
      // First login without onboarding → onboarding. Returning user → dashboard.
      if (savedProfile && savedProfile.onboardingCompleted) {
        setPage({ name: 'dashboard' });
      } else {
        setPage({ name: 'onboarding' });
      }
    } else {
      setPremiumLoading(false);
    }
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

  const login = useCallback((email: string, password: string) => {
    const users = loadJSON<User[]>(STORAGE_KEYS.users, []);
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!found) return { ok: false, error: 'No account found with that email. Please sign up first.' };
    if (found.password !== password) return { ok: false, error: 'Incorrect password. Please try again.' };
    const userId = emailToUserId(found.email);
    const existingProfile = loadProfile(userId);
    setUser(found);
    setProfile(existingProfile);
    saveJSON(STORAGE_KEYS.currentUser, found);
    if (existingProfile && existingProfile.onboardingCompleted) {
      setPage({ name: 'dashboard' });
    } else {
      setPage({ name: 'onboarding' });
    }
    return { ok: true };
  }, []);

  const signup = useCallback((name: string, email: string, password: string) => {
    const users = loadJSON<User[]>(STORAGE_KEYS.users, []);
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, error: 'An account with this email already exists. Please log in.' };
    }
    const newUser: User = { name, email, password };
    users.push(newUser);
    saveJSON(STORAGE_KEYS.users, users);
    setUser(newUser);
    setProfile(null);
    saveJSON(STORAGE_KEYS.currentUser, newUser);
    // New signup → always go to onboarding.
    setPage({ name: 'onboarding' });
    return { ok: true };
  }, []);

  const completeOnboarding = useCallback(
    (data: Omit<StudentProfile, 'userId' | 'onboardingCompleted' | 'createdAt' | 'updatedAt'>) => {
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
      saveProfile(newProfile);
      setProfile(newProfile);
      setPage({ name: 'dashboard' });
    },
    [user],
  );

  const updateProfile = useCallback(
    (updates: Partial<StudentProfile>) => {
      if (!profile || !user) return;
      const updated: StudentProfile = {
        ...profile,
        ...updates,
        updatedAt: Date.now(),
      };
      saveProfile(updated);
      setProfile(updated);
    },
    [profile, user],
  );

  const logout = useCallback(() => {
    setUser(null);
    setProfile(null);
    removeKey(STORAGE_KEYS.currentUser);
    setPage({ name: 'landing' });
  }, []);

  const navigate = useCallback((next: Page) => {
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({ user, profile, isPremium: premium, premiumLoading, refreshPremium, login, signup, logout, completeOnboarding, updateProfile, page, navigate }),
    [user, profile, premium, premiumLoading, refreshPremium, login, signup, logout, completeOnboarding, updateProfile, page, navigate],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
