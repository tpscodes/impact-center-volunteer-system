// useSharedTasks.js
// Simple shared state via JSONBin.io polling — no Firebase, no backend.
// All devices on same network poll every 2.5 seconds.
//
// SETUP (takes 2 minutes):
// 1. Go to https://jsonbin.io → Sign up free
// 2. Create a new bin with this initial JSON: { "tasks": [] }
// 3. Copy the Bin ID and your API Key
// 4. Replace BIN_ID and API_KEY below

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
  { id: "t1", name: "Rack 7 — Fill Coffee", item: "Coffee bags", action: "Fill", source: "Warehouse — Green shelf", destination: "Rack 7", comments: "Front shelf when done", priority: "High", estimatedTime: "~15 min", status: "available", assignedTo: "", assignedName: "", createdAt: Date.now() },
  { id: "t2", name: "Rack 9 — Front Cereal", item: "Cereal boxes", action: "Front up", source: "Already on shelf", destination: "Rack 9", comments: "Pull all products forward, make it look full", priority: "Normal", estimatedTime: "~10 min", status: "available", assignedTo: "", assignedName: "", createdAt: Date.now() },
  { id: "t3", name: "Door 1 — Fill Yogurt", item: "Yogurt cups", action: "Fill", source: "Walk-in fridge", destination: "Door 1", comments: "Check expiration dates, oldest in front", priority: "High", estimatedTime: "~12 min", status: "available", assignedTo: "", assignedName: "", createdAt: Date.now() },
  { id: "t4", name: "Rack 15 — Stock Beans", item: "Great Northern Beans (silver bags)", action: "Fill", source: "Donation bins in warehouse", destination: "Rack 15", comments: "Move peanut butter to Rack 18 first, then fill with beans", priority: "Urgent", estimatedTime: "~20 min", status: "available", assignedTo: "", assignedName: "", createdAt: Date.now() },
];

// ── Fetch current tasks from JSONBin ─────────────────────────────────────────
async function fetchTasks() {
  try {
    const res = await fetch(BASE_URL + "/latest", { headers: HEADERS });
    const data = await res.json();
    return data.tasks || [];
  } catch {
    return null;
  }
}

// ── Save tasks to JSONBin ────────────────────────────────────────────────────
async function saveTasks(tasks) {
  try {
    await fetch(BASE_URL, {
      method: "PUT",
      headers: HEADERS,
      body: JSON.stringify({ tasks }),
    });
    return true;
  } catch {
    return false;
  }
}

// ── Main hook ────────────────────────────────────────────────────────────────
export function useSharedTasks() {
  const [tasks, setTasks] = useState(SEED_TASKS);
  const [synced, setSynced] = useState(false);
  const [error, setError] = useState(false);
  const pendingWrite = useRef(false);

  // Poll for remote changes
  useEffect(() => {
    let alive = true;

    async function poll() {
      if (pendingWrite.current) return; // skip poll during write
      const remote = await fetchTasks();
      if (!alive) return;
      if (remote === null) { setError(true); return; }
      setError(false);
      setSynced(true);
      setTasks(remote.length > 0 ? remote : SEED_TASKS);
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => { alive = false; clearInterval(interval); };
  }, []);

  // Create a new task — accepts both assignedTo and assignTo field names
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
      createdAt: Date.now(),
    };
    pendingWrite.current = true;
    const updated = [...tasks, newTask];
    setTasks(updated);
    await saveTasks(updated);
    pendingWrite.current = false;
    return newTask;
  }, [tasks]);

  // Claim a task (experienced volunteer)
  const claimTask = useCallback(async (taskId, volunteerId, volunteerName) => {
    pendingWrite.current = true;
    const updated = tasks.map(t =>
      t.id === taskId
        ? { ...t, status: "in-progress", assignedTo: volunteerId, assignedName: volunteerName, claimedAt: Date.now() }
        : t
    );
    setTasks(updated);
    await saveTasks(updated);
    pendingWrite.current = false;
  }, [tasks]);

  // Complete a task
  const completeTask = useCallback(async (taskId) => {
    pendingWrite.current = true;
    const updated = tasks.map(t =>
      t.id === taskId ? { ...t, status: "complete", completedAt: Date.now() } : t
    );
    setTasks(updated);
    await saveTasks(updated);
    pendingWrite.current = false;
  }, [tasks]);

  // Delete a task (manager only)
  const deleteTask = useCallback(async (taskId) => {
    pendingWrite.current = true;
    const updated = tasks.filter(t => t.id !== taskId);
    setTasks(updated);
    await saveTasks(updated);
    pendingWrite.current = false;
  }, [tasks]);

  // Reset to seed tasks (manager only — for demo reset)
  const resetTasks = useCallback(async () => {
    pendingWrite.current = true;
    const fresh = SEED_TASKS.map(t => ({ ...t, id: "t" + Date.now() + Math.random(), status: "available", assignedTo: "", assignedName: "", createdAt: Date.now() }));
    setTasks(fresh);
    await saveTasks(fresh);
    pendingWrite.current = false;
  }, []);

  return { tasks, synced, error, createTask, claimTask, completeTask, deleteTask, resetTasks };
}
