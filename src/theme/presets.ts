/**
 * Shared type definitions and values for visual theme presets.
 * Keeping presets in a dedicated file makes ThemeContext smaller and easier to maintain.
 */
export type ThemePresetId =
  | "monochrome"
  | "ocean"
  | "forest"
  | "sunset"
  | "midnight"
  | "cherry";

export interface ThemePresetPalette {
  primary: string;
  secondary: string;
  backgroundDefault: string;
  backgroundPaper: string;
  textPrimary: string;
  textSecondary: string;
  divider: string;
  bodyGradient: string;
}

export interface ThemePreset {
  id: ThemePresetId;
  name: string;
  description: string;
  light: ThemePresetPalette;
  dark: ThemePresetPalette;
}

export const DEFAULT_THEME_PRESET: ThemePresetId = "monochrome";

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "monochrome",
    name: "Monochrome",
    description: "Black and white, minimal contrast-first UI.",
    light: {
      primary: "#18181b",
      secondary: "#52525b",
      backgroundDefault: "#ffffff",
      backgroundPaper: "#ffffff",
      textPrimary: "#18181b",
      textSecondary: "#71717a",
      divider: "rgba(24, 24, 27, 0.08)",
      bodyGradient: "none",
    },
    dark: {
      primary: "#f4f4f5",
      secondary: "#a1a1aa",
      backgroundDefault: "#111111",
      backgroundPaper: "#1a1a1a",
      textPrimary: "#fafafa",
      textSecondary: "#a1a1aa",
      divider: "rgba(250, 250, 250, 0.08)",
      bodyGradient: "none",
    },
  },
  {
    id: "ocean",
    name: "Ocean Blue",
    description: "Deep blue workspace with calm aqua accents.",
    light: {
      primary: "#0369a1",
      secondary: "#0891b2",
      backgroundDefault: "#f8fbfd",
      backgroundPaper: "#ffffff",
      textPrimary: "#082f49",
      textSecondary: "#64748b",
      divider: "rgba(3, 105, 161, 0.10)",
      bodyGradient: "none",
    },
    dark: {
      primary: "#38bdf8",
      secondary: "#22d3ee",
      backgroundDefault: "#0c1520",
      backgroundPaper: "#141e2b",
      textPrimary: "#e0f2fe",
      textSecondary: "#7dd3fc",
      divider: "rgba(56, 189, 248, 0.10)",
      bodyGradient: "none",
    },
  },
  {
    id: "forest",
    name: "Forest Green",
    description: "Nature-inspired palette with balanced contrast.",
    light: {
      primary: "#15803d",
      secondary: "#059669",
      backgroundDefault: "#f7faf8",
      backgroundPaper: "#ffffff",
      textPrimary: "#14532d",
      textSecondary: "#64748b",
      divider: "rgba(21, 128, 61, 0.10)",
      bodyGradient: "none",
    },
    dark: {
      primary: "#4ade80",
      secondary: "#34d399",
      backgroundDefault: "#0c1510",
      backgroundPaper: "#141e18",
      textPrimary: "#dcfce7",
      textSecondary: "#86efac",
      divider: "rgba(74, 222, 128, 0.10)",
      bodyGradient: "none",
    },
  },
  {
    id: "sunset",
    name: "Sunset Orange",
    description: "Warm orange-red tones for energetic planning.",
    light: {
      primary: "#c2410c",
      secondary: "#e11d48",
      backgroundDefault: "#fdfaf7",
      backgroundPaper: "#ffffff",
      textPrimary: "#431407",
      textSecondary: "#78716c",
      divider: "rgba(194, 65, 12, 0.10)",
      bodyGradient: "none",
    },
    dark: {
      primary: "#fb923c",
      secondary: "#fb7185",
      backgroundDefault: "#151010",
      backgroundPaper: "#1e1614",
      textPrimary: "#fff7ed",
      textSecondary: "#fdba74",
      divider: "rgba(251, 146, 60, 0.10)",
      bodyGradient: "none",
    },
  },
  {
    id: "midnight",
    name: "Midnight Violet",
    description: "Cool night palette with electric violet accents.",
    light: {
      primary: "#7c3aed",
      secondary: "#a855f7",
      backgroundDefault: "#faf8ff",
      backgroundPaper: "#ffffff",
      textPrimary: "#2e1065",
      textSecondary: "#78716c",
      divider: "rgba(124, 58, 237, 0.10)",
      bodyGradient: "none",
    },
    dark: {
      primary: "#a78bfa",
      secondary: "#c084fc",
      backgroundDefault: "#100c18",
      backgroundPaper: "#1a1525",
      textPrimary: "#f5f3ff",
      textSecondary: "#c4b5fd",
      divider: "rgba(167, 139, 250, 0.10)",
      bodyGradient: "none",
    },
  },
  {
    id: "cherry",
    name: "Cherry Blossom",
    description: "Soft rose palette with high readability.",
    light: {
      primary: "#db2777",
      secondary: "#ec4899",
      backgroundDefault: "#fdf8fb",
      backgroundPaper: "#ffffff",
      textPrimary: "#500724",
      textSecondary: "#78716c",
      divider: "rgba(219, 39, 119, 0.10)",
      bodyGradient: "none",
    },
    dark: {
      primary: "#f472b6",
      secondary: "#fb7185",
      backgroundDefault: "#150c10",
      backgroundPaper: "#1e1418",
      textPrimary: "#fdf2f8",
      textSecondary: "#f9a8d4",
      divider: "rgba(244, 114, 182, 0.10)",
      bodyGradient: "none",
    },
  },
];

export const isThemePresetId = (value: string | null): value is ThemePresetId => {
  return THEME_PRESETS.some((preset) => preset.id === value);
};

export const getThemePreset = (id: ThemePresetId): ThemePreset => {
  return THEME_PRESETS.find((preset) => preset.id === id) ?? THEME_PRESETS[0];
};
