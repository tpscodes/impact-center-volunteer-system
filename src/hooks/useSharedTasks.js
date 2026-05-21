// useSharedTasks.js
// Real-time shared state via Firebase Realtime Database.
// onValue listeners push updates to all connected clients instantly.
//
// Signature: useSharedTasks(pantryId)
//   pantryId: e.g. "jason" | "amber" — required.
//   If null/undefined, returns empty no-op state (no Firebase subscription).
//   All Firebase paths are scoped to pantries/${pantryId}/.

import { useState, useEffect, useCallback, useRef } from "react";
import { db } from "../firebase";
import { ref, onValue, set, remove } from "firebase/database";

// ── Named volunteer profiles ──────────────────────────────────────────────────
export const VOLUNTEER_PROFILES = [
  { id: "1001", name: "Volunteer 1", isShiftLeader: true },
  { id: "1002", name: "Volunteer 2", isShiftLeader: true },
  { id: "1003", name: "Volunteer 3" },
  { id: "1004", name: "Volunteer 4" },
  { id: "1005", name: "Volunteer 5" },
];

// ── Seed tasks ────────────────────────────────────────────────────────────────
export const SEED_TASKS = [
  { id: "t1", name: "Rack 7 — Fill Coffee", item: "Coffee bags", action: "Fill", source: "Warehouse — Green shelf", destination: "Rack 7", comments: "Front shelf when done", priority: "High", estimatedTime: "~15 min", status: "available", assignedTo: "", assignedName: "", tags: ["Warehouse", "Warm"], createdAt: Date.now() },
  { id: "t2", name: "Rack 9 — Front Cereal", item: "Cereal boxes", action: "Front up", source: "Already on shelf", destination: "Rack 9", comments: "Pull all products forward, make it look full", priority: "Normal", estimatedTime: "~10 min", status: "available", assignedTo: "", assignedName: "", tags: ["Warehouse", "General"], createdAt: Date.now() },
  { id: "t3", name: "Door 1 — Fill Yogurt", item: "Yogurt cups", action: "Fill", source: "Walk-in fridge", destination: "Door 1", comments: "Check expiration dates, oldest in front", priority: "High", estimatedTime: "~12 min", status: "available", assignedTo: "", assignedName: "", tags: ["Fridge", "Cool"], createdAt: Date.now() },
  { id: "t4", name: "Rack 15 — Stock Beans", item: "Great Northern Beans (silver bags)", action: "Fill", source: "Donation bins in warehouse", destination: "Rack 15", comments: "Move peanut butter to Rack 18 first, then fill with beans", priority: "Urgent", estimatedTime: "~20 min", status: "available", assignedTo: "", assignedName: "", tags: ["Warehouse", "Sorting"], createdAt: Date.now() },
];

// ── Firebase serialisation helpers ───────────────────────────────────────────
// Firebase doesn't store arrays — tasks are keyed by task.id

function tasksToFirebase(tasksArray) {
  const obj = {};
  for (const t of tasksArray) {
    const clean = {};
    for (const [k, v] of Object.entries(t)) {
      if (v !== undefined) clean[k] = v;
    }
    obj[t.id] = clean;
  }
  return obj;
}

function tasksFromFirebase(snap) {
  if (!snap) return null;
  return Object.values(snap);
}

function completedTasksToFirebase(arr) {
  const obj = {};
  arr.forEach((entry, i) => {
    const key = entry.completedAtMs ? String(entry.completedAtMs) : String(i);
    const clean = {};
    for (const [k, v] of Object.entries(entry)) {
      if (v !== undefined) clean[k] = v;
    }
    obj[key] = clean;
  });
  return obj;
}

function completedTasksFromFirebase(snap) {
  if (!snap) return [];
  return Object.values(snap).sort((a, b) => (a.completedAtMs || 0) - (b.completedAtMs || 0));
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export function useSharedTasks(pantryId) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [tasks, setTasks] = useState(SEED_TASKS);
  const [shiftLeader, _setShiftLeader] = useState(null);
  const [completedTasks, _setCompletedTasks] = useState([]);
  const [session, _setSession] = useState(null);
  const [synced, setSynced] = useState(false);
  const [error, setError] = useState(false);

  // Ref mirrors so write callbacks always see current values without stale closures
  const tasksRef     = useRef(SEED_TASKS);
  const slRef        = useRef(null);
  const ctRef        = useRef([]);
  const sessionRef   = useRef(null);
  const endTimerRef  = useRef(null);
  // pantryIdRef lets callbacks always read the latest pantryId without deps churn
  const pantryIdRef  = useRef(pantryId);

  useEffect(() => { pantryIdRef.current = pantryId; }, [pantryId]);

  function updateTasks(val)          { tasksRef.current = val;     setTasks(val); }
  function updateShiftLeader(val)    { slRef.current = val;        _setShiftLeader(val); }
  function updateCompletedTasks(val) { ctRef.current = val;        _setCompletedTasks(val); }
  function updateSession(val)        { sessionRef.current = val;   _setSession(val); }

  // ── Real-time listeners ───────────────────────────────────────────────────
  useEffect(() => {
    if (!pantryId) return; // no-op until pantryId is available

    const base = `pantries/${pantryId}`;

    // tasks listener
    const unsubTasks = onValue(
      ref(db, `${base}/tasks`),
      (snap) => {
        const data = snap.val();
        if (data === null) {
          // First load — seed Firebase with default tasks
          const seed = SEED_TASKS.map(t => ({ ...t, createdAt: Date.now() }));
          set(ref(db, `${base}/tasks`), tasksToFirebase(seed));
          updateTasks(seed);
        } else {
          const arr = tasksFromFirebase(data);
          updateTasks(arr && arr.length > 0 ? arr : SEED_TASKS);
        }
        setSynced(true);
        setError(false);
      },
      (err) => { console.error("Firebase tasks error:", err); setError(true); }
    );

    // shiftLeader listener
    const unsubSL = onValue(
      ref(db, `${base}/shiftLeader`),
      (snap) => { updateShiftLeader(snap.val() || null); },
      (err) => { console.error("Firebase shiftLeader error:", err); }
    );

    // completedTasks listener
    const unsubCT = onValue(
      ref(db, `${base}/completedTasks`),
      (snap) => { updateCompletedTasks(completedTasksFromFirebase(snap.val())); },
      (err) => { console.error("Firebase completedTasks error:", err); }
    );

    // session/current listener
    const unsubSession = onValue(
      ref(db, `${base}/session/current`),
      (snap) => { updateSession(snap.val() || null); },
      (err) => { console.error("Firebase session error:", err); }
    );

    return () => {
      unsubTasks();
      unsubSL();
      unsubCT();
      unsubSession();
    };
  }, [pantryId]);

  // Auto-end timed sessions when endTime is reached
  useEffect(() => {
    if (endTimerRef.current) { clearTimeout(endTimerRef.current); endTimerRef.current = null; }
    if (!session?.isActive || session.type !== "timed" || !session.endTime) return;
    const msLeft = session.endTime - Date.now();
    if (msLeft <= 0) {
      endSession();
      return;
    }
    endTimerRef.current = setTimeout(() => { endSession(); }, msLeft);
    return () => { if (endTimerRef.current) clearTimeout(endTimerRef.current); };
  }, [session?.isActive, session?.endTime]);

  // ── Write helpers (use pantryIdRef.current so they're always fresh) ────────
  async function writeTasks(arr) {
    await set(ref(db, `pantries/${pantryIdRef.current}/tasks`), tasksToFirebase(arr));
  }

  async function writeShiftLeader(sl) {
    if (sl === null) {
      await remove(ref(db, `pantries/${pantryIdRef.current}/shiftLeader`));
    } else {
      await set(ref(db, `pantries/${pantryIdRef.current}/shiftLeader`), sl);
    }
  }

  async function writeCompletedTasks(arr) {
    if (arr.length === 0) {
      await remove(ref(db, `pantries/${pantryIdRef.current}/completedTasks`));
    } else {
      await set(ref(db, `pantries/${pantryIdRef.current}/completedTasks`), completedTasksToFirebase(arr));
    }
  }

  // ── Public actions ────────────────────────────────────────────────────────

  // Create a new task
  const createTask = useCallback(async (taskData) => {
    const newTask = {
      id: "t" + Date.now(),
      name: (taskData.destination ? taskData.destination + " — " : "") + taskData.item,
      item: taskData.item || "",
      action: taskData.action || "",
      source: taskData.source || "",
      destination: taskData.destination || "",
      comments: taskData.comments || "",
      priority: taskData.priority || "Normal",
      estimatedTime: taskData.estimatedTime || "~15 min",
      status: "available",
      assignedTo: taskData.assignedTo || taskData.assignTo || "",
      assignedName: taskData.assignedName || "",
      tags: taskData.tags || [],
      createdAt: Date.now(),
    };
    const updated = [...tasksRef.current, newTask];
    updateTasks(updated);
    await writeTasks(updated);
    return newTask;
  }, []);

  // Claim a task — extraFields is optional { claimedByName, claimedByType, sessionToken }
  const claimTask = useCallback(async (taskId, volunteerId, volunteerName, extraFields = {}) => {
    const updated = tasksRef.current.map(t =>
      t.id === taskId
        ? { ...t, status: "in-progress", assignedTo: volunteerId, assignedName: volunteerName, claimedAt: Date.now(), ...extraFields }
        : t
    );
    updateTasks(updated);
    await writeTasks(updated);
  }, []);

  // Complete a task — removes it from tasks, writes entry to completedTasks/${taskId}
  const completeTask = useCallback(async (taskId, completedBy) => {
    const completedTask = tasksRef.current.find(t => t.id === taskId);
    // Remove the completed task from the tasks array entirely
    const updated = tasksRef.current.filter(t => t.id !== taskId);
    const isShiftLeaderTask = completedTask && (completedTask.tags || []).includes("Shift Leader");
    const newShiftLeader = isShiftLeaderTask ? null : slRef.current;

    const now = new Date();
    const historyEntry = completedTask ? {
      id: completedTask.id,
      name: completedTask.name,
      tags: completedTask.tags || [],
      source: completedTask.source || "",
      destination: completedTask.destination || "",
      completedBy: completedBy || completedTask.claimedByName || completedTask.assignedName || completedTask.assignedTo || "Unknown",
      ...(completedTask.claimedByName ? { claimedByName: completedTask.claimedByName } : {}),
      completedAt: now.getTime(),
      completedAtMs: now.getTime(),
      sessionDate: now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    } : null;

    const newCompletedTasks = historyEntry
      ? [...ctRef.current, historyEntry]
      : ctRef.current;

    updateTasks(updated);
    if (isShiftLeaderTask) updateShiftLeader(null);
    updateCompletedTasks(newCompletedTasks);

    await Promise.all([
      // Remove task from pantries/${pantryId}/tasks/${taskId}
      remove(ref(db, `pantries/${pantryIdRef.current}/tasks/${taskId}`)),
      writeShiftLeader(newShiftLeader),
      // Write entry to pantries/${pantryId}/completedTasks/${taskId}
      historyEntry
        ? set(ref(db, `pantries/${pantryIdRef.current}/completedTasks/${taskId}`), historyEntry)
        : Promise.resolve(),
    ]);
  }, []);

  // Delete a task (manager only)
  const deleteTask = useCallback(async (taskId) => {
    const updated = tasksRef.current.filter(t => t.id !== taskId);
    updateTasks(updated);
    await remove(ref(db, `pantries/${pantryIdRef.current}/tasks/${taskId}`));
  }, []);

  // Update a task's editable fields (manager only)
  const updateTask = useCallback(async (taskId, updates) => {
    const updated = tasksRef.current.map(t => t.id === taskId ? { ...t, ...updates } : t);
    updateTasks(updated);
    const task = updated.find(t => t.id === taskId);
    if (task) await set(ref(db, `pantries/${pantryIdRef.current}/tasks/${taskId}`), task);
  }, []);

  // Mark a task as incomplete — clears assignedTo/assignedName/claimedAt and volunteer fields
  const markTaskIncomplete = useCallback(async (taskId) => {
    const updated = tasksRef.current.map(t => {
      if (t.id !== taskId) return t;
      const { claimedAt, claimedByName, claimedByType, sessionToken, ...rest } = t;
      return { ...rest, status: "incomplete", assignedTo: "", assignedName: "" };
    });
    updateTasks(updated);
    await writeTasks(updated);
  }, []);

  // Reset to seed tasks (manager only — for demo reset)
  const resetTasks = useCallback(async () => {
    const fresh = SEED_TASKS.map(t => ({
      ...t,
      status: "available",
      assignedTo: "",
      assignedName: "",
      createdAt: Date.now(),
    }));
    updateTasks(fresh);
    updateShiftLeader(null);
    updateCompletedTasks([]);
    await Promise.all([
      writeTasks(fresh),
      remove(ref(db, `pantries/${pantryIdRef.current}/shiftLeader`)),
      remove(ref(db, `pantries/${pantryIdRef.current}/completedTasks`)),
    ]);
  }, []);

  // Set the current shift leader (called after claiming a Shift Leader task)
  const setShiftLeader = useCallback(async ({ name, taskId }) => {
    const sl = { name, taskId };
    updateShiftLeader(sl);
    await writeShiftLeader(sl);
  }, []);

  // Manually clear the shift leader
  const clearShiftLeader = useCallback(async () => {
    updateShiftLeader(null);
    await remove(ref(db, `pantries/${pantryIdRef.current}/shiftLeader`));
  }, []);

  // Clear all task history (manager only)
  const clearCompletedTasks = useCallback(async () => {
    updateCompletedTasks([]);
    await remove(ref(db, `pantries/${pantryIdRef.current}/completedTasks`));
  }, []);

  // Start a session
  const startSession = useCallback(async ({ type, startTime, endTime }) => {
    const now = new Date();
    const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    const date = now.toISOString().slice(0, 10);
    const sessionData = {
      isActive: true,
      type,
      startTime: startTime || Date.now(),
      endTime: type === "timed" ? endTime : null,
      dayOfWeek,
      date,
    };
    if (type === "timed" && startTime && endTime) {
      const startStr = new Date(startTime).toTimeString().slice(0, 5);
      const endStr   = new Date(endTime).toTimeString().slice(0, 5);
      await set(
        ref(db, `pantries/${pantryIdRef.current}/sessionSettings/${dayOfWeek}`),
        { defaultStartTime: startStr, defaultEndTime: endStr }
      );
    }
    updateSession(sessionData);
    await set(ref(db, `pantries/${pantryIdRef.current}/session/current`), sessionData);
  }, []);

  // End a session — mark all in-progress/incomplete tasks as rolled over
  const endSession = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const updated = tasksRef.current.map(t => {
      if (t.status !== "in-progress" && t.status !== "incomplete") return t;
      const { claimedAt, claimedByName, claimedByType, sessionToken, ...rest } = t;
      return { ...rest, status: "incomplete", assignedTo: "", assignedName: "", rolledOver: true, rolledOverFrom: today };
    });
    const closedSession = { ...(sessionRef.current || {}), isActive: false };
    updateTasks(updated);
    updateSession(closedSession);
    await Promise.all([
      writeTasks(updated),
      set(ref(db, `pantries/${pantryIdRef.current}/session/current`), closedSession),
    ]);
  }, []);

  // ── Return empty no-op state if pantryId not yet available ────────────────
  // (All hooks above are called unconditionally to satisfy Rules of Hooks)
  if (!pantryId) {
    return {
      tasks: [], shiftLeader: null, completedTasks: [], session: null,
      synced: false, error: false,
      createTask:         async () => {},
      claimTask:          async () => {},
      completeTask:       async () => {},
      deleteTask:         async () => {},
      updateTask:         async () => {},
      resetTasks:         async () => {},
      setShiftLeader:     async () => {},
      clearShiftLeader:   async () => {},
      clearCompletedTasks: async () => {},
      markTaskIncomplete: async () => {},
      startSession:       async () => {},
      endSession:         async () => {},
    };
  }

  return {
    tasks, shiftLeader, completedTasks, session, synced, error,
    createTask, claimTask, completeTask, deleteTask, updateTask, resetTasks,
    setShiftLeader, clearShiftLeader, clearCompletedTasks,
    markTaskIncomplete, startSession, endSession,
  };
}
