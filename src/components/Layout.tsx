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

const drawerWidth = 320;

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
  return (
    <ListItem disablePadding>
      <ListItemButton
        selected={selected}
        onClick={onClick}
        sx={{
          borderRadius: 2,
          alignItems: "center",
          minHeight: 54,
          px: 1.25,
          py: 0.75,
          my: 0.35,
          mx: 0.6,
          border: "1px solid",
          borderColor: selected ? "primary.main" : "transparent",
          backgroundColor: selected ? (theme) => alpha(theme.palette.primary.main, 0.13) : "transparent",
          transition: "all 0.2s ease",
          "&.Mui-selected": {
            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.16),
            "&:hover": {
              backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.22),
            },
          },
          "&.Mui-selected::before": {
            display: "none",
          },
          "&:hover": {
            borderColor: "divider",
            backgroundColor: (theme) => alpha(theme.palette.text.primary, 0.04),
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 36,
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
            fontWeight: selected ? 700 : 600,
            fontSize: "0.9rem",
            lineHeight: 1.2,
          }}
          secondaryTypographyProps={{
            fontSize: "0.72rem",
            color: "text.secondary",
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

  const drawerContent = (
    <>
      <Toolbar sx={{ minHeight: { xs: 68, md: 72 } }} />
      <Box sx={{ px: 2, pb: 1.5, overflowY: "auto", overflowX: "hidden" }}>
        <Box
          sx={{
            px: 2,
            py: 1.5,
            mb: 1.5,
            borderRadius: 2.5,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.45),
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <EditNoteIcon sx={{ color: "primary.main", fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("Dev Journal")}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.78rem" }}>
            {t("Daily command center for journal, tasks, goals, and habits.")}
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 1,
              mt: 1.25,
            }}
          >
            {overviewStats.map((stat) => (
              <Box
                key={stat.label}
                sx={{
                  borderRadius: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                  px: 1,
                  py: 0.8,
                  minWidth: 0,
                  backgroundColor: (theme) => alpha(theme.palette.text.primary, 0.03),
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", lineHeight: 1.1, fontSize: "0.66rem", letterSpacing: "0.04em" }}
                >
                  {stat.label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.35, fontSize: "0.88rem" }}>
                  {stat.value}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Box
          sx={{
            borderRadius: 2.5,
            border: "1px solid",
            borderColor: "divider",
            mb: 1.5,
            overflow: "hidden",
          }}
        >
          <Box sx={{ px: 1.5, py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.12em", fontSize: "0.62rem" }}>
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

        <Box
          sx={{
            borderRadius: 2.5,
            border: "1px solid",
            borderColor: "divider",
            mb: 1.5,
            overflow: "hidden",
          }}
        >
          <Box sx={{ px: 1.5, py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.12em", fontSize: "0.62rem" }}>
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
                  <Chip label={t("Done")} size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: "0.65rem" }} />
                ) : (
                  <Chip label={t("Missing")} size="small" color="warning" variant="outlined" sx={{ height: 20, fontSize: "0.65rem" }} />
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

        <Box
          sx={{
            borderRadius: 2.5,
            border: "1px solid",
            borderColor: "divider",
            mb: 1.5,
            overflow: "hidden",
          }}
        >
          <Box sx={{ px: 1.5, py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.12em", fontSize: "0.62rem" }}>
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
              badge={<Chip label={openTasksCount} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.68rem" }} />}
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
              badge={<Chip label={activeGoalsCount} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.68rem" }} />}
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
              badge={<Chip label={`${completedHabitsToday}/${totalHabits}`} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.68rem" }} />}
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
              badge={<Chip label={activeProjectsCount} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.68rem" }} />}
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

        <Box
          sx={{
            borderRadius: 2.5,
            border: "1px solid",
            borderColor: "divider",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              px: 1.5,
              py: 1,
              borderBottom: "1px solid",
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.12em", fontSize: "0.62rem" }}>
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
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1.5,
                "&:hover": { color: "primary.main", bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12) },
              }}
            >
              <AddIcon fontSize="small" />
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
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.72rem" }}>
          {t("Settings & Theme")}
        </Typography>
        <IconButton
          onClick={() => {
            onTabChange("settings");
            closeMobileDrawer();
          }}
          sx={{ color: "text.secondary", border: "1px solid", borderColor: "divider" }}
        >
          <SettingsIcon fontSize="small" />
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
          borderBottom: "1px solid",
          borderColor: "divider",
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
                width: 34,
                height: 34,
                display: "grid",
                placeItems: "center",
                borderRadius: 2,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2),
                border: "1px solid",
                borderColor: (theme) => alpha(theme.palette.primary.main, 0.45),
              }}
            >
              <EditNoteIcon sx={{ color: "primary.main", fontSize: 19 }} />
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
              <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: "0.7rem" }}>
                {t("View: {tab}", { tab: activeTabLabel[activeTab] })}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Box
            sx={{
              position: "relative",
              borderRadius: 2,
              backgroundColor: (theme) => alpha(theme.palette.text.primary, 0.05),
              "&:hover": {
                backgroundColor: (theme) => alpha(theme.palette.text.primary, 0.09),
              },
              width: { xs: "100%", sm: 320, md: 360 },
              maxWidth: { xs: 180, sm: 360 },
              border: "1px solid",
              borderColor: "divider",
              mr: 1,
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
                  py: 1,
                  px: 1,
                  pl: "38px",
                  width: "100%",
                  fontSize: "0.88rem",
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
              backgroundColor: alpha(muiTheme.palette.common.black, 0.35),
            },
          },
        }}
        sx={{
          width: { md: drawerWidth },
          flexShrink: 0,
          ["& .MuiDrawer-paper"]: {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.paper",
            backgroundImage: "none",
            backdropFilter: "blur(14px)",
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
            background:
              "radial-gradient(circle at 12% 10%, rgba(255,255,255,0.04), transparent 28%), radial-gradient(circle at 95% 0%, rgba(255,255,255,0.03), transparent 22%)",
          }}
        />
        <Box sx={{ position: "relative", zIndex: 1 }}>{children}</Box>
      </Box>
    </Box>
  );
};
