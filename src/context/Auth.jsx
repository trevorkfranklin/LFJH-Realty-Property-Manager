import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

// Secondary client with no session persistence — used for admin user creation
// so creating a new user doesn't sign out the currently logged-in admin.
const ephemeral = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(undefined); // undefined = loading
  const [profile, setProfile]   = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [needsSetup, setNeedsSetup] = useState(false);

  const loadProfiles = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at');
    setProfiles(data || []);
  }, []);

  const loadProfile = useCallback(async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data);
    loadProfiles();
  }, [loadProfiles]);

  useEffect(() => {
    supabase.rpc('has_users').then(({ data }) => {
      if (data === false) setNeedsSetup(true);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ?? null);
      if (session) loadProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else { setProfile(null); setProfiles([]); }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const login = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    setNeedsSetup(false);
    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  // First-time setup: create admin account and sign in
  const createFirstAdmin = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { role: 'admin' } },
    });
    if (error) return { error: error.message };
    const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
    if (loginErr) return { error: loginErr.message };
    setNeedsSetup(false);
    return { success: true };
  }, []);

  // Admin creates additional users — uses ephemeral client so admin stays signed in
  const createUser = useCallback(async (email, password, role) => {
    const { error } = await ephemeral.auth.signUp({
      email, password,
      options: { data: { role } },
    });
    if (error) return { error: error.message };
    // Refresh profiles list after a short delay (trigger needs a moment)
    setTimeout(() => loadProfiles(), 1500);
    return { success: true };
  }, [loadProfiles]);

  const updateRole = useCallback(async (userId, role) => {
    await supabase.from('profiles').update({ role }).eq('id', userId);
    setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role } : p));
  }, []);

  const deleteUser = useCallback(async (userId) => {
    await supabase.from('profiles').delete().eq('id', userId);
    setProfiles(prev => prev.filter(p => p.id !== userId));
  }, []);

  const isAdmin = profile?.role === 'admin';
  const canEdit = isAdmin;

  return (
    <AuthContext.Provider value={{
      session, profile, profiles, needsSetup,
      isAdmin, canEdit,
      login, logout, createFirstAdmin, createUser, updateRole, deleteUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
