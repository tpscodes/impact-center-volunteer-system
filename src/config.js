// src/config.js
//
// Per-deployment constant: set VITE_PANTRY_ID in .env (or Vercel env vars)
// to target a different pantry. Defaults to "jason" for the IMPACT Center
// production deployment.
//
// Manager screens read pantryId from AuthContext (login-aware).
// Volunteer screens (no login) use this constant so they always point to
// the correct Firebase namespace for the tablet they're installed on.

export const PANTRY_ID = import.meta.env.VITE_PANTRY_ID || 'jason';
