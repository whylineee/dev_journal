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
  const baseTheme = createTheme({
    palette: {
      mode: appearanceMode,
      primary: { main: palette.primary },
      secondary: { main: palette.secondary },
      background: {
        default: palette.backgroundDefault,
        paper: palette.backgroundPaper,
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
      h4: { fontWeight: 700, letterSpacing: "-0.02em", fontSize: "1.9rem" },
      h5: { fontWeight: 650, letterSpacing: "-0.01em", fontSize: "1.42rem" },
      h6: { fontWeight: 650, fontSize: "1.08rem" },
      subtitle1: { fontWeight: 500, fontSize: "0.95rem" },
      subtitle2: {
        fontWeight: 500,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
      },
      body1: {
        fontSize: "0.96rem",
        lineHeight: 1.55,
      },
      body2: {
        fontSize: "0.88rem",
        lineHeight: 1.5,
      },
      button: {
        fontSize: "0.86rem",
        letterSpacing: "0.01em",
        fontWeight: 600,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: palette.backgroundDefault,
            backgroundImage: palette.bodyGradient,
            backgroundAttachment: "fixed",
            minHeight: "100vh",
            color: palette.textPrimary,
            fontFeatureSettings: '"cv02" 1, "cv03" 1, "cv04" 1, "cv11" 1',
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
          },
          "::-webkit-scrollbar": { width: "8px", height: "8px" },
          "::-webkit-scrollbar-track": { background: "transparent" },
          "::-webkit-scrollbar-thumb": {
            background: appearanceMode === "dark" ? "#4a4a4a" : "#b0b0b0",
            borderRadius: "4px",
          },
          "::-webkit-scrollbar-thumb:hover": {
            background: appearanceMode === "dark" ? "#6b6b6b" : "#8e8e8e",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor:
              isDark
                ? "rgba(15, 15, 15, 0.78)"
                : "rgba(255, 255, 255, 0.88)",
            backdropFilter: "blur(14px)",
            border: `1px solid ${palette.divider}`,
            boxShadow:
              isDark
                ? "0 4px 24px -4px rgba(0, 0, 0, 0.36)"
                : "0 4px 20px -8px rgba(15, 23, 42, 0.18)",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: Math.max(10, borderRadius - 2),
          },
        },
      },
      MuiButton: {
        defaultProps: {
          size: uiDensity === "compact" ? "small" : "medium",
        },
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 600,
            borderRadius: Math.max(8, borderRadius - 5),
            minHeight: uiDensity === "compact" ? 34 : 40,
            padding: uiDensity === "compact" ? "6px 14px" : "9px 18px",
            transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
          },
          containedPrimary: {
            boxShadow: `0 4px 14px 0 ${palette.primary}50`,
            "&:hover": {
              boxShadow: `0 6px 20px ${palette.primary}70`,
              transform: "translateY(-1px)",
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
              color: palette.primary,
            },
            "& .MuiInputLabel-root.MuiInputLabel-shrink": {
              backgroundColor: isDark ? "rgba(15, 15, 15, 0.9)" : "rgba(255, 255, 255, 0.92)",
              paddingLeft: 6,
              paddingRight: 6,
              borderRadius: 6,
            },
            "& .MuiOutlinedInput-root": {
              backgroundColor:
                isDark
                  ? "rgba(0, 0, 0, 0.24)"
                  : "rgba(255, 255, 255, 0.72)",
              transition: "all 0.2s",
              borderRadius: Math.max(8, borderRadius - 5),
              "& fieldset": { borderColor: palette.divider },
              "&:hover fieldset": { borderColor: palette.secondary },
              "&.Mui-focused fieldset": {
                borderColor: palette.primary,
                borderWidth: "1px",
              },
              "&.Mui-focused": {
                boxShadow: `0 0 0 3px ${palette.primary}22`,
              },
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 500,
            borderRadius: 999,
            height: uiDensity === "compact" ? 24 : 26,
          },
          label: {
            paddingLeft: 8,
            paddingRight: 8,
            fontSize: "0.76rem",
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor:
              isDark
                ? "rgba(10, 10, 10, 0.72)"
                : "rgba(255, 255, 255, 0.82)",
            backdropFilter: "blur(20px)",
            borderRight: `1px solid ${palette.divider}`,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor:
              isDark
                ? "rgba(10, 10, 10, 0.62)"
                : "rgba(255, 255, 255, 0.82)",
            backdropFilter: "blur(16px)",
            borderBottom: `1px solid ${palette.divider}`,
            boxShadow: "none",
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: Math.max(8, borderRadius - 8),
            margin: "4px 8px",
            padding: uiDensity === "compact" ? "7px 12px" : "9px 14px",
            transition: "background-color 0.16s ease, border-color 0.16s ease",
            border: "1px solid transparent",
            "&:hover": {
              borderColor: palette.divider,
            },
            "&.Mui-selected": {
              backgroundColor: `${palette.primary}21`,
              borderColor: `${palette.primary}60`,
              "&:hover": { backgroundColor: `${palette.primary}2c` },
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
