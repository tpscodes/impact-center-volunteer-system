// src/utils/rebuildDatabase.js
//
// Writes known-good auth + app settings to Firebase without touching any
// other data under pantries/jason/ (tasks, history, etc.).
// Note: volunteers now live at root /volunteers/ — not under pantries/jason/.
//
// Uses update() throughout so existing keys are preserved — nothing is
// deleted or overwritten unless explicitly listed below.
//
// HOW TO USE:
//   Temporarily imported in src/main.jsx on app load.
//   Remove the import + call once the database looks correct.

import { db } from '../firebase';
import { ref, update } from 'firebase/database';

export async function rebuildDatabase() {
  console.log('[rebuildDatabase] Writing settings…');

  await Promise.all([
    // ── Jason ──────────────────────────────────────────────────────────────
    update(ref(db, 'pantries/jason/appSettings/auth'), {
      username:    'jason',
      password:    'admin',
      displayName: 'Jason Bratina',
      initials:    'JB',
      role:        'manager',
      pantryId:    'jason',
    }),
    update(ref(db, 'pantries/jason/appSettings/profile'), {
      displayName: 'Jason Bratina',
      initials:    'JB',
    }),
    update(ref(db, 'pantries/jason/appSettings/app'), {
      orgName:      'IMPACT Center',
      location:     'Greenwood, IN',
      deliveryDays: {
        monday:    true,
        tuesday:   true,
        wednesday: true,
        thursday:  true,
        friday:    true,
        saturday:  false,
        sunday:    false,
      },
    }),

    // ── Amber ──────────────────────────────────────────────────────────────
    update(ref(db, 'pantries/amber/appSettings/auth'), {
      username:    'amber',
      password:    'amber',
      displayName: 'Amber',
      initials:    'AM',
      role:        'manager',
      pantryId:    'amber',
    }),

    // ── Steve ──────────────────────────────────────────────────────────────
    update(ref(db, 'pantries/steve/appSettings/auth'), {
      username:    'steve',
      password:    'steve',
      displayName: 'Steve',
      initials:    'ST',
      role:        'superadmin',
    }),
  ]);

  console.log('[rebuildDatabase] ✅ Done.');
}
