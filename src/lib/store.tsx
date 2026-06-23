"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import type {
  LoggedSession,
  RecurringHabit,
  PlanItem,
  PlanStatus,
  DeviceConnection,
  Profile,
  SportId,
} from "./types";
import { generateSessions, trackingSince } from "./mock/sessions";
import { MARTIJN_HABITS } from "./mock/habits";
import { defaultConnections } from "./mock/connections";
import { buildWeekPlan, type WeekDay } from "./mock/week-plan";
import { SPORT_IDS } from "./mock/sports";
import { createClient, isSupabaseConfigured } from "./supabase/client";
import * as q from "./db/queries";
import type { SupabaseClient } from "@supabase/supabase-js";

const STORAGE_KEY = "martijnfit:v2";

interface CoreState {
  profile: Profile;
  sessions: LoggedSession[];
  habits: RecurringHabit[];
  adHoc: PlanItem[];
  statusOverrides: Record<string, PlanStatus>;
  connections: DeviceConnection[];
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Demo seed (used when Supabase isn't configured) ─────────────────
function seed(today: Date): CoreState {
  const sessions = generateSessions(today);
  return {
    profile: {
      name: "Martijn",
      sports: [...SPORT_IDS],
      trackingSince: trackingSince(sessions),
      onboarded: true,
    },
    sessions,
    habits: MARTIJN_HABITS,
    adHoc: [],
    statusOverrides: {},
    connections: defaultConnections(today),
  };
}

const EMPTY: CoreState = {
  profile: { name: "Athlete", sports: [], trackingSince: "", onboarded: false },
  sessions: [],
  habits: [],
  adHoc: [],
  statusOverrides: {},
  connections: [],
};

/** Merge live connection status from the DB onto the static device catalog. */
function applyConnectionStatus(
  base: DeviceConnection[],
  status: Record<string, { connected: boolean; lastSynced?: string }>
): DeviceConnection[] {
  return base.map((c) => {
    const live = status[c.id];
    return live ? { ...c, connected: live.connected, lastSynced: live.lastSynced } : c;
  });
}

interface StoreValue extends CoreState {
  hydrated: boolean;
  today: Date;
  signedIn: boolean;
  addSession: (s: Omit<LoggedSession, "id">) => Promise<string> | string;
  updateSession: (id: string, patch: Partial<LoggedSession>) => void;
  deleteSession: (id: string) => void;
  setHabits: (h: RecurringHabit[]) => void;
  setPlanStatus: (itemId: string, status: PlanStatus) => void;
  addAdHoc: (item: {
    date: string;
    sport: SportId;
    startTime: string;
    endTime: string;
    label: string;
  }) => string;
  removeAdHoc: (id: string) => void;
  movePlanItem: (item: PlanItem, newDateISO: string) => void;
  getWeekPlan: (weekStart: Date) => WeekDay[];
  toggleConnection: (id: string) => void;
  completeOnboarding: (p: {
    name: string;
    sports: SportId[];
    habits: RecurringHabit[];
  }) => void;
  reload: () => Promise<void>;
  signOut: () => Promise<void>;
  resetDemo: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CoreState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [today, setToday] = useState<Date>(() => new Date());
  const [signedIn, setSignedIn] = useState(false);

  const supabaseRef = useRef<SupabaseClient | null>(null);
  const userIdRef = useRef<string | null>(null);
  const supa = isSupabaseConfigured;

  // ─── Hydration ─────────────────────────────────────────────────────
  useEffect(() => {
    const now = new Date();
    setToday(now);

    if (!supa) {
      // Demo mode — localStorage seed
      let next: CoreState | null = null;
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) next = JSON.parse(raw) as CoreState;
      } catch {
        next = null;
      }
      if (!next || !next.sessions?.length) next = seed(now);
      setState(next);
      setHydrated(true);
      return;
    }

    // Supabase mode
    const supabase = createClient();
    supabaseRef.current = supabase;

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userIdRef.current = user?.id ?? null;
      setSignedIn(!!user);
      if (user) {
        const data = await q.loadUserData(supabase);
        setState({
          profile: data.profile,
          sessions: data.sessions,
          habits: data.habits,
          adHoc: data.adHoc,
          statusOverrides: data.overrides,
          connections: applyConnectionStatus(
            defaultConnections(now),
            data.connections
          ),
        });
      } else {
        setState({ ...EMPTY, connections: defaultConnections(now) });
      }
      setHydrated(true);
    };
    load();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const newId = session?.user?.id ?? null;
      if (newId !== userIdRef.current) {
        userIdRef.current = newId;
        setSignedIn(!!newId);
        setHydrated(false);
        load();
      }
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist demo state to localStorage
  useEffect(() => {
    if (!hydrated || supa) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, hydrated, supa]);

  const reload = useCallback(async () => {
    const supabase = supabaseRef.current;
    if (!supa || !supabase || !userIdRef.current) return;
    const data = await q.loadUserData(supabase);
    setState((p) => ({
      profile: data.profile,
      sessions: data.sessions,
      habits: data.habits,
      adHoc: data.adHoc,
      statusOverrides: data.overrides,
      connections: applyConnectionStatus(p.connections, data.connections),
    }));
  }, [supa]);

  // ─── Mutators (optimistic local + write-through to Supabase) ────────
  const addSession = useCallback(
    (s: Omit<LoggedSession, "id">): Promise<string> | string => {
      const supabase = supabaseRef.current;
      if (supa && supabase) {
        const tempId = uid("ses");
        setState((p) => ({ ...p, sessions: [...p.sessions, { ...s, id: tempId }] }));
        return q.insertSession(supabase, s).then((created) => {
          if (created) {
            setState((p) => ({
              ...p,
              sessions: p.sessions.map((x) => (x.id === tempId ? created : x)),
            }));
            return created.id;
          }
          return tempId;
        });
      }
      const id = uid("ses");
      setState((p) => ({ ...p, sessions: [...p.sessions, { ...s, id }] }));
      return id;
    },
    [supa]
  );

  const updateSession = useCallback(
    (id: string, patch: Partial<LoggedSession>) => {
      setState((p) => ({
        ...p,
        sessions: p.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      }));
      const supabase = supabaseRef.current;
      if (supa && supabase) void q.updateSessionRow(supabase, id, patch);
    },
    [supa]
  );

  const deleteSession = useCallback(
    (id: string) => {
      setState((p) => ({ ...p, sessions: p.sessions.filter((s) => s.id !== id) }));
      const supabase = supabaseRef.current;
      if (supa && supabase) void q.deleteSessionRow(supabase, id);
    },
    [supa]
  );

  const setHabits = useCallback(
    (h: RecurringHabit[]) => {
      setState((p) => ({ ...p, habits: h }));
      const supabase = supabaseRef.current;
      if (supa && supabase && userIdRef.current)
        void q.replaceHabits(supabase, userIdRef.current, h);
    },
    [supa]
  );

  const setPlanStatus = useCallback(
    (itemId: string, status: PlanStatus) => {
      setState((p) => ({
        ...p,
        statusOverrides: { ...p.statusOverrides, [itemId]: status },
      }));
      const supabase = supabaseRef.current;
      if (supa && supabase && userIdRef.current)
        void q.upsertOverride(supabase, userIdRef.current, itemId, status);
    },
    [supa]
  );

  const addAdHoc = useCallback(
    (item: {
      date: string;
      sport: SportId;
      startTime: string;
      endTime: string;
      label: string;
    }): string => {
      const id = uid("adhoc");
      const newItem: PlanItem = { id, status: "confirmed", origin: "adhoc", ...item };
      setState((p) => ({ ...p, adHoc: [...p.adHoc, newItem] }));
      const supabase = supabaseRef.current;
      if (supa && supabase) {
        void q.insertAdHoc(supabase, item).then((created) => {
          if (created)
            setState((p) => ({
              ...p,
              adHoc: p.adHoc.map((x) => (x.id === id ? created : x)),
            }));
        });
      }
      return id;
    },
    [supa]
  );

  const removeAdHoc = useCallback(
    (id: string) => {
      setState((p) => ({ ...p, adHoc: p.adHoc.filter((i) => i.id !== id) }));
      const supabase = supabaseRef.current;
      if (supa && supabase) void q.deleteAdHoc(supabase, id);
    },
    [supa]
  );

  const movePlanItem = useCallback(
    (item: PlanItem, newDateISO: string) => {
      const supabase = supabaseRef.current;
      if (item.origin === "habit") {
        setPlanStatus(item.id, "skipped");
        addAdHoc({
          date: newDateISO,
          sport: item.sport,
          startTime: item.startTime,
          endTime: item.endTime,
          label: item.label,
        });
      } else {
        setState((p) => ({
          ...p,
          adHoc: p.adHoc.map((i) => (i.id === item.id ? { ...i, date: newDateISO } : i)),
        }));
        if (supa && supabase) void q.updateAdHocDate(supabase, item.id, newDateISO);
      }
    },
    [supa, setPlanStatus, addAdHoc]
  );

  const getWeekPlan = useCallback(
    (weekStart: Date): WeekDay[] =>
      buildWeekPlan({
        weekStart,
        habits: state.habits,
        adHoc: state.adHoc,
        statusOverrides: state.statusOverrides,
        sessions: state.sessions,
        today,
      }),
    [state.habits, state.adHoc, state.statusOverrides, state.sessions, today]
  );

  const toggleConnection = useCallback((id: string) => {
    setState((p) => ({
      ...p,
      connections: p.connections.map((c) =>
        c.id === id ? { ...c, connected: !c.connected } : c
      ),
    }));
  }, []);

  const completeOnboarding = useCallback(
    (np: { name: string; sports: SportId[]; habits: RecurringHabit[] }) => {
      setState((p) => ({
        ...p,
        profile: { ...p.profile, name: np.name, sports: np.sports, onboarded: true },
        habits: np.habits,
      }));
      const supabase = supabaseRef.current;
      if (supa && supabase && userIdRef.current) {
        void q.updateProfile(supabase, {
          name: np.name,
          sports: np.sports,
          onboarded: true,
        });
        void q.replaceHabits(supabase, userIdRef.current, np.habits);
      }
    },
    [supa]
  );

  const resetDemo = useCallback(() => {
    if (supa) {
      void reload();
      return;
    }
    const fresh = seed(new Date());
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch {
      /* ignore */
    }
    setState(fresh);
  }, [supa, reload]);

  const signOut = useCallback(async () => {
    const supabase = supabaseRef.current;
    if (supa && supabase) {
      await supabase.auth.signOut();
      window.location.href = "/login";
    }
  }, [supa]);

  const value: StoreValue = {
    ...state,
    hydrated,
    today,
    signedIn,
    addSession,
    updateSession,
    deleteSession,
    setHabits,
    setPlanStatus,
    addAdHoc,
    removeAdHoc,
    movePlanItem,
    getWeekPlan,
    toggleConnection,
    completeOnboarding,
    reload,
    signOut,
    resetDemo,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useAppStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}
