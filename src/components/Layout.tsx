import {
  Box,
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
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <ListItem disablePadding sx={{ px: 0.5 }}>
      <ListItemButton
        selected={selected}
        onClick={onClick}
        sx={{
          borderRadius: 1.5,
          minHeight: compact ? 34 : 36,
          px: compact ? 1 : 1.25,
          py: compact ? 0.4 : 0.5,
          my: 0.15,
          border: "none",
          backgroundColor: selected
            ? isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"
            : "transparent",
          "&.Mui-selected": {
            backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            "&:hover": {
              backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
            },
          },
          "&:hover": {
            backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: compact ? 28 : 30,
            color: selected ? "text.primary" : "text.secondary",
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
              color: "text.secondary",
              minWidth: compact ? 18 : 20,
              textAlign: "right",
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

export const Layout = ({
  children,
  activeTab,
  onTabChange,
  selectedDate: _selectedDate,
  onSelectDate,
  selectedPageId: _selectedPageId,
  onSelectPage: _onSelectPage,
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

  const closeMobileDrawer = () => {
    if (isMobile) setMobileDrawerOpen(false);
  };

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Logo / branding */}
      <Box sx={{ px: isCompactDesktop ? 1.35 : 1.75, pt: isCompactDesktop ? 1.3 : 1.5, pb: 0.5, display: "flex", alignItems: "center", gap: 1 }}>
        <Box
          sx={{
            width: isCompactDesktop ? 26 : 28,
            height: isCompactDesktop ? 26 : 28,
            display: "grid",
            placeItems: "center",
            borderRadius: 1.5,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            flexShrink: 0,
          }}
        >
          <EditNoteIcon sx={{ fontSize: isCompactDesktop ? 15 : 16 }} />
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: isCompactDesktop ? "0.84rem" : "0.9rem", letterSpacing: "-0.01em" }}>
          {t("Dev Journal")}
        </Typography>
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
            count={openTasksCount || undefined}
          />
          <NavItem
            compact={isCompactDesktop}
            selected={activeTab === "goals"}
            onClick={() => { onTabChange("goals"); closeMobileDrawer(); }}
            icon={<FlagIcon />}
            label={t("Goals")}
            count={activeGoalsCount || undefined}
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
            count={activeProjectsCount || undefined}
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
        {/* Content area */}
        <Box
          sx={{
            px: { xs: 2, md: isCompactDesktop ? 2 : 3 },
            py: { xs: 1.25, md: isCompactDesktop ? 1.5 : 2 },
          }}
        >
          {isMobile && (
            <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 1 }}>
              <IconButton
                aria-label={t("Open navigation menu")}
                title={t("Open navigation menu")}
                color="inherit"
                onClick={() => setMobileDrawerOpen(true)}
                size="small"
              >
                <MenuIcon fontSize="small" />
              </IconButton>
            </Box>
          )}
          {children}
        </Box>
      </Box>
    </Box>
  );
};
