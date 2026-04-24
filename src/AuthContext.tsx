import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from './supabase';
import { setCurrentUserId } from './db';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const ALLOWED_EMAIL = 'you@example.com';

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

// Check localStorage for cached Supabase session to avoid flash
function getCachedSession(): User | null {
  try {
    const storageKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (!storageKey) return null;
    const data = JSON.parse(localStorage.getItem(storageKey) || '');
    return data?.user ?? null;
  } catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [cachedUser] = useState(() => {
    const u = getCachedSession();
    if (u) setCurrentUserId(u.id);
    return u;
  });
  const [user, setUser] = useState<User | null>(cachedUser);
  const [loading, setLoading] = useState(!cachedUser);

  useEffect(() => {
    // Listen for auth changes first so we don't miss events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      if (u && u.email !== ALLOWED_EMAIL) {
        supabase.auth.signOut();
        setUser(null);
        setCurrentUserId(null);
        setLoading(false);
        alert('Access restricted.');
        return;
      }
      setUser(u);
      setCurrentUserId(u?.id ?? null);
      setLoading(false);
    });

    // Then check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      setCurrentUserId(u?.id ?? null);
      setLoading(false);

      // After OAuth redirect on mobile, the token exchange may not be done yet.
      // Retry once if we have hash params but no session.
      if (!u && (window.location.hash.includes('access_token') || window.location.search.includes('code='))) {
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: s } }) => {
            if (s?.user) {
              setUser(s.user);
              setCurrentUserId(s.user.id);
              setLoading(false);
            }
          });
        }, 1000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error('Sign in failed:', err);
      alert('Sign in failed. Please try again.');
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setCurrentUserId(null);
      setUser(null);
      localStorage.removeItem('homebase-cache');
    } catch (err) {
      console.error('Sign out failed:', err);
      alert('Sign out failed. Please try again.');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
