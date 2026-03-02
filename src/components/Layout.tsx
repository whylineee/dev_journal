import {
  alpha,
  AppBar,
  Box,
  Chip,
  Drawer,
  IconButton,
  InputBase,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  Toolbar,
  Typography,
  useMediaQuery,
  Divider,
} from "@mui/material";
import { ReactNode, useState } from "react";
import { useTheme } from "@mui/material/styles";
import { useEntries, useSearchEntries } from "../hooks/useEntries";
import { usePages } from "../hooks/usePages";
import { useTasks } from "../hooks/useTasks";
import { useGoals } from "../hooks/useGoals";
import { useHabits } from "../hooks/useHabits";
import { useI18n } from "../i18n/I18nContext";
import { format, parseISO } from "date-fns";
import SearchIcon from "@mui/icons-material/Search";
import EditNoteIcon from "@mui/icons-material/EditNote";
import TodayIcon from "@mui/icons-material/Today";
import EventNoteIcon from "@mui/icons-material/EventNote";
import ArticleIcon from "@mui/icons-material/Article";
import AddIcon from "@mui/icons-material/Add";
import SettingsIcon from "@mui/icons-material/Settings";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import FlagIcon from "@mui/icons-material/Flag";
import RepeatIcon from "@mui/icons-material/Repeat";
import DashboardIcon from "@mui/icons-material/Dashboard";
import InsightsIcon from "@mui/icons-material/Insights";
import MenuIcon from "@mui/icons-material/Menu";
import KeyboardCommandKeyIcon from "@mui/icons-material/KeyboardCommandKey";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";

const drawerWidth = 280;

type LayoutTab = "planner" | "journal" | "page" | "tasks" | "goals" | "habits" | "insights" | "settings";

interface LayoutProps {
  children: ReactNode;
  activeTab: LayoutTab;
  onTabChange: (tab: LayoutTab) => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  selectedPageId: number | null;
  onSelectPage: (id: number | null) => void;
}

export const Layout = ({
  children,
  activeTab,
  onTabChange,
  selectedDate,
  onSelectDate,
  selectedPageId,
  onSelectPage,
}: LayoutProps) => {
  const muiTheme = useTheme();
  const { language, setLanguage, t } = useI18n();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: allEntries } = useEntries();
  const { data: searchResults } = useSearchEntries(searchQuery);
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

  const activeTabLabel: Record<LayoutTab, string> = {
    planner: t("Planner"),
    journal: t("Journal"),
    tasks: t("Tasks"),
    goals: t("Goals"),
    habits: t("Habits"),
    insights: t("Insights"),
    page: t("Pages"),
    settings: t("Settings"),
  };

  const navItemStyle = (isSelected: boolean) => ({
    borderRadius: 2,
    mb: 0.5,
    mx: 1,
    transition: "all 0.2s",
    color: isSelected ? "primary.main" : "text.primary",
    "&:hover": {
      backgroundColor: alpha(muiTheme.palette.primary.main, 0.08),
    },
    ...(isSelected
      ? {
          backgroundColor: alpha(muiTheme.palette.primary.main, 0.16),
          "&:hover": {
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
    <Box sx={{ display: "flex", height: "100dvh", overflow: "hidden", bgcolor: "background.default" }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Toolbar>
          {isMobile ? (
            <IconButton color="inherit" onClick={() => setMobileDrawerOpen(true)} edge="start" sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          ) : null}
          <EditNoteIcon sx={{ mr: 2, color: "primary.main", fontSize: 28 }} />
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "text.primary",
              fontSize: { xs: "1rem", sm: "1.1rem" },
            }}
          >
            {t("Dev Journal")}
          </Typography>

          <Chip
            size="small"
            label={t("View: {tab}", { tab: activeTabLabel[activeTab] })}
            variant="outlined"
            sx={{ mr: { xs: 0.5, sm: 1.5 }, display: { xs: "none", sm: "inline-flex" } }}
          />

          <Chip
            size="small"
            icon={<CalendarTodayIcon sx={{ fontSize: 12 }} />}
            label={format(new Date(), "MMM d")}
            variant="outlined"
            sx={{ mr: 1, display: { xs: "none", lg: "inline-flex" } }}
          />

          <Chip
            size="small"
            icon={<KeyboardCommandKeyIcon sx={{ fontSize: 14 }} />}
            label={t("Ctrl/Cmd + K")}
            variant="outlined"
            sx={{ mr: 1.5, display: { xs: "none", md: "inline-flex" } }}
          />

          <TextField
            select
            size="small"
            value={language}
            onChange={(event) => setLanguage(event.target.value === "uk" ? "uk" : "en")}
            sx={{
              mr: 1,
              minWidth: 86,
              display: { xs: "none", sm: "inline-flex" },
              "& .MuiOutlinedInput-root": { bgcolor: "transparent" },
            }}
            SelectProps={{ native: true }}
          >
            <option value="en">EN</option>
            <option value="uk">UKR</option>
          </TextField>

          <Box
            sx={{
              position: "relative",
              borderRadius: 2,
              backgroundColor: alpha(muiTheme.palette.text.primary, 0.04),
              "&:hover": {
                backgroundColor: alpha(muiTheme.palette.text.primary, 0.08),
              },
              ml: { xs: 0.5, sm: 2 },
              width: { xs: "100%", sm: "100%" },
              maxWidth: { xs: 140, sm: 320 },
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box sx={{ padding: "0 12px", height: "100%", position: "absolute", pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <SearchIcon sx={{ color: "text.secondary", fontSize: 20 }} />
            </Box>
            <InputBase
              placeholder={isMobile ? t("Search...") : t("Search journal entries...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{
                color: "text.primary",
                width: "100%",
                "& .MuiInputBase-input": {
                  padding: "8px 8px 8px 0",
                  paddingLeft: "36px",
                  transition: "width 0.2s",
                  width: "100%",
                  fontSize: { xs: "0.85rem", sm: "0.95rem" },
                  "&::placeholder": {
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
            boxSizing: "border-box",
            borderRight: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.paper",
            backgroundImage: "none",
            backdropFilter: "blur(10px)",
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: "auto", py: 2 }}>
          <Box
            sx={{
              mx: 2,
              mb: 2,
              p: 1.5,
              borderRadius: 2.5,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: alpha(muiTheme.palette.primary.main, 0.06),
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.25 }}>
              {format(new Date(), "EEEE, MMM d")}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {t("View: {tab}", { tab: activeTabLabel[activeTab] })}
            </Typography>
            <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              <Chip size="small" variant="outlined" label={`${t("Tasks")}: ${openTasksCount}`} />
              <Chip size="small" variant="outlined" label={`${t("Goals")}: ${activeGoalsCount}`} />
              <Chip size="small" variant="outlined" label={`${t("Habits")}: ${completedHabitsToday}/${totalHabits}`} />
            </Box>
          </Box>

          <Typography variant="overline" sx={{ px: 3, mb: 1, display: "block", color: "text.secondary", letterSpacing: "0.1em" }}>
            {t("Overview")}
          </Typography>
          <List disablePadding>
            <ListItem disablePadding>
              <ListItemButton selected={activeTab === "planner"} onClick={() => {
                onTabChange("planner");
                closeMobileDrawer();
              }} sx={navItemStyle(activeTab === "planner")}>
                <DashboardIcon sx={{ mr: 2, fontSize: 20, opacity: 0.8 }} />
                <ListItemText
                  primary={t("Planner")}
                  secondary={t("Daily overview")}
                  primaryTypographyProps={{ fontWeight: 600 }}
                  secondaryTypographyProps={{ fontSize: "0.75rem" }}
                />
              </ListItemButton>
            </ListItem>
          </List>

          <Divider sx={{ my: 2, borderColor: "divider", mx: 2 }} />

          <Typography variant="overline" sx={{ px: 3, mb: 1, display: "block", color: "text.secondary", letterSpacing: "0.1em" }}>
            {t("Daily Journal")}
          </Typography>
          <List disablePadding>
            <ListItem disablePadding>
              <ListItemButton
                selected={activeTab === "journal" && selectedDate === format(new Date(), "yyyy-MM-dd")}
                onClick={() => {
                  setSearchQuery("");
                  onTabChange("journal");
                  onSelectDate(format(new Date(), "yyyy-MM-dd"));
                  closeMobileDrawer();
                }}
                sx={navItemStyle(activeTab === "journal" && selectedDate === format(new Date(), "yyyy-MM-dd"))}
              >
                <TodayIcon sx={{ mr: 2, fontSize: 20, opacity: 0.8 }} />
                <ListItemText
                  primary={t("Today")}
                  secondary={t("Current daily report")}
                  primaryTypographyProps={{ fontWeight: 600 }}
                  secondaryTypographyProps={{ fontSize: "0.75rem" }}
                />
                {todayEntryExists ? (
                  <Chip label={t("Done")} size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: "0.65rem" }} />
                ) : (
                  <Chip label={t("Missing")} size="small" color="warning" variant="outlined" sx={{ height: 20, fontSize: "0.65rem" }} />
                )}
              </ListItemButton>
            </ListItem>

            {displayEntries?.map((entry) => (
              <ListItem key={entry.id} disablePadding>
                <ListItemButton
                  selected={activeTab === "journal" && selectedDate === entry.date}
                  onClick={() => {
                    onTabChange("journal");
                    onSelectDate(entry.date);
                    closeMobileDrawer();
                  }}
                  sx={navItemStyle(activeTab === "journal" && selectedDate === entry.date)}
                >
                  <EventNoteIcon sx={{ mr: 2, fontSize: 20, opacity: 0.6 }} />
                  <ListItemText
                    primary={format(parseISO(entry.date), "MMM d, yyyy")}
                    secondary={entry.date === todayStr ? t("Today") : undefined}
                    primaryTypographyProps={{ fontSize: "0.9rem" }}
                    secondaryTypographyProps={{ fontSize: "0.72rem" }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 2, borderColor: "divider", mx: 2 }} />

          <Typography variant="overline" sx={{ px: 3, mb: 1, display: "block", color: "text.secondary", letterSpacing: "0.1em" }}>
            {t("Management")}
          </Typography>
          <List disablePadding>
            <ListItem disablePadding>
              <ListItemButton selected={activeTab === "tasks"} onClick={() => {
                onTabChange("tasks");
                closeMobileDrawer();
              }} sx={navItemStyle(activeTab === "tasks")}>
                <TaskAltIcon sx={{ mr: 2, fontSize: 20, opacity: 0.8 }} />
                <ListItemText
                  primary={t("Tasks")}
                  secondary={t("Execution board")}
                  primaryTypographyProps={{ fontWeight: 600 }}
                  secondaryTypographyProps={{ fontSize: "0.75rem" }}
                />
                <Chip label={openTasksCount} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.7rem" }} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton selected={activeTab === "goals"} onClick={() => {
                onTabChange("goals");
                closeMobileDrawer();
              }} sx={navItemStyle(activeTab === "goals")}>
                <FlagIcon sx={{ mr: 2, fontSize: 20, opacity: 0.8 }} />
                <ListItemText
                  primary={t("Goals")}
                  secondary={t("Milestones")}
                  primaryTypographyProps={{ fontWeight: 600 }}
                  secondaryTypographyProps={{ fontSize: "0.75rem" }}
                />
                <Chip label={activeGoalsCount} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.7rem" }} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton selected={activeTab === "habits"} onClick={() => {
                onTabChange("habits");
                closeMobileDrawer();
              }} sx={navItemStyle(activeTab === "habits")}>
                <RepeatIcon sx={{ mr: 2, fontSize: 20, opacity: 0.8 }} />
                <ListItemText
                  primary={t("Habits")}
                  secondary={t("Daily consistency")}
                  primaryTypographyProps={{ fontWeight: 600 }}
                  secondaryTypographyProps={{ fontSize: "0.75rem" }}
                />
                <Chip label={`${completedHabitsToday}/${totalHabits}`} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.7rem" }} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton selected={activeTab === "insights"} onClick={() => {
                onTabChange("insights");
                closeMobileDrawer();
              }} sx={navItemStyle(activeTab === "insights")}>
                <InsightsIcon sx={{ mr: 2, fontSize: 20, opacity: 0.8 }} />
                <ListItemText
                  primary={t("Insights")}
                  secondary={t("Decisions, incidents, retros")}
                  primaryTypographyProps={{ fontWeight: 600 }}
                  secondaryTypographyProps={{ fontSize: "0.75rem" }}
                />
              </ListItemButton>
            </ListItem>
          </List>

          <Divider sx={{ my: 2, borderColor: "divider", mx: 2 }} />

          <Box sx={{ px: 3, mb: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.1em" }}>
              {t("Pages")}
            </Typography>
            <IconButton
              size="small"
              onClick={() => {
                onTabChange("page");
                onSelectPage(null);
                closeMobileDrawer();
              }}
              sx={{ color: "text.secondary", "&:hover": { color: "primary.main", bgcolor: "rgba(96, 165, 250, 0.1)" } }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Box>
          <List disablePadding>
            <ListItem disablePadding>
              <ListItemButton selected={activeTab === "page" && selectedPageId === null} onClick={() => {
                onTabChange("page");
                onSelectPage(null);
                closeMobileDrawer();
              }} sx={navItemStyle(activeTab === "page" && selectedPageId === null)}>
                <AddIcon sx={{ mr: 2, fontSize: 20, opacity: 0.8, color: "primary.main" }} />
                <ListItemText
                  primary={t("New Page")}
                  secondary={t("Create note or doc")}
                  primaryTypographyProps={{ fontWeight: 600, color: "primary.main" }}
                  secondaryTypographyProps={{ fontSize: "0.75rem" }}
                />
              </ListItemButton>
            </ListItem>

            {pages?.map((page) => (
              <ListItem key={page.id} disablePadding>
                <ListItemButton
                  selected={activeTab === "page" && selectedPageId === page.id}
                  onClick={() => {
                    onTabChange("page");
                    onSelectPage(page.id);
                    closeMobileDrawer();
                  }}
                  sx={navItemStyle(activeTab === "page" && selectedPageId === page.id)}
                >
                  <ArticleIcon sx={{ mr: 2, fontSize: 20, opacity: 0.6 }} />
                  <ListItemText
                    primary={page.title || "Untitled"}
                    secondary={t("Knowledge page")}
                    primaryTypographyProps={{ fontSize: "0.9rem" }}
                    secondaryTypographyProps={{ fontSize: "0.72rem" }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>

        <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider", display: "flex", alignItems: "center" }}>
          <IconButton
            onClick={() => {
              onTabChange("settings");
              closeMobileDrawer();
            }}
            sx={{ color: "text.secondary" }}
          >
            <SettingsIcon />
          </IconButton>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>{t("Settings & Theme")}</Typography>
        </Box>
      </Drawer>

      <Box component="main" sx={{
        flexGrow: 1,
        p: { xs: 1.5, sm: 2, md: 4 },
        pt: { xs: 9, md: 10 },
        overflow: "auto",
        position: "relative",
      }}>
        {children}
      </Box>
    </Box>
  );
};
