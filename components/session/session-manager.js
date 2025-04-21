"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { getSupabaseBrowser } from "@/lib/supabase";

export default function SessionManager({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [sessionData, setSessionData] = useState(null);
  const [showExtensionPrompt, setShowExtensionPrompt] = useState(false);
  const [showLogoutMessage, setShowLogoutMessage] = useState(false);

  const createSession = useCallback(async (userId) => {
    const supabase = getSupabaseBrowser();
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const { data, error } = await supabase
      .from("sessions")
      .insert([{ id: sessionId, user_id: userId, expires_at: expiresAt.toISOString() }])
      .select()
      .single();

    if (error) {
      console.error("Error creating session:", error);
      return null;
    }

    console.log("Session created:", { sessionId, expires_at: expiresAt.toISOString() });
    return data;
  }, []);

  const updateSessionActivity = useCallback(async (sessionId) => {
    const supabase = getSupabaseBrowser();
    const newExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // Extend 15 minutes

    const { error } = await supabase
      .from("sessions")
      .update({ expires_at: newExpiresAt.toISOString() })
      .eq("id", sessionId);

    if (error) {
      console.error("Error updating session activity:", error);
      return;
    }

    console.log("Activity updated:", { sessionId, newExpiresAt: newExpiresAt.toISOString() });
    setSessionData((prev) => (prev ? { ...prev, expires_at: newExpiresAt.toISOString() } : prev));
    setShowExtensionPrompt(false);
  }, []);

  const fetchSessionExpiration = useCallback(async (sessionId) => {
    console.log("Fetching session, ID:", sessionId || "none");
    if (!sessionId) {
      console.log("No session ID, checking public.sessions");
      const supabase = getSupabaseBrowser();
      const { data: sessions, error } = await supabase
        .from("sessions")
        .select("id, expires_at")
        .gt("expires_at", new Date().toISOString());

      if (error) {
        console.error("Error fetching sessions:", error);
        return null;
      }

      if (sessions && sessions.length > 0) {
        console.log("Session recovered:", sessions[0]);
        return sessions[0];
      }
      console.log("No active sessions found");
      return null;
    }

    const supabase = getSupabaseBrowser();
    const { data, error } = await supabase
      .from("sessions")
      .select("id, expires_at")
      .eq("id", sessionId)
      .single();

    if (error) {
      console.error("Error fetching session:", error);
      return null;
    }

    console.log("Session fetched:", data);
    return data;
  }, []);

  const handleExtendSession = useCallback(() => {
    if (sessionData?.id) {
      console.log("Extending session:", sessionData.id);
      updateSessionActivity(sessionData.id);
    }
  }, [sessionData, updateSessionActivity]);

  const handleLogout = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    console.log("Logging out due to expiry or user action");
    await supabase.auth.signOut();
    setShowExtensionPrompt(false);
    setShowLogoutMessage(true);
    setTimeout(() => {
      console.log("Redirecting to login after logout message");
      setShowLogoutMessage(false);
      router.push("/auth/login");
    }, 5000); // Show logout message for 5 seconds
  }, [router]);

  const checkSessionExpiration = useCallback(async () => {
    console.log("Checking session expiration");
    const supabase = getSupabaseBrowser();
    const { data: { session: authSession } } = await supabase.auth.getSession();

    if (!authSession?.user?.id) {
      console.log("No auth session, redirecting to login");
      if (pathname !== "/auth/login" && pathname !== "/auth/register") {
        router.push("/auth/login");
      }
      setIsChecking(false);
      return;
    }

    let session = await fetchSessionExpiration(authSession.session_id);

    if (!session) {
      console.log("No session found, creating new one for user:", authSession.user.id);
      session = await createSession(authSession.user.id);
      if (!session) {
        console.error("Failed to create session, signing out");
        await supabase.auth.signOut();
        router.push("/auth/login");
        setIsChecking(false);
        return;
      }
    }

    setSessionData(session);
    const expiresAt = new Date(session.expires_at);
    if (expiresAt < new Date()) {
      console.log("Session expired at:", session.expires_at);
      handleLogout();
      return;
    }

    const timeUntilExpiration = (expiresAt - new Date()) / (1000 * 60);
    console.log("Time until expiration:", { minutes: timeUntilExpiration.toFixed(2) });

    // Show extension prompt ~1 minute before expiry
    if (timeUntilExpiration <= 1 && timeUntilExpiration > 0) {
      console.log("Showing extension prompt, time left:", timeUntilExpiration.toFixed(2));
      setShowExtensionPrompt(true);
      setTimeout(() => {
        if (!document.hidden && new Date(session.expires_at) <= new Date()) {
          console.log("Prompt timed out, logging out");
          handleLogout();
        }
      }, 30 * 1000); // Prompt lasts 30 seconds
    }

    setIsChecking(false);
  }, [router, pathname, createSession, fetchSessionExpiration, handleLogout]);

  useEffect(() => {
    console.log("Initial session check");
    checkSessionExpiration();
  }, [checkSessionExpiration]);

  useEffect(() => {
    if (!isChecking) {
      console.log("Starting session check interval");
      const interval = setInterval(checkSessionExpiration, 60 * 1000); // Check every minute
      return () => {
        console.log("Clearing session check interval");
        clearInterval(interval);
      };
    }
  }, [isChecking, checkSessionExpiration]);

  useEffect(() => {
    if (!isChecking) {
      const handleActivity = () => {
        const supabase = getSupabaseBrowser();
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.session_id) {
            console.log("Activity detected, updating session:", session.session_id);
            updateSessionActivity(session.session_id);
          }
        });
      };

      window.addEventListener("mousemove", handleActivity);
      window.addEventListener("keydown", handleActivity);
      window.addEventListener("click", handleActivity);

      return () => {
        console.log("Removing activity listeners");
        window.removeEventListener("mousemove", handleActivity);
        window.removeEventListener("keydown", handleActivity);
        window.removeEventListener("click", handleActivity);
      };
    }
  }, [isChecking, updateSessionActivity]);

  return (
    <>
      {children}
      {showExtensionPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Sesión por expirar
            </h3>
            <p className="text-gray-600 mb-6">
              Tu sesión está por expirar en menos de un minuto. ¿Deseas extenderla?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-gray-700 font-medium"
              >
                Cerrar
              </button>
              <button
                onClick={handleExtendSession}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Extender
              </button>
            </div>
          </div>
        </div>
      )}
      {showLogoutMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Sesión cerrada
            </h3>
            <p className="text-gray-600 mb-6">
              Tu sesión ha sido cerrada por inactividad. Redirigiendo al inicio...
            </p>
          </div>
        </div>
      )}
    </>
  );
}