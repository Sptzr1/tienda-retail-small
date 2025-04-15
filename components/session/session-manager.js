"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser, extendSession, invalidateSession } from "@/lib/supabase";

export default function SessionManager() {
  const router = useRouter();
  const [sessionExpiring, setSessionExpiring] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [expiresAt, setExpiresAt] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Mark component as hydrated
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Fetch or create session expiration
  const fetchSessionExpiration = useCallback(async (retryCount = 0) => {
    try {
      const supabase = getSupabaseBrowser();
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error("No session found:", sessionError?.message || "No session data");
        if (isHydrated && retryCount >= 2) {
          router.push("/auth/login");
        }
        return null;
      }

      console.log("Session found:", { userId: session.user.id, expiresIn: session.expires_in });

      const { data, error } = await supabase
        .from("sessions")
        .select("expires_at")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Session fetch error:", error);
        if (retryCount < 2) {
          return fetchSessionExpiration(retryCount + 1);
        }
        return null;
      }

      if (!data?.expires_at) {
        // Create new session
        const newExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
        const { error: insertError } = await supabase
          .from("sessions")
          .insert({ id: session.user.id, expires_at: newExpiresAt.toISOString() });

        if (insertError) {
          console.error("Error creating session:", insertError);
          if (retryCount < 2) {
            return fetchSessionExpiration(retryCount + 1);
          }
          return null;
        }

        console.log("Session created:", { expires_at: newExpiresAt });
        setExpiresAt(newExpiresAt);
        return newExpiresAt;
      }

      const expiration = new Date(data.expires_at);
      console.log("Session expiration:", { expires_at: expiration });
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

  // Extend session
  const handleExtendSession = async () => {
    try {
      const supabase = getSupabaseBrowser();
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error("No session for extend:", sessionError?.message || "No session data");
        if (isHydrated) {
          router.push("/auth/login");
        }
        return;
      }

      const { expiresAt: newExpiresAt } = await extendSession(supabase, session.user.id);

      console.log("Session extended:", { newExpiresAt });
      setExpiresAt(new Date(newExpiresAt));
      setSessionExpiring(false);
      setCountdown(10);
    } catch (error) {
      console.error("Error extending session:", error);
      handleLogout();
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      const supabase = getSupabaseBrowser();
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error("No session for logout:", sessionError?.message || "No session data");
      } else {
        await invalidateSession(supabase, session.user.id);
        await supabase.auth.signOut();
        console.log("Session logged out:", { userId: session.user.id });
      }

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

  // Check session expiration
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

      if (timeUntilExpiration > 0 && timeUntilExpiration <= 2 * 60 * 1000) {
        setSessionExpiring(true);
      } else {
        setSessionExpiring(false);
      }
    };

    checkSessionExpiration();
    const interval = setInterval(checkSessionExpiration, 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchSessionExpiration]);

  // Countdown timer
  useEffect(() => {
    if (!sessionExpiring) return;

    setCountdown(10);
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
            Tu sesión expirará pronto. ¿Deseas extenderla por 30 minutos más?
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