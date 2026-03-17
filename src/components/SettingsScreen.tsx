import { ChangeEvent, useRef, useState } from "react";
import {
  Box,
  Button,
  FormControlLabel,
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
      <Box sx={{ p: { xs: 1, md: 2 } }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.25 }}>
          {t("Settings")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t("Customize how the app looks and behaves")}
        </Typography>

        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
          {t("Theme")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("Choose a color palette for the app")}
        </Typography>

        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
          {THEME_PRESETS.map((preset) => {
            const active = preset.id === themePreset;
            const modePalette = appearanceMode === "dark" ? preset.dark : preset.light;
            return (
              <Box
                key={preset.id}
                onClick={() => setThemePreset(preset.id)}
                sx={{
                  borderRadius: 2.5,
                  overflow: "hidden",
                  border: active ? "2px solid" : "2px solid transparent",
                  borderColor: active ? modePalette.primary : "transparent",
                  boxShadow: active ? `0 0 0 2px ${modePalette.primary}30` : "none",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  outline: (theme) => active ? "none" : `1px solid ${theme.palette.mode === "dark" ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)"}`,
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: `0 6px 20px ${modePalette.primary}25`,
                    outline: `1px solid ${modePalette.primary}50`,
                  },
                }}
              >
                {/* Color preview strip */}
                <Box
                  sx={{
                    height: 72,
                    bgcolor: modePalette.backgroundDefault,
                    display: "flex",
                    alignItems: "flex-end",
                    pb: 1.5,
                    px: 1.5,
                    gap: 0.75,
                    position: "relative",
                  }}
                >
                  {/* mini UI mockup */}
                  <Box sx={{ position: "absolute", top: 10, left: 12, right: 12, height: 8, borderRadius: 1, bgcolor: modePalette.backgroundPaper, opacity: 0.8 }} />
                  <Box sx={{ position: "absolute", top: 24, left: 12, width: "55%", height: 6, borderRadius: 0.75, bgcolor: modePalette.textPrimary, opacity: 0.12 }} />
                  <Box sx={{ position: "absolute", top: 36, left: 12, width: "35%", height: 4, borderRadius: 0.5, bgcolor: modePalette.textSecondary, opacity: 0.18 }} />
                  {/* color swatches */}
                  <Box sx={{ position: "absolute", bottom: 10, right: 10, display: "flex", gap: 0.5 }}>
                    <Box sx={{ width: 18, height: 18, borderRadius: "50%", bgcolor: modePalette.primary, boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }} />
                    <Box sx={{ width: 18, height: 18, borderRadius: "50%", bgcolor: modePalette.secondary, boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }} />
                  </Box>
                  {active && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        bgcolor: modePalette.primary,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Box component="span" sx={{ color: "#fff", fontSize: "10px", lineHeight: 1, fontWeight: 700 }}>✓</Box>
                    </Box>
                  )}
                </Box>
                {/* Label */}
                <Box sx={{ px: 1.5, py: 1, bgcolor: (theme) => theme.palette.background.paper }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, display: "block", fontSize: "0.78rem" }}>
                    {preset.name}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>

        <Box sx={{ height: 32 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>{t("Appearance")}</Typography>

        {/* Mode toggle - visual buttons */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{t("Theme mode")}</Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            {(["light", "dark"] as AppearanceMode[]).map((mode) => (
              <Box
                key={mode}
                onClick={() => setAppearanceMode(mode)}
                sx={{
                  flex: 1,
                  borderRadius: 2,
                  p: 1.5,
                  border: appearanceMode === mode ? "2px solid" : "1px solid",
                  borderColor: appearanceMode === mode
                    ? "primary.main"
                    : (th) => th.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                  bgcolor: appearanceMode === mode
                    ? (th) => `${th.palette.primary.main}12`
                    : "transparent",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.15s ease",
                }}
              >
                <Typography sx={{ fontSize: "1.2rem", mb: 0.25 }}>{mode === "light" ? "☀️" : "🌙"}</Typography>
                <Typography variant="caption" sx={{ fontWeight: 600, textTransform: "capitalize" }}>
                  {t(mode === "light" ? "Light" : "Dark")}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 1.25,
          }}
        >

          <TextField
            select
            size="small"
            label={t("Font")}
            value={fontPreset}
            onChange={(event) => setFontPreset(event.target.value as FontPreset)}
            fullWidth
            SelectProps={{ native: true }}
            InputLabelProps={{ shrink: true }}
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
            InputLabelProps={{ shrink: true }}
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
            InputLabelProps={{ shrink: true }}
          >
            <option value="en">{t("English")}</option>
            <option value="uk">{t("Ukrainian")}</option>
          </TextField>
        </Box>

        <Box sx={{ height: 40 }} />
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

        <Box sx={{ height: 40 }} />
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

        <Box sx={{ height: 40 }} />
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
      </Box>
    </Box>
  );
};
