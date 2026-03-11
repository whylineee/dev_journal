import { KeyboardEvent, useEffect, useMemo, useState } from "react";
import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useI18n } from "../i18n/I18nContext";

export interface CommandAction {
  id: string;
  title: string;
  subtitle?: string;
  section?: string;
  keywords?: string[];
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  actions: CommandAction[];
  onClose: () => void;
}

const normalize = (value: string) => value.trim().toLowerCase();

export const CommandPalette = ({ open, actions, onClose }: CommandPaletteProps) => {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredActions = useMemo(() => {
    const q = normalize(query);
    if (!q) {
      return actions;
    }

    return actions.filter((action) => {
      const haystack = [
        action.title,
        action.subtitle ?? "",
        action.section ?? "",
        ...(action.keywords ?? []),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [actions, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedIndex(0);
      return;
    }

    setSelectedIndex(0);
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const executeAction = (index: number) => {
    const action = filteredActions[index];
    if (!action) {
      return;
    }

    onClose();
    action.onSelect();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, Math.max(filteredActions.length - 1, 0)));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      executeAction(selectedIndex);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogContent sx={{ p: 2.5 }} onKeyDown={handleKeyDown}>
        <TextField
          autoFocus
          fullWidth
          placeholder={t("Type a command or search")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        <Box sx={{ mt: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="caption" color="text.secondary">
            {t("{count} commands", { count: filteredActions.length })}
          </Typography>
          <Chip size="small" label="Ctrl/Cmd + K" variant="outlined" />
        </Box>

        <List sx={{ mt: 1, maxHeight: 420, overflowY: "auto" }}>
          {filteredActions.map((action, index) => (
            <ListItemButton
              key={action.id}
              selected={index === selectedIndex}
              onClick={() => executeAction(index)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                transition: "all 0.15s ease",
                "&.Mui-selected": {
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)",
                },
              }}
            >
              <ListItemText
                primary={action.title}
                secondary={
                  action.subtitle
                    ? `${action.section ? `${action.section} • ` : ""}${action.subtitle}`
                    : action.section
                }
              />
            </ListItemButton>
          ))}

          {filteredActions.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 2 }}>
              {t("No commands found.")}
            </Typography>
          ) : null}
        </List>
      </DialogContent>
    </Dialog>
  );
};
