import {
  alpha,
  Box,
  Chip,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@mui/material/styles";
import { useEntries } from "../hooks/useEntries";
import { usePages } from "../hooks/usePages";
import { useTasks } from "../hooks/useTasks";
import { useGoals } from "../hooks/useGoals";
import { useHabits } from "../hooks/useHabits";
import { useProjects } from "../hooks/useProjects";
import { useI18n } from "../i18n/I18nContext";
import { format, parseISO } from "date-fns";

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
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";

const drawerWidth = 290;

type LayoutTab = "planner" | "focus" | "journal" | "page" | "tasks" | "goals" | "habits" | "projects" | "insights" | "settings";

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
          position: "relative",
          overflow: "hidden",
          borderRadius: 2.5,
          alignItems: "center",
          minHeight: 42,
          px: 1.6,
          py: 0.7,
          my: 0.3,
          mx: 0.25,
          border: "1px solid",
          borderColor: selected
            ? alpha(theme.palette.primary.main, isDark ? 0.36 : 0.2)
            : isDark
              ? "rgba(255,255,255,0.04)"
              : "rgba(0,0,0,0.04)",
          backgroundColor: selected
            ? isDark
              ? alpha(theme.palette.primary.main, 0.14)
              : alpha(theme.palette.primary.main, 0.08)
            : "transparent",
          transition: "all 0.18s ease",
          "&.Mui-selected": {
            backgroundColor: isDark
              ? alpha(theme.palette.primary.main, 0.16)
              : alpha(theme.palette.primary.main, 0.1),
            "&:hover": {
              backgroundColor: isDark
                ? alpha(theme.palette.primary.main, 0.2)
                : alpha(theme.palette.primary.main, 0.12),
            },
          },
          "&::before": {
            content: '""',
            position: "absolute",
            inset: "8px auto 8px 8px",
            width: 3,
            borderRadius: 999,
            background: selected ? theme.palette.primary.main : "transparent",
            boxShadow: selected ? `0 0 18px ${alpha(theme.palette.primary.main, 0.45)}` : "none",
          },
          "&:hover": {
            borderColor: selected
              ? alpha(theme.palette.primary.main, isDark ? 0.42 : 0.24)
              : isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.08)",
            backgroundColor: selected
              ? isDark
                ? alpha(theme.palette.primary.main, 0.2)
                : alpha(theme.palette.primary.main, 0.12)
              : isDark
                ? "rgba(255,255,255,0.03)"
                : "rgba(0,0,0,0.02)",
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 34,
            color: selected ? "text.primary" : "text.secondary",
            transition: "all 0.18s ease",
            transform: selected ? "scale(1.02)" : "scale(1)",
          }}
        >
          {icon}
        </ListItemIcon>
        <ListItemText
          primary={primary}
          secondary={secondary}
          primaryTypographyProps={{
            fontWeight: selected ? 700 : 560,
            fontSize: "0.88rem",
            lineHeight: 1.2,
            noWrap: true,
          }}
          secondaryTypographyProps={{
            fontSize: "0.7rem",
            color: "text.secondary",
            lineHeight: 1.2,
            noWrap: true,
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
  const { t } = useI18n();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));
  const isDark = muiTheme.palette.mode === "dark";
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const mainRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 8);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const { data: allEntries } = useEntries();

  const { data: pages } = usePages();
  const { data: tasks } = useTasks();
  const { data: goals } = useGoals();
  const { data: habits } = useHabits();
  const { data: projects } = useProjects();

  const displayEntries = allEntries;
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
      focus: t("Focus Session"),
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
  const selectedPageTitle = useMemo(() => {
    if (selectedPageId === null) {
      return t("Compose a fresh note, spec, or workspace.");
    }

    const currentPage = pages?.find((page) => page.id === selectedPageId);
    if (!currentPage) {
      return t("Open a page and keep your notes flowing.");
    }

    return currentPage.title?.trim() || t("Untitled page");
  }, [pages, selectedPageId, t]);
  const activeTabSubtitle = useMemo<Record<LayoutTab, string>>(
    () => ({
      planner: t("Your command center for today, this week, and what needs attention next."),
      focus: t("A calmer space for one task, one timer, and clean momentum."),
      journal: t("Capture the day clearly so the next one starts lighter."),
      page: selectedPageTitle,
      tasks: t("Track execution across tasks, priorities, and next actions."),
      goals: t("Keep bigger outcomes visible without losing the milestones."),
      habits: t("Stay consistent with routines that compound over time."),
      projects: t("See active workspaces, branches, and delivery scope at a glance."),
      insights: t("Read patterns in your work, progress, and consistency."),
      settings: t("Tune the app, visuals, reminders, and backup behavior."),
    }),
    [selectedPageTitle, t]
  );

  const closeMobileDrawer = () => {
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  const sectionBoxSx = {
    mb: 1.35,
    px: 1.05,
    py: 1.05,
    borderRadius: 3,
    border: "1px solid",
    borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
    bgcolor: isDark ? "rgba(255,255,255,0.022)" : "rgba(255,255,255,0.7)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
  };

  const sectionHeaderSx = {
    px: 1.2,
    py: 0.4,
    mb: 0.2,
  };

  const drawerContent = (
    <>
      <Box sx={{
          px: 1.25, pt: 1.2, pb: 1.5,
          overflowY: "auto", overflowX: "hidden", flex: 1,
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}>
        <Box
          sx={{
            px: 1.55,
            pt: 1.7,
            pb: 1.55,
            mb: 1.35,
            borderRadius: 4,
            position: "relative",
            overflow: "hidden",
            border: "1px solid",
            borderColor: alpha(muiTheme.palette.primary.main, isDark ? 0.24 : 0.16),
            background: isDark
              ? `radial-gradient(circle at top left, ${alpha(muiTheme.palette.primary.main, 0.3)}, transparent 42%), linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))`
              : `radial-gradient(circle at top left, ${alpha(muiTheme.palette.primary.main, 0.18)}, transparent 42%), linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.72))`,
            boxShadow: isDark ? "0 18px 50px rgba(0,0,0,0.28)" : "0 18px 40px rgba(0,0,0,0.08)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 1.4 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                display: "grid",
                placeItems: "center",
                borderRadius: 2.5,
                color: isDark ? "#04111c" : "#fff",
                background: `linear-gradient(135deg, ${muiTheme.palette.primary.main}, ${alpha(muiTheme.palette.secondary.main, 0.92)})`,
                boxShadow: `0 12px 24px ${alpha(muiTheme.palette.primary.main, 0.28)}`,
              }}
            >
              <EditNoteIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-0.02em" }}>
                {t("Dev Journal")}
              </Typography>
              <Typography sx={{ color: "text.secondary", fontSize: "0.76rem", lineHeight: 1.35 }}>
                {t("Local-first planning for builders who like clarity.")}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mb: 1.35, flexWrap: "wrap" }}>
            <Chip
              size="small"
              icon={<CalendarMonthOutlinedIcon sx={{ fontSize: "0.95rem !important" }} />}
              label={format(new Date(), "EEE, MMM d")}
              sx={{
                height: 28,
                borderRadius: 999,
                bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.8)",
                border: "1px solid",
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              }}
            />
            <Chip
              size="small"
              label={`${displayEntries?.length ?? 0} ${t("Entries")}`}
              sx={{
                height: 28,
                borderRadius: 999,
                bgcolor: "transparent",
                border: "1px solid",
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              }}
            />
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 0.9,
            }}
          >
            {overviewStats.map((stat) => (
              <Box
                key={stat.label}
                sx={{
                  borderRadius: 2.4,
                  px: 1.15,
                  py: 0.95,
                  minWidth: 0,
                  border: "1px solid",
                  borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                  bgcolor: isDark ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.75)",
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", lineHeight: 1.1, fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase" }}
                >
                  {stat.label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, mt: 0.55, fontSize: "1rem", letterSpacing: "-0.03em" }}>
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
          <List disablePadding sx={{ py: 0.35 }}>
            <SideNavButton
              selected={activeTab === "planner"}
              onClick={() => {
                onTabChange("planner");
                closeMobileDrawer();
              }}
              icon={<DashboardIcon fontSize="small" />}
              primary={t("Planner")}
            />
            <SideNavButton
              selected={activeTab === "focus"}
              onClick={() => {
                onTabChange("focus");
                closeMobileDrawer();
              }}
              icon={<TimerOutlinedIcon fontSize="small" />}
              primary={t("Focus")}
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
          <List disablePadding sx={{ py: 0.35 }}>
            <SideNavButton
              selected={activeTab === "journal" && selectedDate === todayStr}
              onClick={() => {
                onTabChange("journal");
                onSelectDate(todayStr);
                closeMobileDrawer();
              }}
              icon={<TodayIcon fontSize="small" />}
              primary={t("Today")}
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
          <List disablePadding sx={{ py: 0.35 }}>
            <SideNavButton
              selected={activeTab === "tasks"}
              onClick={() => {
                onTabChange("tasks");
                closeMobileDrawer();
              }}
              icon={<TaskAltIcon fontSize="small" />}
              primary={t("Tasks")}
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
              aria-label={t("Create New Page")}
              title={t("Create New Page")}
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
          <List disablePadding sx={{ py: 0.35 }}>
            <SideNavButton
              selected={activeTab === "page" && selectedPageId === null}
              onClick={() => {
                onTabChange("page");
                onSelectPage(null);
                closeMobileDrawer();
              }}
              icon={<AddIcon fontSize="small" />}
              primary={t("New Page")}
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
                primary={page.title || t("Untitled")}
              />
            ))}
          </List>
        </Box>
      </Box>

      <Box
        sx={{
          p: 1.5,
          borderTop: "1px solid",
          borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {t("Settings & Theme")}
          </Typography>
          <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, mt: 0.15 }}>
            {t("Tune your workspace")}
          </Typography>
        </Box>
        <IconButton
          aria-label={t("Open Settings")}
          title={t("Open Settings")}
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
      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={isMobile ? mobileDrawerOpen : true}
        onClose={() => setMobileDrawerOpen(false)}
        ModalProps={{
          keepMounted: true,
          BackdropProps: {
            sx: {
              backgroundColor: isDark ? "rgba(0,0,0,0.60)" : "rgba(0,0,0,0.20)",
            },
          },
        }}
        sx={{
          width: { md: drawerWidth },
          flexShrink: 0,
          "& .MuiDrawer-paper": {
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
        ref={mainRef}
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          overflowX: "hidden",
          position: "relative",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
          background: isDark
            ? "radial-gradient(circle at top right, rgba(59,130,246,0.1), transparent 24%), radial-gradient(circle at 20% 0%, rgba(16,185,129,0.06), transparent 28%)"
            : "radial-gradient(circle at top right, rgba(59,130,246,0.08), transparent 22%), radial-gradient(circle at 20% 0%, rgba(16,185,129,0.05), transparent 26%)",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
          }}
        />

        {/* Sticky content header */}
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            px: { xs: 1.5, sm: 2, md: 3.5 },
            pt: { xs: 1.1, md: 1.5 },
            pb: { xs: 0.7, md: 0.9 },
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.2,
              minHeight: { xs: 58, md: 68 },
              px: { xs: 1.1, sm: 1.35, md: 1.6 },
              borderRadius: 3.2,
              border: "1px solid",
              borderColor: scrolled
                ? isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.07)"
                : isDark
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.05)",
              backgroundColor: isDark ? "rgba(13,15,18,0.78)" : "rgba(255,255,255,0.78)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              boxShadow: scrolled
                ? isDark
                  ? "0 14px 30px rgba(0,0,0,0.28)"
                  : "0 14px 30px rgba(0,0,0,0.08)"
                : "none",
            }}
          >
            {isMobile && (
              <IconButton
                aria-label={t("Open navigation menu")}
                title={t("Open navigation menu")}
                color="inherit"
                onClick={() => setMobileDrawerOpen(true)}
                edge="start"
                size="small"
                sx={{
                  border: "1px solid",
                  borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                  borderRadius: 2,
                }}
              >
                <MenuIcon fontSize="small" />
              </IconButton>
            )}

            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  color: "text.secondary",
                  fontSize: "0.67rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  mb: 0.25,
                }}
              >
                {t("Workspace")}
              </Typography>
              <Typography
                variant="h6"
                noWrap
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: "1rem", md: "1.15rem" },
                  letterSpacing: "-0.03em",
                  color: "text.primary",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {activeTabLabel[activeTab]}
              </Typography>
              <Typography
                noWrap
                sx={{
                  color: "text.secondary",
                  fontSize: { xs: "0.76rem", md: "0.82rem" },
                  lineHeight: 1.35,
                  mt: 0.15,
                }}
              >
                {activeTabSubtitle[activeTab]}
              </Typography>
            </Box>

            <Chip
              size="small"
              icon={<CalendarMonthOutlinedIcon sx={{ fontSize: "0.95rem !important" }} />}
              label={format(new Date(), "MMM d")}
              sx={{
                height: 32,
                borderRadius: 999,
                bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.035)",
                border: "1px solid",
                borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                display: { xs: "none", sm: "inline-flex" },
              }}
            />
          </Box>
        </Box>

        <Box
          sx={{
            p: { xs: 1.5, sm: 2, md: 3.5 },
            pt: { xs: 1, sm: 1.5, md: 2 },
            position: "relative",
            zIndex: 1,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};
