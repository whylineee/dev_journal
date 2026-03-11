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

const glassLight = (opacity: number) => `rgba(255, 255, 255, ${opacity})`;
const glassDark = (opacity: number) => `rgba(0, 0, 0, ${opacity})`;

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

  const glassBorder = isDark
    ? "1px solid rgba(255, 255, 255, 0.08)"
    : "1px solid rgba(255, 255, 255, 0.45)";

  const glassShadow = isDark
    ? "0 8px 32px rgba(0, 0, 0, 0.40), 0 2px 8px rgba(0, 0, 0, 0.20), inset 0 1px 0 rgba(255, 255, 255, 0.04)"
    : "0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.70)";

  const glassBg = isDark ? glassDark(0.35) : glassLight(0.50);
  const glassBlur = "blur(24px) saturate(1.4)";
  const cardRadius = Math.max(12, borderRadius - 2);
  const btnRadius = Math.max(10, borderRadius - 4);

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
      h4: { fontWeight: 700, letterSpacing: "-0.025em", fontSize: "1.85rem", lineHeight: 1.2 },
      h5: { fontWeight: 650, letterSpacing: "-0.015em", fontSize: "1.4rem", lineHeight: 1.25 },
      h6: { fontWeight: 600, fontSize: "1.05rem", lineHeight: 1.3 },
      subtitle1: { fontWeight: 500, fontSize: "0.95rem", lineHeight: 1.45 },
      subtitle2: {
        fontWeight: 500,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        fontSize: "0.72rem",
      },
      body1: {
        fontSize: "0.95rem",
        lineHeight: 1.6,
        letterSpacing: "0.01em",
      },
      body2: {
        fontSize: "0.87rem",
        lineHeight: 1.55,
        letterSpacing: "0.01em",
      },
      button: {
        fontSize: "0.85rem",
        letterSpacing: "0.02em",
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
            scrollbarWidth: "thin",
            scrollbarColor: `${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"} transparent`,
          },
          "::selection": {
            backgroundColor: `${palette.primary}30`,
            color: palette.textPrimary,
          },
          "::-webkit-scrollbar": { width: "6px", height: "6px" },
          "::-webkit-scrollbar-track": { background: "transparent" },
          "::-webkit-scrollbar-thumb": {
            background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
            borderRadius: "3px",
          },
          "::-webkit-scrollbar-thumb:hover": {
            background: isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.22)",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: glassBg,
            backdropFilter: glassBlur,
            WebkitBackdropFilter: glassBlur,
            border: glassBorder,
            boxShadow: glassShadow,
            borderRadius: cardRadius,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: cardRadius,
            backgroundColor: glassBg,
            backdropFilter: glassBlur,
            WebkitBackdropFilter: glassBlur,
            border: glassBorder,
            boxShadow: glassShadow,
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            "&:hover": {
              transform: "translateY(-1px)",
              boxShadow: isDark
                ? "0 12px 40px rgba(0, 0, 0, 0.50), 0 4px 12px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.06)"
                : "0 12px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.80)",
            },
          },
        },
      },
      MuiButton: {
        defaultProps: {
          size: uiDensity === "compact" ? "small" : "medium",
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 600,
            borderRadius: btnRadius,
            minHeight: uiDensity === "compact" ? 34 : 40,
            padding: uiDensity === "compact" ? "6px 14px" : "9px 20px",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          },
          containedPrimary: {
            background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})`,
            boxShadow: `0 4px 16px ${palette.primary}35`,
            border: "1px solid rgba(255, 255, 255, 0.15)",
            color: isDark ? "#0a0a0a" : "#ffffff",
            "&:hover": {
              boxShadow: `0 6px 24px ${palette.primary}50`,
              transform: "translateY(-1px)",
              background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})`,
              filter: "brightness(1.1)",
            },
          },
          outlined: {
            backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.50)",
            borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
            "&:hover": {
              backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.70)",
              borderColor: palette.primary,
            },
          },
          text: {
            "&:hover": {
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
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
              backgroundColor: `${palette.backgroundDefault}e8`,
              paddingLeft: 6,
              paddingRight: 6,
              borderRadius: 6,
            },
            "&:has(select.MuiNativeSelect-select) .MuiInputLabel-root": {
              transform: "translate(14px, -9px) scale(0.75)",
              maxWidth: "calc(133% - 32px)",
              backgroundColor: `${palette.backgroundDefault}e8`,
              paddingLeft: 6,
              paddingRight: 6,
              borderRadius: 6,
            },
            "&:has(select.MuiNativeSelect-select) .MuiOutlinedInput-notchedOutline legend": {
              maxWidth: "100%",
            },
            "& .MuiOutlinedInput-root": {
              backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              transition: "all 0.2s ease",
              borderRadius: btnRadius,
              "& fieldset": {
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                transition: "border-color 0.2s ease",
              },
              "&:hover fieldset": { borderColor: `${palette.primary}60` },
              "&.Mui-focused fieldset": {
                borderColor: palette.primary,
                borderWidth: "1.5px",
              },
              "&.Mui-focused": {
                boxShadow: `0 0 0 3px ${palette.primary}30`,
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.70)",
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
            height: uiDensity === "compact" ? 24 : 28,
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
          },
          label: {
            paddingLeft: 10,
            paddingRight: 10,
            fontSize: "0.76rem",
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRadius: 0,
            backgroundColor: isDark ? "rgba(8, 8, 12, 0.70)" : "rgba(255, 255, 255, 0.65)",
            backdropFilter: "blur(40px) saturate(1.6)",
            WebkitBackdropFilter: "blur(40px) saturate(1.6)",
            borderRight: isDark
              ? "1px solid rgba(255, 255, 255, 0.06)"
              : "1px solid rgba(255, 255, 255, 0.50)",
            boxShadow: isDark
              ? "4px 0 24px rgba(0, 0, 0, 0.30)"
              : "4px 0 24px rgba(0, 0, 0, 0.06)",
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? "rgba(8, 8, 12, 0.55)" : "rgba(255, 255, 255, 0.55)",
            backdropFilter: "blur(32px) saturate(1.5)",
            WebkitBackdropFilter: "blur(32px) saturate(1.5)",
            borderBottom: isDark
              ? "1px solid rgba(255, 255, 255, 0.06)"
              : "1px solid rgba(255, 255, 255, 0.50)",
            boxShadow: isDark
              ? "0 4px 16px rgba(0, 0, 0, 0.20)"
              : "0 4px 16px rgba(0, 0, 0, 0.04)",
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? glassDark(0.60) : glassLight(0.72),
            backdropFilter: "blur(40px) saturate(1.6)",
            WebkitBackdropFilter: "blur(40px) saturate(1.6)",
            border: glassBorder,
            boxShadow: isDark
              ? "0 24px 80px rgba(0, 0, 0, 0.60), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
              : "0 24px 80px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.80)",
            borderRadius: Math.max(16, borderRadius),
          },
          root: {
            "& .MuiBackdrop-root": {
              backgroundColor: isDark ? "rgba(0,0,0,0.50)" : "rgba(0,0,0,0.25)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: isDark ? "rgba(20, 20, 24, 0.85)" : "rgba(255, 255, 255, 0.90)",
            color: palette.textPrimary,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
            boxShadow: isDark
              ? "0 4px 16px rgba(0,0,0,0.40)"
              : "0 4px 16px rgba(0,0,0,0.08)",
            borderRadius: 8,
            fontSize: "0.78rem",
            fontWeight: 500,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: Math.max(10, borderRadius - 6),
            margin: "3px 6px",
            padding: uiDensity === "compact" ? "7px 12px" : "9px 14px",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            border: "1px solid transparent",
            "&:hover": {
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
              borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
            },
            "&.Mui-selected": {
              backgroundColor: `${palette.primary}15`,
              borderColor: `${palette.primary}30`,
              boxShadow: `0 0 0 1px ${palette.primary}20, 0 2px 8px ${palette.primary}18`,
              "&:hover": { backgroundColor: `${palette.primary}20` },
            },
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? glassDark(0.55) : glassLight(0.72),
            backdropFilter: "blur(32px) saturate(1.5)",
            WebkitBackdropFilter: "blur(32px) saturate(1.5)",
            border: glassBorder,
            boxShadow: isDark
              ? "0 12px 40px rgba(0,0,0,0.50)"
              : "0 12px 40px rgba(0,0,0,0.10)",
          },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? glassDark(0.55) : glassLight(0.72),
            backdropFilter: "blur(32px) saturate(1.5)",
            WebkitBackdropFilter: "blur(32px) saturate(1.5)",
            border: glassBorder,
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
            borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            transition: "all 0.2s ease",
            "&:hover": {
              backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
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
