"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser, createSession, extendSession, invalidateSession } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export default function SessionManager() {
  const router = useRouter();
  const [sessionExpiring, setSessionExpiring] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [expiresAt, setExpiresAt] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const fetchSessionExpiration = useCallback(async (retryCount = 0) => {
    try {
      const supabase = getSupabaseBrowser();
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session || !session.user?.id) {
        console.error("Invalid session data:", {
          error: sessionError?.message,
          hasSession: !!session,
          hasSessionId: !!session?.id,
          hasUserId: !!session?.user?.id,
        });
        if (isHydrated && retryCount >= 2) {
          await supabase.auth.signOut();
          router.push("/auth/login");
        }
        return null;
      }

      let sessionId = session.id;
      if (!sessionId) {
        console.warn("No session ID, checking public.sessions");
        const { data, error } = await supabase
          .from("sessions")
          .select("id, expires_at, is_valid")
          .eq("user_id", session.user.id)
          .eq("is_valid", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error || !data?.id) {
          console.error("No valid session found:", error?.message);
          if (retryCount < 2) {
            sessionId = uuidv4();
            const newExpiresAt = await createSession(
              supabase,
              sessionId,
              session.user.id,
              navigator.userAgent
            );
            console.log("Session created:", { sessionId, expires_at: newExpiresAt });
            setExpiresAt(newExpiresAt);
            return newExpiresAt;
          }
          await supabase.auth.signOut();
          router.push("/auth/login");
          return null;
        }
        sessionId = data.id;
        const expiration = new Date(data.expires_at);
        if (!data.is_valid) {
          console.log("Session invalid:", data);
          await invalidateSession(supabase, sessionId, session.user.id);
          await supabase.auth.signOut();
          router.push("/auth/login");
          return null;
        }
        console.log("Session recovered:", { sessionId, expires_at: expiration });
        setExpiresAt(expiration);
        return expiration;
      }

      console.log("Session found:", {
        sessionId: session.id,
        userId: session.user.id,
        expiresIn: session.expires_in,
      });

      const { data, error } = await supabase
        .from("sessions")
        .select("expires_at, last_activity, is_valid")
        .eq("id", sessionId)
        .eq("user_id", session.user.id)
        .single();

      if (error) {
        console.error("Session fetch error:", error);
        if (error.code === "PGRST116" && retryCount < 2) {
          const newExpiresAt = await createSession(
            supabase,
            sessionId,
            session.user.id,
            navigator.userAgent
          );
          console.log("Session created:", { sessionId, expires_at: newExpiresAt });
          setExpiresAt(newExpiresAt);
          return newExpiresAt;
        }
        if (retryCount < 2) {
          return fetchSessionExpiration(retryCount + 1);
        }
        return null;
      }

      if (!data?.is_valid) {
        console.log("Session invalid:", data);
        await invalidateSession(supabase, sessionId, session.user.id);
        if (isHydrated) {
          await supabase.auth.signOut();
          router.push("/auth/login");
        }
        return null;
      }

      const expiration = new Date(data.expires_at);
      console.log("Session fetched:", {
        sessionId,
        expires_at: expiration,
        is_valid: data.is_valid,
      });
      setExpiresAt(expiration);
      return expiration;
    } catch (error) {
      console.error("Error fetching session expiration:", error);
      if (retryCount < 2) {
        return fetchSessionExpiration(retryCount + 1);
      }
      return null;
    }
  }, [isHydrated, router]);

  const handleExtendSession = async () => {
    try {
      const supabase = getSupabaseBrowser();
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session || !session.user?.id) {
        console.error("Invalid session for extend:", {
          error: sessionError?.message,
          hasSession: !!session,
          hasSessionId: !!session?.id,
          hasUserId: !!session?.user?.id,
        });
        if (isHydrated) {
          await supabase.auth.signOut();
          router.push("/auth/login");
        }
        return;
      }

      let sessionId = session.id;
      if (!sessionId) {
        const { data, error } = await supabase
          .from("sessions")
          .select("id")
          .eq("user_id", session.user.id)
          .eq("is_valid", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error || !data?.id) {
          console.error("No valid session for extend:", error?.message);
          await supabase.auth.signOut();
          router.push("/auth/login");
          return;
        }
        sessionId = data.id;
      }

      const { expiresAt: newExpiresAt } = await extendSession(supabase, sessionId, session.user.id);
      console.log("Session extended:", { sessionId, newExpiresAt });
      setExpiresAt(new Date(newExpiresAt));
      setSessionExpiring(false);
      setCountdown(30);
    } catch (error) {
      console.error("Error extending session:", error);
      await handleLogout();
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseBrowser();
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (!sessionError && session?.user?.id) {
        await invalidateSession(supabase, session?.id, session.user.id);
        console.log("Session logged out:", { sessionId: session?.id, userId: session.user.id });
      } else {
        console.error("No valid session for logout:", sessionError?.message);
      }

      await supabase.auth.signOut();
      if (isHydrated) {
        router.push("/auth/login?error=session_expired");
      }
    } catch (error) {
      console.error("Error logging out:", error);
      if (isHydrated) {
        router.push("/auth/login");
      }
    }
  };

  const updateActivity = useCallback(async () => {
    try {
      const supabase = getSupabaseBrowser();
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session || !session.user?.id) {
        console.error("Invalid session for activity update:", {
          error: sessionError?.message,
          hasSession: !!session,
          hasSessionId: !!session?.id,
          hasUserId: !!session?.user?.id,
        });
        return;
      }

      let sessionId = session.id;
      if (!sessionId) {
        const { data, error } = await supabase
          .from("sessions")
          .select("id")
          .eq("user_id", session.user.id)
          .eq("is_valid", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error || !data?.id) {
          console.error("No valid session for activity update:", error?.message);
          return;
        }
        sessionId = data.id;
      }

      const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const { error: updateError } = await supabase
        .from("sessions")
        .update({
          last_activity: new Date().toISOString(),
          expires_at: newExpiresAt.toISOString(),
          is_valid: true,
        })
        .eq("id", sessionId)
        .eq("user_id", session.user.id);

      if (updateError) {
        console.error("Error updating activity:", updateError);
        return;
      }

      console.log("Activity updated:", { sessionId, newExpiresAt });
      setExpiresAt(newExpiresAt);
    } catch (error) {
      console.error("Error in activity update:", error);
    }
  }, []);

  useEffect(() => {
    const handleActivity = () => {
      updateActivity();
    };

    window.addEventListener("click", handleActivity);
    window.addEventListener("keydown", handleActivity);

    return () => {
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("keydown", handleActivity);
    };
  }, [updateActivity]);

  useEffect(() => {
    const checkSessionExpiration = async () => {
      const expiration = await fetchSessionExpiration();

      if (!expiration) {
        setSessionExpiring(false);
        return;
      }

      const now = new Date();
      const timeUntilExpiration = expiration.getTime() - now.getTime();

      console.log("Time until expiration:", { minutes: timeUntilExpiration / 60000 });

      if (timeUntilExpiration > 0 && timeUntilExpiration <= 5 * 60 * 1000) {
        setSessionExpiring(true);
      } else {
        setSessionExpiring(false);
      }
    };

    checkSessionExpiration();
    const interval = setInterval(checkSessionExpiration, 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchSessionExpiration]);

  useEffect(() => {
    if (!sessionExpiring) return;

    setCountdown(30);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionExpiring]);

  if (!sessionExpiring) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-yellow-100 p-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div>
          <p className="font-medium text-yellow-800">
            Tu sesión expirará pronto. ¿Deseas extenderla por 24 horas más?
          </p>
          <p className="text-sm text-yellow-700">La sesión se cerrará automáticamente en {countdown} segundos.</p>
        </div>
        <button
          onClick={handleExtendSession}
          className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500"
        >
          Extender sesión
        </button>
      </div>
    </div>
  );
}