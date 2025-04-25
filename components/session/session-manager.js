// components/session/session-manager.js
"use client";

import { useEffect, useCallback, useState, memo, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { getSupabaseBrowser } from "@/lib/supabase";
import { useSessionContext } from "@/lib/session-context";

const SessionManagerService = {
  intervalId: null,
  sessionData: null,
  showExtensionPrompt: false,
  showLogoutMessage: false,
  router: null,
  pathname: null,
  userId: null,
  role: null,
  isInitialized: false,
  instanceId: uuidv4(),
  listeners: new Set(),
  activityCleanup: null,

  initialize(router, pathname, userId, role) {
    if (this.isInitialized && this.userId === userId && this.role === role) {
      console.log(`SessionManagerService already initialized [instance: ${this.instanceId}]`);
      return;
    }
    this.router = router;
    this.pathname = pathname;
    this.userId = userId;
    this.role = role;
    this.isInitialized = true;
    console.log(`SessionManagerService initialized [instance: ${this.instanceId}]:`, new Date().toISOString());
    this.startSessionCheck();
    this.activityCleanup = this.setupActivityListeners();
  },

  async checkSessionExpiration() {
    console.log(`Checking session expiration [instance: ${this.instanceId}]:`, new Date().toISOString());
    const supabase = getSupabaseBrowser();
    const { data: { session: authSession }, error: authError } = await supabase.auth.getSession();

    if (authError || !authSession?.user?.id || authSession.user.id !== this.userId) {
      console.log("No valid auth session or user mismatch, stopping checks");
      this.cleanup();
      if (this.pathname !== "/auth/login" && this.pathname !== "/auth/register") {
        this.router.push("/auth/login");
      }
      this.notifyListeners({ sessionData: null, showExtensionPrompt: false, showLogoutMessage: false });
      return;
    }

    let session = await this.fetchSession(authSession.user.id);

    if (!session) {
      console.log("No session found, creating new one for user:", authSession.user.id);
      session = await this.createSession(authSession.user.id);
      if (!session) {
        console.error("Failed to create session, signing out");
        await this.handleLogout();
        return;
      }
    }

    this.sessionData = session;
    const expiresAt = new Date(session.expires_at);
    if (expiresAt < new Date()) {
      console.log("Session expired at:", session.expires_at);
      await this.handleLogout();
      return;
    }

    const timeUntilExpiration = (expiresAt - new Date()) / (1000 * 60);
    console.log("Time until expiration:", { minutes: timeUntilExpiration.toFixed(2) });

    if (this.role !== "demo" && timeUntilExpiration <= 1 && timeUntilExpiration > 0) {
      console.log("Showing extension prompt, time left:", timeUntilExpiration.toFixed(2));
      this.showExtensionPrompt = true;
      setTimeout(async () => {
        if (!document.hidden && new Date(session.expires_at) <= new Date()) {
          console.log("Prompt timed out, logging out");
          await this.handleLogout();
        }
      }, 60 * 1000);
    }

    this.notifyListeners({
      sessionData: this.sessionData,
      showExtensionPrompt: this.showExtensionPrompt,
      showLogoutMessage: this.showLogoutMessage,
    });
  },

  async createSession(userId) {
    const supabase = getSupabaseBrowser();
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const { data, error } = await supabase
      .from("sessions")
      .insert([{ id: sessionId, user_id: userId, expires_at: expiresAt.toISOString() }])
      .select()
      .single();

    if (error) {
      console.error("Error creating session:", error.message);
      return null;
    }

    console.log("Session created:", { sessionId, expires_at: expiresAt.toISOString() });
    return data;
  },

  async updateSessionActivity(sessionId) {
    if (this.role === "demo") {
      console.log("Demo users cannot extend sessions");
      this.notifyListeners({
        demoMessage: "Usuarios demo no pueden extender sesiones. Contacta a un super admin para actualizar tu cuenta.",
      });
      return;
    }
    const supabase = getSupabaseBrowser();
    const newExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const { error } = await supabase
      .from("sessions")
      .update({ expires_at: newExpiresAt.toISOString() })
      .eq("id", sessionId);

    if (error) {
      console.error("Error updating session activity:", error.message);
      return;
    }

    console.log("Activity updated:", { sessionId, newExpiresAt: newExpiresAt.toISOString() });
    this.sessionData = { ...this.sessionData, expires_at: newExpiresAt.toISOString() };
    this.showExtensionPrompt = false;
    this.notifyListeners({
      sessionData: this.sessionData,
      showExtensionPrompt: this.showExtensionPrompt,
      showLogoutMessage: this.showLogoutMessage,
    });
  },

  async fetchSession(userId) {
    const supabase = getSupabaseBrowser();
    const { data, error } = await supabase
      .from("sessions")
      .select("id, expires_at")
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error("Error fetching session:", error.message);
      return null;
    }

    if (data) {
      console.log("Session recovered:", data);
      return data;
    }
    console.log("No active session found for user:", userId);
    return null;
  },

  async handleExtendSession() {
    if (this.role === "demo") {
      console.log("Demo users cannot extend sessions");
      this.notifyListeners({
        demoMessage: "Usuarios demo no pueden extender sesiones. Contacta a un super admin para actualizar tu cuenta.",
      });
      return;
    }
    if (this.sessionData?.id) {
      console.log("Extending session:", this.sessionData.id);
      await this.updateSessionActivity(this.sessionData.id);
    }
  },

  async handleLogout() {
    const supabase = getSupabaseBrowser();
    console.log("Logging out");
    await supabase.auth.signOut();
    if (this.sessionData?.id) {
      await supabase.from("sessions").delete().eq("id", this.sessionData.id);
    }
    this.showExtensionPrompt = false;
    this.showLogoutMessage = true;
    this.notifyListeners({
      sessionData: null,
      showExtensionPrompt: false,
      showLogoutMessage: true,
    });
    setTimeout(() => {
      console.log("Redirecting to login");
      this.showLogoutMessage = false;
      this.notifyListeners({
        sessionData: null,
        showExtensionPrompt: false,
        showLogoutMessage: false,
      });
      this.router.push("/auth/login");
    }, 5000);
  },

  startSessionCheck() {
    if (!this.intervalId) {
      console.log(`Starting global session check interval [instance: ${this.instanceId}]:`, new Date().toISOString());
      this.intervalId = setInterval(() => {
        console.log(`Interval tick [instance: ${this.instanceId}]:`, new Date().toISOString());
        if (this.pathname.startsWith("/auth")) {
          console.log("Skipping session check on auth route");
          return;
        }
        this.checkSessionExpiration();
      }, 5 * 60 * 1000); // 5 minutes
    } else {
      console.log(`Session check interval already running [instance: ${this.instanceId}]`);
    }
  },

  setupActivityListeners() {
    const debounce = (fn, delay) => {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
      };
    };

    const debouncedUpdateSession = debounce((sessionId) => this.updateSessionActivity(sessionId), 30000); // 30s

    const handleActivity = () => {
      if (this.sessionData?.id) {
        debouncedUpdateSession(this.sessionData.id);
      }
    };

    window.addEventListener("mousemove", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity, { passive: true });
    window.addEventListener("click", handleActivity, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      console.log(`Activity listeners removed [instance: ${this.instanceId}]`);
    };
  },

  addListener(callback) {
    this.listeners.add(callback);
  },

  removeListener(callback) {
    this.listeners.delete(callback);
  },

  notifyListeners(state) {
    this.listeners.forEach((callback) => callback(state));
  },

  cleanup() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.activityCleanup) {
      this.activityCleanup();
      this.activityCleanup = null;
    }
    this.listeners.clear();
    this.isInitialized = false;
    console.log(`SessionManagerService cleaned up [instance: ${this.instanceId}]`);
  },
};

const SessionManagerComponent = memo(({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { userId, role, isInitialized } = useSessionContext();
  const [state, setState] = useState({
    sessionData: null,
    showExtensionPrompt: false,
    showLogoutMessage: false,
    demoMessage: null,
  });
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) {
      console.log(`SessionManagerComponent skipping reinitialization [instance: ${SessionManagerService.instanceId}]`);
      return;
    }
    console.log(`SessionManagerComponent mounted [instance: ${SessionManagerService.instanceId}]:`, new Date().toISOString());
    if (isInitialized && userId && role) {
      SessionManagerService.initialize(router, pathname, userId, role);
      initializedRef.current = true;
    }
    const listener = (newState) => setState(newState);
    SessionManagerService.addListener(listener);
    return () => {
      console.log(`SessionManagerComponent unmounted [instance: ${SessionManagerService.instanceId}]:`, new Date().toISOString());
      SessionManagerService.removeListener(listener);
    };
  }, [router, pathname, userId, role, isInitialized]);

  const handleExtendSession = useCallback(() => {
    SessionManagerService.handleExtendSession();
  }, []);

  const handleLogout = useCallback(() => {
    SessionManagerService.handleLogout();
  }, []);

  return (
    <>
      {children}
      {state.showExtensionPrompt && (
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
      {state.showLogoutMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Sesión cerrada
            </h3>
            <p className="text-gray-600 mb-6">
              Tu sesión ha been cerrada por inactividad. Redirigiendo al inicio...
            </p>
          </div>
        </div>
      )}
      {state.demoMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Acceso Restringido
            </h3>
            <p className="text-gray-600 mb-6">{state.demoMessage}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setState((prev) => ({ ...prev, demoMessage: null }))}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-gray-700 font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

SessionManagerComponent.displayName = "SessionManagerComponent";

export default SessionManagerComponent;