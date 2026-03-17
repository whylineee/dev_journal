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
          borderRadius: 1.5,
          alignItems: "center",
          minHeight: 36,
          px: 1.5,
          py: 0.5,
          my: 0.25,
          mx: 0.5,
          transition: "background-color 0.15s ease",
          "&.Mui-selected": {
            backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
            "&:hover": {
              backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
            },
          },
          "&.Mui-selected::before": {
            display: "none",
          },
          "&:hover": {
            backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
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
            noWrap: true,
          }}
          secondaryTypographyProps={{
            fontSize: "0.68rem",
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

  const closeMobileDrawer = () => {
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  const sectionBoxSx = {
    mb: 2.5,
  };

  const sectionHeaderSx = {
    px: 1.5,
    py: 0.5,
    mb: 0.5,
  };

  const drawerContent = (
    <>
      <Box sx={{
          px: 1.5, pt: 1.5, pb: 1.5,
          overflowY: "auto", overflowX: "hidden", flex: 1,
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}>
        {/* App header */}
        <Box sx={{ px: 2, pt: 2, pb: 1.5, mb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                display: "grid",
                placeItems: "center",
                borderRadius: 1.5,
                backgroundColor: isDark ? muiTheme.palette.primary.main : muiTheme.palette.primary.main,
              }}
            >
              <EditNoteIcon sx={{ color: isDark ? "#000" : "#fff", fontSize: 18 }} />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.01em" }}>
              {t("Dev Journal")}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 1,
            }}
          >
            {overviewStats.map((stat) => (
              <Box
                key={stat.label}
                sx={{
                  borderRadius: 1.5,
                  px: 1.25,
                  py: 0.75,
                  minWidth: 0,
                  bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", lineHeight: 1.1, fontSize: "0.63rem", letterSpacing: "0.04em", textTransform: "uppercase" }}
                >
                  {stat.label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.4, fontSize: "0.9rem" }}>
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
          <List disablePadding sx={{ py: 0.5 }}>
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
          <List disablePadding sx={{ py: 0.5 }}>
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
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: { xs: 1.5, sm: 2, md: 3.5 },
            minHeight: { xs: 48, md: 52 },
            transition: "background-color 0.15s ease",
            backgroundColor: scrolled
              ? muiTheme.palette.background.default
              : "transparent",
            borderBottom: scrolled ? `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` : "1px solid transparent",
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
            >
              <MenuIcon fontSize="small" />
            </IconButton>
          )}

          <Typography
            variant="h6"
            noWrap
            sx={{
              fontWeight: 700,
              fontSize: { xs: "1rem", md: "1.1rem" },
              letterSpacing: "-0.02em",
              color: "text.primary",
              flexShrink: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {activeTabLabel[activeTab]}
          </Typography>

          <Box sx={{ flexGrow: 1, minWidth: 16 }} />
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
