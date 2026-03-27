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
      backgroundDefault: "#f8f8f8",
      backgroundPaper: "#ffffff",
      textPrimary: "#09090b",
      textSecondary: "#71717a",
      divider: "#e4e4e7",
      bodyGradient: "none",
    },
    dark: {
      primary: "#fafafa",
      secondary: "#a1a1aa",
      backgroundDefault: "#09090b",
      backgroundPaper: "#18181b",
      textPrimary: "#fafafa",
      textSecondary: "#a1a1aa",
      divider: "#27272a",
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
      backgroundDefault: "#f8fafc",
      backgroundPaper: "#ffffff",
      textPrimary: "#0c4a6e",
      textSecondary: "#64748b",
      divider: "#e2e8f0",
      bodyGradient: "none",
    },
    dark: {
      primary: "#38bdf8",
      secondary: "#22d3ee",
      backgroundDefault: "#0c1222",
      backgroundPaper: "#152032",
      textPrimary: "#e0f2fe",
      textSecondary: "#7dd3fc",
      divider: "#1e3048",
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
      backgroundDefault: "#f8faf8",
      backgroundPaper: "#ffffff",
      textPrimary: "#14532d",
      textSecondary: "#64748b",
      divider: "#e2e8e4",
      bodyGradient: "none",
    },
    dark: {
      primary: "#4ade80",
      secondary: "#34d399",
      backgroundDefault: "#0a1210",
      backgroundPaper: "#142420",
      textPrimary: "#dcfce7",
      textSecondary: "#86efac",
      divider: "#1a3428",
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
      backgroundDefault: "#faf8f6",
      backgroundPaper: "#ffffff",
      textPrimary: "#431407",
      textSecondary: "#78716c",
      divider: "#e7e2de",
      bodyGradient: "none",
    },
    dark: {
      primary: "#fb923c",
      secondary: "#fb7185",
      backgroundDefault: "#120e0c",
      backgroundPaper: "#1e1816",
      textPrimary: "#fff7ed",
      textSecondary: "#fdba74",
      divider: "#302420",
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
      backgroundDefault: "#f9f8fc",
      backgroundPaper: "#ffffff",
      textPrimary: "#2e1065",
      textSecondary: "#78716c",
      divider: "#e4e0ee",
      bodyGradient: "none",
    },
    dark: {
      primary: "#a78bfa",
      secondary: "#c084fc",
      backgroundDefault: "#0e0a18",
      backgroundPaper: "#1a1528",
      textPrimary: "#f5f3ff",
      textSecondary: "#c4b5fd",
      divider: "#2a2240",
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
      backgroundDefault: "#faf8f9",
      backgroundPaper: "#ffffff",
      textPrimary: "#500724",
      textSecondary: "#78716c",
      divider: "#e8e0e4",
      bodyGradient: "none",
    },
    dark: {
      primary: "#f472b6",
      secondary: "#fb7185",
      backgroundDefault: "#120a0e",
      backgroundPaper: "#1e141a",
      textPrimary: "#fdf2f8",
      textSecondary: "#f9a8d4",
      divider: "#30202a",
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
