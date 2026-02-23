import { Box, TextField, Typography, Button, Paper, IconButton, Tooltip, Chip, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { useState, useEffect, useMemo, useCallback } from "react";
import Markdown from "react-markdown";
import { useDeleteEntry, useEntry, useSaveEntry } from "../hooks/useEntries";
import { format, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import CodeIcon from '@mui/icons-material/Code';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

interface EntryFormProps {
    date: string;
    previewEnabled: boolean;
    autosaveEnabled: boolean;
}

const countWords = (value: string) => value.split(/\s+/).filter((word) => word.length > 0).length;
const formatDraftTime = (value: string) => {
    try {
        return format(parseISO(value), 'HH:mm');
    } catch {
        return 'recently';
    }
};

export const EntryForm = ({ date, previewEnabled, autosaveEnabled }: EntryFormProps) => {
    const { data: entry, isLoading } = useEntry(date);
    const saveMutation = useSaveEntry();
    const deleteMutation = useDeleteEntry();

    const [yesterday, setYesterday] = useState("");
    const [today, setToday] = useState("");
    const [draftRestoredAt, setDraftRestoredAt] = useState<string | null>(null);
    const [hydrated, setHydrated] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    // Track which textarea was focused last
    const [lastFocused, setLastFocused] = useState<'yesterday' | 'today'>('yesterday');

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
        setDraftRestoredAt(restoredAt);
        setHydrated(true);
    }, [entry, date, draftKey]);

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
                })
            );
        }, 700);

        return () => clearTimeout(timeout);
    }, [autosaveEnabled, draftKey, hydrated, today, yesterday]);

    const handleSave = useCallback(() => {
        saveMutation.mutate(
            { date, yesterday, today },
            {
                onSuccess: () => {
                    localStorage.removeItem(draftKey);
                    setDraftRestoredAt(null);
                },
            }
        );
    }, [date, draftKey, saveMutation, today, yesterday]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
                event.preventDefault();
                if (!saveMutation.isPending) {
                    handleSave();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSave, saveMutation.isPending]);

    const insertFormat = (prefix: string, suffix: string) => {
        const isYest = lastFocused === 'yesterday';
        const currentValue = isYest ? yesterday : today;
        const setter = isYest ? setYesterday : setToday;

        if (currentValue.endsWith('\n') || currentValue.length === 0) {
            setter(currentValue + `${prefix}text${suffix}`);
        } else {
            setter(currentValue + `\n${prefix}text${suffix}`);
        }
    };

    const insertTemplate = (target: 'yesterday' | 'today') => {
        if (target === 'yesterday') {
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
        if (!yesterday.trim()) {
            return;
        }
        setToday((prev) => (prev.trim().length > 0 ? `${prev}\n\n${yesterday}` : yesterday));
    };

    const clearDraft = () => {
        localStorage.removeItem(draftKey);
        setDraftRestoredAt(null);
        setYesterday(entry?.yesterday ?? "");
        setToday(entry?.today ?? "");
    };

    const handleDeleteEntry = () => {
        deleteMutation.mutate(date, {
            onSuccess: () => {
                localStorage.removeItem(draftKey);
                setDraftRestoredAt(null);
                setYesterday("");
                setToday("");
                setConfirmDeleteOpen(false);
            },
        });
    };

    const yesterdayWords = countWords(yesterday);
    const todayWords = countWords(today);
    const totalWords = yesterdayWords + todayWords;

    const isToday = format(new Date(), "yyyy-MM-dd") === date;
    const displayDate = isToday ? "Today" : format(parseISO(date), "MMMM d, yyyy");

    if (isLoading) return (
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
            <Typography variant="h6" color="text.secondary">Loading journal entry...</Typography>
        </Box>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
        >
            <Box sx={{ maxWidth: 900, mx: "auto" }}>
                <Box display="flex" justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} mb={2} flexDirection={{ xs: "column", md: "row" }} gap={2}>
                    <Typography variant="h4" sx={{
                        background: 'linear-gradient(to right, #93c5fd, #c4b5fd)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        {displayDate}
                    </Typography>

                    <Paper elevation={0} sx={{ display: 'flex', gap: 0.5, p: 0.5, borderRadius: 3, bgcolor: 'rgba(15, 23, 42, 0.4)', flexWrap: 'wrap' }}>
                        <Tooltip title="Bold">
                            <IconButton size="small" onClick={() => insertFormat('**', '**')}>
                                <FormatBoldIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Italic">
                            <IconButton size="small" onClick={() => insertFormat('*', '*')}>
                                <FormatItalicIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Code">
                            <IconButton size="small" onClick={() => insertFormat('`', '`')}>
                                <CodeIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Bullet List">
                            <IconButton size="small" onClick={() => insertFormat('- ', '')}>
                                <FormatListBulletedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Copy yesterday to today">
                            <IconButton size="small" onClick={copyYesterdayToToday}>
                                <ContentCopyIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Paper>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Chip label={`Words: ${totalWords}`} size="small" variant="outlined" />
                    <Chip label={`Yesterday: ${yesterdayWords}`} size="small" variant="outlined" />
                    <Chip label={`Today: ${todayWords}`} size="small" variant="outlined" />
                    <Chip label={autosaveEnabled ? 'Autosave on' : 'Autosave off'} size="small" color={autosaveEnabled ? 'success' : 'default'} variant="outlined" />
                    <Chip label="Ctrl/Cmd+S to save" size="small" variant="outlined" />
                    {entry ? <Chip label="Saved in DB" size="small" color="success" variant="outlined" /> : null}
                    {draftRestoredAt ? (
                        <Chip label={`Draft restored: ${formatDraftTime(draftRestoredAt)}`} size="small" color="info" variant="outlined" />
                    ) : null}
                </Box>

                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
                    <Box sx={{ flex: 1 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="h6" color="primary.light" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <span style={{ fontSize: '1.2em' }}>⏮</span> Yesterday
                            </Typography>
                            <Button size="small" variant="text" onClick={() => insertTemplate('yesterday')}>Template</Button>
                        </Box>
                        <TextField
                            multiline
                            rows={10}
                            fullWidth
                            value={yesterday}
                            onFocus={() => setLastFocused('yesterday')}
                            onChange={(e) => setYesterday(e.target.value)}
                            placeholder="What did you achieve? Any blockers?"
                            sx={{ mt: 1 }}
                        />
                        <AnimatePresence>
                            {previewEnabled && yesterday.length > 0 && (
                                <Box component={motion.div} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                    <Paper sx={{ mt: 2, p: 2, minHeight: 60, bgcolor: 'rgba(30, 41, 59, 0.4)', borderRadius: 2 }} variant="outlined">
                                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 1, display: 'block' }}>Preview</Typography>
                                        <Markdown>{yesterday}</Markdown>
                                    </Paper>
                                </Box>
                            )}
                        </AnimatePresence>
                    </Box>

                    <Box sx={{ flex: 1 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="h6" color="secondary.light" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <span style={{ fontSize: '1.2em' }}>🎯</span> Today
                            </Typography>
                            <Button size="small" variant="text" onClick={() => insertTemplate('today')}>Template</Button>
                        </Box>
                        <TextField
                            multiline
                            rows={10}
                            fullWidth
                            value={today}
                            onFocus={() => setLastFocused('today')}
                            onChange={(e) => setToday(e.target.value)}
                            placeholder="What's the main focus for today?"
                            sx={{ mt: 1 }}
                        />
                        <AnimatePresence>
                            {previewEnabled && today.length > 0 && (
                                <Box component={motion.div} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                    <Paper sx={{ mt: 2, p: 2, minHeight: 60, bgcolor: 'rgba(30, 41, 59, 0.4)', borderRadius: 2 }} variant="outlined">
                                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 1, display: 'block' }}>Preview</Typography>
                                        <Markdown>{today}</Markdown>
                                    </Paper>
                                </Box>
                            )}
                        </AnimatePresence>
                    </Box>
                </Box>

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="text"
                            color="inherit"
                            size="small"
                            startIcon={<RestartAltIcon />}
                            onClick={clearDraft}
                        >
                            Reset Draft
                        </Button>
                        <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<DeleteOutlineIcon />}
                            disabled={!entry || deleteMutation.isPending}
                            onClick={() => setConfirmDeleteOpen(true)}
                        >
                            Delete Day Entry
                        </Button>
                    </Box>

                    <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        startIcon={<SaveIcon />}
                        onClick={handleSave}
                        disabled={saveMutation.isPending}
                        sx={{ px: 4, py: 1.5 }}
                    >
                        {saveMutation.isPending ? "Saving..." : "Save Journal"}
                    </Button>
                </Box>
            </Box>

            <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)}>
                <DialogTitle>Delete day entry?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        This will permanently delete the saved journal entry for {displayDate}.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDeleteOpen(false)}>Cancel</Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={handleDeleteEntry}
                        disabled={deleteMutation.isPending}
                    >
                        {deleteMutation.isPending ? "Deleting..." : "Delete"}
                    </Button>
                </DialogActions>
            </Dialog>
        </motion.div>
    );
};
