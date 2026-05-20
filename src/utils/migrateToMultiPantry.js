// src/utils/migrateToMultiPantry.js
//
// One-time migration: copies all root-level Firebase data under /pantries/jason/
// and seeds Amber + Steve auth records.
//
// HOW TO RUN (once, manually):
//   1. Open the app in a browser tab while logged in.
//   2. Open the browser console and run:
//        import('/src/utils/migrateToMultiPantry.js').then(m => m.runMigration())
//
//   OR temporarily add a button in any page component:
//        import { runMigration } from '../utils/migrateToMultiPantry';
//        <button onClick={runMigration}>Run Migration</button>
//
// SAFE TO RE-RUN: skips if pantries/jason/volunteers already has more than 10
// entries (i.e. real volunteer data has been migrated). Using a count threshold
// avoids a false-positive from the 5-entry placeholder seed that the app writes
// on first load when no volunteers exist.
// ROOT DATA IS PRESERVED — nothing at the root level is deleted.

import { db } from '../firebase';
import { ref, get, set } from 'firebase/database';

// Root-level paths to copy into /pantries/jason/
// NOTE: only real operational data is listed here — no placeholder or seed data
// is created by this migration. Whatever exists at each root path is copied as-is.
const ROOT_PATHS = [
  'tasks',
  'completedTasks',
  'shiftLeader',
  'volunteers',
  'session',
  'sessionSettings',
  'routeTemplates',
  'routeOccurrences',
  'routeHistory',
  'appSettings',
];

export async function runMigration() {
  console.log('[Migration] Starting multi-pantry migration…');

  // ── Guard: skip if pantries/jason/volunteers already has real data ────────
  // A count > 10 means real volunteers have been migrated. The app seeds only
  // 5 placeholder entries (IDs 1001–1005) on first load, so ≤ 10 means we
  // should still run the migration to copy real root-level data.
  const guardSnap = await get(ref(db, 'pantries/jason/volunteers'));
  const existingCount = guardSnap.exists()
    ? Object.keys(guardSnap.val()).length
    : 0;
  if (existingCount > 10) {
    console.log(`[Migration] Already migrated — pantries/jason/volunteers has ${existingCount} entries. Skipping.`);
    return { skipped: true };
  }

  // ── Step 1: Copy root data → /pantries/jason/ ────────────────────────────
  for (const path of ROOT_PATHS) {
    const snap = await get(ref(db, path));
    if (snap.exists()) {
      await set(ref(db, `pantries/jason/${path}`), snap.val());
      console.log(`[Migration] ✓ Copied  ${path}  →  pantries/jason/${path}`);
    } else {
      console.log(`[Migration] –  Skipped  ${path}  (no data at root)`);
    }
  }

  // ── Step 2: Patch Jason's auth with role + pantryId ──────────────────────
  const jasonAuthSnap = await get(ref(db, 'pantries/jason/appSettings/auth'));
  const jasonAuth = jasonAuthSnap.exists() ? jasonAuthSnap.val() : {};
  await set(ref(db, 'pantries/jason/appSettings/auth'), {
    ...jasonAuth,
    username: 'admin',
    // password intentionally omitted — falls back to 'admin' in AuthContext
    role: 'manager',
    pantryId: 'jason',
  });
  console.log('[Migration] ✓ Patched  pantries/jason/appSettings/auth  (role + pantryId)');

  // ── Step 3: Seed Amber ────────────────────────────────────────────────────
  await set(ref(db, 'pantries/amber/appSettings/auth'), {
    username: 'amber',
    password: 'amber',
    displayName: 'Amber',
    initials: 'AM',
    role: 'manager',
    pantryId: 'amber',
  });
  await set(ref(db, 'pantries/amber/appSettings/app'), {
    orgName: 'IMPACT Center',
    location: 'Greenwood, IN',
  });
  console.log('[Migration] ✓ Seeded   pantries/amber/appSettings');

  // ── Step 4: Seed Steve ────────────────────────────────────────────────────
  await set(ref(db, 'pantries/steve/appSettings/auth'), {
    username: 'steve',
    password: 'steve',
    displayName: 'Steve',
    initials: 'ST',
    role: 'superadmin',
  });
  console.log('[Migration] ✓ Seeded   pantries/steve/appSettings/auth');

  console.log('[Migration] ✅ Migration complete. Root-level data preserved as backup.');
  return { migrated: true };
}
