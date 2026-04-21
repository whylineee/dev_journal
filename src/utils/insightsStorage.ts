const ADR_STORAGE_KEY = "devJournal_insights_adr_records";
const INCIDENTS_STORAGE_KEY = "devJournal_insights_incident_records";
const DEBUG_STORAGE_KEY = "devJournal_insights_debug_sessions";
const QUICK_CAPTURE_STORAGE_KEY = "devJournal_insights_quick_capture";

export interface AdrRecord {
  id: string;
  title: string;
  problem: string;
  decision: string;
  rationale: string;
  consequences: string;
  created_at: string;
  review_date: string;
}

export interface IncidentRecord {
  id: string;
  title: string;
  severity: string;
  symptoms: string;
  root_cause: string;
  fix: string;
  prevention: string;
  created_at: string;
}

export interface DebugSession {
  id: string;
  title: string;
  symptoms: string;
  hypotheses: string;
  checks: string;
  conclusion: string;
  created_at: string;
}

export interface QuickCaptureRecord {
  id: string;
  raw_text: string;
  structured_text: string;
  created_at: string;
}

const isValidAdrRecord = (item: unknown): item is AdrRecord =>
  typeof item === "object" &&
  item !== null &&
  typeof (item as AdrRecord).id === "string" &&
  typeof (item as AdrRecord).title === "string" &&
  typeof (item as AdrRecord).problem === "string" &&
  typeof (item as AdrRecord).decision === "string" &&
  typeof (item as AdrRecord).rationale === "string" &&
  typeof (item as AdrRecord).consequences === "string" &&
  typeof (item as AdrRecord).created_at === "string" &&
  typeof (item as AdrRecord).review_date === "string";

const isValidIncidentRecord = (item: unknown): item is IncidentRecord =>
  typeof item === "object" &&
  item !== null &&
  typeof (item as IncidentRecord).id === "string" &&
  typeof (item as IncidentRecord).title === "string" &&
  typeof (item as IncidentRecord).severity === "string" &&
  typeof (item as IncidentRecord).symptoms === "string" &&
  typeof (item as IncidentRecord).root_cause === "string" &&
  typeof (item as IncidentRecord).fix === "string" &&
  typeof (item as IncidentRecord).prevention === "string" &&
  typeof (item as IncidentRecord).created_at === "string";

const isValidDebugSession = (item: unknown): item is DebugSession =>
  typeof item === "object" &&
  item !== null &&
  typeof (item as DebugSession).id === "string" &&
  typeof (item as DebugSession).title === "string" &&
  typeof (item as DebugSession).symptoms === "string" &&
  typeof (item as DebugSession).hypotheses === "string" &&
  typeof (item as DebugSession).checks === "string" &&
  typeof (item as DebugSession).conclusion === "string" &&
  typeof (item as DebugSession).created_at === "string";

const isValidQuickCaptureRecord = (item: unknown): item is QuickCaptureRecord =>
  typeof item === "object" &&
  item !== null &&
  typeof (item as QuickCaptureRecord).id === "string" &&
  typeof (item as QuickCaptureRecord).raw_text === "string" &&
  typeof (item as QuickCaptureRecord).structured_text === "string" &&
  typeof (item as QuickCaptureRecord).created_at === "string";

const readRecords = <T>(storageKey: string, isValid: (item: unknown) => item is T): T[] => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    return Array.isArray(parsed) ? parsed.filter(isValid) : [];
  } catch {
    return [];
  }
};

const persistRecords = <T>(storageKey: string, records: T[]): void => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(records));
  } catch {
    // Keep storage writes best-effort so local persistence failures do not break the UI flow.
  }
};

export const readAdrRecords = (): AdrRecord[] => readRecords(ADR_STORAGE_KEY, isValidAdrRecord);

export const persistAdrRecords = (records: AdrRecord[]): void => {
  persistRecords(ADR_STORAGE_KEY, records);
};

export const readIncidents = (): IncidentRecord[] => {
  return readRecords(INCIDENTS_STORAGE_KEY, isValidIncidentRecord);
};

export const persistIncidents = (records: IncidentRecord[]): void => {
  persistRecords(INCIDENTS_STORAGE_KEY, records);
};

export const readDebugSessions = (): DebugSession[] => {
  return readRecords(DEBUG_STORAGE_KEY, isValidDebugSession);
};

export const persistDebugSessions = (sessions: DebugSession[]): void => {
  persistRecords(DEBUG_STORAGE_KEY, sessions);
};

export const readQuickCaptureRecords = (): QuickCaptureRecord[] => {
  return readRecords(QUICK_CAPTURE_STORAGE_KEY, isValidQuickCaptureRecord);
};

export const persistQuickCaptureRecords = (records: QuickCaptureRecord[]): void => {
  persistRecords(QUICK_CAPTURE_STORAGE_KEY, records);
};
