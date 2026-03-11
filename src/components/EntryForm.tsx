import {
    Box,
    TextField,
    Typography,
    Button,
    Paper,
    IconButton,
    Tooltip,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
} from "@mui/material";
import { useState, useEffect, useMemo, useCallback } from "react";
import Markdown from "react-markdown";
import { useDeleteEntry, useEntry, useSaveEntry } from "../hooks/useEntries";
import { useProjects } from "../hooks/useProjects";
import { useI18n } from "../i18n/I18nContext";
import { format, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@mui/material/styles";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import CodeIcon from "@mui/icons-material/Code";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import SaveIcon from "@mui/icons-material/Save";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { useAppNotifications } from "../notifications/AppNotifications";

interface EntryFormProps {
    date: string;
    previewEnabled: boolean;
    autosaveEnabled: boolean;
}

type EnergyTag = "focused" | "deep_work" | "tired" | "distracted";

const countWords = (value: string) => value.split(/\s+/).filter((word) => word.length > 0).length;
const ENERGY_STORAGE_KEY = "devJournal_entry_energy_tags";
const formatDraftTime = (value: string) => {
    try {
        return format(parseISO(value), "HH:mm");
    } catch {
        return "recently";
    }
};

const ENERGY_OPTIONS: { value: EnergyTag; label: string; color: "success" | "primary" | "warning" | "error" }[] = [
    { value: "focused", label: "Focused", color: "success" },
    { value: "deep_work", label: "Deep Work", color: "primary" },
    { value: "tired", label: "Tired", color: "warning" },
    { value: "distracted", label: "Distracted", color: "error" },
];

export const EntryForm = ({ date, previewEnabled, autosaveEnabled }: EntryFormProps) => {
    const muiTheme = useTheme();
    const { t } = useI18n();
    const { data: entry, isLoading } = useEntry(date);
    const { data: projects = [] } = useProjects();
    const saveMutation = useSaveEntry();
    const deleteMutation = useDeleteEntry();
    const { notify } = useAppNotifications();

    const [yesterday, setYesterday] = useState("");
    const [today, setToday] = useState("");
    const [draftRestoredAt, setDraftRestoredAt] = useState<string | null>(null);
    const [hydrated, setHydrated] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [energyTag, setEnergyTag] = useState<EnergyTag | null>(null);
    const [projectId, setProjectId] = useState<number | "">("");
    const [lastFocused, setLastFocused] = useState<"yesterday" | "today">("yesterday");
    const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);

    const draftKey = useMemo(() => `devJournal_entry_draft_${date}`, [date]);

    useEffect(() => {
        const entryYesterday = entry?.yesterday ?? "";
        const entryToday = entry?.today ?? "";

        let nextYesterday = entryYesterday;
        let nextToday = entryToday;
        let restoredAt: string | null = null;

        const rawDraft = localStorage.getItem(draftKey);
        if (rawDraft) {
            try {
                const draft = JSON.parse(rawDraft) as { yesterday?: string; today?: string; updatedAt?: string };
                nextYesterday = typeof draft.yesterday === "string" ? draft.yesterday : entryYesterday;
                nextToday = typeof draft.today === "string" ? draft.today : entryToday;
                restoredAt = draft.updatedAt ?? null;
            } catch {
                localStorage.removeItem(draftKey);
            }
        }

        setYesterday(nextYesterday);
        setToday(nextToday);
        setProjectId(entry?.project_id ?? "");
        setDraftRestoredAt(restoredAt);
        setHydrated(true);
    }, [entry, date, draftKey]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(ENERGY_STORAGE_KEY);
            if (!raw) {
                setEnergyTag(null);
                return;
            }

            const parsed = JSON.parse(raw) as Record<string, EnergyTag>;
            const next = parsed[date];
            if (next === "focused" || next === "deep_work" || next === "tired" || next === "distracted") {
                setEnergyTag(next);
            } else {
                setEnergyTag(null);
            }
        } catch {
            setEnergyTag(null);
        }
    }, [date]);

    useEffect(() => {
        if (!autosaveEnabled || !hydrated) {
            return;
        }

        const timeout = setTimeout(() => {
            localStorage.setItem(
                draftKey,
                JSON.stringify({
                    yesterday,
                    today,
                    updatedAt: new Date().toISOString(),
                }),
            );
        }, 700);

        return () => clearTimeout(timeout);
    }, [autosaveEnabled, draftKey, hydrated, today, yesterday]);

    const handleSave = useCallback(() => {
        saveMutation.mutate(
            { date, yesterday, today, project_id: projectId === "" ? null : projectId },
            {
                onSuccess: () => {
                    localStorage.removeItem(draftKey);
                    setDraftRestoredAt(null);
                    notify(t("Journal entry saved."), "success");
                },
            },
        );
    }, [date, draftKey, notify, projectId, saveMutation, t, today, yesterday]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
                event.preventDefault();
                if (!saveMutation.isPending) {
                    handleSave();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleSave, saveMutation.isPending]);

    const insertFormat = (prefix: string, suffix: string) => {
        const isYest = lastFocused === "yesterday";
        const currentValue = isYest ? yesterday : today;
        const setter = isYest ? setYesterday : setToday;

        if (currentValue.endsWith("\n") || currentValue.length === 0) {
            setter(currentValue + `${prefix}text${suffix}`);
        } else {
            setter(currentValue + `\n${prefix}text${suffix}`);
        }
    };

    const insertTemplate = (target: "yesterday" | "today") => {
        if (target === "yesterday") {
            setYesterday((prev) => {
                const template = "- Completed:\n- Blockers:\n- Notes:";
                return prev.trim().length === 0 ? template : `${prev}\n\n${template}`;
            });
        } else {
            setToday((prev) => {
                const template = "- Priority 1:\n- Priority 2:\n- Risks:\n- Help needed:";
                return prev.trim().length === 0 ? template : `${prev}\n\n${template}`;
            });
        }
    };

    const copyYesterdayToToday = () => {
        if (!yesterday.trim()) return;
        setToday((prev) => (prev.trim().length > 0 ? `${prev}\n\n${yesterday}` : yesterday));
    };

    const clearDraft = () => {
        localStorage.removeItem(draftKey);
        setDraftRestoredAt(null);
        setYesterday(entry?.yesterday ?? "");
        setToday(entry?.today ?? "");
        setProjectId(entry?.project_id ?? "");
    };

    const handleEnergyTagToggle = (next: EnergyTag) => {
        const resolved = energyTag === next ? null : next;
        setEnergyTag(resolved);

        try {
            const raw = localStorage.getItem(ENERGY_STORAGE_KEY);
            const parsed = raw ? (JSON.parse(raw) as Record<string, EnergyTag>) : {};
            if (resolved) {
                parsed[date] = resolved;
            } else {
                delete parsed[date];
            }
            localStorage.setItem(ENERGY_STORAGE_KEY, JSON.stringify(parsed));
            window.dispatchEvent(new CustomEvent("devJournal:energyTagUpdated"));
        } catch {
            // ignore
        }
    };

    const handleDeleteEntry = () => {
        deleteMutation.mutate(date, {
            onSuccess: () => {
                localStorage.removeItem(draftKey);
                setDraftRestoredAt(null);
                setYesterday("");
                setToday("");
                setConfirmDeleteOpen(false);
                notify(t("Journal entry deleted."), "info");
            },
        });
    };

    const yesterdayWords = countWords(yesterday);
    const todayWords = countWords(today);
    const totalWords = yesterdayWords + todayWords;

    const isToday = format(new Date(), "yyyy-MM-dd") === date;
    const displayDate = isToday ? t("Today") : format(parseISO(date), "MMMM d, yyyy");
    const isDark = muiTheme.palette.mode === "dark";

    const glassSx = {
        borderRadius: 3.5,
        border: "1px solid",
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.50)",
        bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.40)",
        backdropFilter: "blur(20px) saturate(1.4)",
        WebkitBackdropFilter: "blur(20px) saturate(1.4)",
        boxShadow: isDark
            ? "0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)"
            : "0 8px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.60)",
    };

    const toolbarBtnSx = {
        color: "text.secondary",
        borderRadius: 1.5,
        width: 32,
        height: 32,
        transition: "all 0.2s ease",
        "&:hover": {
            color: "text.primary",
            bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
        },
    };

    if (isLoading)
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
                <Typography variant="h6" color="text.secondary">
                    {t("Loading...")}
                </Typography>
            </Box>
        );

    const statusParts: string[] = [];
    if (entry) statusParts.push(t("Saved"));
    if (draftRestoredAt) statusParts.push(`${t("Draft")} ${formatDraftTime(draftRestoredAt)}`);
    if (autosaveEnabled) statusParts.push(t("Autosave on"));

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}>
            <Box sx={{ maxWidth: 860, mx: "auto", mt: { xs: 0.5, md: 1 }, pb: 3 }}>
                {/* ── Header card ── */}
                <Box sx={{ ...glassSx, p: { xs: 2, sm: 2.5 }, mb: { xs: 1.5, md: 2 } }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
                                {displayDate}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {totalWords} {t("words")} · {statusParts.join(" · ")}
                            </Typography>
                        </Box>
                        <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
                            {/* Formatting toolbar inline */}
                            <Box sx={{ display: { xs: "none", sm: "flex" }, gap: 0.25, mr: 0.5 }}>
                                <Tooltip title={t("Bold")}>
                                    <IconButton size="small" onClick={() => insertFormat("**", "**")} sx={toolbarBtnSx}>
                                        <FormatBoldIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={t("Italic")}>
                                    <IconButton size="small" onClick={() => insertFormat("*", "*")} sx={toolbarBtnSx}>
                                        <FormatItalicIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={t("Code")}>
                                    <IconButton size="small" onClick={() => insertFormat("`", "`")} sx={toolbarBtnSx}>
                                        <CodeIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={t("Bullet list")}>
                                    <IconButton size="small" onClick={() => insertFormat("- ", "")} sx={toolbarBtnSx}>
                                        <FormatListBulletedIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<SaveIcon />}
                                onClick={handleSave}
                                disabled={saveMutation.isPending}
                                sx={{ px: 2 }}
                            >
                                {saveMutation.isPending ? t("Saving...") : t("Save")}
                            </Button>
                            <IconButton
                                size="small"
                                onClick={(e) => setMoreAnchor(e.currentTarget)}
                                sx={{
                                    border: "1px solid",
                                    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                                    borderRadius: 1.5,
                                    width: 32,
                                    height: 32,
                                }}
                            >
                                <MoreHorizIcon fontSize="small" />
                            </IconButton>
                            <Menu
                                anchorEl={moreAnchor}
                                open={Boolean(moreAnchor)}
                                onClose={() => setMoreAnchor(null)}
                                transformOrigin={{ horizontal: "right", vertical: "top" }}
                                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                            >
                                <MenuItem onClick={() => { copyYesterdayToToday(); setMoreAnchor(null); }}>
                                    <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
                                    <ListItemText>{t("Copy yesterday → today")}</ListItemText>
                                </MenuItem>
                                <MenuItem onClick={() => { clearDraft(); setMoreAnchor(null); }}>
                                    <ListItemIcon><RestartAltIcon fontSize="small" /></ListItemIcon>
                                    <ListItemText>{t("Reset draft")}</ListItemText>
                                </MenuItem>
                                <MenuItem disabled={!entry || deleteMutation.isPending} onClick={() => { setMoreAnchor(null); setConfirmDeleteOpen(true); }} sx={{ color: "error.main" }}>
                                    <ListItemIcon><DeleteOutlineIcon fontSize="small" color="error" /></ListItemIcon>
                                    <ListItemText>{t("Delete entry")}</ListItemText>
                                </MenuItem>
                            </Menu>
                        </Box>
                    </Box>

                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
                        <TextField
                            select size="small" label={t("Project")}
                            value={projectId === "" ? "" : String(projectId)}
                            onChange={(e) => { const v = e.target.value; setProjectId(v === "" ? "" : Number(v)); }}
                            fullWidth SelectProps={{ native: true }}
                        >
                            <option value="">{t("No project")}</option>
                            {projects.map((project) => (
                                <option key={project.id} value={project.id}>{project.name}</option>
                            ))}
                        </TextField>
                        <TextField
                            select size="small" label={t("Energy")}
                            value={energyTag ?? ""}
                            onChange={(e) => { const v = e.target.value as EnergyTag | ""; handleEnergyTagToggle(v === "" ? (energyTag ?? "focused") : v); }}
                            fullWidth SelectProps={{ native: true }}
                        >
                            <option value="">{t("No tag")}</option>
                            {ENERGY_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{t(opt.label)}</option>
                            ))}
                        </TextField>
                    </Box>
                </Box>

                {/* ── Yesterday card ── */}
                <Box sx={{ ...glassSx, p: { xs: 2, sm: 2.5 }, mb: { xs: 1.5, md: 2 } }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 0.75 }}>
                            ⏮ {t("Yesterday")}
                            <Chip label={`${yesterdayWords}`} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.62rem" }} />
                        </Typography>
                        <Tooltip title={t("Insert template")}>
                            <IconButton size="small" onClick={() => insertTemplate("yesterday")} sx={toolbarBtnSx}>
                                <DescriptionOutlinedIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                    <TextField
                        multiline rows={5} fullWidth value={yesterday}
                        onFocus={() => setLastFocused("yesterday")}
                        onChange={(e) => setYesterday(e.target.value)}
                        placeholder={t("What did you achieve? Any blockers?")}
                    />
                    <AnimatePresence>
                        {previewEnabled && yesterday.length > 0 && (
                            <Box component={motion.div} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                                <Paper sx={{ mt: 1.5, p: 1.5, minHeight: 40, bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", borderRadius: 2 }} variant="outlined">
                                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 1, mb: 0.5, display: "block", fontSize: "0.6rem" }}>
                                        {t("Preview")}
                                    </Typography>
                                    <Markdown>{yesterday}</Markdown>
                                </Paper>
                            </Box>
                        )}
                    </AnimatePresence>
                </Box>

                {/* ── Today card ── */}
                <Box sx={{ ...glassSx, p: { xs: 2, sm: 2.5 } }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 0.75 }}>
                            🎯 {t("Today")}
                            <Chip label={`${todayWords}`} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.62rem" }} />
                        </Typography>
                        <Tooltip title={t("Insert template")}>
                            <IconButton size="small" onClick={() => insertTemplate("today")} sx={toolbarBtnSx}>
                                <DescriptionOutlinedIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                    <TextField
                        multiline rows={5} fullWidth value={today}
                        onFocus={() => setLastFocused("today")}
                        onChange={(e) => setToday(e.target.value)}
                        placeholder={t("What's the main focus for today?")}
                    />
                    <AnimatePresence>
                        {previewEnabled && today.length > 0 && (
                            <Box component={motion.div} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                                <Paper sx={{ mt: 1.5, p: 1.5, minHeight: 40, bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", borderRadius: 2 }} variant="outlined">
                                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 1, mb: 0.5, display: "block", fontSize: "0.6rem" }}>
                                        {t("Preview")}
                                    </Typography>
                                    <Markdown>{today}</Markdown>
                                </Paper>
                            </Box>
                        )}
                    </AnimatePresence>
                </Box>
            </Box>

            <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)}>
                <DialogTitle>{t("Delete entry")}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        {t("This will permanently delete the saved journal entry for")} {displayDate}.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDeleteOpen(false)}>{t("Cancel")}</Button>
                    <Button color="error" variant="contained" onClick={handleDeleteEntry} disabled={deleteMutation.isPending}>
                        {deleteMutation.isPending ? t("Deleting...") : t("Delete")}
                    </Button>
                </DialogActions>
            </Dialog>
        </motion.div>
    );
};
