import SaveIcon from "@mui/icons-material/Save";
import { Box, Button, Chip, InputBase, Stack } from "@mui/material";

interface PageEditorHeaderProps {
  draftRestored: boolean;
  isCompactDesktop: boolean;
  onSave: () => void;
  saving: boolean;
  setTitle: (value: string) => void;
  title: string;
}

export const PageEditorHeader = ({
  draftRestored,
  isCompactDesktop,
  onSave,
  saving,
  setTitle,
  title,
}: PageEditorHeaderProps) => (
  <Box
    sx={{
      mb: 1.6,
      p: { xs: 1.2, md: isCompactDesktop ? 1.45 : 1.8 },
      borderRadius: isCompactDesktop ? 3.2 : 4,
      border: "1px solid",
      borderColor: "divider",
      backgroundColor: "background.paper",
    }}
  >
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems={{ xs: "flex-start", lg: "center" }}
      gap={2}
      flexDirection={{ xs: "column", lg: "row" }}
    >
      <Box sx={{ minWidth: 0, flex: 1, width: "100%" }}>
        <InputBase
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          sx={{
            fontSize: { xs: "2rem", sm: "2.4rem", xl: "3rem" },
            lineHeight: 1.05,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            color: "text.primary",
            flex: 1,
            minWidth: 0,
            width: "100%",
            mb: 0.5,
            "& input::placeholder": {
              color: "text.secondary",
              opacity: 1,
            },
          }}
        />
      </Box>

      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{
          flexWrap: "wrap",
          justifyContent: { xs: "flex-start", lg: "flex-end" },
          width: { xs: "100%", lg: "auto" },
        }}
      >
        {draftRestored ? <Chip label="Draft restored" size="small" color="info" variant="outlined" /> : null}
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={onSave}
          disabled={saving}
          sx={{
            px: isCompactDesktop ? 2.1 : 2.6,
            minWidth: isCompactDesktop ? 132 : 150,
            minHeight: isCompactDesktop ? 40 : 42,
            borderRadius: 2.8,
          }}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </Stack>
    </Box>
  </Box>
);
