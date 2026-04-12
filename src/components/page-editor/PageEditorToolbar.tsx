import CheckBoxOutlinedIcon from "@mui/icons-material/CheckBoxOutlined";
import CodeIcon from "@mui/icons-material/Code";
import DataObjectIcon from "@mui/icons-material/DataObject";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import NotesIcon from "@mui/icons-material/Notes";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import ViewAgendaOutlinedIcon from "@mui/icons-material/ViewAgendaOutlined";
import ChecklistRtlIcon from "@mui/icons-material/ChecklistRtl";
import { Box, Button, IconButton, Stack, Tooltip } from "@mui/material";

interface PageEditorToolbarProps {
  insertChecklist: () => void;
  insertCodeBlock: () => void;
  insertFormat: (prefix: string, suffix: string) => void;
  insertTable: () => void;
  insertTaskDatabase: () => void;
  insertTaskTrackerDatabase: () => void;
  insertTemplate: () => void;
  isDark: boolean;
  pageSection: "page" | "tasks" | "checklist";
  setPageSection: (value: "page" | "tasks" | "checklist") => void;
}

export const PageEditorToolbar = ({
  insertChecklist,
  insertCodeBlock,
  insertFormat,
  insertTable,
  insertTaskDatabase,
  insertTaskTrackerDatabase,
  insertTemplate,
  isDark,
  pageSection,
  setPageSection,
}: PageEditorToolbarProps) => {
  const toolbarButtonSx = {
    color: "text.secondary",
    borderRadius: 2.2,
    border: "1px solid transparent",
    "&:hover": {
      color: "text.primary",
      bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
      borderColor: "divider",
    },
  };

  const pageSectionButtonSx = (active: boolean) => ({
    textTransform: "none",
    borderRadius: 99,
    px: 1.7,
    py: 0.7,
    color: active ? "text.primary" : "text.secondary",
    bgcolor: active ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)") : "transparent",
    border: "1px solid",
    borderColor: active ? (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)") : "transparent",
    fontWeight: 600,
    minHeight: 38,
    transition: "background-color .18s ease, border-color .18s ease, color .18s ease",
    "&:hover": {
      bgcolor: active ? (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)") : isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
      color: "text.primary",
    },
  });

  return (
    <Box
      sx={{
        mb: 2,
        p: 0.8,
        borderRadius: 3.2,
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "stretch", lg: "center" },
          justifyContent: "space-between",
          gap: 1,
          flexDirection: { xs: "column", lg: "row" },
        }}
      >
        <Box
          sx={{
            p: 0.35,
            display: "inline-flex",
            gap: 0.45,
            alignItems: "center",
            borderRadius: 99,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
            flexWrap: "wrap",
          }}
        >
          <Button size="small" startIcon={<NotesIcon fontSize="small" />} onClick={() => setPageSection("page")} sx={pageSectionButtonSx(pageSection === "page")} data-testid="page-editor-section-page">
            Page
          </Button>
          <Button size="small" startIcon={<ViewAgendaOutlinedIcon fontSize="small" />} onClick={() => setPageSection("tasks")} sx={pageSectionButtonSx(pageSection === "tasks")} data-testid="page-editor-section-tasks">
            Tasks
          </Button>
          <Button size="small" startIcon={<ChecklistRtlIcon fontSize="small" />} onClick={() => setPageSection("checklist")} sx={pageSectionButtonSx(pageSection === "checklist")} data-testid="page-editor-section-checklist">
            Checklist
          </Button>
        </Box>
      </Box>

      <Stack
        direction="row"
        spacing={0.35}
        sx={{
          mt: 1.15,
          pt: 1.15,
          borderTop: "1px solid",
          borderColor: "divider",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Tooltip title="Bold">
          <IconButton size="small" onClick={() => insertFormat("**", "**")} sx={toolbarButtonSx}>
            <FormatBoldIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Italic">
          <IconButton size="small" onClick={() => insertFormat("*", "*")} sx={toolbarButtonSx}>
            <FormatItalicIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Code">
          <IconButton size="small" onClick={() => insertFormat("`", "`")} sx={toolbarButtonSx}>
            <CodeIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Code Block">
          <IconButton size="small" onClick={insertCodeBlock} sx={toolbarButtonSx}>
            <DataObjectIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Bullet List">
          <IconButton size="small" onClick={() => insertFormat("- ", "")} sx={toolbarButtonSx}>
            <FormatListBulletedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Checklist">
          <IconButton size="small" onClick={insertChecklist} sx={toolbarButtonSx}>
            <CheckBoxOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Table">
          <IconButton size="small" onClick={insertTable} sx={toolbarButtonSx}>
            <TableChartOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Tasks Database">
          <IconButton size="small" onClick={insertTaskDatabase} sx={toolbarButtonSx}>
            <ViewAgendaOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Task Tracker">
          <IconButton size="small" onClick={insertTaskTrackerDatabase} sx={toolbarButtonSx}>
            <FactCheckOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Button size="small" onClick={insertTemplate} sx={{ ml: 0.3, borderRadius: 2.4 }}>
          Insert template
        </Button>
      </Stack>
    </Box>
  );
};
