const memoryStore = new Map<string, string>();

const hasWindowStorage = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readRaw = (key: string): string | null => {
  if (hasWindowStorage()) {
    return window.localStorage.getItem(key);
  }

  return memoryStore.get(key) ?? null;
};

const writeRaw = (key: string, value: string): void => {
  if (hasWindowStorage()) {
    window.localStorage.setItem(key, value);
    return;
  }

  memoryStore.set(key, value);
};

export const readJson = <T>(key: string): T | null => {
  const value = readRaw(key);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const writeJson = (key: string, value: unknown): void => {
  writeRaw(key, JSON.stringify(value));
};

export const removeKey = (key: string): void => {
  if (hasWindowStorage()) {
    window.localStorage.removeItem(key);
    return;
  }

  memoryStore.delete(key);
};

export const clearStore = (): void => {
  if (hasWindowStorage()) {
    window.localStorage.clear();
    return;
  }

  memoryStore.clear();
};
