class MemoryStorage implements Storage {
  private readonly store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  key(index: number) {
    return [...this.store.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

export const installBrowserMocks = () => {
  const events: string[] = [];
  const storage = new MemoryStorage();
  const windowMock = {
    dispatchEvent(event: Event) {
      events.push(event.type);
      return true;
    },
    addEventListener() {
      return undefined;
    },
    removeEventListener() {
      return undefined;
    },
  } as unknown as Window;

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
    writable: true,
  });

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: windowMock,
    writable: true,
  });

  return {
    events,
    storage,
    reset() {
      storage.clear();
      events.length = 0;
    },
  };
};
