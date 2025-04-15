import { createClient } from "@supabase/supabase-js";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// Create a single supabase client for the browser
const createBrowserClient = () => {
  return createClientComponentClient();
};

// Create a single supabase client for server components
const createServerClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_ANON_KEY;

  return createClient(supabaseUrl, supabaseServiceKey);
};

// Client singleton to avoid multiple instances
let browserClient = null;
export const getSupabaseBrowser = () => {
  if (typeof window === "undefined") {
    throw new Error("getSupabaseBrowser should only be called in the browser");
  }

  if (!browserClient) {
    browserClient = createBrowserClient();
  }
  return browserClient;
};

// For server components
export const getSupabaseServer = () => {
  return createServerClient();
};

// Function to create or update a session
export const createSession = async (supabase, sessionId, userId, userAgent = "unknown") => {
  if (!sessionId || !userId) {
    throw new Error("sessionId and userId are required");
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day

  const { error } = await supabase.from("sessions").upsert(
    {
      id: sessionId,
      user_id: userId,
      created_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      last_activity: new Date().toISOString(),
      ip_address: "unknown",
      user_agent: userAgent,
      extension_count: 0,
      is_valid: true,
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("Error creating session:", error);
    throw error;
  }

  // Update last login
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ last_login: new Date().toISOString() })
    .eq("id", userId);

  if (profileError) {
    console.error("Error updating last login:", profileError);
  }

  return expiresAt;
};

// Function to extend a session
export const extendSession = async (supabase, sessionId, userId) => {
  if (!sessionId || !userId) {
    throw new Error("sessionId and userId are required");
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day

  const { data, error } = await supabase
    .from("sessions")
    .update({
      expires_at: expiresAt.toISOString(),
      last_activity: new Date().toISOString(),
      is_valid: true,
    })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .select("extension_count")
    .single();

  if (error) {
    console.error("Error extending session:", error);
    throw error;
  }

  // Increment extension_count via RPC (if exists)
  let extensionCount = data?.extension_count || 0;
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc("increment_extension_count", {
      session_id: sessionId,
    });
    if (rpcError) {
      console.error("Error incrementing extension count:", rpcError);
    } else {
      extensionCount = rpcData || extensionCount + 1;
    }
  } catch (rpcError) {
    console.error("RPC call failed:", rpcError);
  }

  return {
    expiresAt,
    extensionCount,
  };
};

// Function to invalidate a session
export const invalidateSession = async (supabase, sessionId, userId) => {
  // If no sessionId, try to find one
  let targetSessionId = sessionId;
  if (!targetSessionId && userId) {
    const { data, error } = await supabase
      .from("sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("is_valid", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data?.id) {
      console.warn("No valid session found for user:", userId, error?.message);
      return; // Proceed to sign out
    }
    targetSessionId = data.id;
  }

  if (!targetSessionId || !userId) {
    console.warn("Skipping session invalidation due to missing sessionId or userId");
    return;
  }

  const { error } = await supabase
    .from("sessions")
    .update({
      is_valid: false,
      expires_at: new Date().toISOString(),
    })
    .eq("id", targetSessionId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error invalidating session:", error);
    throw error;
  }
};