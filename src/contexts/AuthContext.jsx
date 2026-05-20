// src/contexts/AuthContext.jsx
//
// Provides: { pantryId, role, displayName, initials, login, logout, loading }
//   role:     "manager" | "superadmin"
//   pantryId: "jason" | "amber" | null  (superadmin has no pantryId)
//   loading:  true while rehydrating from localStorage on first mount

import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ref, get } from 'firebase/database';

const LS_KEY = 'impact_center_auth';

// All known pantry IDs — checked in order during login
const PANTRY_IDS = ['jason', 'amber', 'steve'];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();

  const [authState, setAuthState] = useState({
    pantryId:    null,
    role:        null,
    displayName: null,
    initials:    null,
    loading:     true,
  });

  // ── Rehydrate from localStorage on mount ───────────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setAuthState({ ...parsed, loading: false });
      } else {
        setAuthState(s => ({ ...s, loading: false }));
      }
    } catch {
      localStorage.removeItem(LS_KEY);
      setAuthState(s => ({ ...s, loading: false }));
    }
  }, []);

  // ── login ───────────────────────────────────────────────────────────────────
  // Returns auth data on success; throws Error("Invalid credentials") on failure.
  async function login(username, password) {
    const lowerUser = username.trim().toLowerCase();

    // 1. Try every pantry's auth record (post-migration path)
    for (const id of PANTRY_IDS) {
      const snap = await get(ref(db, `pantries/${id}/appSettings/auth`));
      if (!snap.exists()) continue;

      const auth = snap.val();
      const storedUsername = (auth.username || '').toLowerCase();
      if (storedUsername !== lowerUser) continue;

      // Username matched — verify password
      const storedPassword = auth.password || 'admin'; // default 'admin' for Jason
      if (password !== storedPassword) {
        // Username matched but password wrong — fail immediately, don't try others
        throw new Error('Invalid credentials');
      }

      const data = {
        pantryId:    auth.role === 'superadmin' ? null : (auth.pantryId || id),
        role:        auth.role || 'manager',
        displayName: auth.displayName || auth.username || id,
        initials:    auth.initials ||
                     (auth.displayName || id).slice(0, 2).toUpperCase(),
        loading:     false,
      };
      setAuthState(data);
      localStorage.setItem(LS_KEY, JSON.stringify(data));
      return data;
    }

    // 2. Legacy fallback: root appSettings/auth/password (pre-migration)
    //    Allows Jason to log in even before the migration has been run.
    if (lowerUser === 'admin') {
      const snap = await get(ref(db, 'appSettings/auth/password'));
      const storedPassword = snap.exists() ? snap.val() : 'admin';
      if (password === storedPassword || password === 'admin') {
        const data = {
          pantryId:    'jason',
          role:        'manager',
          displayName: 'Jason Bratina',
          initials:    'JB',
          loading:     false,
        };
        setAuthState(data);
        localStorage.setItem(LS_KEY, JSON.stringify(data));
        return data;
      }
    }

    throw new Error('Invalid credentials');
  }

  // ── logout ──────────────────────────────────────────────────────────────────
  function logout() {
    setAuthState({
      pantryId:    null,
      role:        null,
      displayName: null,
      initials:    null,
      loading:     false,
    });
    localStorage.removeItem(LS_KEY);
    navigate('/login');
  }

  return (
    <AuthContext.Provider value={{
      pantryId:    authState.pantryId,
      role:        authState.role,
      displayName: authState.displayName,
      initials:    authState.initials,
      loading:     authState.loading,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
