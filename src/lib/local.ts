"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Per-browser state for the MVP: the contributor's handle, which training
 * modules they passed, and which tasks they claimed. It lives in
 * localStorage, so it is not shared between devices yet. Shared accounts
 * and a real task queue are the next step on the roadmap.
 */
export interface LocalState {
  handle: string;
  passed: string[];
  claimed: { taskId: string; at: string }[];
}

const KEY = "playpen:v1";
const EMPTY: LocalState = { handle: "", passed: [], claimed: [] };
const listeners = new Set<() => void>();
let snapshot: LocalState | null = null;

function read(): LocalState {
  if (snapshot) return snapshot;
  try {
    const raw = window.localStorage.getItem(KEY);
    snapshot = raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    snapshot = EMPTY;
  }
  return snapshot!;
}

function write(next: LocalState) {
  snapshot = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked (private mode): keep state in memory for this visit.
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useLocalState() {
  const state = useSyncExternalStore(subscribe, read, () => EMPTY);
  const update = useCallback((fn: (s: LocalState) => LocalState) => write(fn(read())), []);
  return [state, update] as const;
}
