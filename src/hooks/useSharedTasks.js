// useSharedTasks.js
// Real-time shared state via Firebase Realtime Database.
// onValue listeners push updates to all connected clients instantly.

import { useState, useEffect, useCallback, useRef } from "react";
import { db } from "../firebase";
import { ref, onValue, set, remove } from "firebase/database";

// ── Named volunteer profiles ──────────────────────────────────────────────────
export const VOLUNTEER_PROFILES = [
  { id: "1001", name: "Volunteer 1" },
  { id: "1002", name: "Volunteer 2" },
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

// ── Firebase path helpers ─────────────────────────────────────────────────────
// Firebase doesn't store arrays — tasks are keyed by task.id under "tasks/"
// e.g. tasks/t1 = { id:"t1", name:..., ... }

function tasksToFirebase(tasksArray) {
  const obj = {};
  for (const t of tasksArray) {
    // Firebase doesn't allow undefined values — strip them out
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
  // Store as object keyed by index-safe key (use completedAtMs or index)
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

// ── Main hook ────────────────────────────────────────────────────────────────
export function useSharedTasks() {
  const [tasks, setTasks] = useState(SEED_TASKS);
  const [shiftLeader, _setShiftLeader] = useState(null);
  const [completedTasks, _setCompletedTasks] = useState([]);
  const [synced, setSynced] = useState(false);
  const [error, setError] = useState(false);

  // Ref mirrors so write callbacks always see current values without stale closures
  const tasksRef = useRef(SEED_TASKS);
  const slRef = useRef(null);
  const ctRef = useRef([]);

  function updateTasks(val) { tasksRef.current = val; setTasks(val); }
  function updateShiftLeader(val) { slRef.current = val; _setShiftLeader(val); }
  function updateCompletedTasks(val) { ctRef.current = val; _setCompletedTasks(val); }

  // ── Real-time listeners ───────────────────────────────────────────────────
  useEffect(() => {
    // tasks/ listener
    const unsubTasks = onValue(
      ref(db, "tasks"),
      (snap) => {
        const data = snap.val();
        if (data === null) {
          // First load — seed Firebase with default tasks
          const seed = SEED_TASKS.map(t => ({ ...t, createdAt: Date.now() }));
          set(ref(db, "tasks"), tasksToFirebase(seed));
          updateTasks(seed);
        } else {
          const arr = tasksFromFirebase(data);
          updateTasks(arr && arr.length > 0 ? arr : SEED_TASKS);
        }
        setSynced(true);
        setError(false);
      },
      (err) => {
        console.error("Firebase tasks error:", err);
        setError(true);
      }
    );

    // shiftLeader/ listener
    const unsubSL = onValue(
      ref(db, "shiftLeader"),
      (snap) => { updateShiftLeader(snap.val() || null); },
      (err) => { console.error("Firebase shiftLeader error:", err); }
    );

    // completedTasks/ listener
    const unsubCT = onValue(
      ref(db, "completedTasks"),
      (snap) => { updateCompletedTasks(completedTasksFromFirebase(snap.val())); },
      (err) => { console.error("Firebase completedTasks error:", err); }
    );

    return () => {
      unsubTasks();
      unsubSL();
      unsubCT();
    };
  }, []);

  // ── Write helpers ─────────────────────────────────────────────────────────
  async function writeTasks(arr) {
    await set(ref(db, "tasks"), tasksToFirebase(arr));
  }

  async function writeShiftLeader(sl) {
    if (sl === null) {
      await remove(ref(db, "shiftLeader"));
    } else {
      await set(ref(db, "shiftLeader"), sl);
    }
  }

  async function writeCompletedTasks(arr) {
    if (arr.length === 0) {
      await remove(ref(db, "completedTasks"));
    } else {
      await set(ref(db, "completedTasks"), completedTasksToFirebase(arr));
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

  // Claim a task
  const claimTask = useCallback(async (taskId, volunteerId, volunteerName) => {
    const updated = tasksRef.current.map(t =>
      t.id === taskId
        ? { ...t, status: "in-progress", assignedTo: volunteerId, assignedName: volunteerName, claimedAt: Date.now() }
        : t
    );
    updateTasks(updated);
    await writeTasks(updated);
  }, []);

  // Complete a task — records history, auto-clears shiftLeader if Shift Leader task
  const completeTask = useCallback(async (taskId, completedBy) => {
    const completedTask = tasksRef.current.find(t => t.id === taskId);
    const updated = tasksRef.current.map(t =>
      t.id === taskId ? { ...t, status: "complete", completedAt: Date.now() } : t
    );
    const isShiftLeaderTask = completedTask && (completedTask.tags || []).includes("Shift Leader");
    const newShiftLeader = isShiftLeaderTask ? null : slRef.current;

    // Build history entry
    const historyEntry = completedTask ? {
      id: completedTask.id,
      name: completedTask.name,
      tags: completedTask.tags || [],
      completedBy: completedBy || completedTask.assignedName || completedTask.assignedTo || "Unknown",
      completedAt: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      completedAtMs: Date.now(),
    } : null;

    const newCompletedTasks = historyEntry
      ? [...ctRef.current, historyEntry]
      : ctRef.current;

    updateTasks(updated);
    if (isShiftLeaderTask) updateShiftLeader(null);
    updateCompletedTasks(newCompletedTasks);

    // Write all three paths in parallel
    await Promise.all([
      writeTasks(updated),
      writeShiftLeader(newShiftLeader),
      writeCompletedTasks(newCompletedTasks),
    ]);
  }, []);

  // Delete a task (manager only)
  const deleteTask = useCallback(async (taskId) => {
    const updated = tasksRef.current.filter(t => t.id !== taskId);
    updateTasks(updated);
    // Remove the specific task node rather than rewriting all tasks
    await remove(ref(db, `tasks/${taskId}`));
  }, []);

  // Reset to seed tasks (manager only — for demo reset)
  const resetTasks = useCallback(async () => {
    const fresh = SEED_TASKS.map(t => ({
      ...t,
      id: "t" + Date.now() + Math.random(),
      status: "available",
      assignedTo: "",
      assignedName: "",
      createdAt: Date.now(),
    }));
    updateTasks(fresh);
    updateShiftLeader(null);
    await Promise.all([
      writeTasks(fresh),
      remove(ref(db, "shiftLeader")),
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
    await remove(ref(db, "shiftLeader"));
  }, []);

  // Clear all task history (manager only)
  const clearCompletedTasks = useCallback(async () => {
    updateCompletedTasks([]);
    await remove(ref(db, "completedTasks"));
  }, []);

  return {
    tasks, shiftLeader, completedTasks, synced, error,
    createTask, claimTask, completeTask, deleteTask, resetTasks,
    setShiftLeader, clearShiftLeader, clearCompletedTasks,
  };
}
