// lib/session-context.js
"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { getSupabaseBrowser } from "@/lib/supabase";

const SessionContext = createContext({
  sessionId: null,
  userId: null,
  role: null,
  isInitialized: false,
  setSession: () => {},
});

export function SessionProvider({ children }) {
  const [sessionId, setSessionId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [role, setRole] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const lastSessionIdRef = useRef(null);
  const sessionCacheRef = useRef(null);

  useEffect(() => {
    const supabase = getSupabaseBrowser();

    async function initializeSession() {
      try {
        // Skip if on auth routes
        if (typeof window !== "undefined" && window.location.pathname.startsWith("/auth")) {
          console.log("Skipping session initialization on auth route");
          setIsInitialized(true);
          return;
        }

        // Check cache first
        if (sessionCacheRef.current) {
          const session = sessionCacheRef.current;
          if (session?.id && session.user?.id && session.id !== lastSessionIdRef.current) {
            lastSessionIdRef.current = session.id;
            setSessionId(session.id);
            setUserId(session.user.id);
            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("role")
              .eq("id", session.user.id)
              .single();
            if (profileError) {
              console.error("Error fetching profile:", profileError.message);
              setRole(null);
            } else {
              setRole(profile?.role || null);
            }
            console.log("Session initialized from cache:", { sessionId: session.id, userId: session.user.id, role: profile?.role });
          }
          setIsInitialized(true);
          return;
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Error fetching session:", error.message);
          if (error.message.includes("Invalid Refresh Token")) {
            setSessionId(null);
            setUserId(null);
            setRole(null);
            sessionCacheRef.current = null;
          }
          setIsInitialized(true);
          return;
        }

        sessionCacheRef.current = session;
        if (session?.id && session.user?.id && session.id !== lastSessionIdRef.current) {
          lastSessionIdRef.current = session.id;
          setSessionId(session.id);
          setUserId(session.user.id);
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();
          if (profileError) {
            console.error("Error fetching profile:", profileError.message);
            setRole(null);
          } else {
            setRole(profile?.role || null);
          }
          console.log("Session initialized:", { sessionId: session.id, userId: session.user.id, role: profile?.role });
        }
        setIsInitialized(true);
      } catch (error) {
        console.error("Initialization error:", error.message);
        setIsInitialized(true);
      }
    }

    initializeSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change:", event, !!session);
      if (event === "SIGNED_IN" && session?.id && session.id !== lastSessionIdRef.current) {
        sessionCacheRef.current = session;
        lastSessionIdRef.current = session.id;
        setSessionId(session.id);
        setUserId(session.user.id);
        supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single()
          .then(({ data: profile, error }) => {
            if (error) {
              console.error("Error fetching profile on auth change:", error.message);
              setRole(null);
            } else {
              setRole(profile?.role || null);
              console.log("Role updated:", profile?.role);
            }
          });
      } else if (event === "SIGNED_OUT") {
        sessionCacheRef.current = null;
        lastSessionIdRef.current = null;
        setSessionId(null);
        setUserId(null);
        setRole(null);
      }
    });

    return () => {
      authListener.subscription?.unsubscribe();
      console.log("Auth listener unsubscribed");
    };
  }, []);

  const setSession = (newSessionId, newUserId, newRole) => {
    lastSessionIdRef.current = newSessionId;
    setSessionId(newSessionId);
    setUserId(newUserId);
    setRole(newRole);
    sessionCacheRef.current = newSessionId ? { id: newSessionId, user: { id: newUserId } } : null;
  };

  return (
    <SessionContext.Provider value={{ sessionId, userId, role, isInitialized, setSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  return useContext(SessionContext);
}