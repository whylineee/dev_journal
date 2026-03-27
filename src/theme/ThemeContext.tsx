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
const parseHexColor = (value: string) => {
  const normalized = value.replace("#", "").trim();
  if (normalized.length !== 6) {
    return null;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  if ([r, g, b].some((channel) => Number.isNaN(channel))) {
    return null;
  }

  return { r, g, b };
};

const relativeLuminance = (value: string) => {
  const parsed = parseHexColor(value);
  if (!parsed) {
    return 0;
  }

  const channel = (input: number) => {
    const normalized = input / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * channel(parsed.r) + 0.7152 * channel(parsed.g) + 0.0722 * channel(parsed.b);
};

const gradientContrastText = (colorA: string, colorB: string) => {
  const averageLuminance = (relativeLuminance(colorA) + relativeLuminance(colorB)) / 2;
  return averageLuminance > 0.42 ? "#0a0a0a" : "#ffffff";
};

/**
 * Builds MUI theme tokens from current theme settings.
 * Dashboard / data-rich style: solid surfaces, subtle shadows, clean borders.
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
  const borderColor = palette.divider;
  const paperBg = palette.backgroundPaper;
  const cardRadius = Math.max(8, borderRadius - 4);
  const btnRadius = Math.max(6, borderRadius - 8);
  const contrastText = gradientContrastText(palette.primary, palette.secondary);

  const shadowSm = isDark
    ? "0 1px 2px rgba(0,0,0,0.4)"
    : "0 1px 2px rgba(0,0,0,0.05)";
  const shadowMd = isDark
    ? "0 2px 8px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)"
    : "0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)";
  const shadowLg = isDark
    ? "0 8px 24px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.3)"
    : "0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)";

  const hoverBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)";
  const activeBg = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)";

  const baseTheme = createTheme({
    palette: {
      mode: appearanceMode,
      primary: { main: palette.primary, contrastText },
      secondary: { main: palette.secondary, contrastText },
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
      h4: { fontWeight: 800, letterSpacing: "-0.03em", fontSize: "1.75rem", lineHeight: 1.15 },
      h5: { fontWeight: 700, letterSpacing: "-0.02em", fontSize: "1.35rem", lineHeight: 1.2 },
      h6: { fontWeight: 700, fontSize: "1.05rem", lineHeight: 1.25, letterSpacing: "-0.01em" },
      subtitle1: { fontWeight: 600, fontSize: "0.9rem", lineHeight: 1.3 },
      subtitle2: {
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        fontSize: "0.68rem",
      },
      body1: {
        fontSize: "0.9rem",
        lineHeight: 1.6,
      },
      body2: {
        fontSize: "0.82rem",
        lineHeight: 1.5,
      },
      button: {
        fontSize: "0.82rem",
        fontWeight: 600,
      },
      caption: {
        fontSize: "0.72rem",
        lineHeight: 1.4,
        color: palette.textSecondary,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ":root": {
            colorScheme: appearanceMode,
          },
          body: {
            backgroundColor: palette.backgroundDefault,
            backgroundImage: palette.bodyGradient,
            minHeight: "100vh",
            color: palette.textPrimary,
            fontFeatureSettings: '"cv02" 1, "cv03" 1, "cv04" 1, "cv11" 1',
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
            scrollbarWidth: "thin",
            scrollbarColor: `${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"} transparent`,
            "&::-webkit-scrollbar": {
              width: 6,
              height: 6,
            },
            "&::-webkit-scrollbar-track": {
              background: "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
              background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
              borderRadius: 999,
            },
          },
          "#root": {
            minHeight: "100%",
          },
          "::selection": {
            backgroundColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.08)",
            color: palette.textPrimary,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: paperBg,
            border: `1px solid ${borderColor}`,
            boxShadow: shadowSm,
            borderRadius: cardRadius,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: cardRadius,
            backgroundColor: paperBg,
            border: `1px solid ${borderColor}`,
            boxShadow: shadowSm,
            transition: "border-color 0.15s ease, box-shadow 0.15s ease",
            "&:hover": {
              borderColor: isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.15)",
              boxShadow: shadowMd,
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
            fontWeight: 600,
            borderRadius: btnRadius,
            minHeight: uiDensity === "compact" ? 30 : 34,
            padding: uiDensity === "compact" ? "4px 12px" : "6px 14px",
            transition: "background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease, box-shadow 0.12s ease",
            "&:focus-visible": {
              outline: `2px solid ${palette.primary}`,
              outlineOffset: 2,
            },
          },
          containedPrimary: {
            backgroundColor: palette.primary,
            color: contrastText,
            border: "none",
            boxShadow: shadowSm,
            "&:hover": {
              backgroundColor: palette.primary,
              opacity: 0.9,
              boxShadow: shadowMd,
            },
            "&:active": {
              boxShadow: shadowSm,
            },
            "&.Mui-disabled": {
              backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.26)",
            },
          },
          outlined: {
            backgroundColor: "transparent",
            borderColor: borderColor,
            color: palette.textPrimary,
            "&:hover": {
              backgroundColor: hoverBg,
              borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
            },
          },
          text: {
            color: palette.textSecondary,
            "&:hover": {
              backgroundColor: hoverBg,
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
              color: palette.primary,
            },
            "& .MuiOutlinedInput-root": {
              backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
              borderRadius: btnRadius,
              "& fieldset": {
                borderColor: borderColor,
              },
              "&:hover fieldset": {
                borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
              },
              "&.Mui-focused fieldset": {
                borderColor: palette.primary,
                borderWidth: "1.5px",
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
            height: uiDensity === "compact" ? 22 : 24,
            fontSize: "0.72rem",
            backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
            border: "none",
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRadius: 0,
            backgroundColor: isDark ? palette.backgroundPaper : palette.backgroundDefault,
            borderRight: `1px solid ${borderColor}`,
            boxShadow: "none",
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: palette.backgroundPaper,
            borderBottom: `1px solid ${borderColor}`,
            boxShadow: "none",
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: palette.backgroundPaper,
            border: `1px solid ${borderColor}`,
            boxShadow: shadowLg,
            borderRadius: cardRadius,
          },
          root: {
            "& .MuiBackdrop-root": {
              backgroundColor: isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.3)",
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: isDark ? "#2a2a2e" : "#ffffff",
            color: isDark ? "#fff" : "#333",
            border: `1px solid ${borderColor}`,
            boxShadow: shadowMd,
            borderRadius: btnRadius,
            fontSize: "0.72rem",
            fontWeight: 500,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: btnRadius,
            margin: "1px 4px",
            padding: "6px 10px",
            transition: "background-color 0.1s ease, color 0.1s ease",
            "&:hover": {
              backgroundColor: hoverBg,
            },
            "&.Mui-selected": {
              backgroundColor: activeBg,
              "&:hover": {
                backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
              },
            },
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: palette.backgroundPaper,
            border: `1px solid ${borderColor}`,
            boxShadow: shadowLg,
            borderRadius: cardRadius,
          },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            backgroundColor: palette.backgroundPaper,
            border: `1px solid ${borderColor}`,
            boxShadow: shadowLg,
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
            transition: "background-color 0.1s ease, color 0.1s ease",
            borderRadius: btnRadius,
            "&:hover": {
              backgroundColor: hoverBg,
            },
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.82rem",
            minHeight: 36,
            padding: "6px 12px",
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: 36,
          },
          indicator: {
            height: 2,
            borderRadius: 1,
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            height: 4,
            backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
          },
          bar: {
            borderRadius: 999,
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
