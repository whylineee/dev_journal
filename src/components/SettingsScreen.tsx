import { ChangeEvent, useRef, useState } from "react";
import {
  Box,
  Button,
  Divider,
  FormControlLabel,
  Paper,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { format } from "date-fns";
import {
  AppearanceMode,
  FontPreset,
  THEME_PRESETS,
  ThemePresetId,
  UiDensity,
  useThemeContext,
} from "../theme/ThemeContext";
import { useI18n } from "../i18n/I18nContext";
import { useEntries, useImportBackup } from "../hooks/useEntries";
import { usePages } from "../hooks/usePages";
import { useTaskSubtasks, useTasks } from "../hooks/useTasks";
import { useGoalMilestones, useGoals } from "../hooks/useGoals";
import { useHabits } from "../hooks/useHabits";
import { useProjects } from "../hooks/useProjects";
import { useProjectBranches } from "../hooks/useProjectBranches";
import { useMeetings } from "../hooks/useMeetings";
import { BackupPayload } from "../types";

interface SettingsScreenProps {
  reminderEnabled: boolean;
  onReminderEnabledChange: (enabled: boolean) => void;
  reminderHour: number;
  onReminderHourChange: (hour: number) => void;
  journalPreviewEnabled: boolean;
  onJournalPreviewEnabledChange: (enabled: boolean) => void;
  pagePreviewEnabled: boolean;
  onPagePreviewEnabledChange: (enabled: boolean) => void;
  autosaveEnabled: boolean;
  onAutosaveEnabledChange: (enabled: boolean) => void;
}

export const SettingsScreen = ({
  reminderEnabled,
  onReminderEnabledChange,
  reminderHour,
  onReminderHourChange,
  journalPreviewEnabled,
  onJournalPreviewEnabledChange,
  pagePreviewEnabled,
  onPagePreviewEnabledChange,
  autosaveEnabled,
  onAutosaveEnabledChange,
}: SettingsScreenProps) => {
  const { language, setLanguage, t } = useI18n();
  const {
    themePreset,
    setThemePreset,
    appearanceMode,
    setAppearanceMode,
    fontPreset,
    setFontPreset,
    uiDensity,
    setUiDensity,
    borderRadius,
    setBorderRadius,
    resetTheme,
  } = useThemeContext();

  const { data: allEntries } = useEntries();
  const { data: pages } = usePages();
  const { data: tasks } = useTasks();
  const { data: taskSubtasks } = useTaskSubtasks(null);
  const { data: goals } = useGoals();
  const { data: goalMilestones } = useGoalMilestones(null);
  const { data: habits } = useHabits();
  const { data: projects } = useProjects();
  const { data: projectBranches } = useProjectBranches(null);
  const { data: meetings } = useMeetings();

  const importBackupMutation = useImportBackup();
  const [replaceExistingOnImport, setReplaceExistingOnImport] = useState(true);
  const [importStatus, setImportStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const exportBackup = () => {
    const data = {
      exported_at: new Date().toISOString(),
      entries: allEntries ?? [],
      pages: pages ?? [],
      tasks: tasks ?? [],
      task_subtasks: taskSubtasks ?? [],
      goals: goals ?? [],
      goal_milestones: goalMilestones ?? [],
      projects: projects ?? [],
      project_branches: projectBranches ?? [],
      meetings: meetings ?? [],
      habits: habits ?? [],
      habit_logs: (habits ?? []).flatMap((habit) =>
        habit.completed_dates.map((date) => ({
          habit_id: habit.id,
          date,
        }))
      ),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `dev-journal-backup-${format(new Date(), "yyyy-MM-dd")}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const openImportPicker = () => {
    fileInputRef.current?.click();
  };

  const handleImportBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as BackupPayload;

      importBackupMutation.mutate(
        { payload: parsed, replaceExisting: replaceExistingOnImport },
        {
          onSuccess: () => {
            setImportStatus(t("Backup imported successfully."));
          },
          onError: () => {
            setImportStatus(t("Import failed. Check JSON format."));
          },
        }
      );
    } catch {
      setImportStatus(t("Import failed. Invalid JSON file."));
    } finally {
      event.target.value = "";
    }
  };

  return (
    <Box sx={{ maxWidth: 980, mx: "auto", mt: 1 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {t("Settings")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("Customize Theme")}
        </Typography>

        <TextField
          select
          size="small"
          label={t("Theme preset")}
          value={themePreset}
          onChange={(event) => setThemePreset(event.target.value as ThemePresetId)}
          sx={{ mt: 1, width: { xs: "100%", sm: 260 } }}
          SelectProps={{ native: true }}
        >
          {THEME_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </TextField>

        <Box sx={{ mt: 2, display: "grid", gap: 1, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          {THEME_PRESETS.map((preset) => {
            const active = preset.id === themePreset;
            return (
              <Box
                key={preset.id}
                onClick={() => setThemePreset(preset.id)}
                sx={{
                  borderRadius: 2,
                  p: 1.25,
                  border: active ? "2px solid" : "1px solid",
                  borderColor: active ? "primary.main" : "divider",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  "&:hover": { borderColor: "primary.main" },
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {preset.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                  {preset.description}
                </Typography>
              </Box>
            );
          })}
        </Box>

        <Divider sx={{ my: 3 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{t("Appearance")}</Typography>
        <Box
          sx={{
            mt: 1,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 1.25,
          }}
        >
          <TextField
            select
            size="small"
            label={t("Theme mode")}
            value={appearanceMode}
            onChange={(event) => setAppearanceMode(event.target.value as AppearanceMode)}
            fullWidth
            SelectProps={{ native: true }}
          >
            <option value="dark">{t("Dark")}</option>
            <option value="light">{t("Light")}</option>
          </TextField>

          <TextField
            select
            size="small"
            label={t("Font")}
            value={fontPreset}
            onChange={(event) => setFontPreset(event.target.value as FontPreset)}
            fullWidth
            SelectProps={{ native: true }}
          >
            <option value="inter">Inter</option>
            <option value="roboto">Roboto</option>
            <option value="mono">Mono</option>
          </TextField>

          <TextField
            select
            size="small"
            label={t("Density")}
            value={uiDensity}
            onChange={(event) => setUiDensity(event.target.value as UiDensity)}
            fullWidth
            SelectProps={{ native: true }}
          >
            <option value="comfortable">{t("Comfortable")}</option>
            <option value="compact">{t("Compact")}</option>
          </TextField>

          <TextField
            type="number"
            size="small"
            label={t("Corner radius (6-24)")}
            value={borderRadius}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (Number.isFinite(value)) {
                setBorderRadius(Math.min(24, Math.max(6, value)));
              }
            }}
            fullWidth
            inputProps={{ min: 6, max: 24, step: 1 }}
          />

          <TextField
            select
            size="small"
            label={t("Language")}
            value={language}
            onChange={(event) => setLanguage(event.target.value === "uk" ? "uk" : "en")}
            fullWidth
            SelectProps={{ native: true }}
          >
            <option value="en">{t("English")}</option>
            <option value="uk">{t("Ukrainian")}</option>
          </TextField>
        </Box>

        <Divider sx={{ my: 3 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{t("Productivity")}</Typography>
        <FormControlLabel
          sx={{ mt: 1 }}
          control={<Switch checked={journalPreviewEnabled} onChange={(event) => onJournalPreviewEnabledChange(event.target.checked)} />}
          label={t("Show journal markdown preview")}
        />
        <FormControlLabel
          control={<Switch checked={pagePreviewEnabled} onChange={(event) => onPagePreviewEnabledChange(event.target.checked)} />}
          label={t("Show page markdown preview")}
        />
        <FormControlLabel
          control={<Switch checked={autosaveEnabled} onChange={(event) => onAutosaveEnabledChange(event.target.checked)} />}
          label={t("Enable draft autosave")}
        />

        <Divider sx={{ my: 3 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{t("Reminders")}</Typography>
        <FormControlLabel
          sx={{ mt: 1 }}
          control={<Switch checked={reminderEnabled} onChange={(event) => onReminderEnabledChange(event.target.checked)} />}
          label={t("Enable daily journal reminder")}
        />

        <TextField
          type="number"
          size="small"
          label={t("Reminder hour (0-23)")}
          value={reminderHour}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (Number.isInteger(value)) {
              const normalized = Math.min(23, Math.max(0, value));
              onReminderHourChange(normalized);
            }
          }}
          sx={{ mt: 1, width: { xs: "100%", sm: 260 } }}
          inputProps={{ min: 0, max: 23, step: 1 }}
        />

        <Divider sx={{ my: 3 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>{t("Data")}</Typography>
        <Button onClick={exportBackup} startIcon={<DownloadIcon />} variant="outlined" sx={{ width: { xs: "100%", sm: "auto" } }}>
          {t("Export Backup (JSON)")}
        </Button>
        <FormControlLabel
          sx={{ mt: 1, display: "block" }}
          control={<Switch checked={replaceExistingOnImport} onChange={(event) => setReplaceExistingOnImport(event.target.checked)} />}
          label={t("Replace existing data on import")}
        />
        <Button
          onClick={openImportPicker}
          startIcon={<UploadFileIcon />}
          variant="outlined"
          sx={{ mt: 1, width: { xs: "100%", sm: "auto" } }}
          disabled={importBackupMutation.isPending}
        >
          {importBackupMutation.isPending ? t("Importing...") : t("Import Backup (JSON)")}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImportBackup}
          style={{ display: "none" }}
        />
        {importStatus ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            {importStatus}
          </Typography>
        ) : null}

        <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <Button onClick={resetTheme} color="inherit">{t("Reset")}</Button>
        </Box>
      </Paper>
    </Box>
  );
};
