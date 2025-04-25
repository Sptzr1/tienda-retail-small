// lib/profile-context.js
"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { getSupabaseBrowser } from "@/lib/supabase";
import { useSessionContext } from "@/lib/session-context";

const ProfileContext = createContext();

export function ProfileProvider({ children }) {
  const { userId, isInitialized } = useSessionContext();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isInitialized || !userId) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const supabase = getSupabaseBrowser();
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*,stores(*)")
          .eq("id", userId)
          .single();
        if (error) throw error;
        setProfile(data);
      } catch (error) {
        console.error("Error fetching profile:", error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId, isInitialized]);

  return (
    <ProfileContext.Provider value={{ profile, loading }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}