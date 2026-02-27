"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";
import type { HrProfile } from "@/lib/database.types";
import { cacheSet, cacheGet } from "@/lib/offline-cache";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: HrProfile | null;
  loading: boolean;
  signIn: (phone: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const COOKIE_NAME = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/\/\/(.*?)\.supabase/)?.[1] ?? "app"}-auth-token`;

function setAuthCookie(session: Session | null) {
  if (typeof document === "undefined") return;
  if (session) {
    const value = btoa(JSON.stringify(session));
    // Use expires_at (UTC epoch) to compute actual remaining lifetime
    const remainingSeconds = session.expires_at
      ? Math.max(0, session.expires_at - Math.floor(Date.now() / 1000))
      : (session.expires_in ?? 3600);
    document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${remainingSeconds}; SameSite=Lax`;
  } else {
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<HrProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    // Restore cached profile immediately for offline/instant display
    const cached = cacheGet<HrProfile>(userId, "profile");
    if (cached) setProfile(cached.data);

    try {
      const { data } = await supabase
        .from("hr_profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (data) {
        setProfile(data);
        cacheSet(userId, "profile", data);
      }
    } catch {
      // Offline — cached profile (if any) is already set above
    }
  }, []);

  useEffect(() => {
    // Get initial session and sync cookie for middleware
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setAuthCookie(s);
      if (s?.user) fetchProfile(s.user.id);
      setLoading(false);
    });

    // Listen for auth changes and sync cookie for middleware
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setAuthCookie(s);
      if (s?.user) {
        fetchProfile(s.user.id);
      } else {
        setProfile(null);
        // If signed out remotely (another device logged in), redirect to login
        if (event === "SIGNED_OUT") {
          try {
            const intentional = sessionStorage.getItem("user_logout");
            sessionStorage.removeItem("user_logout");
            if (!intentional) {
              window.location.href = "/login";
            }
          } catch {
            window.location.href = "/login";
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = useCallback(async (phone: string, password: string) => {
    const email = `${phone}@uds.hr`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    // Kick out all other sessions so only one device is logged in at a time
    await supabase.auth.signOut({ scope: "others" });
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    // Flag so onAuthStateChange knows this was intentional (not a remote kick)
    try { sessionStorage.setItem("user_logout", "true"); } catch { /* ignore */ }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
