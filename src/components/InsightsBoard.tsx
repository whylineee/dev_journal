import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useI18n } from "../i18n/I18nContext";
import { useEntries } from "../hooks/useEntries";
import { useTasks } from "../hooks/useTasks";
import { format, subDays } from "date-fns";
import {
  type AdrRecord,
  type DebugSession,
  type IncidentRecord,
  type QuickCaptureRecord,
  persistAdrRecords,
  persistDebugSessions,
  persistIncidents,
  persistQuickCaptureRecords,
  readAdrRecords,
  readDebugSessions,
  readIncidents,
  readQuickCaptureRecords,
} from "../utils/insightsStorage";

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

type SectionKey = "retro" | "capture" | "adr" | "debug" | "incidents";

export const InsightsBoard = () => {
  const { t } = useI18n();
  const muiTheme = useTheme();
  const isDark = muiTheme.palette.mode === "dark";
  const { data: entries = [] } = useEntries();
  const { data: tasks = [] } = useTasks();

  const [expanded, setExpanded] = useState<Partial<Record<SectionKey, boolean>>>({});
  const toggle = (key: SectionKey) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  const isOpen = (key: SectionKey) => Boolean(expanded[key]);

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
  const [quickCaptureRecords, setQuickCaptureRecords] = useState<QuickCaptureRecord[]>(() => readQuickCaptureRecords());
  const [quickCaptureInput, setQuickCaptureInput] = useState("");
  const [quickCaptureStructured, setQuickCaptureStructured] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechActive, setSpeechActive] = useState(false);
  const speechRecRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const host = window as Window & {
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      SpeechRecognition?: new () => SpeechRecognitionLike;
    };
    setSpeechSupported(Boolean(host.SpeechRecognition ?? host.webkitSpeechRecognition));

    return () => {
      if (speechRecRef.current) {
        try { speechRecRef.current.stop(); } catch { /* already stopped */ }
        speechRecRef.current = null;
      }
    };
  }, []);

  const sortedRecords = useMemo(() => [...records].sort((a, b) => b.created_at.localeCompare(a.created_at)), [records]);

  const canSave = title.trim().length > 0 && problem.trim().length > 0 && decision.trim().length > 0 && rationale.trim().length > 0;
  const canSaveIncident = incidentTitle.trim().length > 0 && incidentSymptoms.trim().length > 0 && incidentRootCause.trim().length > 0 && incidentFix.trim().length > 0;
  const canSaveDebug = debugTitle.trim().length > 0 && debugSymptoms.trim().length > 0 && debugHypotheses.trim().length > 0 && debugChecks.trim().length > 0 && debugConclusion.trim().length > 0;

  const handleSaveAdr = () => {
    if (!canSave) return;
    const next: AdrRecord = { id: crypto.randomUUID(), title: title.trim(), problem: problem.trim(), decision: decision.trim(), rationale: rationale.trim(), consequences: consequences.trim(), created_at: new Date().toISOString(), review_date: reviewDate };
    const updated = [next, ...records]; setRecords(updated); persistAdrRecords(updated);
    setTitle(""); setProblem(""); setDecision(""); setRationale(""); setConsequences(""); setReviewDate("");
  };
  const handleRemoveAdr = (id: string) => { const updated = records.filter((r) => r.id !== id); setRecords(updated); persistAdrRecords(updated); };

  const handleSaveIncident = () => {
    if (!canSaveIncident) return;
    const next: IncidentRecord = { id: crypto.randomUUID(), title: incidentTitle.trim(), severity: incidentSeverity, symptoms: incidentSymptoms.trim(), root_cause: incidentRootCause.trim(), fix: incidentFix.trim(), prevention: incidentPrevention.trim(), created_at: new Date().toISOString() };
    const updated = [next, ...incidents]; setIncidents(updated); persistIncidents(updated);
    setIncidentTitle(""); setIncidentSeverity("medium"); setIncidentSymptoms(""); setIncidentRootCause(""); setIncidentFix(""); setIncidentPrevention("");
  };
  const handleRemoveIncident = (id: string) => { const updated = incidents.filter((r) => r.id !== id); setIncidents(updated); persistIncidents(updated); };

  const applyDebugTemplate = () => {
    if (debugSymptoms.trim().length === 0) setDebugSymptoms("- User-visible behavior:\n- Error text:\n- Repro frequency:");
    if (debugHypotheses.trim().length === 0) setDebugHypotheses("- Hypothesis 1:\n- Hypothesis 2:\n- Most likely:");
    if (debugChecks.trim().length === 0) setDebugChecks("- Check 1:\n- Check 2:\n- Logs/metrics observed:");
    if (debugConclusion.trim().length === 0) setDebugConclusion("- Root cause:\n- Fix applied:\n- Follow-up:");
  };
  const handleSaveDebugSession = () => {
    if (!canSaveDebug) return;
    const next: DebugSession = { id: crypto.randomUUID(), title: debugTitle.trim(), symptoms: debugSymptoms.trim(), hypotheses: debugHypotheses.trim(), checks: debugChecks.trim(), conclusion: debugConclusion.trim(), created_at: new Date().toISOString() };
    const updated = [next, ...debugSessions]; setDebugSessions(updated); persistDebugSessions(updated);
    setDebugTitle(""); setDebugSymptoms(""); setDebugHypotheses(""); setDebugChecks(""); setDebugConclusion("");
  };
  const handleRemoveDebugSession = (id: string) => { const updated = debugSessions.filter((s) => s.id !== id); setDebugSessions(updated); persistDebugSessions(updated); };

  const handleExportBuildLog = () => {
    const lines: string[] = ["# Dev Journal Build Log", "", `Generated: ${new Date().toISOString()}`, "", "## Decisions (Mini ADR)"];
    if (records.length === 0) { lines.push("- No ADR records yet."); }
    else { records.forEach((r) => { lines.push(`### ${r.title}`, `- Date: ${r.created_at.slice(0, 10)}`, `- Problem: ${r.problem}`, `- Decision: ${r.decision}`, `- Rationale: ${r.rationale}`); if (r.consequences) lines.push(`- Consequences: ${r.consequences}`); lines.push(""); }); }
    lines.push("## Incident Learnings");
    if (incidents.length === 0) { lines.push("- No incidents logged yet."); }
    else { incidents.forEach((i) => { lines.push(`### ${i.title}`, `- Date: ${i.created_at.slice(0, 10)}`, `- Severity: ${i.severity}`, `- Symptoms: ${i.symptoms}`, `- Root cause: ${i.root_cause}`, `- Fix: ${i.fix}`); if (i.prevention) lines.push(`- Prevention: ${i.prevention}`); lines.push(""); }); }
    lines.push("## Debug Sessions");
    if (debugSessions.length === 0) { lines.push("- No debug sessions yet."); }
    else { debugSessions.forEach((s) => { lines.push(`### ${s.title}`, `- Date: ${s.created_at.slice(0, 10)}`, `- Symptoms: ${s.symptoms}`, `- Hypotheses: ${s.hypotheses}`, `- Checks: ${s.checks}`, `- Conclusion: ${s.conclusion}`, ""); }); }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `dev-journal-build-log-${new Date().toISOString().slice(0, 10)}.md`; a.click(); URL.revokeObjectURL(url);
  };

  const structureQuickCapture = (raw: string) => {
    const lines = raw.split(/\n+/).map((l) => l.trim()).filter((l) => l.length > 0);
    const context = lines.filter((l) => l.toLowerCase().includes("because") || l.toLowerCase().includes("context"));
    const blockers = lines.filter((l) => l.toLowerCase().includes("block") || l.toLowerCase().includes("risk"));
    const next = lines.filter((l) => l.toLowerCase().includes("next") || l.toLowerCase().includes("tomorrow"));
    const actions = lines.filter((l) => !context.includes(l) && !blockers.includes(l) && !next.includes(l));
    return ["Context:", context.length > 0 ? context.map((l) => `- ${l}`).join("\n") : "- n/a", "", "Actions:", actions.length > 0 ? actions.map((l) => `- ${l}`).join("\n") : "- n/a", "", "Blockers:", blockers.length > 0 ? blockers.map((l) => `- ${l}`).join("\n") : "- none", "", "Next:", next.length > 0 ? next.map((l) => `- ${l}`).join("\n") : "- review and schedule next step"].join("\n");
  };
  const handleGenerateQuickCapture = () => { const raw = quickCaptureInput.trim(); if (!raw) return; setQuickCaptureStructured(structureQuickCapture(raw)); };
  const handleSaveQuickCapture = () => {
    const raw = quickCaptureInput.trim(); const structured = quickCaptureStructured.trim(); if (!raw || !structured) return;
    const nextRecord: QuickCaptureRecord = { id: crypto.randomUUID(), raw_text: raw, structured_text: structured, created_at: new Date().toISOString() };
    const updated = [nextRecord, ...quickCaptureRecords]; setQuickCaptureRecords(updated); persistQuickCaptureRecords(updated);
    setQuickCaptureInput(""); setQuickCaptureStructured("");
  };
  const handleDeleteQuickCapture = (id: string) => { const updated = quickCaptureRecords.filter((r) => r.id !== id); setQuickCaptureRecords(updated); persistQuickCaptureRecords(updated); };
  const handleToggleSpeech = () => {
    if (speechActive && speechRecRef.current) {
      try { speechRecRef.current.stop(); } catch { /* already stopped */ }
      speechRecRef.current = null;
      setSpeechActive(false);
      return;
    }
    const host = window as Window & { webkitSpeechRecognition?: new () => SpeechRecognitionLike; SpeechRecognition?: new () => SpeechRecognitionLike; };
    const Ctor = host.SpeechRecognition ?? host.webkitSpeechRecognition;
    if (!Ctor) { setSpeechSupported(false); return; }
    setSpeechSupported(true);
    const rec = new Ctor(); rec.lang = "en-US"; rec.continuous = false; rec.interimResults = false;
    rec.onresult = (e) => { const transcript = Array.from(e.results).map((r) => r[0]?.transcript ?? "").join(" ").trim(); if (transcript) setQuickCaptureInput((p) => (p.trim().length > 0 ? `${p}\n${transcript}` : transcript)); };
    rec.onerror = () => { setSpeechActive(false); speechRecRef.current = null; };
    rec.onend = () => { setSpeechActive(false); speechRecRef.current = null; };
    speechRecRef.current = rec;
    rec.start(); setSpeechActive(true);
  };

  const weeklyRetro = useMemo(() => {
    const startDate = format(subDays(new Date(), 6), "yyyy-MM-dd");
    const weeklyEntries = entries.filter((entry) => entry.date >= startDate);
    const totalWords = weeklyEntries.reduce((sum, entry) => sum + `${entry.yesterday} ${entry.today}`.split(/\s+/).filter((w) => w.trim().length > 0).length, 0);
    const blockers = weeklyEntries.flatMap((entry) => `${entry.yesterday}\n${entry.today}`.split("\n").map((l) => l.trim()).filter((l) => l.length > 0).filter((l) => l.toLowerCase().includes("block") || l.toLowerCase().includes("risk") || l.toLowerCase().includes("stuck") || l.toLowerCase().includes("issue")));
    const doneTasks = tasks.filter((task) => task.status === "done").length;
    const totalTasks = tasks.length;
    const completionRate = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
    const consistency = weeklyEntries.length >= 5 ? t("strong") : weeklyEntries.length >= 3 ? t("moderate") : t("weak");
    const recommendation = blockers.length >= 4 ? t("Reduce WIP and define explicit unblocker owner for each stalled task.") : completionRate < 50 ? t("Break tasks into smaller chunks and close one every day before adding new work.") : t("Keep current pace and capture one key learning per completed task.");
    return { journalDays: weeklyEntries.length, totalWords, avgWords: weeklyEntries.length === 0 ? 0 : Math.round(totalWords / weeklyEntries.length), blockerCount: blockers.length, topBlockers: blockers.slice(0, 4), completionRate, consistency, recommendation };
  }, [entries, tasks, t]);

  const glassSx = {
    p: { xs: 1.5, sm: 2 },
    mb: 2,
    borderRadius: 2.5,
    bgcolor: "background.paper",
    border: "1px solid",
    borderColor: "divider",
  };

  const sectionHeader = (key: SectionKey, label: string, count: number, subtitle: string) => (
    <Box
      onClick={() => toggle(key)}
      sx={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        cursor: "pointer", userSelect: "none",
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{label}</Typography>
          {count > 0 && <Chip size="small" label={count} variant="outlined" sx={{ height: 20, fontSize: "0.66rem" }} />}
        </Stack>
        <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
      </Box>
      <IconButton
        size="small"
        aria-label={isOpen(key) ? t("Collapse section") : t("Expand section")}
        title={isOpen(key) ? t("Collapse section") : t("Expand section")}
        sx={{ transition: "transform 0.2s ease", transform: isOpen(key) ? "rotate(180deg)" : "rotate(0deg)" }}
      >
        <ExpandMoreIcon fontSize="small" />
      </IconButton>
    </Box>
  );

  const recordCardSx = {
    p: 1.5,
    borderRadius: 2,
    border: "1px solid",
    borderColor: "divider",
    bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
    "&:hover": {
      borderColor: alpha(muiTheme.palette.primary.main, 0.25),
      boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.06)",
    },
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: "auto", mt: { xs: 1, md: 1.5 }, pb: 4, display: "grid", gap: { xs: 2, md: 2.5 } }}>
      {/* Header */}
      <Box sx={{ ...glassSx, p: { xs: 2.5, sm: 3 } }}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <LibraryBooksIcon color="primary" />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{t("Insights")}</Typography>
              <Typography variant="caption" color="text.secondary">
                {t("Track engineering decisions, incidents, retros, and developer intelligence.")}
              </Typography>
            </Box>
          </Stack>
          <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={handleExportBuildLog}>
            {t("Export")}
          </Button>
        </Stack>
      </Box>

      {/* Weekly Retro */}
      <Box sx={{ ...glassSx, p: { xs: 2.5, sm: 3 } }}>
        {sectionHeader("retro", t("Weekly Retro Report"), 0, t("Automatic weekly summary of writing patterns, blockers, and execution focus."))}
        <Collapse in={isOpen("retro")} timeout="auto" unmountOnExit>
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" }, gap: 1.5, mb: 2 }}>
              {[
                { label: t("Journal days"), value: `${weeklyRetro.journalDays}/7` },
                { label: t("Average words"), value: weeklyRetro.avgWords },
                { label: t("Task completion"), value: `${weeklyRetro.completionRate}%` },
                { label: t("Blockers logged"), value: weeklyRetro.blockerCount },
                { label: t("Consistency"), value: weeklyRetro.consistency },
              ].map((stat) => (
                <Box key={stat.label} sx={{ ...recordCardSx, textAlign: "center", p: 1.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.1rem" }}>{stat.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                </Box>
              ))}
            </Box>
            {weeklyRetro.topBlockers.length > 0 && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "text.secondary" }}>
                  {t("Top blockers")}
                </Typography>
                {weeklyRetro.topBlockers.map((b, i) => (
                  <Typography key={`${b}-${i}`} variant="body2" color="text.secondary" sx={{ ml: 1 }}>• {b}</Typography>
                ))}
              </Box>
            )}
            <Typography variant="body2"><strong>{t("Recommendation")}:</strong> {weeklyRetro.recommendation}</Typography>
          </Box>
        </Collapse>
      </Box>

      {/* Quick Capture */}
      <Box sx={{ ...glassSx, p: { xs: 2.5, sm: 3 } }}>
        {sectionHeader("capture", t("Quick Capture"), quickCaptureRecords.length, t("Capture thoughts quickly with text or voice and structure them automatically."))}
        <Collapse in={isOpen("capture")} timeout="auto" unmountOnExit>
          <Stack spacing={1.5} sx={{ mt: 2 }}>
            <TextField label={t("Raw capture")} value={quickCaptureInput} onChange={(e) => setQuickCaptureInput(e.target.value)} multiline minRows={2} placeholder={t("Write fast notes, blockers, ideas, or use voice input.")} fullWidth size="small" />
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
              {speechSupported && (
                <Button variant="outlined" size="small" onClick={handleToggleSpeech}>
                  {speechActive ? t("Stop voice capture") : t("Voice")}
                </Button>
              )}
              <Button variant="outlined" size="small" onClick={handleGenerateQuickCapture} disabled={quickCaptureInput.trim().length === 0}>{t("Structure")}</Button>
              <Button variant="contained" size="small" onClick={handleSaveQuickCapture} disabled={quickCaptureInput.trim().length === 0 || quickCaptureStructured.trim().length === 0}>{t("Save")}</Button>
            </Stack>
            {quickCaptureStructured && (
              <TextField label={t("Structured output")} value={quickCaptureStructured} onChange={(e) => setQuickCaptureStructured(e.target.value)} multiline minRows={4} fullWidth size="small" />
            )}
            {quickCaptureRecords.length > 0 && <Divider />}
            {quickCaptureRecords.map((r) => (
              <Box key={r.id} sx={recordCardSx}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Chip size="small" label={r.created_at.slice(0, 10)} variant="outlined" sx={{ height: 20, fontSize: "0.62rem" }} />
                  <IconButton size="small" color="error" onClick={() => handleDeleteQuickCapture(r.id)}><DeleteOutlineIcon sx={{ fontSize: 16 }} /></IconButton>
                </Stack>
                <Typography variant="body2" sx={{ mt: 0.75 }} noWrap>{r.raw_text}</Typography>
              </Box>
            ))}
          </Stack>
        </Collapse>
      </Box>

      {/* ADR */}
      <Box sx={{ ...glassSx, p: { xs: 2.5, sm: 3 } }}>
        {sectionHeader("adr", t("Mini ADR Log"), records.length, t("Capture architecture and implementation decisions with context and consequences."))}
        <Collapse in={isOpen("adr")} timeout="auto" unmountOnExit>
          <Stack spacing={1.5} sx={{ mt: 2 }}>
            <TextField label={t("Decision title")} value={title} onChange={(e) => setTitle(e.target.value)} fullWidth size="small" />
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
              <TextField label={t("Problem")} value={problem} onChange={(e) => setProblem(e.target.value)} multiline minRows={2} fullWidth size="small" />
              <TextField label={t("Decision")} value={decision} onChange={(e) => setDecision(e.target.value)} multiline minRows={2} fullWidth size="small" />
              <TextField label={t("Rationale")} value={rationale} onChange={(e) => setRationale(e.target.value)} multiline minRows={2} fullWidth size="small" />
              <TextField label={t("Consequences")} value={consequences} onChange={(e) => setConsequences(e.target.value)} multiline minRows={2} fullWidth size="small" />
            </Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <TextField type="date" label={t("Review date")} value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" sx={{ maxWidth: 200 }} />
              <Button variant="contained" size="small" onClick={handleSaveAdr} disabled={!canSave}>{t("Save")}</Button>
            </Stack>
            {sortedRecords.length > 0 && <Divider />}
            {sortedRecords.map((r) => (
              <Box key={r.id} sx={recordCardSx}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{r.title}</Typography>
                    <Stack direction="row" spacing={0} sx={{ gap: 0.5, mt: 0.25 }}>
                      <Chip size="small" label={r.created_at.slice(0, 10)} variant="outlined" sx={{ height: 18, fontSize: "0.60rem" }} />
                      {r.review_date && <Chip size="small" label={`${t("Review")}: ${r.review_date}`} color="warning" variant="outlined" sx={{ height: 18, fontSize: "0.60rem" }} />}
                    </Stack>
                  </Box>
                  <IconButton size="small" color="error" onClick={() => handleRemoveAdr(r.id)}><DeleteOutlineIcon sx={{ fontSize: 16 }} /></IconButton>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                  {r.decision.slice(0, 150)}{r.decision.length > 150 ? "..." : ""}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Collapse>
      </Box>

      {/* Debug Mode */}
      <Box sx={{ ...glassSx, p: { xs: 2.5, sm: 3 } }}>
        {sectionHeader("debug", t("Debug Mode"), debugSessions.length, t("Use a guided rubber-duck flow to debug with structure and confidence."))}
        <Collapse in={isOpen("debug")} timeout="auto" unmountOnExit>
          <Stack spacing={1.5} sx={{ mt: 2 }}>
            <TextField label={t("Debug session title")} value={debugTitle} onChange={(e) => setDebugTitle(e.target.value)} fullWidth size="small" />
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
              <TextField label={t("Symptoms")} value={debugSymptoms} onChange={(e) => setDebugSymptoms(e.target.value)} multiline minRows={2} fullWidth size="small" />
              <TextField label={t("Hypotheses")} value={debugHypotheses} onChange={(e) => setDebugHypotheses(e.target.value)} multiline minRows={2} fullWidth size="small" />
              <TextField label={t("Checks")} value={debugChecks} onChange={(e) => setDebugChecks(e.target.value)} multiline minRows={2} fullWidth size="small" />
              <TextField label={t("Conclusion")} value={debugConclusion} onChange={(e) => setDebugConclusion(e.target.value)} multiline minRows={2} fullWidth size="small" />
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" size="small" onClick={applyDebugTemplate}>{t("Insert template")}</Button>
              <Button variant="contained" size="small" onClick={handleSaveDebugSession} disabled={!canSaveDebug}>{t("Save")}</Button>
            </Stack>
            {debugSessions.length > 0 && <Divider />}
            {debugSessions.map((s) => (
              <Box key={s.id} sx={recordCardSx}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{s.title}</Typography>
                    <Chip size="small" label={s.created_at.slice(0, 10)} variant="outlined" sx={{ height: 18, fontSize: "0.60rem", mt: 0.25 }} />
                  </Box>
                  <IconButton size="small" color="error" onClick={() => handleRemoveDebugSession(s.id)}><DeleteOutlineIcon sx={{ fontSize: 16 }} /></IconButton>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                  {s.conclusion.slice(0, 150)}{s.conclusion.length > 150 ? "..." : ""}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Collapse>
      </Box>

      {/* Incidents */}
      <Box sx={{ ...glassSx, p: { xs: 2.5, sm: 3 } }}>
        {sectionHeader("incidents", t("What Broke Log"), incidents.length, t("Capture incidents and how you fixed them to build a practical bug knowledge base."))}
        <Collapse in={isOpen("incidents")} timeout="auto" unmountOnExit>
          <Stack spacing={1.5} sx={{ mt: 2 }}>
            <Stack direction="row" spacing={1.5}>
              <TextField label={t("Incident title")} value={incidentTitle} onChange={(e) => setIncidentTitle(e.target.value)} fullWidth size="small" />
              <TextField select label={t("Severity")} value={incidentSeverity} onChange={(e) => setIncidentSeverity(e.target.value as IncidentRecord["severity"])} SelectProps={{ native: true }} InputLabelProps={{ shrink: true }} size="small" sx={{ minWidth: 130 }}>
                <option value="low">{t("Low")}</option>
                <option value="medium">{t("Medium")}</option>
                <option value="high">{t("High")}</option>
                <option value="critical">{t("Critical")}</option>
              </TextField>
            </Stack>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
              <TextField label={t("Symptoms")} value={incidentSymptoms} onChange={(e) => setIncidentSymptoms(e.target.value)} multiline minRows={2} fullWidth size="small" />
              <TextField label={t("Root cause")} value={incidentRootCause} onChange={(e) => setIncidentRootCause(e.target.value)} multiline minRows={2} fullWidth size="small" />
              <TextField label={t("Fix")} value={incidentFix} onChange={(e) => setIncidentFix(e.target.value)} multiline minRows={2} fullWidth size="small" />
              <TextField label={t("How to prevent next time")} value={incidentPrevention} onChange={(e) => setIncidentPrevention(e.target.value)} multiline minRows={2} fullWidth size="small" />
            </Box>
            <Box><Button variant="contained" size="small" onClick={handleSaveIncident} disabled={!canSaveIncident}>{t("Save")}</Button></Box>
            {incidents.length > 0 && <Divider />}
            {incidents.map((inc) => (
              <Box key={inc.id} sx={recordCardSx}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{inc.title}</Typography>
                    <Stack direction="row" spacing={0} sx={{ gap: 0.5, mt: 0.25 }}>
                      <Chip size="small" label={inc.severity} color={inc.severity === "critical" || inc.severity === "high" ? "error" : "warning"} variant="outlined" sx={{ height: 18, fontSize: "0.60rem" }} />
                      <Chip size="small" label={inc.created_at.slice(0, 10)} variant="outlined" sx={{ height: 18, fontSize: "0.60rem" }} />
                    </Stack>
                  </Box>
                  <IconButton size="small" color="error" onClick={() => handleRemoveIncident(inc.id)}><DeleteOutlineIcon sx={{ fontSize: 16 }} /></IconButton>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                  {inc.fix.slice(0, 150)}{inc.fix.length > 150 ? "..." : ""}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Collapse>
      </Box>
    </Box>
  );
};
