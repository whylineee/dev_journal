import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import { useI18n } from "../i18n/I18nContext";
import { useEntries } from "../hooks/useEntries";
import { useTasks } from "../hooks/useTasks";
import { format, isAfter, parseISO, subDays } from "date-fns";

interface AdrRecord {
  id: string;
  title: string;
  problem: string;
  decision: string;
  rationale: string;
  consequences: string;
  created_at: string;
  review_date: string;
}

interface IncidentRecord {
  id: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  symptoms: string;
  root_cause: string;
  fix: string;
  prevention: string;
  created_at: string;
}

interface DebugSession {
  id: string;
  title: string;
  symptoms: string;
  hypotheses: string;
  checks: string;
  conclusion: string;
  created_at: string;
}

interface QuickCaptureRecord {
  id: string;
  raw_text: string;
  structured_text: string;
  created_at: string;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

const ADR_STORAGE_KEY = "devJournal_insights_adr_records";
const INCIDENTS_STORAGE_KEY = "devJournal_insights_incident_records";
const DEBUG_STORAGE_KEY = "devJournal_insights_debug_sessions";
const QUICK_CAPTURE_STORAGE_KEY = "devJournal_insights_quick_capture";

const readAdrRecords = (): AdrRecord[] => {
  try {
    const raw = localStorage.getItem(ADR_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as AdrRecord[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item) =>
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.problem === "string" &&
        typeof item.decision === "string" &&
        typeof item.rationale === "string" &&
        typeof item.consequences === "string" &&
        typeof item.created_at === "string" &&
        typeof item.review_date === "string"
    );
  } catch {
    return [];
  }
};

const persistAdrRecords = (records: AdrRecord[]) => {
  localStorage.setItem(ADR_STORAGE_KEY, JSON.stringify(records));
};

const readIncidents = (): IncidentRecord[] => {
  try {
    const raw = localStorage.getItem(INCIDENTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as IncidentRecord[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item) =>
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.severity === "string" &&
        typeof item.symptoms === "string" &&
        typeof item.root_cause === "string" &&
        typeof item.fix === "string" &&
        typeof item.prevention === "string" &&
        typeof item.created_at === "string"
    );
  } catch {
    return [];
  }
};

const persistIncidents = (records: IncidentRecord[]) => {
  localStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify(records));
};

const readDebugSessions = (): DebugSession[] => {
  try {
    const raw = localStorage.getItem(DEBUG_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as DebugSession[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item) =>
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.symptoms === "string" &&
        typeof item.hypotheses === "string" &&
        typeof item.checks === "string" &&
        typeof item.conclusion === "string" &&
        typeof item.created_at === "string"
    );
  } catch {
    return [];
  }
};

const persistDebugSessions = (sessions: DebugSession[]) => {
  localStorage.setItem(DEBUG_STORAGE_KEY, JSON.stringify(sessions));
};

const readQuickCaptureRecords = (): QuickCaptureRecord[] => {
  try {
    const raw = localStorage.getItem(QUICK_CAPTURE_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as QuickCaptureRecord[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item) =>
        typeof item.id === "string" &&
        typeof item.raw_text === "string" &&
        typeof item.structured_text === "string" &&
        typeof item.created_at === "string"
    );
  } catch {
    return [];
  }
};

const persistQuickCaptureRecords = (records: QuickCaptureRecord[]) => {
  localStorage.setItem(QUICK_CAPTURE_STORAGE_KEY, JSON.stringify(records));
};

export const InsightsBoard = () => {
  const { t } = useI18n();
  const { data: entries = [] } = useEntries();
  const { data: tasks = [] } = useTasks();
  const [records, setRecords] = useState<AdrRecord[]>(() => readAdrRecords());
  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState("");
  const [decision, setDecision] = useState("");
  const [rationale, setRationale] = useState("");
  const [consequences, setConsequences] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [incidents, setIncidents] = useState<IncidentRecord[]>(() => readIncidents());
  const [incidentTitle, setIncidentTitle] = useState("");
  const [incidentSeverity, setIncidentSeverity] = useState<IncidentRecord["severity"]>("medium");
  const [incidentSymptoms, setIncidentSymptoms] = useState("");
  const [incidentRootCause, setIncidentRootCause] = useState("");
  const [incidentFix, setIncidentFix] = useState("");
  const [incidentPrevention, setIncidentPrevention] = useState("");
  const [debugSessions, setDebugSessions] = useState<DebugSession[]>(() => readDebugSessions());
  const [debugTitle, setDebugTitle] = useState("");
  const [debugSymptoms, setDebugSymptoms] = useState("");
  const [debugHypotheses, setDebugHypotheses] = useState("");
  const [debugChecks, setDebugChecks] = useState("");
  const [debugConclusion, setDebugConclusion] = useState("");
  const [buildLogStatus, setBuildLogStatus] = useState("");
  const [quickCaptureRecords, setQuickCaptureRecords] = useState<QuickCaptureRecord[]>(() => readQuickCaptureRecords());
  const [quickCaptureInput, setQuickCaptureInput] = useState("");
  const [quickCaptureStructured, setQuickCaptureStructured] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechActive, setSpeechActive] = useState(false);
  const [retroGeneratedAt, setRetroGeneratedAt] = useState("");

  useEffect(() => {
    const host = window as Window & {
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      SpeechRecognition?: new () => SpeechRecognitionLike;
    };
    setSpeechSupported(Boolean(host.SpeechRecognition ?? host.webkitSpeechRecognition));
  }, []);

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [records]);

  const canSave =
    title.trim().length > 0 &&
    problem.trim().length > 0 &&
    decision.trim().length > 0 &&
    rationale.trim().length > 0;
  const canSaveIncident =
    incidentTitle.trim().length > 0 &&
    incidentSymptoms.trim().length > 0 &&
    incidentRootCause.trim().length > 0 &&
    incidentFix.trim().length > 0;
  const canSaveDebug =
    debugTitle.trim().length > 0 &&
    debugSymptoms.trim().length > 0 &&
    debugHypotheses.trim().length > 0 &&
    debugChecks.trim().length > 0 &&
    debugConclusion.trim().length > 0;

  const handleSaveAdr = () => {
    if (!canSave) {
      return;
    }

    const next: AdrRecord = {
      id: crypto.randomUUID(),
      title: title.trim(),
      problem: problem.trim(),
      decision: decision.trim(),
      rationale: rationale.trim(),
      consequences: consequences.trim(),
      created_at: new Date().toISOString(),
      review_date: reviewDate,
    };

    const updated = [next, ...records];
    setRecords(updated);
    persistAdrRecords(updated);

    setTitle("");
    setProblem("");
    setDecision("");
    setRationale("");
    setConsequences("");
    setReviewDate("");
  };

  const handleRemoveAdr = (id: string) => {
    const updated = records.filter((record) => record.id !== id);
    setRecords(updated);
    persistAdrRecords(updated);
  };

  const handleSaveIncident = () => {
    if (!canSaveIncident) {
      return;
    }

    const next: IncidentRecord = {
      id: crypto.randomUUID(),
      title: incidentTitle.trim(),
      severity: incidentSeverity,
      symptoms: incidentSymptoms.trim(),
      root_cause: incidentRootCause.trim(),
      fix: incidentFix.trim(),
      prevention: incidentPrevention.trim(),
      created_at: new Date().toISOString(),
    };

    const updated = [next, ...incidents];
    setIncidents(updated);
    persistIncidents(updated);

    setIncidentTitle("");
    setIncidentSeverity("medium");
    setIncidentSymptoms("");
    setIncidentRootCause("");
    setIncidentFix("");
    setIncidentPrevention("");
  };

  const handleRemoveIncident = (id: string) => {
    const updated = incidents.filter((record) => record.id !== id);
    setIncidents(updated);
    persistIncidents(updated);
  };

  const applyDebugTemplate = () => {
    if (debugSymptoms.trim().length === 0) {
      setDebugSymptoms("- User-visible behavior:\n- Error text:\n- Repro frequency:");
    }
    if (debugHypotheses.trim().length === 0) {
      setDebugHypotheses("- Hypothesis 1:\n- Hypothesis 2:\n- Most likely:");
    }
    if (debugChecks.trim().length === 0) {
      setDebugChecks("- Check 1:\n- Check 2:\n- Logs/metrics observed:");
    }
    if (debugConclusion.trim().length === 0) {
      setDebugConclusion("- Root cause:\n- Fix applied:\n- Follow-up:");
    }
  };

  const handleSaveDebugSession = () => {
    if (!canSaveDebug) {
      return;
    }

    const next: DebugSession = {
      id: crypto.randomUUID(),
      title: debugTitle.trim(),
      symptoms: debugSymptoms.trim(),
      hypotheses: debugHypotheses.trim(),
      checks: debugChecks.trim(),
      conclusion: debugConclusion.trim(),
      created_at: new Date().toISOString(),
    };

    const updated = [next, ...debugSessions];
    setDebugSessions(updated);
    persistDebugSessions(updated);

    setDebugTitle("");
    setDebugSymptoms("");
    setDebugHypotheses("");
    setDebugChecks("");
    setDebugConclusion("");
  };

  const handleRemoveDebugSession = (id: string) => {
    const updated = debugSessions.filter((session) => session.id !== id);
    setDebugSessions(updated);
    persistDebugSessions(updated);
  };

  const handleExportBuildLog = () => {
    const lines: string[] = [
      "# Dev Journal Build Log",
      "",
      `Generated: ${new Date().toISOString()}`,
      "",
      "## Decisions (Mini ADR)",
    ];

    if (records.length === 0) {
      lines.push("- No ADR records yet.");
    } else {
      records.forEach((record) => {
        lines.push(`### ${record.title}`);
        lines.push(`- Date: ${record.created_at.slice(0, 10)}`);
        lines.push(`- Problem: ${record.problem}`);
        lines.push(`- Decision: ${record.decision}`);
        lines.push(`- Rationale: ${record.rationale}`);
        if (record.consequences) {
          lines.push(`- Consequences: ${record.consequences}`);
        }
        lines.push("");
      });
    }

    lines.push("## Incident Learnings");
    if (incidents.length === 0) {
      lines.push("- No incidents logged yet.");
    } else {
      incidents.forEach((incident) => {
        lines.push(`### ${incident.title}`);
        lines.push(`- Date: ${incident.created_at.slice(0, 10)}`);
        lines.push(`- Severity: ${incident.severity}`);
        lines.push(`- Symptoms: ${incident.symptoms}`);
        lines.push(`- Root cause: ${incident.root_cause}`);
        lines.push(`- Fix: ${incident.fix}`);
        if (incident.prevention) {
          lines.push(`- Prevention: ${incident.prevention}`);
        }
        lines.push("");
      });
    }

    lines.push("## Debug Sessions");
    if (debugSessions.length === 0) {
      lines.push("- No debug sessions yet.");
    } else {
      debugSessions.forEach((session) => {
        lines.push(`### ${session.title}`);
        lines.push(`- Date: ${session.created_at.slice(0, 10)}`);
        lines.push(`- Symptoms: ${session.symptoms}`);
        lines.push(`- Hypotheses: ${session.hypotheses}`);
        lines.push(`- Checks: ${session.checks}`);
        lines.push(`- Conclusion: ${session.conclusion}`);
        lines.push("");
      });
    }

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `dev-journal-build-log-${new Date().toISOString().slice(0, 10)}.md`;
    anchor.click();
    URL.revokeObjectURL(url);

    setBuildLogStatus(t("Portfolio build log exported."));
  };

  const structureQuickCapture = (raw: string) => {
    const lines = raw
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const context = lines.filter((line) => line.toLowerCase().includes("because") || line.toLowerCase().includes("context"));
    const blockers = lines.filter((line) => line.toLowerCase().includes("block") || line.toLowerCase().includes("risk"));
    const next = lines.filter((line) => line.toLowerCase().includes("next") || line.toLowerCase().includes("tomorrow"));
    const actions = lines.filter((line) => !context.includes(line) && !blockers.includes(line) && !next.includes(line));

    return [
      "Context:",
      context.length > 0 ? context.map((line) => `- ${line}`).join("\n") : "- n/a",
      "",
      "Actions:",
      actions.length > 0 ? actions.map((line) => `- ${line}`).join("\n") : "- n/a",
      "",
      "Blockers:",
      blockers.length > 0 ? blockers.map((line) => `- ${line}`).join("\n") : "- none",
      "",
      "Next:",
      next.length > 0 ? next.map((line) => `- ${line}`).join("\n") : "- review and schedule next step",
    ].join("\n");
  };

  const handleGenerateQuickCapture = () => {
    const raw = quickCaptureInput.trim();
    if (!raw) {
      return;
    }
    setQuickCaptureStructured(structureQuickCapture(raw));
  };

  const handleSaveQuickCapture = () => {
    const raw = quickCaptureInput.trim();
    const structured = quickCaptureStructured.trim();
    if (!raw || !structured) {
      return;
    }

    const nextRecord: QuickCaptureRecord = {
      id: crypto.randomUUID(),
      raw_text: raw,
      structured_text: structured,
      created_at: new Date().toISOString(),
    };

    const updated = [nextRecord, ...quickCaptureRecords];
    setQuickCaptureRecords(updated);
    persistQuickCaptureRecords(updated);

    setQuickCaptureInput("");
    setQuickCaptureStructured("");
  };

  const handleDeleteQuickCapture = (id: string) => {
    const updated = quickCaptureRecords.filter((record) => record.id !== id);
    setQuickCaptureRecords(updated);
    persistQuickCaptureRecords(updated);
  };

  const handleToggleSpeech = () => {
    const host = window as Window & {
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      SpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const RecognitionCtor = host.SpeechRecognition ?? host.webkitSpeechRecognition;
    if (!RecognitionCtor) {
      setSpeechSupported(false);
      return;
    }

    setSpeechSupported(true);
    const recognition = new RecognitionCtor();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      if (transcript) {
        setQuickCaptureInput((prev) => (prev.trim().length > 0 ? `${prev}\n${transcript}` : transcript));
      }
    };
    recognition.onerror = () => {
      setSpeechActive(false);
    };
    recognition.onend = () => {
      setSpeechActive(false);
    };

    if (speechActive) {
      recognition.stop();
      setSpeechActive(false);
      return;
    }

    recognition.start();
    setSpeechActive(true);
  };

  const weeklyRetro = useMemo(() => {
    const startDate = subDays(new Date(), 6);
    const startDateIso = parseISO(format(startDate, "yyyy-MM-dd"));

    const weeklyEntries = entries.filter((entry) =>
      isAfter(parseISO(entry.date), subDays(startDateIso, 1))
    );

    const totalWords = weeklyEntries.reduce((sum, entry) => {
      const words = `${entry.yesterday} ${entry.today}`
        .split(/\s+/)
        .filter((word) => word.trim().length > 0).length;
      return sum + words;
    }, 0);

    const blockers = weeklyEntries.flatMap((entry) => {
      const allLines = `${entry.yesterday}\n${entry.today}`
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      return allLines.filter(
        (line) =>
          line.toLowerCase().includes("block") ||
          line.toLowerCase().includes("risk") ||
          line.toLowerCase().includes("stuck") ||
          line.toLowerCase().includes("issue")
      );
    });

    const blockerCount = blockers.length;
    const topBlockers = blockers.slice(0, 4);
    const doneTasks = tasks.filter((task) => task.status === "done").length;
    const totalTasks = tasks.length;
    const completionRate = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

    const consistency = weeklyEntries.length >= 5 ? t("strong") : weeklyEntries.length >= 3 ? t("moderate") : t("weak");
    const recommendation =
      blockerCount >= 4
        ? t("Reduce WIP and define explicit unblocker owner for each stalled task.")
        : completionRate < 50
          ? t("Break tasks into smaller chunks and close one every day before adding new work.")
          : t("Keep current pace and capture one key learning per completed task.");

    return {
      journalDays: weeklyEntries.length,
      totalWords,
      avgWords: weeklyEntries.length === 0 ? 0 : Math.round(totalWords / weeklyEntries.length),
      blockerCount,
      topBlockers,
      completionRate,
      consistency,
      recommendation,
    };
  }, [entries, tasks, t]);

  const handleGenerateRetro = () => {
    setRetroGeneratedAt(new Date().toISOString());
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", mt: 1, display: "grid", gap: 2 }}>
      <Paper sx={{ p: 3, borderRadius: 3.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <LibraryBooksIcon color="primary" />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {t("Insights")}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {t("Track engineering decisions, incidents, retros, and developer intelligence.")}
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2 }}>
          <Button variant="outlined" onClick={handleExportBuildLog}>
            {t("Export Portfolio Build Log")}
          </Button>
          {buildLogStatus ? (
            <Typography variant="body2" color="success.main" sx={{ alignSelf: "center" }}>
              {buildLogStatus}
            </Typography>
          ) : null}
        </Stack>
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {t("Weekly Retro Report")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("Automatic weekly summary of writing patterns, blockers, and execution focus.")}
        </Typography>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 1, flexWrap: "wrap" }}>
          <Chip size="small" variant="outlined" label={`${t("Journal days")}: ${weeklyRetro.journalDays}/7`} />
          <Chip size="small" variant="outlined" label={`${t("Average words")}: ${weeklyRetro.avgWords}`} />
          <Chip size="small" variant="outlined" color={weeklyRetro.blockerCount > 0 ? "warning" : "success"} label={`${t("Blockers logged")}: ${weeklyRetro.blockerCount}`} />
          <Chip size="small" variant="outlined" color={weeklyRetro.completionRate >= 60 ? "success" : "warning"} label={`${t("Task completion")}: ${weeklyRetro.completionRate}%`} />
          <Chip size="small" variant="outlined" label={`${t("Consistency")}: ${weeklyRetro.consistency}`} />
        </Stack>

        <Button variant="outlined" onClick={handleGenerateRetro}>
          {t("Regenerate retro report")}
        </Button>

        <Typography variant="body2" sx={{ mt: 2 }}>
          <strong>{t("Top blockers")}:</strong>
        </Typography>
        {weeklyRetro.topBlockers.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t("No blocker patterns detected this week.")}
          </Typography>
        ) : (
          <Stack spacing={0.5} sx={{ mt: 0.5 }}>
            {weeklyRetro.topBlockers.map((blocker, index) => (
              <Typography key={`${blocker}-${index}`} variant="body2" color="text.secondary">
                - {blocker}
              </Typography>
            ))}
          </Stack>
        )}

        <Typography variant="body2" sx={{ mt: 2 }}>
          <strong>{t("Recommendation")}:</strong> {weeklyRetro.recommendation}
        </Typography>

        {retroGeneratedAt ? (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
            {t("Last generated at")}: {retroGeneratedAt.slice(0, 16).replace("T", " ")}
          </Typography>
        ) : null}
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {t("Quick Capture")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("Capture thoughts quickly with text or voice and structure them automatically.")}
        </Typography>

        <Stack spacing={1.5}>
          <TextField
            label={t("Raw capture")}
            value={quickCaptureInput}
            onChange={(event) => setQuickCaptureInput(event.target.value)}
            multiline
            minRows={3}
            placeholder={t("Write fast notes, blockers, ideas, or use voice input.")}
            fullWidth
          />
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            <Button variant="outlined" onClick={handleToggleSpeech}>
              {speechActive ? t("Stop voice capture") : t("Start voice capture")}
            </Button>
            <Button variant="outlined" onClick={handleGenerateQuickCapture} disabled={quickCaptureInput.trim().length === 0}>
              {t("Structure capture")}
            </Button>
            <Button variant="contained" onClick={handleSaveQuickCapture} disabled={quickCaptureInput.trim().length === 0 || quickCaptureStructured.trim().length === 0}>
              {t("Save capture")}
            </Button>
          </Stack>
          {!speechSupported ? (
            <Typography variant="caption" color="text.secondary">
              {t("Voice capture is available only in browsers with Speech Recognition support.")}
            </Typography>
          ) : null}
          {quickCaptureStructured ? (
            <TextField
              label={t("Structured output")}
              value={quickCaptureStructured}
              onChange={(event) => setQuickCaptureStructured(event.target.value)}
              multiline
              minRows={7}
              fullWidth
            />
          ) : null}
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={1.5}>
          {quickCaptureRecords.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("No quick captures yet.")}
            </Typography>
          ) : (
            quickCaptureRecords.map((record) => (
              <Paper key={record.id} variant="outlined" sx={{ p: 2 }}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
                  <Chip size="small" label={`${t("Created")}: ${record.created_at.slice(0, 10)}`} variant="outlined" />
                  <Button color="error" onClick={() => handleDeleteQuickCapture(record.id)}>
                    {t("Delete")}
                  </Button>
                </Stack>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>{t("Raw capture")}:</strong> {record.raw_text}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, whiteSpace: "pre-wrap" }}>
                  <strong>{t("Structured output")}:</strong>
                  {"\n"}
                  {record.structured_text}
                </Typography>
              </Paper>
            ))
          )}
        </Stack>
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {t("Mini ADR Log")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("Capture architecture and implementation decisions with context and consequences.")}
        </Typography>

        <Stack spacing={1.5}>
          <TextField
            label={t("Decision title")}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            fullWidth
          />
          <TextField
            label={t("Problem")}
            value={problem}
            onChange={(event) => setProblem(event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
          <TextField
            label={t("Decision")}
            value={decision}
            onChange={(event) => setDecision(event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
          <TextField
            label={t("Rationale")}
            value={rationale}
            onChange={(event) => setRationale(event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
          <TextField
            label={t("Consequences")}
            value={consequences}
            onChange={(event) => setConsequences(event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
          <TextField
            type="date"
            label={t("Review date")}
            value={reviewDate}
            onChange={(event) => setReviewDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ maxWidth: 260 }}
          />
          <Box>
            <Button variant="contained" onClick={handleSaveAdr} disabled={!canSave}>
              {t("Save ADR")}
            </Button>
          </Box>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={1.5}>
          {sortedRecords.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("No ADR records yet.")}
            </Typography>
          ) : (
            sortedRecords.map((record) => (
              <Paper key={record.id} variant="outlined" sx={{ p: 2 }}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {record.title}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: "wrap" }}>
                      <Chip size="small" label={`${t("Created")}: ${record.created_at.slice(0, 10)}`} variant="outlined" />
                      {record.review_date ? (
                        <Chip size="small" label={`${t("Review")}: ${record.review_date}`} color="warning" variant="outlined" />
                      ) : null}
                    </Stack>
                  </Box>
                  <Button color="error" onClick={() => handleRemoveAdr(record.id)}>
                    {t("Delete")}
                  </Button>
                </Stack>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>{t("Problem")}:</strong> {record.problem}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.75 }}>
                  <strong>{t("Decision")}:</strong> {record.decision}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.75 }}>
                  <strong>{t("Rationale")}:</strong> {record.rationale}
                </Typography>
                {record.consequences ? (
                  <Typography variant="body2" sx={{ mt: 0.75 }}>
                    <strong>{t("Consequences")}:</strong> {record.consequences}
                  </Typography>
                ) : null}
              </Paper>
            ))
          )}
        </Stack>
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {t("Debug Mode")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("Use a guided rubber-duck flow to debug with structure and confidence.")}
        </Typography>

        <Stack spacing={1.5}>
          <TextField
            label={t("Debug session title")}
            value={debugTitle}
            onChange={(event) => setDebugTitle(event.target.value)}
            fullWidth
          />
          <TextField
            label={t("Symptoms")}
            value={debugSymptoms}
            onChange={(event) => setDebugSymptoms(event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
          <TextField
            label={t("Hypotheses")}
            value={debugHypotheses}
            onChange={(event) => setDebugHypotheses(event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
          <TextField
            label={t("Checks")}
            value={debugChecks}
            onChange={(event) => setDebugChecks(event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
          <TextField
            label={t("Conclusion")}
            value={debugConclusion}
            onChange={(event) => setDebugConclusion(event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={applyDebugTemplate}>
              {t("Insert template")}
            </Button>
            <Button variant="contained" onClick={handleSaveDebugSession} disabled={!canSaveDebug}>
              {t("Save debug session")}
            </Button>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={1.5}>
          {debugSessions.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("No debug sessions yet.")}
            </Typography>
          ) : (
            debugSessions.map((session) => (
              <Paper key={session.id} variant="outlined" sx={{ p: 2 }}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {session.title}
                    </Typography>
                    <Chip size="small" label={`${t("Created")}: ${session.created_at.slice(0, 10)}`} variant="outlined" sx={{ mt: 0.5 }} />
                  </Box>
                  <Button color="error" onClick={() => handleRemoveDebugSession(session.id)}>
                    {t("Delete")}
                  </Button>
                </Stack>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>{t("Symptoms")}:</strong> {session.symptoms}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.75 }}>
                  <strong>{t("Hypotheses")}:</strong> {session.hypotheses}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.75 }}>
                  <strong>{t("Checks")}:</strong> {session.checks}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.75 }}>
                  <strong>{t("Conclusion")}:</strong> {session.conclusion}
                </Typography>
              </Paper>
            ))
          )}
        </Stack>
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {t("What Broke Log")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("Capture incidents and how you fixed them to build a practical bug knowledge base.")}
        </Typography>

        <Stack spacing={1.5}>
          <TextField
            label={t("Incident title")}
            value={incidentTitle}
            onChange={(event) => setIncidentTitle(event.target.value)}
            fullWidth
          />
          <TextField
            select
            label={t("Severity")}
            value={incidentSeverity}
            onChange={(event) => setIncidentSeverity(event.target.value as IncidentRecord["severity"])}
            SelectProps={{ native: true }}
            sx={{ maxWidth: 220 }}
          >
            <option value="low">{t("Low")}</option>
            <option value="medium">{t("Medium")}</option>
            <option value="high">{t("High")}</option>
            <option value="critical">{t("Critical")}</option>
          </TextField>
          <TextField
            label={t("Symptoms")}
            value={incidentSymptoms}
            onChange={(event) => setIncidentSymptoms(event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
          <TextField
            label={t("Root cause")}
            value={incidentRootCause}
            onChange={(event) => setIncidentRootCause(event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
          <TextField
            label={t("Fix")}
            value={incidentFix}
            onChange={(event) => setIncidentFix(event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
          <TextField
            label={t("How to prevent next time")}
            value={incidentPrevention}
            onChange={(event) => setIncidentPrevention(event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
          <Box>
            <Button variant="contained" onClick={handleSaveIncident} disabled={!canSaveIncident}>
              {t("Save incident")}
            </Button>
          </Box>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={1.5}>
          {incidents.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("No incidents logged yet.")}
            </Typography>
          ) : (
            incidents.map((incident) => (
              <Paper key={incident.id} variant="outlined" sx={{ p: 2 }}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {incident.title}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: "wrap" }}>
                      <Chip size="small" color="warning" label={`${t("Severity")}: ${incident.severity}`} variant="outlined" />
                      <Chip size="small" label={`${t("Created")}: ${incident.created_at.slice(0, 10)}`} variant="outlined" />
                    </Stack>
                  </Box>
                  <Button color="error" onClick={() => handleRemoveIncident(incident.id)}>
                    {t("Delete")}
                  </Button>
                </Stack>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>{t("Symptoms")}:</strong> {incident.symptoms}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.75 }}>
                  <strong>{t("Root cause")}:</strong> {incident.root_cause}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.75 }}>
                  <strong>{t("Fix")}:</strong> {incident.fix}
                </Typography>
                {incident.prevention ? (
                  <Typography variant="body2" sx={{ mt: 0.75 }}>
                    <strong>{t("How to prevent next time")}:</strong> {incident.prevention}
                  </Typography>
                ) : null}
              </Paper>
            ))
          )}
        </Stack>
      </Paper>
    </Box>
  );
};
