import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Status = "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  status: Status;
}

const AuthCtx = createContext<AuthState>({
  user: null,
  session: null,
  loading: true,
  status: "loading",
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    status: "loading",
  });

  useEffect(() => {
    let mounted = true;
    const apply = (session: Session | null) => {
      if (!mounted) return;
      const user = session?.user ?? null;
      setState({
        user,
        session,
        loading: false,
        status: user ? "authenticated" : "unauthenticated",
      });
    };

    // 1) Subscribe FIRST so we don't miss the initial event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => apply(session),
    );

    // 2) Hydrate from storage.
    supabase.auth.getSession().then(({ data }) => apply(data.session));

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return <AuthCtx.Provider value={state}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
