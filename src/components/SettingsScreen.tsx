import { ChangeEvent, ReactNode, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  ButtonBase,
  Chip,
  Divider,
  Slider,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { motion } from "framer-motion";
import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import { format } from "date-fns";
import {
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
import {
  applyPreferenceSnapshot,
  exportPreferenceSnapshot,
} from "../utils/preferencesStorage";

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

interface OptionTileProps {
  title: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
  accent?: string;
  preview?: ReactNode;
  radius?: string;
}

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const SettingsOptionTile = ({
  title,
  description,
  selected,
  onClick,
  accent,
  preview,
  radius = "16px",
}: OptionTileProps) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { t } = useI18n();

  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        width: "100%",
        borderRadius: radius,
        textAlign: "left",
        alignItems: "stretch",
        overflow: "hidden",
        transition: "border-color 0.14s ease, box-shadow 0.14s ease",
      }}
    >
      <Box
        sx={{
          width: "100%",
          minHeight: 116,
          p: 1.35,
          borderRadius: radius,
          border: "1px solid",
          borderColor: selected
            ? accent ?? "primary.main"
            : theme.palette.divider,
          bgcolor: selected
            ? alpha(accent ?? theme.palette.primary.main, isDark ? 0.18 : 0.12)
            : "background.default",
          transition: "border-color 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease",
          "&:hover": {
            borderColor: accent ?? "primary.main",
            boxShadow: theme.shadows[1],
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
              {title}
            </Typography>
            {description ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.4, lineHeight: 1.45 }}>
                {description}
              </Typography>
            ) : null}
          </Box>
          {selected ? <Chip size="small" label={t("Active")} color="primary" sx={{ flexShrink: 0, alignSelf: "flex-start" }} /> : null}
        </Box>
        {preview ? <Box sx={{ mt: 1.4 }}>{preview}</Box> : null}
      </Box>
    </ButtonBase>
  );
};

const SettingsToggleRow = ({ label, description, checked, onChange }: ToggleRowProps) => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        py: 1.35,
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.35, lineHeight: 1.45 }}>
          {description}
        </Typography>
      </Box>
      <Switch checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </Box>
  );
};

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
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
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

  const activePreset = THEME_PRESETS.find((preset) => preset.id === themePreset) ?? THEME_PRESETS[0];
  const activePalette = appearanceMode === "dark" ? activePreset.dark : activePreset.light;
  const settingsTileRadius = `${Math.min(18, Math.max(12, borderRadius))}px`;
  const settingsInsetRadius = `${Math.min(18, Math.max(12, borderRadius - 1))}px`;
  const settingsSurfaceRadius = `${Math.min(24, Math.max(18, borderRadius + 2))}px`;

  const datasetStats = useMemo(
    () => [
      { label: t("Entries"), value: allEntries?.length ?? 0 },
      { label: t("Pages"), value: pages?.length ?? 0 },
      { label: t("Tasks"), value: tasks?.length ?? 0 },
      { label: t("Goals"), value: goals?.length ?? 0 },
      { label: t("Habits"), value: habits?.length ?? 0 },
      { label: t("Projects"), value: projects?.length ?? 0 },
      { label: t("Meetings"), value: meetings?.length ?? 0 },
    ],
    [allEntries, goals, habits, meetings, pages, projects, t, tasks]
  );

  const totalBackupRecords = useMemo(() => {
    return (
      (allEntries?.length ?? 0) +
      (pages?.length ?? 0) +
      (tasks?.length ?? 0) +
      (taskSubtasks?.length ?? 0) +
      (goals?.length ?? 0) +
      (goalMilestones?.length ?? 0) +
      (habits?.length ?? 0) +
      (projects?.length ?? 0) +
      (projectBranches?.length ?? 0) +
      (meetings?.length ?? 0)
    );
  }, [
    allEntries,
    goalMilestones,
    goals,
    habits,
    meetings,
    pages,
    projectBranches,
    projects,
    taskSubtasks,
    tasks,
  ]);

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
      preferences: exportPreferenceSnapshot(
        () => appearanceMode,
        (value) => Math.min(18, Math.max(6, Math.round(value)))
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
            if (parsed.preferences) {
              applyPreferenceSnapshot(parsed.preferences);
            }
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

  const surfaceSx = {
    p: { xs: 1.5, md: 2.25 },
    borderRadius: settingsSurfaceRadius,
    border: "1px solid",
    borderColor: "divider",
    bgcolor: "background.paper",
  };

  const sectionHeading = (eyebrow: string, title: string, description: string) => (
    <Box sx={{ mb: 1.8 }}>
      <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {eyebrow}
      </Typography>
      <Typography variant="h6" sx={{ mt: 0.45, fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.55, maxWidth: 560 }}>
        {description}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ maxWidth: 1120, mx: "auto", mt: 1, pb: 4 }}>
      <Box sx={{ p: { xs: 1, md: 2 } }}>
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, ease: "easeOut" }}
          sx={{
            ...surfaceSx,
            overflow: "hidden",
            backgroundImage: `linear-gradient(135deg, ${alpha(activePalette.primary, isDark ? 0.16 : 0.12)} 0%, ${alpha(activePalette.secondary, isDark ? 0.12 : 0.08)} 100%)`,
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.1fr) minmax(320px, 0.9fr)" },
              gap: 2.2,
              alignItems: "stretch",
            }}
          >
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.45, letterSpacing: "-0.03em" }}>
                {t("Settings")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 620 }}>
                {t("Tune color, density, language, and backup behavior from one place.")}
              </Typography>

              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8, mt: 1.6 }}>
                <Chip icon={<AutoAwesomeRoundedIcon />} label={`${activePreset.name} / ${t(appearanceMode === "dark" ? "Dark" : "Light")}`} />
                <Chip icon={<TuneRoundedIcon />} label={`${t("Density")}: ${t(uiDensity === "compact" ? "Compact" : "Comfortable")}`} />
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
                  gap: 1,
                  mt: 2,
                }}
              >
                {[
                  { label: t("Preset"), value: activePreset.name },
                  { label: t("Mode"), value: t(appearanceMode === "dark" ? "Dark" : "Light") },
                  { label: t("Language"), value: t(language === "uk" ? "Ukrainian" : "English") },
                ].map((item) => (
                  <Box
                    key={item.label}
                    sx={{
                      px: 1.2,
                      py: 1.1,
                      borderRadius: settingsInsetRadius,
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: "background.default",
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {item.label}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.55, fontWeight: 700 }}>
                      {item.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            <Box
              sx={{
                minHeight: 220,
                borderRadius: settingsSurfaceRadius,
                p: 1.25,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {t("Live preview")}
              </Typography>
              <Box
                sx={{
                  mt: 1.1,
                  flex: 1,
                  borderRadius: settingsInsetRadius,
                  p: 1.3,
                  border: "1px solid",
                  borderColor: alpha(activePalette.primary, isDark ? 0.32 : 0.2),
                  bgcolor: alpha(activePalette.backgroundPaper, isDark ? 0.92 : 0.88),
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {t("Current setup")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t("Preview the active palette before you change it.")}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 0.6 }}>
                    <Box sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: activePalette.primary }} />
                    <Box sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: activePalette.secondary }} />
                  </Box>
                </Box>
                <Divider sx={{ my: 1.2 }} />
                <Box sx={{ display: "grid", gap: 0.8 }}>
                  {[
                    { label: t("Preset"), value: activePreset.name },
                    { label: t("Mode"), value: t(appearanceMode === "dark" ? "Dark" : "Light") },
                    { label: t("Density"), value: t(uiDensity === "compact" ? "Compact" : "Comfortable") },
                    { label: t("Language"), value: t(language === "uk" ? "Ukrainian" : "English") },
                  ].map((item) => (
                    <Box key={item.label} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        {item.label}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {item.value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            mt: 2,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1.1fr) minmax(340px, 0.9fr)" },
            gap: 2,
            alignItems: "start",
          }}
        >
          <Box
            component={motion.div}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, delay: 0.06, ease: "easeOut" }}
            sx={surfaceSx}
          >
            {sectionHeading(
              t("Appearance"),
              t("Theme presets"),
              t("Compact controls for how the workspace looks, reads, and feels.")
            )}

            <Box sx={{ display: "grid", gap: 1.1, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              {THEME_PRESETS.map((preset) => {
                const presetPalette = appearanceMode === "dark" ? preset.dark : preset.light;
                return (
                  <SettingsOptionTile
                    key={preset.id}
                    title={preset.name}
                    description={preset.description}
                    selected={preset.id === themePreset}
                    onClick={() => setThemePreset(preset.id)}
                    accent={presetPalette.primary}
                    radius={settingsTileRadius}
                    preview={
                      <Box sx={{ display: "flex", gap: 0.7 }}>
                        <Box sx={{ flex: 1, height: 40, borderRadius: 2, bgcolor: presetPalette.backgroundDefault, border: "1px solid", borderColor: alpha(presetPalette.primary, 0.16) }} />
                        <Box sx={{ width: 26, height: 26, borderRadius: "50%", bgcolor: presetPalette.primary, mt: "auto" }} />
                        <Box sx={{ width: 26, height: 26, borderRadius: "50%", bgcolor: presetPalette.secondary, mt: "auto" }} />
                      </Box>
                    }
                  />
                );
              })}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: "grid", gap: 1.1, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
              <SettingsOptionTile
                title={t("Light")}
                description={t("Brighter contrast for daytime planning and review.")}
                selected={appearanceMode === "light"}
                onClick={() => setAppearanceMode("light")}
                radius={settingsTileRadius}
                preview={<LightModeRoundedIcon fontSize="small" />}
              />
              <SettingsOptionTile
                title={t("Dark")}
                description={t("Lower glare for long sessions and evening work.")}
                selected={appearanceMode === "dark"}
                onClick={() => setAppearanceMode("dark")}
                radius={settingsTileRadius}
                preview={<DarkModeRoundedIcon fontSize="small" />}
              />
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                gap: 1.2,
                mt: 2,
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.8 }}>
                  {t("Density")}
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 0.9 }}>
                  {(["comfortable", "compact"] as UiDensity[]).map((density) => (
                    <SettingsOptionTile
                      key={density}
                      title={t(density === "compact" ? "Compact" : "Comfortable")}
                      description={density === "compact" ? t("More data in view.") : t("More breathing room.")}
                      selected={uiDensity === density}
                      onClick={() => setUiDensity(density)}
                      radius={settingsTileRadius}
                    />
                  ))}
                </Box>
              </Box>

              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.8 }}>
                  {t("Corner radius")}
                </Typography>
                <Box
                  sx={{
                    px: 1.35,
                    py: 1.2,
                    borderRadius: settingsInsetRadius,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.default",
                  }}
                >
                  <Slider
                    min={6}
                    max={18}
                    step={1}
                    value={borderRadius}
                    onChange={(_, value) => setBorderRadius(Array.isArray(value) ? value[0] : value)}
                    valueLabelDisplay="auto"
                  />
                  <Typography variant="caption" color="text.secondary">
                    {t("Sharper corners for denser UI, softer corners for calmer surfaces.")}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box
              sx={{
                mt: 2,
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                gap: 1.2,
              }}
            >
              <TextField
                select
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
          </Box>

          <Box sx={{ display: "grid", gap: 2 }}>
            <Box
              component={motion.div}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: 0.12, ease: "easeOut" }}
              sx={surfaceSx}
            >
              {sectionHeading(
                t("Behavior"),
                t("Workspace behavior"),
                t("Keep previews, live blocks, autosave, and reminders aligned with how you work.")
              )}

              <SettingsToggleRow
                label={t("Show journal preview")}
                description={t("Keep the journal reading surface visible while you write.")}
                checked={journalPreviewEnabled}
                onChange={onJournalPreviewEnabledChange}
              />
              <SettingsToggleRow
                label={t("Show page live blocks")}
                description={t("Render task tables, trackers, and embedded blocks below markdown.")}
                checked={pagePreviewEnabled}
                onChange={onPagePreviewEnabledChange}
              />
              <SettingsToggleRow
                label={t("Autosave drafts")}
                description={t("Persist in-progress journal and page edits locally.")}
                checked={autosaveEnabled}
                onChange={onAutosaveEnabledChange}
              />
              <SettingsToggleRow
                label={t("Daily journal reminder")}
                description={t("Send a local reminder when no entry exists after the selected hour.")}
                checked={reminderEnabled}
                onChange={onReminderEnabledChange}
              />

              <TextField
                type="number"
                label={t("Reminder hour (0-23)")}
                value={reminderHour}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isInteger(value)) {
                    onReminderHourChange(Math.min(23, Math.max(0, value)));
                  }
                }}
                sx={{ mt: 1.5, width: { xs: "100%", sm: 240 } }}
                inputProps={{ min: 0, max: 23, step: 1 }}
              />
            </Box>

            <Box
              component={motion.div}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: 0.18, ease: "easeOut" }}
              sx={surfaceSx}
            >
              {sectionHeading(
                t("Data"),
                t("Backup and import"),
                t("Local export includes entries, pages, tasks, goals, habits, projects, and meetings.")
              )}

              <Box
                sx={{
                  p: 1.25,
                  borderRadius: settingsInsetRadius,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.default",
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {t("Ready to export")}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.35 }}>
                  {t("{count} records synced into the next backup file.", { count: totalBackupRecords })}
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 0.8, mt: 1.2 }}>
                  {datasetStats.map((item) => (
                    <Box key={item.label} sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        {item.label}
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {item.value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              <SettingsToggleRow
                label={t("Replace existing data on import")}
                description={t("Use this only when the backup should replace the current local workspace.")}
                checked={replaceExistingOnImport}
                onChange={setReplaceExistingOnImport}
              />

              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.5 }}>
                <Button onClick={exportBackup} startIcon={<DownloadIcon />} variant="contained">
                  {t("Export Backup (JSON)")}
                </Button>
                <Button
                  onClick={openImportPicker}
                  startIcon={<UploadFileIcon />}
                  variant="outlined"
                  disabled={importBackupMutation.isPending}
                >
                  {importBackupMutation.isPending ? t("Importing...") : t("Import Backup (JSON)")}
                </Button>
                <Button onClick={resetTheme} color="inherit">
                  {t("Reset")}
                </Button>
              </Box>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportBackup}
                style={{ display: "none" }}
              />

              {importStatus ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.1 }}>
                  {importStatus}
                </Typography>
              ) : null}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
