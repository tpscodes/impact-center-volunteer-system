// useSharedTasks.js
// Simple shared state via JSONBin.io polling — no Firebase, no backend.
// All devices on same network poll every 2.5 seconds.

import { useState, useEffect, useCallback, useRef } from "react";

const BIN_ID = "69a7a3c7d0ea881f40eca986";
const API_KEY = "$2a$10$dmSINC.eIcDCRnQgrEyGyeVbmUAsH1dcSQfvfMWfGpMEzjzxXyuXu";
const POLL_INTERVAL = 2500; // ms

const BASE_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
const HEADERS = {
  "Content-Type": "application/json",
  "X-Master-Key": API_KEY,
  "X-Bin-Meta": "false",
};

// ── Initial seed tasks from Jason's real task lists ──────────────────────────
export const SEED_TASKS = [
  { id: "t1", name: "Rack 7 — Fill Coffee", item: "Coffee bags", action: "Fill", source: "Warehouse — Green shelf", destination: "Rack 7", comments: "Front shelf when done", priority: "High", estimatedTime: "~15 min", status: "available", assignedTo: "", assignedName: "", tags: ["Warehouse", "Warm"], createdAt: Date.now() },
  { id: "t2", name: "Rack 9 — Front Cereal", item: "Cereal boxes", action: "Front up", source: "Already on shelf", destination: "Rack 9", comments: "Pull all products forward, make it look full", priority: "Normal", estimatedTime: "~10 min", status: "available", assignedTo: "", assignedName: "", tags: ["Warehouse", "General"], createdAt: Date.now() },
  { id: "t3", name: "Door 1 — Fill Yogurt", item: "Yogurt cups", action: "Fill", source: "Walk-in fridge", destination: "Door 1", comments: "Check expiration dates, oldest in front", priority: "High", estimatedTime: "~12 min", status: "available", assignedTo: "", assignedName: "", tags: ["Fridge", "Cool"], createdAt: Date.now() },
  { id: "t4", name: "Rack 15 — Stock Beans", item: "Great Northern Beans (silver bags)", action: "Fill", source: "Donation bins in warehouse", destination: "Rack 15", comments: "Move peanut butter to Rack 18 first, then fill with beans", priority: "Urgent", estimatedTime: "~20 min", status: "available", assignedTo: "", assignedName: "", tags: ["Warehouse", "Sorting"], createdAt: Date.now() },
];

// ── Fetch full bin (tasks + shiftLeader + completedTasks) ─────────────────────
async function fetchBin() {
  try {
    const res = await fetch(BASE_URL + "/latest", { headers: HEADERS });
    if (!res.ok) return null; // treat 4xx/5xx (incl. 429 rate-limit) as failure
    const data = await res.json();
    return {
      tasks: data.tasks || [],
      shiftLeader: data.shiftLeader || null,
      completedTasks: data.completedTasks || [],
    };
  } catch {
    return null;
  }
}

// ── Save full bin ─────────────────────────────────────────────────────────────
async function saveBin(tasks, shiftLeader, completedTasks) {
  try {
    const res = await fetch(BASE_URL, {
      method: "PUT",
      headers: HEADERS,
      body: JSON.stringify({ tasks, shiftLeader, completedTasks }),
    });
    return res.ok; // false on 4xx/5xx so callers know the save failed
  } catch {
    return false;
  }
}

// ── Main hook ────────────────────────────────────────────────────────────────
export function useSharedTasks() {
  const [tasks, setTasks] = useState(SEED_TASKS);
  const [shiftLeader, _setShiftLeader] = useState(null);
  const [completedTasks, _setCompletedTasks] = useState([]);
  const [synced, setSynced] = useState(false);
  const [error, setError] = useState(false);
  const pendingWrite = useRef(false);

  // Ref mirrors so all useCallback closures always see current values
  const slRef = useRef(null);
  const ctRef = useRef([]);

  function updateShiftLeader(val) {
    slRef.current = val;
    _setShiftLeader(val);
  }

  function updateCompletedTasks(val) {
    ctRef.current = val;
    _setCompletedTasks(val);
  }

  // Poll for remote changes
  useEffect(() => {
    let alive = true;

    async function poll() {
      if (pendingWrite.current) return;
      const remote = await fetchBin();
      if (!alive) return;
      if (remote === null) { setError(true); return; }
      setError(false);
      setSynced(true);
      setTasks(remote.tasks.length > 0 ? remote.tasks : SEED_TASKS);
      updateShiftLeader(remote.shiftLeader || null);
      updateCompletedTasks(remote.completedTasks || []);
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => { alive = false; clearInterval(interval); };
  }, []);

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
    pendingWrite.current = true;
    const updated = [...tasks, newTask];
    setTasks(updated);
    await saveBin(updated, slRef.current, ctRef.current);
    pendingWrite.current = false;
    return newTask;
  }, [tasks]);

  // Claim a task
  const claimTask = useCallback(async (taskId, volunteerId, volunteerName) => {
    pendingWrite.current = true;
    const updated = tasks.map(t =>
      t.id === taskId
        ? { ...t, status: "in-progress", assignedTo: volunteerId, assignedName: volunteerName, claimedAt: Date.now() }
        : t
    );
    setTasks(updated);
    await saveBin(updated, slRef.current, ctRef.current);
    pendingWrite.current = false;
  }, [tasks]);

  // Complete a task — records history entry, auto-clears shiftLeader if task has "Shift Leader" tag
  const completeTask = useCallback(async (taskId, completedBy) => {
    pendingWrite.current = true;
    const completedTask = tasks.find(t => t.id === taskId);
    const updated = tasks.map(t =>
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

    setTasks(updated);
    if (isShiftLeaderTask) updateShiftLeader(null);
    updateCompletedTasks(newCompletedTasks);
    await saveBin(updated, newShiftLeader, newCompletedTasks);
    pendingWrite.current = false;
  }, [tasks]);

  // Delete a task (manager only)
  const deleteTask = useCallback(async (taskId) => {
    pendingWrite.current = true;
    const updated = tasks.filter(t => t.id !== taskId);
    setTasks(updated);
    await saveBin(updated, slRef.current, ctRef.current);
    pendingWrite.current = false;
  }, [tasks]);

  // Reset to seed tasks (manager only — for demo reset)
  const resetTasks = useCallback(async () => {
    pendingWrite.current = true;
    const fresh = SEED_TASKS.map(t => ({ ...t, id: "t" + Date.now() + Math.random(), status: "available", assignedTo: "", assignedName: "", createdAt: Date.now() }));
    setTasks(fresh);
    updateShiftLeader(null);
    await saveBin(fresh, null, ctRef.current);
    pendingWrite.current = false;
  }, []);

  // Set the current shift leader (called after claiming a Shift Leader task)
  const setShiftLeader = useCallback(async ({ name, taskId }) => {
    pendingWrite.current = true;
    const sl = { name, taskId };
    updateShiftLeader(sl);
    await saveBin(tasks, sl, ctRef.current);
    pendingWrite.current = false;
  }, [tasks]);

  // Manually clear the shift leader
  const clearShiftLeader = useCallback(async () => {
    pendingWrite.current = true;
    updateShiftLeader(null);
    await saveBin(tasks, null, ctRef.current);
    pendingWrite.current = false;
  }, [tasks]);

  // Clear all task history (manager only)
  const clearCompletedTasks = useCallback(async () => {
    pendingWrite.current = true;
    updateCompletedTasks([]);
    await saveBin(tasks, slRef.current, []);
    pendingWrite.current = false;
  }, [tasks]);

  return {
    tasks, shiftLeader, completedTasks, synced, error,
    createTask, claimTask, completeTask, deleteTask, resetTasks,
    setShiftLeader, clearShiftLeader, clearCompletedTasks,
  };
}
