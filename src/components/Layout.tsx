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
  ListItemIcon,
  ListItemText,
  TextField,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { ReactNode, useMemo, useState } from "react";
import { useTheme } from "@mui/material/styles";
import { useEntries, useSearchEntries } from "../hooks/useEntries";
import { usePages } from "../hooks/usePages";
import { useTasks } from "../hooks/useTasks";
import { useGoals } from "../hooks/useGoals";
import { useHabits } from "../hooks/useHabits";
import { useProjects } from "../hooks/useProjects";
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
import FolderOpenIcon from "@mui/icons-material/FolderOpen";

const drawerWidth = 290;

type LayoutTab = "planner" | "journal" | "page" | "tasks" | "goals" | "habits" | "projects" | "insights" | "settings";

interface LayoutProps {
  children: ReactNode;
  activeTab: LayoutTab;
  onTabChange: (tab: LayoutTab) => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  selectedPageId: number | null;
  onSelectPage: (id: number | null) => void;
}

interface NavButtonProps {
  selected: boolean;
  icon: ReactNode;
  primary: string;
  secondary?: string;
  badge?: ReactNode;
  onClick: () => void;
}

const SideNavButton = ({ selected, icon, primary, secondary, badge, onClick }: NavButtonProps) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <ListItem disablePadding>
      <ListItemButton
        selected={selected}
        onClick={onClick}
        sx={{
          borderRadius: 2.5,
          alignItems: "center",
          minHeight: 48,
          px: 1.5,
          py: 0.65,
          my: 0.25,
          mx: 0.5,
          border: "1px solid",
          borderColor: selected
            ? alpha(theme.palette.primary.main, 0.30)
            : "transparent",
          backgroundColor: selected
            ? alpha(theme.palette.primary.main, 0.10)
            : "transparent",
          backdropFilter: selected ? "blur(8px)" : "none",
          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          "&.Mui-selected": {
            backgroundColor: alpha(theme.palette.primary.main, 0.12),
            boxShadow: `0 0 16px ${alpha(theme.palette.primary.main, 0.10)}, inset 0 1px 0 ${alpha(theme.palette.primary.main, 0.08)}`,
            "&:hover": {
              backgroundColor: alpha(theme.palette.primary.main, 0.18),
            },
          },
          "&.Mui-selected::before": {
            display: "none",
          },
          "&:hover": {
            borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
            backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 34,
            color: selected ? "primary.main" : "text.secondary",
            transition: "color 0.2s ease",
          }}
        >
          {icon}
        </ListItemIcon>
        <ListItemText
          primary={primary}
          secondary={secondary}
          primaryTypographyProps={{
            fontWeight: selected ? 650 : 500,
            fontSize: "0.86rem",
            lineHeight: 1.2,
          }}
          secondaryTypographyProps={{
            fontSize: "0.68rem",
            color: "text.secondary",
            lineHeight: 1.2,
          }}
        />
        {badge}
      </ListItemButton>
    </ListItem>
  );
};

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
  const isDark = muiTheme.palette.mode === "dark";
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: allEntries } = useEntries();
  const { data: searchResults } = useSearchEntries(searchQuery);
  const { data: pages } = usePages();
  const { data: tasks } = useTasks();
  const { data: goals } = useGoals();
  const { data: habits } = useHabits();
  const { data: projects } = useProjects();

  const displayEntries = searchQuery ? searchResults : allEntries;
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayEntryExists = Boolean(allEntries?.find((entry) => entry.date === todayStr));
  const openTasksCount = (tasks ?? []).filter((task) => task.status !== "done").length;
  const activeGoalsCount = (goals ?? []).filter((goal) => goal.status === "active" || goal.status === "paused").length;
  const completedHabitsToday = (habits ?? []).filter((habit) => habit.completed_dates.includes(todayStr)).length;
  const totalHabits = habits?.length ?? 0;
  const activeProjectsCount = (projects ?? []).filter((project) => project.status === "active" || project.status === "paused").length;

  const overviewStats = useMemo(
    () => [
      { label: t("Tasks"), value: openTasksCount },
      { label: t("Goals"), value: activeGoalsCount },
      { label: t("Habits"), value: `${completedHabitsToday}/${totalHabits}` },
      { label: t("Projects"), value: activeProjectsCount },
    ],
    [t, openTasksCount, activeGoalsCount, completedHabitsToday, totalHabits, activeProjectsCount]
  );
  const activeTabLabel = useMemo<Record<LayoutTab, string>>(
    () => ({
      planner: t("Planner"),
      journal: t("Journal"),
      page: t("Pages"),
      tasks: t("Tasks"),
      goals: t("Goals"),
      habits: t("Habits"),
      projects: t("Projects"),
      insights: t("Insights"),
      settings: t("Settings"),
    }),
    [t]
  );

  const closeMobileDrawer = () => {
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  const sectionBoxSx = {
    borderRadius: 3,
    border: "1px solid",
    borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.60)",
    mb: 1.5,
    overflow: "hidden",
    bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.30)",
    backdropFilter: "blur(8px)",
  };

  const sectionHeaderSx = {
    px: 1.5,
    py: 0.9,
    borderBottom: "1px solid",
    borderColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
  };

  const drawerContent = (
    <>
      <Toolbar sx={{ minHeight: { xs: 68, md: 72 } }} />
      <Box sx={{ px: 1.5, pb: 1.5, overflowY: "auto", overflowX: "hidden", flex: 1 }}>
        {/* Overview stats card */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            mb: 1.5,
            borderRadius: 3,
            border: "1px solid",
            borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.60)",
            backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.35)",
            backdropFilter: "blur(12px)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                display: "grid",
                placeItems: "center",
                borderRadius: 1.5,
                background: `linear-gradient(135deg, ${muiTheme.palette.primary.main}, ${muiTheme.palette.secondary.main})`,
              }}
            >
              <EditNoteIcon sx={{ color: isDark ? "#0a0a0a" : "#ffffff", fontSize: 16 }} />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: "0.9rem" }}>
              {t("Dev Journal")}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.75rem", lineHeight: 1.4 }}>
            {t("Daily command center for journal, tasks, goals, and habits.")}
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 0.8,
              mt: 1.25,
            }}
          >
            {overviewStats.map((stat) => (
              <Box
                key={stat.label}
                sx={{
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                  px: 1,
                  py: 0.7,
                  minWidth: 0,
                  backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.40)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", lineHeight: 1.1, fontSize: "0.64rem", letterSpacing: "0.04em" }}
                >
                  {stat.label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.3, fontSize: "0.88rem" }}>
                  {stat.value}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Overview */}
        <Box sx={sectionBoxSx}>
          <Box sx={sectionHeaderSx}>
            <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.12em", fontSize: "0.60rem" }}>
              {t("Overview")}
            </Typography>
          </Box>
          <List disablePadding sx={{ py: 0.5 }}>
            <SideNavButton
              selected={activeTab === "planner"}
              onClick={() => {
                onTabChange("planner");
                closeMobileDrawer();
              }}
              icon={<DashboardIcon fontSize="small" />}
              primary={t("Planner")}
              secondary={t("Daily overview")}
            />
          </List>
        </Box>

        {/* Daily Journal */}
        <Box sx={sectionBoxSx}>
          <Box sx={sectionHeaderSx}>
            <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.12em", fontSize: "0.60rem" }}>
              {t("Daily Journal")}
            </Typography>
          </Box>
          <List disablePadding sx={{ py: 0.5 }}>
            <SideNavButton
              selected={activeTab === "journal" && selectedDate === todayStr}
              onClick={() => {
                setSearchQuery("");
                onTabChange("journal");
                onSelectDate(todayStr);
                closeMobileDrawer();
              }}
              icon={<TodayIcon fontSize="small" />}
              primary={t("Today")}
              secondary={t("Current daily report")}
              badge={
                todayEntryExists ? (
                  <Chip label={t("Done")} size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: "0.63rem" }} />
                ) : (
                  <Chip label={t("Missing")} size="small" color="warning" variant="outlined" sx={{ height: 20, fontSize: "0.63rem" }} />
                )
              }
            />

            {displayEntries?.map((entry) => (
              <SideNavButton
                key={entry.id}
                selected={activeTab === "journal" && selectedDate === entry.date}
                onClick={() => {
                  onTabChange("journal");
                  onSelectDate(entry.date);
                  closeMobileDrawer();
                }}
                icon={<EventNoteIcon fontSize="small" />}
                primary={format(parseISO(entry.date), "MMM d, yyyy")}
                secondary={entry.date === todayStr ? t("Today") : undefined}
              />
            ))}
          </List>
        </Box>

        {/* Management */}
        <Box sx={sectionBoxSx}>
          <Box sx={sectionHeaderSx}>
            <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.12em", fontSize: "0.60rem" }}>
              {t("Management")}
            </Typography>
          </Box>
          <List disablePadding sx={{ py: 0.5 }}>
            <SideNavButton
              selected={activeTab === "tasks"}
              onClick={() => {
                onTabChange("tasks");
                closeMobileDrawer();
              }}
              icon={<TaskAltIcon fontSize="small" />}
              primary={t("Tasks")}
              secondary={t("Execution board")}
              badge={<Chip label={openTasksCount} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.66rem" }} />}
            />
            <SideNavButton
              selected={activeTab === "goals"}
              onClick={() => {
                onTabChange("goals");
                closeMobileDrawer();
              }}
              icon={<FlagIcon fontSize="small" />}
              primary={t("Goals")}
              secondary={t("Milestones")}
              badge={<Chip label={activeGoalsCount} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.66rem" }} />}
            />
            <SideNavButton
              selected={activeTab === "habits"}
              onClick={() => {
                onTabChange("habits");
                closeMobileDrawer();
              }}
              icon={<RepeatIcon fontSize="small" />}
              primary={t("Habits")}
              secondary={t("Daily consistency")}
              badge={<Chip label={`${completedHabitsToday}/${totalHabits}`} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.66rem" }} />}
            />
            <SideNavButton
              selected={activeTab === "projects"}
              onClick={() => {
                onTabChange("projects");
                closeMobileDrawer();
              }}
              icon={<FolderOpenIcon fontSize="small" />}
              primary={t("Projects")}
              secondary={t("Cross-functional scope")}
              badge={<Chip label={activeProjectsCount} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.66rem" }} />}
            />
            <SideNavButton
              selected={activeTab === "insights"}
              onClick={() => {
                onTabChange("insights");
                closeMobileDrawer();
              }}
              icon={<InsightsIcon fontSize="small" />}
              primary={t("Insights")}
              secondary={t("Decisions, incidents, retros")}
            />
          </List>
        </Box>

        {/* Pages */}
        <Box sx={sectionBoxSx}>
          <Box
            sx={{
              ...sectionHeaderSx,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.12em", fontSize: "0.60rem" }}>
              {t("Pages")}
            </Typography>
            <IconButton
              size="small"
              onClick={() => {
                onTabChange("page");
                onSelectPage(null);
                closeMobileDrawer();
              }}
              sx={{
                color: "text.secondary",
                width: 26,
                height: 26,
                border: "1px solid",
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                borderRadius: 1.5,
                "&:hover": {
                  color: "primary.main",
                  bgcolor: alpha(muiTheme.palette.primary.main, 0.10),
                  borderColor: alpha(muiTheme.palette.primary.main, 0.25),
                },
              }}
            >
              <AddIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
          <List disablePadding sx={{ py: 0.5 }}>
            <SideNavButton
              selected={activeTab === "page" && selectedPageId === null}
              onClick={() => {
                onTabChange("page");
                onSelectPage(null);
                closeMobileDrawer();
              }}
              icon={<AddIcon fontSize="small" />}
              primary={t("New Page")}
              secondary={t("Create note or doc")}
            />

            {pages?.map((page) => (
              <SideNavButton
                key={page.id}
                selected={activeTab === "page" && selectedPageId === page.id}
                onClick={() => {
                  onTabChange("page");
                  onSelectPage(page.id);
                  closeMobileDrawer();
                }}
                icon={<ArticleIcon fontSize="small" />}
                primary={page.title || "Untitled"}
                secondary={t("Knowledge page")}
              />
            ))}
          </List>
        </Box>
      </Box>

      <Box
        sx={{
          p: 1.5,
          borderTop: "1px solid",
          borderColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.70rem" }}>
          {t("Settings & Theme")}
        </Typography>
        <IconButton
          onClick={() => {
            onTabChange("settings");
            closeMobileDrawer();
          }}
          size="small"
          sx={{
            color: "text.secondary",
            border: "1px solid",
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            borderRadius: 2,
            width: 32,
            height: 32,
            "&:hover": {
              borderColor: alpha(muiTheme.palette.primary.main, 0.25),
              bgcolor: alpha(muiTheme.palette.primary.main, 0.08),
            },
          }}
        >
          <SettingsIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    </>
  );

  return (
    <Box sx={{ display: "flex", height: "100dvh", overflow: "hidden", bgcolor: "background.default" }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 68, md: 72 }, gap: 1 }}>
          {isMobile ? (
            <IconButton color="inherit" onClick={() => setMobileDrawerOpen(true)} edge="start" sx={{ mr: 0.5 }}>
              <MenuIcon />
            </IconButton>
          ) : null}

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, minWidth: 0, flexShrink: 1 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                display: "grid",
                placeItems: "center",
                borderRadius: 2,
                background: `linear-gradient(135deg, ${muiTheme.palette.primary.main}, ${muiTheme.palette.secondary.main})`,
                boxShadow: `0 4px 12px ${alpha(muiTheme.palette.primary.main, 0.30)}`,
              }}
            >
              <EditNoteIcon sx={{ color: isDark ? "#0a0a0a" : "#ffffff", fontSize: 20 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="subtitle1"
                noWrap
                sx={{
                  fontWeight: 700,
                  letterSpacing: "-0.015em",
                  color: "text.primary",
                  lineHeight: 1.1,
                }}
              >
                {t("Dev Journal")}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: "0.68rem" }}>
                {t("View: {tab}", { tab: activeTabLabel[activeTab] })}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Box
            sx={{
              position: "relative",
              borderRadius: 2.5,
              backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
              backdropFilter: "blur(8px)",
              "&:hover": {
                backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
              },
              width: { xs: "100%", sm: 320, md: 360 },
              maxWidth: { xs: 180, sm: 360 },
              border: "1px solid",
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              mr: 1,
              transition: "all 0.2s ease",
              "&:focus-within": {
                borderColor: alpha(muiTheme.palette.primary.main, 0.40),
                boxShadow: `0 0 0 3px ${alpha(muiTheme.palette.primary.main, 0.10)}`,
              },
            }}
          >
            <Box sx={{ px: 1.5, height: "100%", position: "absolute", pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <SearchIcon sx={{ color: "text.secondary", fontSize: 18 }} />
            </Box>
            <InputBase
              placeholder={isMobile ? t("Search...") : t("Search entries...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{
                color: "text.primary",
                width: "100%",
                "& .MuiInputBase-input": {
                  py: 0.9,
                  px: 1,
                  pl: "38px",
                  width: "100%",
                  fontSize: "0.86rem",
                  "&::placeholder": {
                    color: muiTheme.palette.text.secondary,
                    opacity: 1,
                  },
                },
              }}
            />
          </Box>

          <TextField
            select
            size="small"
            value={language}
            onChange={(event) => setLanguage(event.target.value === "uk" ? "uk" : "en")}
            sx={{
              minWidth: 80,
              display: { xs: "none", sm: "inline-flex" },
              "& .MuiOutlinedInput-root": {
                bgcolor: "transparent",
                minHeight: 36,
              },
            }}
            SelectProps={{ native: true }}
          >
            <option value="en">EN</option>
            <option value="uk">UKR</option>
          </TextField>
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
              backgroundColor: isDark ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.20)",
              backdropFilter: "blur(4px)",
            },
          },
        }}
        sx={{
          width: { md: drawerWidth },
          flexShrink: 0,
          ["& .MuiDrawer-paper"]: {
            width: drawerWidth,
            boxSizing: "border-box",
            backgroundImage: "none",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1.5, sm: 2, md: 3.5 },
          pt: { xs: 10, md: 11 },
          overflowY: "auto",
          overflowX: "hidden",
          position: "relative",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: isDark
              ? "radial-gradient(ellipse at 15% 10%, rgba(255,255,255,0.02), transparent 40%), radial-gradient(ellipse at 90% 5%, rgba(255,255,255,0.015), transparent 35%)"
              : "radial-gradient(ellipse at 15% 10%, rgba(255,255,255,0.30), transparent 40%), radial-gradient(ellipse at 90% 5%, rgba(255,255,255,0.20), transparent 35%)",
          }}
        />
        <Box sx={{ position: "relative", zIndex: 1 }}>{children}</Box>
      </Box>
    </Box>
  );
};
