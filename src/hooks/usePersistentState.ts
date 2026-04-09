import { Dispatch, SetStateAction, useCallback, useEffect, useState } from "react";
import { PREFERENCES_APPLIED_EVENT } from "../utils/preferencesStorage";

const EMPTY_SYNC_EVENTS: string[] = [];

interface UsePersistentStateOptions<T> {
  storageKey: string;
  parse: (raw: string | null) => T;
  serialize: (value: T) => string;
  syncEvents?: string[];
}

export const usePersistentState = <T>({
  storageKey,
  parse,
  serialize,
  syncEvents = EMPTY_SYNC_EVENTS,
}: UsePersistentStateOptions<T>): [T, Dispatch<SetStateAction<T>>] => {
  const readValue = useCallback(() => parse(localStorage.getItem(storageKey)), [parse, storageKey]);
  const [value, setValue] = useState<T>(readValue);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, serialize(value));
    } catch { /* quota or private-mode guard */ }
  }, [serialize, storageKey, value]);

  useEffect(() => {
    const syncValue = () => {
      setValue(readValue());
    };

    const events = [PREFERENCES_APPLIED_EVENT, ...syncEvents];
    events.forEach((eventName) => window.addEventListener(eventName, syncValue));
    window.addEventListener("storage", syncValue);

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, syncValue));
      window.removeEventListener("storage", syncValue);
    };
  }, [readValue, syncEvents]);

  return [value, setValue];
};
