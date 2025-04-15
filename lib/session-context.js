"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { getSupabaseBrowser } from "@/lib/supabase";

const SessionContext = createContext({
  sessionId: null,
  userId: null,
  setSession: () => {},
});

export function SessionProvider({ children }) {
  const [sessionId, setSessionId] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const supabase = getSupabaseBrowser();

    async function initializeSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.id && session.user?.id) {
        setSessionId(session.id);
        setUserId(session.user.id);
      }
    }

    initializeSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.id) {
        setSessionId(session.id);
        setUserId(session.user.id);
      } else if (event === "SIGNED_OUT") {
        setSessionId(null);
        setUserId(null);
      }
    });

    return () => {
      authListener.subscription?.unsubscribe();
    };
  }, []);

  const setSession = (newSessionId, newUserId) => {
    setSessionId(newSessionId);
    setUserId(newUserId);
  };

  return (
    <SessionContext.Provider value={{ sessionId, userId, setSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  return useContext(SessionContext);
}