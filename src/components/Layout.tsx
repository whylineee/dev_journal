import { Box, AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemText, ListItemButton, Divider, InputBase, alpha, Chip, IconButton, Dialog, Button, FormControlLabel, Switch, TextField } from "@mui/material";
import { ChangeEvent, ReactNode, useRef, useState } from "react";
import { useEntries, useImportBackup, useSearchEntries } from "../hooks/useEntries";
import { usePages } from "../hooks/usePages";
import { useTasks } from "../hooks/useTasks";
import { useGoals } from "../hooks/useGoals";
import { AppearanceMode, FontPreset, UiDensity, useThemeContext } from "../theme/ThemeContext";
import { BackupPayload } from "../types";
import { format, parseISO } from "date-fns";
import SearchIcon from '@mui/icons-material/Search';
import EditNoteIcon from '@mui/icons-material/EditNote';
import TodayIcon from '@mui/icons-material/Today';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ArticleIcon from '@mui/icons-material/Article';
import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import FlagIcon from '@mui/icons-material/Flag';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';

const drawerWidth = 280;

interface LayoutProps {
    children: ReactNode;
    activeTab: 'journal' | 'page' | 'tasks' | 'goals';
    onTabChange: (tab: 'journal' | 'page' | 'tasks' | 'goals') => void;
    selectedDate: string;
    onSelectDate: (date: string) => void;
    selectedPageId: number | null;
    onSelectPage: (id: number | null) => void;
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
    settingsOpen: boolean;
    onSettingsOpenChange: (open: boolean) => void;
}

export const Layout = ({
    children,
    activeTab,
    onTabChange,
    selectedDate,
    onSelectDate,
    selectedPageId,
    onSelectPage,
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
    settingsOpen,
    onSettingsOpenChange,
}: LayoutProps) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [replaceExistingOnImport, setReplaceExistingOnImport] = useState(true);
    const [importStatus, setImportStatus] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const {
        primaryColor,
        setPrimaryColor,
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
    const { data: searchResults } = useSearchEntries(searchQuery);
    const importBackupMutation = useImportBackup();
    const { data: pages } = usePages();
    const { data: tasks } = useTasks();
    const { data: goals } = useGoals();

    const displayEntries = searchQuery ? searchResults : allEntries;

    const exportBackup = () => {
        const data = {
            exported_at: new Date().toISOString(),
            entries: allEntries ?? [],
            pages: pages ?? [],
            tasks: tasks ?? [],
            goals: goals ?? [],
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
                        setImportStatus("Backup imported successfully.");
                    },
                    onError: () => {
                        setImportStatus("Import failed. Check JSON format.");
                    },
                }
            );
        } catch {
            setImportStatus("Import failed. Invalid JSON file.");
        } finally {
            event.target.value = "";
        }
    };

    const navItemStyle = (isSelected: boolean) => ({
        borderRadius: 2,
        mb: 0.5,
        mx: 1,
        transition: 'all 0.2s',
        color: isSelected ? 'primary.main' : 'text.primary',
    });

    return (
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <Toolbar>
                    <EditNoteIcon sx={{ mr: 2, color: 'primary.main', fontSize: 28 }} />
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: '-0.02em', color: 'text.primary' }}>
                        Dev Journal
                    </Typography>

                    <Box sx={{
                        position: 'relative',
                        borderRadius: 2,
                        backgroundColor: alpha('#f8fafc', 0.1),
                        '&:hover': {
                            backgroundColor: alpha('#f8fafc', 0.15),
                        },
                        ml: 2,
                        width: '100%',
                        maxWidth: 300,
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <Box sx={{ padding: '0 12px', height: '100%', position: 'absolute', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                        </Box>
                        <InputBase
                            placeholder="Search entries..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            sx={{
                                color: 'inherit',
                                width: '100%',
                                '& .MuiInputBase-input': {
                                    padding: '8px 8px 8px 0',
                                    paddingLeft: '36px',
                                    transition: 'width 0.2s',
                                    width: '100%',
                                },
                            }}
                        />
                    </Box>
                </Toolbar>
            </AppBar>

            <Drawer
                variant="permanent"
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    [`& .MuiDrawer-paper`]: {
                        width: drawerWidth,
                        boxSizing: 'border-box',
                        borderRight: '1px solid rgba(255,255,255,0.05)',
                        backgroundColor: 'rgba(15, 23, 42, 0.5)',
                        backdropFilter: 'blur(20px)'
                    },
                }}
            >
                <Toolbar />
                <Box sx={{ overflow: 'auto', py: 2 }}>

                    {/* JOURNAL SECTION */}
                    <Typography variant="overline" sx={{ px: 3, mb: 1, display: 'block', color: 'text.secondary', letterSpacing: '0.1em' }}>
                        Daily Journal
                    </Typography>
                    <List disablePadding>
                        <ListItem disablePadding>
                            <ListItemButton
                                selected={activeTab === 'journal' && selectedDate === format(new Date(), "yyyy-MM-dd")}
                                onClick={() => {
                                    setSearchQuery("");
                                    onTabChange('journal');
                                    onSelectDate(format(new Date(), "yyyy-MM-dd"));
                                }}
                                sx={navItemStyle(activeTab === 'journal' && selectedDate === format(new Date(), "yyyy-MM-dd"))}
                            >
                                <TodayIcon sx={{ mr: 2, fontSize: 20, opacity: 0.8 }} />
                                <ListItemText primary="Today" primaryTypographyProps={{ fontWeight: 600 }} />
                                {allEntries && allEntries.find(e => e.date === format(new Date(), "yyyy-MM-dd")) && (
                                    <Chip label="Done" size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                                )}
                            </ListItemButton>
                        </ListItem>

                        {displayEntries?.map((entry) => (
                            <ListItem key={entry.id} disablePadding>
                                <ListItemButton
                                    selected={activeTab === 'journal' && selectedDate === entry.date}
                                    onClick={() => {
                                        onTabChange('journal');
                                        onSelectDate(entry.date);
                                    }}
                                    sx={navItemStyle(activeTab === 'journal' && selectedDate === entry.date)}
                                >
                                    <EventNoteIcon sx={{ mr: 2, fontSize: 20, opacity: 0.6 }} />
                                    <ListItemText
                                        primary={format(parseISO(entry.date), "MMM d, yyyy")}
                                        primaryTypographyProps={{ fontSize: '0.9rem' }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>

                    <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.05)', mx: 2 }} />

                    {/* TASKS SECTION */}
                    <Typography variant="overline" sx={{ px: 3, mb: 1, display: 'block', color: 'text.secondary', letterSpacing: '0.1em' }}>
                        Management
                    </Typography>
                    <List disablePadding>
                        <ListItem disablePadding>
                            <ListItemButton
                                selected={activeTab === 'tasks'}
                                onClick={() => onTabChange('tasks')}
                                sx={navItemStyle(activeTab === 'tasks')}
                            >
                                <TaskAltIcon sx={{ mr: 2, fontSize: 20, opacity: 0.8 }} />
                                <ListItemText primary="Tasks" primaryTypographyProps={{ fontWeight: 600 }} />
                            </ListItemButton>
                        </ListItem>
                        <ListItem disablePadding>
                            <ListItemButton
                                selected={activeTab === 'goals'}
                                onClick={() => onTabChange('goals')}
                                sx={navItemStyle(activeTab === 'goals')}
                            >
                                <FlagIcon sx={{ mr: 2, fontSize: 20, opacity: 0.8 }} />
                                <ListItemText primary="Goals" primaryTypographyProps={{ fontWeight: 600 }} />
                            </ListItemButton>
                        </ListItem>
                    </List>

                    <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.05)', mx: 2 }} />

                    {/* PAGES SECTION */}
                    <Box sx={{ px: 3, mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.1em' }}>
                            Pages
                        </Typography>
                        <IconButton
                            size="small"
                            onClick={() => { onTabChange('page'); onSelectPage(null); }}
                            sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'rgba(96, 165, 250, 0.1)' } }}
                        >
                            <AddIcon fontSize="small" />
                        </IconButton>
                    </Box>
                    <List disablePadding>
                        <ListItem disablePadding>
                            <ListItemButton
                                selected={activeTab === 'page' && selectedPageId === null}
                                onClick={() => {
                                    onTabChange('page');
                                    onSelectPage(null);
                                }}
                                sx={navItemStyle(activeTab === 'page' && selectedPageId === null)}
                            >
                                <AddIcon sx={{ mr: 2, fontSize: 20, opacity: 0.8, color: 'primary.main' }} />
                                <ListItemText primary="New Page" primaryTypographyProps={{ fontWeight: 600, color: 'primary.main' }} />
                            </ListItemButton>
                        </ListItem>

                        {pages?.map((page) => (
                            <ListItem key={page.id} disablePadding>
                                <ListItemButton
                                    selected={activeTab === 'page' && selectedPageId === page.id}
                                    onClick={() => {
                                        onTabChange('page');
                                        onSelectPage(page.id);
                                    }}
                                    sx={navItemStyle(activeTab === 'page' && selectedPageId === page.id)}
                                >
                                    <ArticleIcon sx={{ mr: 2, fontSize: 20, opacity: 0.6 }} />
                                    <ListItemText
                                        primary={page.title || "Untitled"}
                                        primaryTypographyProps={{ fontSize: '0.9rem' }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                </Box>

                {/* SETTINGS / THEME BUTTON */}
                <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center' }}>
                    <IconButton onClick={() => onSettingsOpenChange(true)} sx={{ color: 'text.secondary' }}>
                        <SettingsIcon />
                    </IconButton>
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>Settings & Theme</Typography>
                </Box>
            </Drawer>

            <Box component="main" sx={{
                flexGrow: 1,
                p: { xs: 2, md: 4 },
                pt: { xs: 10, md: 10 },
                overflow: 'auto',
                position: 'relative'
            }}>
                {children}
            </Box>

            {/* SETTINGS DIALOG */}
            <Dialog open={settingsOpen} onClose={() => onSettingsOpenChange(false)} PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3, p: 2, minWidth: 320 } }}>
                <Typography variant="h6" gutterBottom>Customize Theme</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>Select an accent color:</Typography>

                <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                    {[
                        { color: '#60a5fa', name: 'Blue' },
                        { color: '#a78bfa', name: 'Purple' },
                        { color: '#10b981', name: 'Emerald' },
                        { color: '#f59e0b', name: 'Amber' },
                        { color: '#ec4899', name: 'Pink' },
                    ].map((preset) => (
                        <Box
                            key={preset.color}
                            onClick={() => setPrimaryColor(preset.color)}
                            sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                bgcolor: preset.color,
                                cursor: 'pointer',
                                border: primaryColor === preset.color ? '3px solid white' : '2px solid transparent',
                                '&:hover': { transform: 'scale(1.1)' },
                                transition: 'all 0.2s'
                            }}
                        />
                    ))}
                </Box>

                <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.08)' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Appearance</Typography>
                <TextField
                    select
                    size="small"
                    label="Theme mode"
                    value={appearanceMode}
                    onChange={(event) => setAppearanceMode(event.target.value as AppearanceMode)}
                    sx={{ mt: 1, width: 220 }}
                    SelectProps={{ native: true }}
                >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                </TextField>

                <TextField
                    select
                    size="small"
                    label="Font"
                    value={fontPreset}
                    onChange={(event) => setFontPreset(event.target.value as FontPreset)}
                    sx={{ mt: 1, width: 220 }}
                    SelectProps={{ native: true }}
                >
                    <option value="inter">Inter</option>
                    <option value="roboto">Roboto</option>
                    <option value="mono">Mono</option>
                </TextField>

                <TextField
                    select
                    size="small"
                    label="Density"
                    value={uiDensity}
                    onChange={(event) => setUiDensity(event.target.value as UiDensity)}
                    sx={{ mt: 1, width: 220 }}
                    SelectProps={{ native: true }}
                >
                    <option value="comfortable">Comfortable</option>
                    <option value="compact">Compact</option>
                </TextField>

                <TextField
                    type="number"
                    size="small"
                    label="Corner radius (6-24)"
                    value={borderRadius}
                    onChange={(event) => {
                        const value = Number(event.target.value);
                        if (Number.isFinite(value)) {
                            setBorderRadius(Math.min(24, Math.max(6, value)));
                        }
                    }}
                    sx={{ mt: 1, width: 220 }}
                    inputProps={{ min: 6, max: 24, step: 1 }}
                />

                <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.08)' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Productivity</Typography>
                <FormControlLabel
                    sx={{ mt: 1 }}
                    control={
                        <Switch
                            checked={journalPreviewEnabled}
                            onChange={(event) => onJournalPreviewEnabledChange(event.target.checked)}
                        />
                    }
                    label="Show journal markdown preview"
                />
                <FormControlLabel
                    control={
                        <Switch
                            checked={pagePreviewEnabled}
                            onChange={(event) => onPagePreviewEnabledChange(event.target.checked)}
                        />
                    }
                    label="Show page markdown preview"
                />
                <FormControlLabel
                    control={
                        <Switch
                            checked={autosaveEnabled}
                            onChange={(event) => onAutosaveEnabledChange(event.target.checked)}
                        />
                    }
                    label="Enable draft autosave"
                />

                <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.08)' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Reminders</Typography>
                <FormControlLabel
                    sx={{ mt: 1 }}
                    control={
                        <Switch
                            checked={reminderEnabled}
                            onChange={(event) => onReminderEnabledChange(event.target.checked)}
                        />
                    }
                    label="Enable daily journal reminder"
                />

                <TextField
                    type="number"
                    size="small"
                    label="Reminder hour (0-23)"
                    value={reminderHour}
                    onChange={(event) => {
                        const value = Number(event.target.value);
                        if (Number.isInteger(value)) {
                            const normalized = Math.min(23, Math.max(0, value));
                            onReminderHourChange(normalized);
                        }
                    }}
                    sx={{ mt: 1, width: 220 }}
                    inputProps={{ min: 0, max: 23, step: 1 }}
                />

                <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.08)' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Data</Typography>
                <Button onClick={exportBackup} startIcon={<DownloadIcon />} variant="outlined">
                    Export Backup (JSON)
                </Button>
                <FormControlLabel
                    sx={{ mt: 1, display: 'block' }}
                    control={
                        <Switch
                            checked={replaceExistingOnImport}
                            onChange={(event) => setReplaceExistingOnImport(event.target.checked)}
                        />
                    }
                    label="Replace existing data on import"
                />
                <Button
                    onClick={openImportPicker}
                    startIcon={<UploadFileIcon />}
                    variant="outlined"
                    sx={{ mt: 1 }}
                    disabled={importBackupMutation.isPending}
                >
                    {importBackupMutation.isPending ? "Importing..." : "Import Backup (JSON)"}
                </Button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={handleImportBackup}
                    style={{ display: 'none' }}
                />
                {importStatus ? (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        {importStatus}
                    </Typography>
                ) : null}

                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <Button onClick={resetTheme} color="inherit">Reset</Button>
                    <Button onClick={() => onSettingsOpenChange(false)} variant="contained" color="primary">Done</Button>
                </Box>
            </Dialog>

        </Box>
    );
};
