// src/contexts/AuthContext.jsx
//
// Provides: { pantryId, activePantryId, role, displayName, initials,
//             login, logout, loading, updateProfile, switchPantry }
//
//   role:           "manager" | "superadmin"
//   pantryId:       "jason" | "amber" | null  (superadmin has no pantryId)
//   activePantryId: the pantry currently being managed
//                   — for managers: always equals pantryId
//                   — for Steve (superadmin): set via switchPantry(), starts null

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
    accountId:      null,
    pantryId:       null,
    activePantryId: null,
    role:           null,
    displayName:    null,
    initials:       null,
    loading:        true,
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
  async function login(username, password) {
    const lowerUser = username.trim().toLowerCase();

    for (const id of PANTRY_IDS) {
      const snap = await get(ref(db, `pantries/${id}/appSettings/auth`));
      if (!snap.exists()) continue;

      const auth = snap.val();
      const storedUsername = (auth.username || '').toLowerCase();
      if (storedUsername !== lowerUser) continue;

      const storedPassword = auth.password || 'admin';
      if (password !== storedPassword) {
        throw new Error('Invalid credentials');
      }

      const isSuperAdmin = auth.role === 'superadmin';
      const ownPantryId  = isSuperAdmin ? null : (auth.pantryId || id);

      const data = {
        accountId:      id,            // firebase node where this user's own auth lives
        pantryId:       ownPantryId,
        activePantryId: ownPantryId,   // superadmin starts with null; managers mirror pantryId
        role:           auth.role || 'manager',
        displayName:    auth.displayName || auth.username || id,
        initials:       auth.initials ||
                        (auth.displayName || id).slice(0, 2).toUpperCase(),
        loading:        false,
      };
      setAuthState(data);
      localStorage.setItem(LS_KEY, JSON.stringify(data));
      return data;
    }

    // Legacy fallback for Jason
    if (lowerUser === 'admin') {
      const snap = await get(ref(db, 'appSettings/auth/password'));
      const storedPassword = snap.exists() ? snap.val() : 'admin';
      if (password === storedPassword || password === 'admin') {
        const data = {
          pantryId:       'jason',
          activePantryId: 'jason',
          role:           'manager',
          displayName:    'Jason Bratina',
          initials:       'JB',
          loading:        false,
        };
        setAuthState(data);
        localStorage.setItem(LS_KEY, JSON.stringify(data));
        return data;
      }
    }

    throw new Error('Invalid credentials');
  }

  // ── switchPantry ────────────────────────────────────────────────────────────
  // Only meaningful for superadmin. Sets the pantry all manager screens read from.
  function switchPantry(pantryId) {
    if (authState.role !== 'superadmin') return;
    const updated = { ...authState, activePantryId: pantryId, loading: false };
    setAuthState(updated);
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
  }

  // ── updateProfile ───────────────────────────────────────────────────────────
  function updateProfile({ displayName, initials }) {
    const updated = { ...authState, displayName, initials, loading: false };
    setAuthState(updated);
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
  }

  // ── logout ──────────────────────────────────────────────────────────────────
  function logout() {
    setAuthState({
      pantryId:       null,
      activePantryId: null,
      role:           null,
      displayName:    null,
      initials:       null,
      loading:        false,
    });
    localStorage.removeItem(LS_KEY);
    navigate('/login');
  }

  return (
    <AuthContext.Provider value={{
      accountId:      authState.accountId,
      pantryId:       authState.pantryId,
      activePantryId: authState.activePantryId,
      role:           authState.role,
      displayName:    authState.displayName,
      initials:       authState.initials,
      loading:        authState.loading,
      login,
      logout,
      updateProfile,
      switchPantry,
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
