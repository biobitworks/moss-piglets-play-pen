import { mockTardigradeAdapter } from "./mock-tardigrade";
import type { DataAdapter } from "./types";

/**
 * Registry of data sources. To plug in Tardimap (or a FlyWire slice), write
 * an adapter that returns a `Dataset`, add it here, and set the
 * PLAYPEN_DATA_SOURCE environment variable in Vercel to its id.
 */
const adapters: Record<string, DataAdapter> = {
  [mockTardigradeAdapter.id]: mockTardigradeAdapter,
};

export function getAdapter(): DataAdapter {
  const id = process.env.PLAYPEN_DATA_SOURCE ?? mockTardigradeAdapter.id;
  return adapters[id] ?? mockTardigradeAdapter;
}

export async function getDataset() {
  return getAdapter().getDataset();
}

export * from "./types";
export * from "./summary";
export * from "./tasks";
