export type EnergyTag = "focused" | "deep_work" | "tired" | "distracted";

export const ENTRY_ENERGY_STORAGE_KEY = "devJournal_entry_energy_tags";
export const ENTRY_ENERGY_UPDATED_EVENT = "devJournal:energyTagUpdated";
export const APP_USAGE_STORAGE_KEY = "devJournal_app_usage_seconds";
export const APP_USAGE_UPDATED_EVENT = "devJournal:usageUpdated";

const ENERGY_TAGS = new Set<EnergyTag>([
  "focused",
  "deep_work",
  "tired",
  "distracted",
]);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const dispatchWindowEvent = (eventName: string) => {
  window.dispatchEvent(new CustomEvent(eventName));
};

export const readEntryEnergyMap = (): Record<string, EnergyTag> => {
  try {
    const raw = localStorage.getItem(ENTRY_ENERGY_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isPlainObject(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce<Record<string, EnergyTag>>((acc, [date, value]) => {
      if (date.length > 0 && typeof value === "string" && ENERGY_TAGS.has(value as EnergyTag)) {
        acc[date] = value as EnergyTag;
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
};

export const writeEntryEnergyMap = (value: Record<string, EnergyTag>) => {
  localStorage.setItem(ENTRY_ENERGY_STORAGE_KEY, JSON.stringify(value));
  dispatchWindowEvent(ENTRY_ENERGY_UPDATED_EVENT);
};

export const writeEntryEnergyTag = (date: string, value: EnergyTag | null) => {
  const next = readEntryEnergyMap();

  if (value) {
    next[date] = value;
  } else {
    delete next[date];
  }

  writeEntryEnergyMap(next);
};

export const readAppUsageMap = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(APP_USAGE_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isPlainObject(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce<Record<string, number>>((acc, [date, value]) => {
      if (date.length > 0 && typeof value === "number" && Number.isFinite(value) && value >= 0) {
        acc[date] = Math.round(value);
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
};

export const writeAppUsageMap = (value: Record<string, number>) => {
  localStorage.setItem(APP_USAGE_STORAGE_KEY, JSON.stringify(value));
  dispatchWindowEvent(APP_USAGE_UPDATED_EVENT);
};
