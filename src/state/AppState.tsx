import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface ChildProfileInput {
  nickname: string;
  grade: "G1" | "G2" | "G3" | "G4" | "G5" | "G6";
  textbookVersion: string;
  interests: string[];
  readingLevel: "normal" | "struggling" | "very_struggling";
}

interface AppStateValue {
  isHydrated: boolean;
  onboardingCompleted: boolean;
  parentId: string | null;
  childId: string | null;
  childProfile: ChildProfileInput | null;
  setParentId: (id: string | null) => void;
  completeOnboarding: (profile: ChildProfileInput, childId: string) => void;
  clearChildProfile: () => void;
  clearAllState: () => void;
}

const AppStateContext = createContext<AppStateValue | null>(null);
const APP_STATE_KEY = "yuwen-app-state-v1";

export function AppStateProvider({ children }: PropsWithChildren) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);
  const [childId, setChildId] = useState<string | null>(null);
  const [childProfile, setChildProfile] = useState<ChildProfileInput | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const raw = await AsyncStorage.getItem(APP_STATE_KEY);
        if (!raw || !alive) return;
        const parsed = JSON.parse(raw) as {
          onboardingCompleted: boolean;
          parentId: string | null;
          childId?: string | null;
          childProfile: ChildProfileInput | null;
        };
        setOnboardingCompleted(Boolean(parsed.onboardingCompleted));
        setParentId(parsed.parentId ?? null);
        setChildId(parsed.childId ?? null);
        setChildProfile(parsed.childProfile ?? null);
      } catch {
        // Keep default state when local data is corrupted.
      } finally {
        if (alive) setIsHydrated(true);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    AsyncStorage.setItem(
      APP_STATE_KEY,
      JSON.stringify({
        onboardingCompleted,
        parentId,
        childId,
        childProfile,
      }),
    ).catch(() => {
      // Ignore write failures in local persistence.
    });
  }, [childId, childProfile, isHydrated, onboardingCompleted, parentId]);

  const value = useMemo<AppStateValue>(
    () => ({
      isHydrated,
      onboardingCompleted,
      parentId,
      childId,
      childProfile,
      setParentId,
      completeOnboarding: (profile, nextChildId) => {
        setChildProfile(profile);
        setChildId(nextChildId);
        setOnboardingCompleted(true);
      },
      clearChildProfile: () => {
        setChildProfile(null);
        setChildId(null);
        setOnboardingCompleted(false);
      },
      clearAllState: () => {
        setParentId(null);
        setChildProfile(null);
        setChildId(null);
        setOnboardingCompleted(false);
      },
    }),
    [childId, childProfile, isHydrated, onboardingCompleted, parentId],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return ctx;
}
