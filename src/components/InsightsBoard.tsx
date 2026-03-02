import { useMemo, useState } from "react";
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

const ADR_STORAGE_KEY = "devJournal_insights_adr_records";

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

export const InsightsBoard = () => {
  const { t } = useI18n();
  const [records, setRecords] = useState<AdrRecord[]>(() => readAdrRecords());
  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState("");
  const [decision, setDecision] = useState("");
  const [rationale, setRationale] = useState("");
  const [consequences, setConsequences] = useState("");
  const [reviewDate, setReviewDate] = useState("");

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [records]);

  const canSave =
    title.trim().length > 0 &&
    problem.trim().length > 0 &&
    decision.trim().length > 0 &&
    rationale.trim().length > 0;

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

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", mt: 1, display: "grid", gap: 2 }}>
      <Paper sx={{ p: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <LibraryBooksIcon color="primary" />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {t("Insights")}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {t("Track engineering decisions, incidents, retros, and developer intelligence.")}
        </Typography>
      </Paper>

      <Paper sx={{ p: 3 }}>
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
    </Box>
  );
};
