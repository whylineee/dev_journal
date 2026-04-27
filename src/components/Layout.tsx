import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { ReactNode, useState } from "react";
import { useTheme } from "@mui/material/styles";
import { useTasks } from "../hooks/useTasks";
import { useGoals } from "../hooks/useGoals";
import { useHabits } from "../hooks/useHabits";
import { useProjects } from "../hooks/useProjects";
import { useI18n } from "../i18n/I18nContext";
import { format } from "date-fns";

import EditNoteIcon from "@mui/icons-material/EditNote";
import TodayIcon from "@mui/icons-material/Today";
import ArticleIcon from "@mui/icons-material/Article";
import SettingsIcon from "@mui/icons-material/Settings";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import FlagIcon from "@mui/icons-material/Flag";
import RepeatIcon from "@mui/icons-material/Repeat";
import DashboardIcon from "@mui/icons-material/Dashboard";
import InsightsIcon from "@mui/icons-material/Insights";
import MenuIcon from "@mui/icons-material/Menu";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import SearchIcon from "@mui/icons-material/Search";

const DRAWER_WIDTH = 240;
const COMPACT_DRAWER_WIDTH = 216;

type LayoutTab = "planner" | "focus" | "journal" | "page" | "tasks" | "goals" | "habits" | "projects" | "insights" | "settings";

interface LayoutProps {
  children: ReactNode;
  activeTab: LayoutTab;
  onTabChange: (tab: LayoutTab) => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  selectedPageId: number | null;
  onSelectPage: (id: number | null) => void;
  onOpenCommandPalette: () => void;
}

interface NavItemProps {
  selected: boolean;
  icon: ReactNode;
  label: string;
  count?: number | string;
  compact?: boolean;
  onClick: () => void;
}

const NavItem = ({ selected, icon, label, count, compact = false, onClick }: NavItemProps) => {
  return (
    <ListItem disablePadding sx={{ px: 0.5 }}>
      <ListItemButton
        selected={selected}
        onClick={onClick}
        sx={{
          borderRadius: 2,
          minHeight: compact ? 35 : 38,
          px: compact ? 1 : 1.35,
          py: compact ? 0.4 : 0.5,
          my: 0.15,
          border: "1px solid",
          borderColor: selected ? "divider" : "transparent",
          backgroundColor: selected ? "background.paper" : "transparent",
          position: "relative",
          overflow: "hidden",
          transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease",
          "&::before": {
            content: '""',
            position: "absolute",
            left: 5,
            top: 9,
            bottom: 9,
            width: 3,
            borderRadius: 999,
            bgcolor: selected ? "primary.main" : "transparent",
          },
          "&.Mui-selected": {
            backgroundColor: "background.paper",
            boxShadow: (theme) => theme.shadows[1],
            "&:hover": {
              backgroundColor: "background.paper",
              borderColor: "divider",
            },
          },
          "&:hover": {
            backgroundColor: "action.hover",
            borderColor: selected ? "divider" : "action.selected",
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: compact ? 30 : 32,
            pl: 0.65,
            color: selected ? "primary.main" : "text.secondary",
            "& .MuiSvgIcon-root": { fontSize: compact ? "1.05rem" : "1.15rem" },
          }}
        >
          {icon}
        </ListItemIcon>
        <ListItemText
          primary={label}
          primaryTypographyProps={{
            fontWeight: selected ? 600 : 500,
            fontSize: compact ? "0.78rem" : "0.82rem",
            lineHeight: 1.3,
            noWrap: true,
            color: selected ? "text.primary" : "text.secondary",
          }}
        />
        {count !== undefined && (
          <Typography
            component="span"
            sx={{
              fontSize: compact ? "0.66rem" : "0.7rem",
              fontWeight: 600,
              color: selected ? "primary.contrastText" : "text.secondary",
              bgcolor: selected ? "primary.main" : "background.default",
              border: "1px solid",
              borderColor: selected ? "primary.main" : "divider",
              minWidth: compact ? 20 : 22,
              height: compact ? 18 : 20,
              px: 0.65,
              borderRadius: 999,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {count}
          </Typography>
        )}
      </ListItemButton>
    </ListItem>
  );
};

const SectionLabel = ({ children, compact = false }: { children: ReactNode; compact?: boolean }) => (
  <Typography
    variant="subtitle2"
    sx={{
      px: compact ? 1.45 : 1.75,
      pt: compact ? 1.25 : 1.5,
      pb: 0.5,
      fontSize: compact ? "0.62rem" : "0.65rem",
      fontWeight: 600,
      letterSpacing: "0.08em",
      color: "text.secondary",
      textTransform: "uppercase",
    }}
  >
    {children}
  </Typography>
);

const formatCount = (value: number) => (value > 99 ? "99+" : value);

export const Layout = ({
  children,
  activeTab,
  onTabChange,
  selectedDate,
  onSelectDate,
  selectedPageId: _selectedPageId,
  onSelectPage: _onSelectPage,
  onOpenCommandPalette,
}: LayoutProps) => {
  const muiTheme = useTheme();
  const { t } = useI18n();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));
  const isCompactDesktop = useMediaQuery(muiTheme.breakpoints.between("md", "xl"));
  const isDark = muiTheme.palette.mode === "dark";
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const drawerWidth = isCompactDesktop ? COMPACT_DRAWER_WIDTH : DRAWER_WIDTH;

  const { data: tasks } = useTasks();
  const { data: goals } = useGoals();
  const { data: habits } = useHabits();
  const { data: projects } = useProjects();

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const openTasksCount = (tasks ?? []).filter((task) => task.status !== "done").length;
  const activeGoalsCount = (goals ?? []).filter((goal) => goal.status === "active" || goal.status === "paused").length;
  const completedHabitsToday = (habits ?? []).filter((habit) => habit.completed_dates.includes(todayStr)).length;
  const totalHabits = habits?.length ?? 0;
  const activeProjectsCount = (projects ?? []).filter((project) => project.status === "active" || project.status === "paused").length;
  const dueTodayTasksCount = (tasks ?? []).filter((task) => task.status !== "done" && task.due_date === todayStr).length;

  const activeTabMeta: Record<LayoutTab, { title: string; description: string; icon: ReactNode }> = {
    planner: {
      title: t("Planner"),
      description: t("Daily command center for journal, tasks, goals, and habits."),
      icon: <DashboardIcon />,
    },
    focus: {
      title: t("Focus"),
      description: t("Deep work timer"),
      icon: <TimerOutlinedIcon />,
    },
    journal: {
      title: t("Journal"),
      description: selectedDate === todayStr ? t("Current daily report") : selectedDate,
      icon: <TodayIcon />,
    },
    page: {
      title: t("Pages"),
      description: t("Knowledge page"),
      icon: <ArticleIcon />,
    },
    tasks: {
      title: t("Tasks Board"),
      description: t("Execution board"),
      icon: <TaskAltIcon />,
    },
    goals: {
      title: t("Goals"),
      description: t("Milestones"),
      icon: <FlagIcon />,
    },
    habits: {
      title: t("Habits"),
      description: t("Daily consistency"),
      icon: <RepeatIcon />,
    },
    projects: {
      title: t("Projects"),
      description: t("Cross-functional scope"),
      icon: <FolderOpenIcon />,
    },
    insights: {
      title: t("Insights"),
      description: t("Decision logs, incidents and retros"),
      icon: <InsightsIcon />,
    },
    settings: {
      title: t("Settings"),
      description: t("Theme, reminders and data controls"),
      icon: <SettingsIcon />,
    },
  };
  const currentTab = activeTabMeta[activeTab];

  const closeMobileDrawer = () => {
    if (isMobile) setMobileDrawerOpen(false);
  };

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Logo / branding */}
      <Box sx={{ px: isCompactDesktop ? 1.35 : 1.75, pt: isCompactDesktop ? 1.3 : 1.5, pb: 1, display: "flex", alignItems: "center", gap: 1 }}>
        <Box
          sx={{
            width: isCompactDesktop ? 30 : 32,
            height: isCompactDesktop ? 30 : 32,
            display: "grid",
            placeItems: "center",
            borderRadius: 2,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            flexShrink: 0,
          }}
        >
          <EditNoteIcon sx={{ fontSize: isCompactDesktop ? 15 : 16 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: isCompactDesktop ? "0.84rem" : "0.92rem", letterSpacing: "-0.01em", lineHeight: 1.1 }}>
            {t("Dev Journal")}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", mt: 0.15 }}>
            {t("Local workspace")}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: isCompactDesktop ? 1.25 : 1.5, pb: 1 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 0.5,
          }}
        >
          {[
            { label: t("Due"), value: dueTodayTasksCount },
            { label: t("Done"), value: `${completedHabitsToday}/${totalHabits || 0}` },
            { label: t("Projects"), value: activeProjectsCount },
          ].map((item) => (
            <Box
              key={item.label}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1.5,
                bgcolor: "background.default",
                px: 0.65,
                py: 0.55,
                minWidth: 0,
              }}
            >
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", fontSize: "0.62rem", lineHeight: 1.05 }}>
                {item.label}
              </Typography>
              <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }} noWrap>
                {item.value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Navigation */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          px: 0.5,
          pt: 0.5,
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        <SectionLabel compact={isCompactDesktop}>{t("Overview")}</SectionLabel>
        <List disablePadding>
          <NavItem
            compact={isCompactDesktop}
            selected={activeTab === "planner"}
            onClick={() => { onTabChange("planner"); closeMobileDrawer(); }}
            icon={<DashboardIcon />}
            label={t("Planner")}
          />
          <NavItem
            compact={isCompactDesktop}
            selected={activeTab === "focus"}
            onClick={() => { onTabChange("focus"); closeMobileDrawer(); }}
            icon={<TimerOutlinedIcon />}
            label={t("Focus")}
          />
          <NavItem
            compact={isCompactDesktop}
            selected={activeTab === "journal"}
            onClick={() => { onTabChange("journal"); onSelectDate(todayStr); closeMobileDrawer(); }}
            icon={<TodayIcon />}
            label={t("Journal")}
          />
          <NavItem
            compact={isCompactDesktop}
            selected={activeTab === "page"}
            onClick={() => { onTabChange("page"); closeMobileDrawer(); }}
            icon={<ArticleIcon />}
            label={t("Pages")}
          />
        </List>

        <SectionLabel compact={isCompactDesktop}>{t("Management")}</SectionLabel>
        <List disablePadding>
          <NavItem
            compact={isCompactDesktop}
            selected={activeTab === "tasks"}
            onClick={() => { onTabChange("tasks"); closeMobileDrawer(); }}
            icon={<TaskAltIcon />}
            label={t("Tasks")}
            count={openTasksCount ? formatCount(openTasksCount) : undefined}
          />
          <NavItem
            compact={isCompactDesktop}
            selected={activeTab === "goals"}
            onClick={() => { onTabChange("goals"); closeMobileDrawer(); }}
            icon={<FlagIcon />}
            label={t("Goals")}
            count={activeGoalsCount ? formatCount(activeGoalsCount) : undefined}
          />
          <NavItem
            compact={isCompactDesktop}
            selected={activeTab === "habits"}
            onClick={() => { onTabChange("habits"); closeMobileDrawer(); }}
            icon={<RepeatIcon />}
            label={t("Habits")}
            count={totalHabits ? `${completedHabitsToday}/${totalHabits}` : undefined}
          />
          <NavItem
            compact={isCompactDesktop}
            selected={activeTab === "projects"}
            onClick={() => { onTabChange("projects"); closeMobileDrawer(); }}
            icon={<FolderOpenIcon />}
            label={t("Projects")}
            count={activeProjectsCount ? formatCount(activeProjectsCount) : undefined}
          />
        </List>

        <SectionLabel compact={isCompactDesktop}>{t("Analytics")}</SectionLabel>
        <List disablePadding>
          <NavItem
            compact={isCompactDesktop}
            selected={activeTab === "insights"}
            onClick={() => { onTabChange("insights"); closeMobileDrawer(); }}
            icon={<InsightsIcon />}
            label={t("Insights")}
          />
        </List>
      </Box>

      {/* Bottom settings */}
      <Box
        sx={{
          px: 0.5,
          pb: 1,
          borderTop: "1px solid",
          borderColor: "divider",
          pt: 0.75,
        }}
      >
        <List disablePadding>
          <NavItem
            compact={isCompactDesktop}
            selected={activeTab === "settings"}
            onClick={() => { onTabChange("settings"); closeMobileDrawer(); }}
            icon={<SettingsIcon />}
            label={t("Settings")}
          />
        </List>
      </Box>
    </Box>
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
              backgroundColor: isDark ? "rgba(0,0,0,0.60)" : "rgba(0,0,0,0.25)",
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
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          overflowX: "hidden",
          position: "relative",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        }}
      >
        <Box
          component="header"
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 5,
            bgcolor: "background.default",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1.5}
            sx={{
              px: { xs: 1.5, md: isCompactDesktop ? 2 : 3 },
              py: { xs: 1, md: 1.15 },
              maxWidth: 1500,
              mx: "auto",
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1.15} sx={{ minWidth: 0 }}>
              {isMobile && (
                <Tooltip title={t("Open navigation menu")}>
                  <IconButton
                    aria-label={t("Open navigation menu")}
                    color="inherit"
                    onClick={() => setMobileDrawerOpen(true)}
                    size="small"
                  >
                    <MenuIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: 2,
                  display: { xs: "none", sm: "grid" },
                  placeItems: "center",
                  color: "primary.main",
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                  flexShrink: 0,
                  "& .MuiSvgIcon-root": { fontSize: 18 },
                }}
              >
                {currentTab.icon}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" noWrap sx={{ fontSize: { xs: "1rem", md: "1.08rem" }, fontWeight: 800, letterSpacing: 0, lineHeight: 1.15 }}>
                  {currentTab.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: { xs: "none", sm: "block" }, mt: 0.15 }}>
                  {currentTab.description}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ flexShrink: 0 }}>
              <Stack direction="row" spacing={0.5} sx={{ display: { xs: "none", lg: "flex" } }}>
                <Chip size="small" label={`${t("Today")}: ${format(new Date(), "MMM d")}`} />
                <Chip size="small" label={`${t("Tasks")}: ${formatCount(openTasksCount)}`} />
                <Chip size="small" label={`${t("Habits")}: ${totalHabits ? `${completedHabitsToday}/${totalHabits}` : "0/0"}`} />
              </Stack>
              <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", lg: "block" }, mx: 0.25 }} />
              <Tooltip title={t("Quick Actions")}>
                <Button
                  aria-label={t("Quick Actions")}
                  variant="outlined"
                  size="small"
                  startIcon={<SearchIcon sx={{ fontSize: 16 }} />}
                  onClick={onOpenCommandPalette}
                  sx={{
                    minWidth: { xs: 36, sm: 118 },
                    px: { xs: 0.8, sm: 1.25 },
                    "& .MuiButton-startIcon": { mr: { xs: 0, sm: 0.65 } },
                  }}
                >
                  <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                    {t("Quick Actions")}
                  </Box>
                </Button>
              </Tooltip>
            </Stack>
          </Stack>
        </Box>

        {/* Content area */}
        <Box
          sx={{
            px: { xs: 1.5, md: isCompactDesktop ? 2 : 3 },
            py: { xs: 1.25, md: isCompactDesktop ? 1.5 : 2.25 },
            maxWidth: 1500,
            mx: "auto",
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};
