import { Box, TextField, Typography, Button, Paper, IconButton, Tooltip } from "@mui/material";
import { useState, useEffect } from "react";
import Markdown from "react-markdown";
import { useEntry, useSaveEntry } from "../hooks/useEntries";
import { format, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import CodeIcon from '@mui/icons-material/Code';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import SaveIcon from '@mui/icons-material/Save';

interface EntryFormProps {
    date: string;
}

export const EntryForm = ({ date }: EntryFormProps) => {
    const { data: entry, isLoading } = useEntry(date);
    const saveMutation = useSaveEntry();

    const [yesterday, setYesterday] = useState("");
    const [today, setToday] = useState("");

    // Track which textarea was focused last
    const [lastFocused, setLastFocused] = useState<'yesterday' | 'today'>('yesterday');

    useEffect(() => {
        if (entry) {
            setYesterday(entry.yesterday);
            setToday(entry.today);
        } else {
            setYesterday("");
            setToday("");
        }
    }, [entry, date]);

    const handleSave = () => {
        saveMutation.mutate({ date, yesterday, today });
    };

    const insertFormat = (prefix: string, suffix: string) => {
        const isYest = lastFocused === 'yesterday';
        const currentValue = isYest ? yesterday : today;
        const setter = isYest ? setYesterday : setToday;

        // Very basic append to the end formatting (ideal would be cursor position, but difficult without complex refs)
        if (currentValue.endsWith('\n') || currentValue.length === 0) {
            setter(currentValue + `${prefix}text${suffix}`);
        } else {
            setter(currentValue + `\n${prefix}text${suffix}`);
        }
    };

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
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                    <Typography variant="h4" sx={{
                        background: 'linear-gradient(to right, #93c5fd, #c4b5fd)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        {displayDate}
                    </Typography>

                    {/* Markdown Toolbar */}
                    <Paper elevation={0} sx={{ display: 'flex', gap: 0.5, p: 0.5, borderRadius: 3, bgcolor: 'rgba(15, 23, 42, 0.4)' }}>
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
                    </Paper>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" gutterBottom color="primary.light" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span style={{ fontSize: '1.2em' }}>⏮</span> Yesterday
                        </Typography>
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
                            {yesterday.length > 0 && (
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
                        <Typography variant="h6" gutterBottom color="secondary.light" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span style={{ fontSize: '1.2em' }}>🎯</span> Today
                        </Typography>
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
                            {today.length > 0 && (
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

                <Box sx={{ mt: 5, display: 'flex', justifyContent: 'flex-end' }}>
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
        </motion.div>
    );
};
