import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext(undefined);

// user expuesto por este contexto = auth.users (de Supabase) + la fila de
// public.profiles fusionada (app_role, phone, account_status, etc — los
// mismos campos que Base44 guardaba directo en la entidad User). Mantiene
// la forma que ya esperaba el resto de la app tras la Fase 4
// (useAuth().user.app_role, .id, .phone, ...).
async function loadUserWithProfile() {
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();
  return { id: authUser.id, email: authUser.email, ...(profile || {}) };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  const checkUserAuth = useCallback(async () => {
    try {
      setIsLoadingAuth(true);
      const merged = await loadUserWithProfile();
      if (merged) {
        setUser(merged);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setAuthChecked(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      setAuthChecked(true);
      setAuthError({ type: 'unknown', message: error.message || 'Auth check failed' });
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  // app_settings es de lectura pública (RLS: using (true)) — ver
  // supabase/migrations/0004_rls.sql. No hay equivalente Supabase al
  // auth_required/user_not_registered de Base44: cada usuario que se
  // registra obtiene automáticamente una fila en profiles (trigger
  // on_auth_user_created), así que ese caso no puede ocurrir aquí.
  const checkAppState = useCallback(async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      const { data, error } = await supabase.from('app_settings').select('*').maybeSingle();
      if (!error) setAppPublicSettings(data);
      await checkUserAuth();
    } catch (error) {
      console.error('App state check failed:', error);
      setAuthError({ type: 'unknown', message: error.message || 'Failed to load app' });
    } finally {
      setIsLoadingPublicSettings(false);
    }
  }, [checkUserAuth]);

  useEffect(() => {
    checkAppState();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, _session) => {
      checkUserAuth();
    });
    return () => subscription.unsubscribe();
  }, [checkAppState, checkUserAuth]);

  const logout = async (shouldRedirect = true) => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) window.location.href = '/login';
  };

  const navigateToLogin = () => {
    window.location.href = `/login?from_url=${encodeURIComponent(window.location.href)}`;
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
