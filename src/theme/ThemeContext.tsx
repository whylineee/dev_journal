import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Theme,
  ThemeProvider as MuiThemeProvider,
  createTheme,
  responsiveFontSizes,
} from "@mui/material/styles";
import {
  DEFAULT_THEME_PRESET,
  ThemePresetId,
  getThemePreset,
  isThemePresetId,
} from "./presets";

export type AppearanceMode = "dark" | "light";
export type FontPreset = "inter" | "roboto" | "mono";
export type UiDensity = "comfortable" | "compact";
export { THEME_PRESETS } from "./presets";
export type { ThemePresetId } from "./presets";

interface ThemeContextType {
  themePreset: ThemePresetId;
  setThemePreset: (preset: ThemePresetId) => void;
  appearanceMode: AppearanceMode;
  setAppearanceMode: (mode: AppearanceMode) => void;
  fontPreset: FontPreset;
  setFontPreset: (preset: FontPreset) => void;
  uiDensity: UiDensity;
  setUiDensity: (density: UiDensity) => void;
  borderRadius: number;
  setBorderRadius: (radius: number) => void;
  resetTheme: () => void;
}

const defaultFontPreset: FontPreset = "inter";
const defaultUiDensity: UiDensity = "comfortable";
const defaultBorderRadius = 16;

const STORAGE_KEYS = {
  themePreset: "devJournal_themePreset",
  appearanceMode: "devJournal_appearanceMode",
  fontPreset: "devJournal_fontPreset",
  uiDensity: "devJournal_uiDensity",
  borderRadius: "devJournal_borderRadius",
} as const;

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const resolveSystemAppearanceMode = (): AppearanceMode => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used within a CustomThemeProvider");
  }
  return context;
};

interface CustomThemeProviderProps {
  children: ReactNode;
}

const resolveFontFamily = (preset: FontPreset) => {
  if (preset === "roboto") {
    return ["Roboto", "Inter", "Arial", "sans-serif"].join(",");
  }

  if (preset === "mono") {
    return [
      '"JetBrains Mono"',
      '"SFMono-Regular"',
      "Menlo",
      "Monaco",
      "Consolas",
      '"Liberation Mono"',
      '"Courier New"',
      "monospace",
    ].join(",");
  }

  return ["Inter", '"Helvetica Neue"', "Arial", "sans-serif"].join(",");
};



/**
 * Builds MUI theme tokens from current theme settings.
 */
const buildMuiTheme = ({
  appearanceMode,
  borderRadius,
  fontFamily,
  palette,
  uiDensity,
}: {
  appearanceMode: AppearanceMode;
  borderRadius: number;
  fontFamily: string;
  palette: ReturnType<typeof getThemePreset>["light"];
  uiDensity: UiDensity;
}): Theme => {
  const isDark = appearanceMode === "dark";

  // Completely Flat, Clean Design Language
  const borderColor = isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)";
  const paperBg = isDark ? "#1e1e1e" : "#ffffff";
  const cardRadius = Math.max(6, borderRadius - 6);
  const btnRadius = Math.max(4, borderRadius - 8);

  const baseTheme = createTheme({
    palette: {
      mode: appearanceMode,
      primary: { main: palette.primary, contrastText: isDark ? "#000" : "#fff" },
      secondary: { main: palette.secondary, contrastText: isDark ? "#000" : "#fff" },
      background: {
        default: palette.backgroundDefault,
        paper: paperBg,
      },
      text: {
        primary: palette.textPrimary,
        secondary: palette.textSecondary,
      },
      divider: palette.divider,
    },
    shape: { borderRadius },
    typography: {
      fontFamily,
      h4: { fontWeight: 700, letterSpacing: "-0.025em", fontSize: "1.85rem", lineHeight: 1.2 },
      h5: { fontWeight: 600, letterSpacing: "-0.015em", fontSize: "1.4rem", lineHeight: 1.25 },
      h6: { fontWeight: 600, fontSize: "1.05rem", lineHeight: 1.3 },
      subtitle1: { fontWeight: 500, fontSize: "0.95rem", lineHeight: 1.3 },
      subtitle2: {
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        fontSize: "0.72rem",
      },
      body1: {
        fontSize: "0.95rem",
        lineHeight: 1.6,
      },
      body2: {
        fontSize: "0.87rem",
        lineHeight: 1.55,
      },
      button: {
        fontSize: "0.85rem",
        fontWeight: 500,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: palette.backgroundDefault,
            minHeight: "100vh",
            color: palette.textPrimary,
            fontFeatureSettings: '"cv02" 1, "cv03" 1, "cv04" 1, "cv11" 1',
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
            scrollbarWidth: "none", // hide scrollbar for general clean look
            "&::-webkit-scrollbar": { display: "none" },
          },
          "::selection": {
            backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)",
            color: palette.textPrimary,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: paperBg,
            border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
            boxShadow: "none",
            borderRadius: cardRadius,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: cardRadius,
            backgroundColor: paperBg,
            border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
            boxShadow: "none",
            transition: "background-color 0.15s ease",
            "&:hover": {
              backgroundColor: isDark ? "#252525" : "#fafafa",
              boxShadow: "none",
            },
          },
        },
      },
      MuiButton: {
        defaultProps: {
          size: uiDensity === "compact" ? "small" : "medium",
          disableElevation: true,
          disableRipple: true,
        },
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 500,
            borderRadius: btnRadius,
            minHeight: uiDensity === "compact" ? 30 : 36,
            padding: uiDensity === "compact" ? "4px 12px" : "6px 16px",
            transition: "all 0.15s ease",
          },
          containedPrimary: {
            backgroundColor: palette.primary,
            color: isDark ? "#000" : "#fff",
            border: "1px solid transparent",
            "&:hover": {
              backgroundColor: isDark ? `${palette.primary}cc` : `${palette.primary}e6`,
            },
            "&:active": {
              transform: "scale(0.97)",
            },
            "&.Mui-disabled": {
              backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
              color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
            },
          },
          outlined: {
            backgroundColor: "transparent",
            borderColor: borderColor,
            color: palette.textPrimary,
            "&:hover": {
              backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
              borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
            },
          },
          text: {
            color: palette.textSecondary,
            "&:hover": {
              backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
              color: palette.textPrimary,
            },
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: "outlined",
          size: uiDensity === "compact" ? "small" : "medium",
        },
        styleOverrides: {
          root: {
            "& .MuiInputLabel-root": {
              color: palette.textSecondary,
            },
            "& .MuiInputLabel-root.Mui-focused": {
              color: palette.textPrimary,
            },
            "& .MuiOutlinedInput-root": {
              backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
              borderRadius: btnRadius,
              "& fieldset": {
                borderColor: borderColor,
              },
              "&:hover fieldset": { 
                borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
              },
              "&.Mui-focused fieldset": {
                borderColor: palette.textPrimary,
                borderWidth: "1px",
              },
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 500,
            borderRadius: btnRadius,
            height: uiDensity === "compact" ? 22 : 26,
            backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRadius: 0,
            backgroundColor: isDark ? "#141414" : "#f5f5f4",
            borderRight: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
            boxShadow: "none",
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: palette.backgroundDefault,
            borderBottom: `1px solid ${borderColor}`,
            boxShadow: "none",
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
            border: `1px solid ${borderColor}`,
            boxShadow: isDark ? "0 12px 40px rgba(0,0,0,0.6)" : "0 12px 40px rgba(0,0,0,0.12)",
            borderRadius: cardRadius,
          },
          root: {
            "& .MuiBackdrop-root": {
              backgroundColor: isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.2)",
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: isDark ? "#2a2a2a" : "#ffffff",
            color: isDark ? "#fff" : "#333",
            border: `1px solid ${borderColor}`,
            boxShadow: isDark ? "0 4px 16px rgba(0,0,0,0.4)" : "0 4px 16px rgba(0,0,0,0.08)",
            borderRadius: btnRadius,
            fontSize: "0.75rem",
            fontWeight: 500,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: btnRadius,
            margin: "2px 8px",
            padding: "6px 8px",
            transition: "background-color 0.1s ease",
            "&:hover": {
              backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
            },
            "&.Mui-selected": {
              backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
              "&:hover": { backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.07)" },
            },
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
            border: `1px solid ${borderColor}`,
            boxShadow: isDark ? "0 6px 20px rgba(0,0,0,0.5)" : "0 6px 20px rgba(0,0,0,0.1)",
            borderRadius: cardRadius,
          },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
            border: `1px solid ${borderColor}`,
            boxShadow: isDark ? "0 6px 20px rgba(0,0,0,0.5)" : "0 6px 20px rgba(0,0,0,0.1)",
            borderRadius: cardRadius,
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            borderRadius: btnRadius,
          },
        },
      },
      MuiNativeSelect: {
        styleOverrides: {
          select: {
            "& option": {
              backgroundColor: palette.backgroundDefault,
              color: palette.textPrimary,
            },
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: borderColor,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            transition: "background-color 0.1s ease",
            borderRadius: btnRadius,
            "&:hover": {
              backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
            },
          },
        },
      },
    },
  });

  return responsiveFontSizes(baseTheme);
};

export const CustomThemeProvider: React.FC<CustomThemeProviderProps> = ({ children }) => {
  const [themePreset, setThemePreset] = useState<ThemePresetId>(() => {
    const value = localStorage.getItem(STORAGE_KEYS.themePreset);
    return isThemePresetId(value) ? value : DEFAULT_THEME_PRESET;
  });
  const [appearanceMode, setAppearanceMode] = useState<AppearanceMode>(() => {
    const mode = localStorage.getItem(STORAGE_KEYS.appearanceMode);
    return mode === "dark" || mode === "light" ? mode : resolveSystemAppearanceMode();
  });
  const [fontPreset, setFontPreset] = useState<FontPreset>(() => {
    const preset = localStorage.getItem(STORAGE_KEYS.fontPreset);
    if (preset === "roboto" || preset === "mono" || preset === "inter") {
      return preset;
    }
    return defaultFontPreset;
  });
  const [uiDensity, setUiDensity] = useState<UiDensity>(() => {
    const density = localStorage.getItem(STORAGE_KEYS.uiDensity);
    return density === "compact" ? "compact" : defaultUiDensity;
  });
  const [borderRadius, setBorderRadius] = useState<number>(() => {
    const value = Number(localStorage.getItem(STORAGE_KEYS.borderRadius));
    return Number.isFinite(value)
      ? Math.min(24, Math.max(6, value))
      : defaultBorderRadius;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.themePreset, themePreset);
  }, [themePreset]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.appearanceMode, appearanceMode);
  }, [appearanceMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.fontPreset, fontPreset);
  }, [fontPreset]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.uiDensity, uiDensity);
  }, [uiDensity]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.borderRadius, String(borderRadius));
  }, [borderRadius]);

  const resetTheme = () => {
    setThemePreset(DEFAULT_THEME_PRESET);
    setAppearanceMode(resolveSystemAppearanceMode());
    setFontPreset(defaultFontPreset);
    setUiDensity(defaultUiDensity);
    setBorderRadius(defaultBorderRadius);
  };

  const fontFamily = resolveFontFamily(fontPreset);
  const palette =
    appearanceMode === "dark"
      ? getThemePreset(themePreset).dark
      : getThemePreset(themePreset).light;

  const theme: Theme = useMemo(
    () => buildMuiTheme({ appearanceMode, borderRadius, fontFamily, palette, uiDensity }),
    [appearanceMode, borderRadius, fontFamily, palette, uiDensity]
  );

  return (
    <ThemeContext.Provider
      value={{
        themePreset,
        setThemePreset,
        appearanceMode,
        setAppearanceMode,
        fontPreset,
        setFontPreset,
        uiDensity,
        setUiDensity,
        borderRadius,
        setBorderRadius,
        resetTheme,
      }}
    >
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
