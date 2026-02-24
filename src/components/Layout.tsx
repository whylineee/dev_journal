import { Box, AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemText, ListItemButton, Divider, InputBase, alpha, Chip, IconButton, Dialog, Button, FormControlLabel, Switch, TextField, useMediaQuery } from "@mui/material";
import { ChangeEvent, ReactNode, useRef, useState } from "react";
import { useTheme } from "@mui/material/styles";
import { useEntries, useImportBackup, useSearchEntries } from "../hooks/useEntries";
import { usePages } from "../hooks/usePages";
import { useTasks } from "../hooks/useTasks";
import { useGoals } from "../hooks/useGoals";
import { useHabits } from "../hooks/useHabits";
import { AppearanceMode, FontPreset, THEME_PRESETS, ThemePresetId, UiDensity, useThemeContext } from "../theme/ThemeContext";
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
import RepeatIcon from '@mui/icons-material/Repeat';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MenuIcon from '@mui/icons-material/Menu';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import KeyboardCommandKeyIcon from '@mui/icons-material/KeyboardCommandKey';

const drawerWidth = 280;

interface LayoutProps {
    children: ReactNode;
    activeTab: 'planner' | 'journal' | 'page' | 'tasks' | 'goals' | 'habits';
    onTabChange: (tab: 'planner' | 'journal' | 'page' | 'tasks' | 'goals' | 'habits') => void;
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
    const muiTheme = useTheme();
    const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [replaceExistingOnImport, setReplaceExistingOnImport] = useState(true);
    const [importStatus, setImportStatus] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement | null>(null);
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
    const { data: searchResults } = useSearchEntries(searchQuery);
    const importBackupMutation = useImportBackup();
    const { data: pages } = usePages();
    const { data: tasks } = useTasks();
    const { data: goals } = useGoals();
    const { data: habits } = useHabits();

    const displayEntries = searchQuery ? searchResults : allEntries;
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const todayEntryExists = Boolean(allEntries?.find((entry) => entry.date === todayStr));
    const openTasksCount = (tasks ?? []).filter((task) => task.status !== "done").length;
    const activeGoalsCount = (goals ?? []).filter((goal) => goal.status === "active" || goal.status === "paused").length;
    const completedHabitsToday = (habits ?? []).filter((habit) => habit.completed_dates.includes(todayStr)).length;
    const totalHabits = habits?.length ?? 0;

    const activeTabLabel: Record<LayoutProps["activeTab"], string> = {
        planner: "Planner",
        journal: "Journal",
        tasks: "Tasks",
        goals: "Goals",
        habits: "Habits",
        page: "Pages",
    };

    const exportBackup = () => {
        const data = {
            exported_at: new Date().toISOString(),
            entries: allEntries ?? [],
            pages: pages ?? [],
            tasks: tasks ?? [],
            goals: goals ?? [],
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
        '&:hover': {
            backgroundColor: alpha(muiTheme.palette.primary.main, 0.08),
        },
        ...(isSelected
            ? {
                backgroundColor: alpha(muiTheme.palette.primary.main, 0.16),
                '&:hover': {
                    backgroundColor: alpha(muiTheme.palette.primary.main, 0.22),
                },
            }
            : {}),
    });

    const closeMobileDrawer = () => {
        if (isMobile) {
            setMobileDrawerOpen(false);
        }
    };

    return (
        <Box sx={{ display: 'flex', height: '100dvh', overflow: 'hidden', bgcolor: 'background.default' }}>
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar>
                    {isMobile ? (
                        <IconButton
                            color="inherit"
                            onClick={() => setMobileDrawerOpen(true)}
                            edge="start"
                            sx={{ mr: 1 }}
                        >
                            <MenuIcon />
                        </IconButton>
                    ) : null}
                    <EditNoteIcon sx={{ mr: 2, color: 'primary.main', fontSize: 28 }} />
                    <Typography
                        variant="h6"
                        noWrap
                        component="div"
                        sx={{
                            flexGrow: 1,
                            fontWeight: 700,
                            letterSpacing: '-0.02em',
                            color: 'text.primary',
                            fontSize: { xs: "1rem", sm: "1.1rem" },
                        }}
                    >
                        Dev Journal
                    </Typography>

                    <Chip
                        size="small"
                        label={`View: ${activeTabLabel[activeTab]}`}
                        variant="outlined"
                        sx={{ mr: { xs: 0.5, sm: 1.5 }, display: { xs: "none", sm: "inline-flex" } }}
                    />

                    <Chip
                        size="small"
                        icon={<KeyboardCommandKeyIcon sx={{ fontSize: 14 }} />}
                        label="Ctrl/Cmd + K"
                        variant="outlined"
                        sx={{ mr: 1.5, display: { xs: "none", md: "inline-flex" } }}
                    />

                    <Box sx={{
                        position: 'relative',
                        borderRadius: 2,
                        backgroundColor: alpha(muiTheme.palette.text.primary, 0.04),
                        '&:hover': {
                            backgroundColor: alpha(muiTheme.palette.text.primary, 0.08),
                        },
                        ml: { xs: 1, sm: 2 },
                        width: { xs: "100%", sm: '100%' },
                        maxWidth: { xs: 180, sm: 320 },
                        border: '1px solid',
                        borderColor: 'divider',
                    }}>
                        <Box sx={{ padding: '0 12px', height: '100%', position: 'absolute', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                        </Box>
                        <InputBase
                            placeholder="Search journal entries..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            sx={{
                                color: 'text.primary',
                                width: '100%',
                                '& .MuiInputBase-input': {
                                    padding: '8px 8px 8px 0',
                                    paddingLeft: '36px',
                                    transition: 'width 0.2s',
                                    width: '100%',
                                    fontSize: { xs: "0.85rem", sm: "0.95rem" },
                                    '&::placeholder': {
                                        color: muiTheme.palette.text.secondary,
                                        opacity: 1,
                                    },
                                },
                            }}
                        />
                    </Box>
                </Toolbar>
            </AppBar>

            <Drawer
                variant={isMobile ? "temporary" : "permanent"}
                open={isMobile ? mobileDrawerOpen : true}
                onClose={() => setMobileDrawerOpen(false)}
                ModalProps={{
                    keepMounted: true,
                    BackdropProps: {
                        sx: {
                            backgroundColor: alpha(muiTheme.palette.common.black, 0.32),
                        },
                    },
                }}
                sx={{
                    width: { md: drawerWidth },
                    flexShrink: 0,
                    [`& .MuiDrawer-paper`]: {
                        width: drawerWidth,
                        boxSizing: 'border-box',
                        borderRight: '1px solid',
                        borderColor: 'divider',
                        backgroundColor: 'background.paper',
                        backgroundImage: 'none',
                        backdropFilter: 'blur(10px)',
                    },
                }}
            >
                <Toolbar />
                <Box sx={{ overflow: 'auto', py: 2 }}>
                    <Typography variant="overline" sx={{ px: 3, mb: 1, display: 'block', color: 'text.secondary', letterSpacing: '0.1em' }}>
                        Overview
                    </Typography>
                    <List disablePadding>
                        <ListItem disablePadding>
                            <ListItemButton
                                selected={activeTab === 'planner'}
                                onClick={() => {
                                    onTabChange('planner');
                                    closeMobileDrawer();
                                }}
                                sx={navItemStyle(activeTab === 'planner')}
                            >
                                <DashboardIcon sx={{ mr: 2, fontSize: 20, opacity: 0.8 }} />
                                <ListItemText
                                    primary="Planner"
                                    secondary="Daily overview"
                                    primaryTypographyProps={{ fontWeight: 600 }}
                                    secondaryTypographyProps={{ fontSize: "0.75rem" }}
                                />
                            </ListItemButton>
                        </ListItem>
                    </List>

                    <Divider sx={{ my: 2, borderColor: 'divider', mx: 2 }} />

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
                                    closeMobileDrawer();
                                }}
                                sx={navItemStyle(activeTab === 'journal' && selectedDate === format(new Date(), "yyyy-MM-dd"))}
                            >
                                <TodayIcon sx={{ mr: 2, fontSize: 20, opacity: 0.8 }} />
                                <ListItemText
                                    primary="Today"
                                    secondary="Current daily report"
                                    primaryTypographyProps={{ fontWeight: 600 }}
                                    secondaryTypographyProps={{ fontSize: "0.75rem" }}
                                />
                                {todayEntryExists ? (
                                    <Chip label="Done" size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                                ) : (
                                    <Chip label="Missing" size="small" color="warning" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
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
                                        closeMobileDrawer();
                                    }}
                                    sx={navItemStyle(activeTab === 'journal' && selectedDate === entry.date)}
                                >
                                    <EventNoteIcon sx={{ mr: 2, fontSize: 20, opacity: 0.6 }} />
                                    <ListItemText
                                        primary={format(parseISO(entry.date), "MMM d, yyyy")}
                                        secondary={entry.date === todayStr ? "Today" : undefined}
                                        primaryTypographyProps={{ fontSize: '0.9rem' }}
                                        secondaryTypographyProps={{ fontSize: "0.72rem" }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>

                    <Divider sx={{ my: 2, borderColor: 'divider', mx: 2 }} />

                    {/* TASKS SECTION */}
                    <Typography variant="overline" sx={{ px: 3, mb: 1, display: 'block', color: 'text.secondary', letterSpacing: '0.1em' }}>
                        Management
                    </Typography>
                    <List disablePadding>
                        <ListItem disablePadding>
                            <ListItemButton
                                selected={activeTab === 'tasks'}
                                onClick={() => {
                                    onTabChange('tasks');
                                    closeMobileDrawer();
                                }}
                                sx={navItemStyle(activeTab === 'tasks')}
                            >
                                <TaskAltIcon sx={{ mr: 2, fontSize: 20, opacity: 0.8 }} />
                                <ListItemText
                                    primary="Tasks"
                                    secondary="Execution board"
                                    primaryTypographyProps={{ fontWeight: 600 }}
                                    secondaryTypographyProps={{ fontSize: "0.75rem" }}
                                />
                                <Chip label={openTasksCount} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.7rem" }} />
                            </ListItemButton>
                        </ListItem>
                        <ListItem disablePadding>
                            <ListItemButton
                                selected={activeTab === 'goals'}
                                onClick={() => {
                                    onTabChange('goals');
                                    closeMobileDrawer();
                                }}
                                sx={navItemStyle(activeTab === 'goals')}
                            >
                                <FlagIcon sx={{ mr: 2, fontSize: 20, opacity: 0.8 }} />
                                <ListItemText
                                    primary="Goals"
                                    secondary="Milestones"
                                    primaryTypographyProps={{ fontWeight: 600 }}
                                    secondaryTypographyProps={{ fontSize: "0.75rem" }}
                                />
                                <Chip label={activeGoalsCount} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.7rem" }} />
                            </ListItemButton>
                        </ListItem>
                        <ListItem disablePadding>
                            <ListItemButton
                                selected={activeTab === 'habits'}
                                onClick={() => {
                                    onTabChange('habits');
                                    closeMobileDrawer();
                                }}
                                sx={navItemStyle(activeTab === 'habits')}
                            >
                                <RepeatIcon sx={{ mr: 2, fontSize: 20, opacity: 0.8 }} />
                                <ListItemText
                                    primary="Habits"
                                    secondary="Daily consistency"
                                    primaryTypographyProps={{ fontWeight: 600 }}
                                    secondaryTypographyProps={{ fontSize: "0.75rem" }}
                                />
                                <Chip
                                    label={`${completedHabitsToday}/${totalHabits}`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: 20, fontSize: "0.7rem" }}
                                />
                            </ListItemButton>
                        </ListItem>
                    </List>

                    <Divider sx={{ my: 2, borderColor: 'divider', mx: 2 }} />

                    {/* PAGES SECTION */}
                    <Box sx={{ px: 3, mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.1em' }}>
                            Pages
                        </Typography>
                        <IconButton
                            size="small"
                            onClick={() => {
                                onTabChange('page');
                                onSelectPage(null);
                                closeMobileDrawer();
                            }}
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
                                    closeMobileDrawer();
                                }}
                                sx={navItemStyle(activeTab === 'page' && selectedPageId === null)}
                            >
                                <AddIcon sx={{ mr: 2, fontSize: 20, opacity: 0.8, color: 'primary.main' }} />
                                <ListItemText
                                    primary="New Page"
                                    secondary="Create note or doc"
                                    primaryTypographyProps={{ fontWeight: 600, color: 'primary.main' }}
                                    secondaryTypographyProps={{ fontSize: "0.75rem" }}
                                />
                            </ListItemButton>
                        </ListItem>

                        {pages?.map((page) => (
                            <ListItem key={page.id} disablePadding>
                                <ListItemButton
                                    selected={activeTab === 'page' && selectedPageId === page.id}
                                    onClick={() => {
                                        onTabChange('page');
                                        onSelectPage(page.id);
                                        closeMobileDrawer();
                                    }}
                                    sx={navItemStyle(activeTab === 'page' && selectedPageId === page.id)}
                                >
                                    <ArticleIcon sx={{ mr: 2, fontSize: 20, opacity: 0.6 }} />
                                    <ListItemText
                                        primary={page.title || "Untitled"}
                                        secondary="Knowledge page"
                                        primaryTypographyProps={{ fontSize: '0.9rem' }}
                                        secondaryTypographyProps={{ fontSize: "0.72rem" }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                </Box>

                {/* SETTINGS / THEME BUTTON */}
                <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
                    <IconButton
                        onClick={() => {
                            onSettingsOpenChange(true);
                            closeMobileDrawer();
                        }}
                        sx={{ color: 'text.secondary' }}
                    >
                        <SettingsIcon />
                    </IconButton>
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>Settings & Theme</Typography>
                </Box>
            </Drawer>

            <Box component="main" sx={{
                flexGrow: 1,
                p: { xs: 1.5, sm: 2, md: 4 },
                pt: { xs: 9, md: 10 },
                overflow: 'auto',
                position: 'relative'
            }}>
                {children}
            </Box>

            {/* SETTINGS DIALOG */}
            <Dialog
                open={settingsOpen}
                onClose={() => onSettingsOpenChange(false)}
                PaperProps={{
                    sx: {
                        bgcolor: 'background.paper',
                        borderRadius: 3,
                        p: 2,
                        width: { xs: "calc(100% - 24px)", sm: "min(760px, 100%)" },
                        maxHeight: "calc(100% - 24px)",
                        m: 1.5,
                    }
                }}
            >
                <Typography variant="h6" gutterBottom>Customize Theme</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>Select a theme preset:</Typography>

                <TextField
                    select
                    size="small"
                    label="Theme preset"
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
                                <Box sx={{ display: "flex", gap: 0.75, mt: 1 }}>
                                    <Box sx={{ width: 18, height: 18, borderRadius: 1, bgcolor: preset.light.primary }} />
                                    <Box sx={{ width: 18, height: 18, borderRadius: 1, bgcolor: preset.light.secondary }} />
                                    <Box sx={{ width: 18, height: 18, borderRadius: 1, bgcolor: preset.dark.primary }} />
                                    <Box sx={{ width: 18, height: 18, borderRadius: 1, bgcolor: preset.dark.backgroundDefault }} />
                                </Box>
                            </Box>
                        );
                    })}
                </Box>

                <Divider sx={{ my: 3, borderColor: 'divider' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Appearance</Typography>
                <TextField
                    select
                    size="small"
                    label="Theme mode"
                    value={appearanceMode}
                    onChange={(event) => setAppearanceMode(event.target.value as AppearanceMode)}
                    sx={{ mt: 1, width: { xs: "100%", sm: 260 } }}
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
                    sx={{ mt: 1, width: { xs: "100%", sm: 260 } }}
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
                    sx={{ mt: 1, width: { xs: "100%", sm: 260 } }}
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
                    sx={{ mt: 1, width: { xs: "100%", sm: 260 } }}
                    inputProps={{ min: 6, max: 24, step: 1 }}
                />

                <Divider sx={{ my: 3, borderColor: 'divider' }} />
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

                <Divider sx={{ my: 3, borderColor: 'divider' }} />
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
                    sx={{ mt: 1, width: { xs: "100%", sm: 260 } }}
                    inputProps={{ min: 0, max: 23, step: 1 }}
                />

                <Divider sx={{ my: 3, borderColor: 'divider' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Data</Typography>
                <Button onClick={exportBackup} startIcon={<DownloadIcon />} variant="outlined" sx={{ width: { xs: "100%", sm: "auto" } }}>
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
                    sx={{ mt: 1, width: { xs: "100%", sm: "auto" } }}
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
