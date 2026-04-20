import { promises as fs } from "fs";
import path from "path";
import { kv } from "@vercel/kv";

export type SavedDecks = {
  king: number[] | null;
  usurper: number[] | null;
};

export type UserData = {
  playerName: string | null;
  lastNameChangedAt: string | null;
  decks: SavedDecks;
  updatedAt: string;
};

type UserDataMap = Record<string, UserData>;

const DATA_DIR = path.join(process.cwd(), ".game-data");
const RUNTIME_DATA_DIR = process.env.VERCEL ? "/tmp/game-data" : DATA_DIR;
const DATA_FILE = path.join(RUNTIME_DATA_DIR, "users.json");
let volatileStore: UserDataMap = {};
const hasKvConfig = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
const USER_KEY_PREFIX = "user";

async function ensureStore() {
  await fs.mkdir(RUNTIME_DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify({}, null, 2), "utf-8");
  }
}

async function readAll(): Promise<UserDataMap> {
  try {
    await ensureStore();
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as UserDataMap;
  } catch {
    // Fallback for restricted runtimes where file IO is unavailable.
    return volatileStore;
  }
}

async function writeAll(data: UserDataMap) {
  volatileStore = data;
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // Keep running with in-memory fallback.
  }
}

function createDefaultUserData(): UserData {
  return {
    playerName: null,
    lastNameChangedAt: null,
    decks: { king: null, usurper: null },
    updatedAt: new Date().toISOString(),
  };
}

function createUserStorageKey(userId: string): string {
  return `${USER_KEY_PREFIX}:${userId}`;
}

function normalizeUserData(data: UserData | null | undefined): UserData {
  return data ?? createDefaultUserData();
}

export async function getUserData(userId: string): Promise<UserData> {
  if (hasKvConfig) {
    try {
      const fromKv = await kv.get<UserData>(createUserStorageKey(userId));
      return normalizeUserData(fromKv);
    } catch {
      // Fall back to local/in-memory store when KV access fails.
    }
  }
  const all = await readAll();
  return normalizeUserData(all[userId]);
}

export async function updateUserData(userId: string, updater: (prev: UserData) => UserData): Promise<UserData> {
  if (hasKvConfig) {
    try {
      const key = createUserStorageKey(userId);
      const prev = normalizeUserData(await kv.get<UserData>(key));
      const next = updater(prev);
      const withUpdatedAt = { ...next, updatedAt: new Date().toISOString() };
      await kv.set(key, withUpdatedAt);
      return withUpdatedAt;
    } catch {
      // Fall back to local/in-memory store when KV access fails.
    }
  }

  const all = await readAll();
  const prev = normalizeUserData(all[userId]);
  const next = updater(prev);
  const withUpdatedAt = { ...next, updatedAt: new Date().toISOString() };
  all[userId] = withUpdatedAt;
  await writeAll(all);
  return withUpdatedAt;
}

