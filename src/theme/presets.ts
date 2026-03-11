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
      backgroundDefault: "#f0f0f3",
      backgroundPaper: "rgba(255, 255, 255, 0.60)",
      textPrimary: "#18181b",
      textSecondary: "#52525b",
      divider: "rgba(24, 24, 27, 0.08)",
      bodyGradient:
        "radial-gradient(ellipse at 0% 0%, rgba(168,162,186,0.28), transparent 50%), radial-gradient(ellipse at 100% 0%, rgba(190,190,210,0.22), transparent 50%), radial-gradient(ellipse at 50% 100%, rgba(200,198,216,0.18), transparent 50%)",
    },
    dark: {
      primary: "#f4f4f5",
      secondary: "#a1a1aa",
      backgroundDefault: "#09090b",
      backgroundPaper: "rgba(24, 24, 27, 0.50)",
      textPrimary: "#fafafa",
      textSecondary: "#a1a1aa",
      divider: "rgba(250, 250, 250, 0.08)",
      bodyGradient:
        "radial-gradient(ellipse at 0% 0%, rgba(80,80,100,0.20), transparent 50%), radial-gradient(ellipse at 100% 0%, rgba(60,60,80,0.18), transparent 50%), radial-gradient(ellipse at 50% 100%, rgba(70,70,90,0.12), transparent 50%)",
    },
  },
  {
    id: "ocean",
    name: "Ocean Blue",
    description: "Deep blue workspace with calm aqua accents.",
    light: {
      primary: "#0369a1",
      secondary: "#0891b2",
      backgroundDefault: "#e8f4fa",
      backgroundPaper: "rgba(255, 255, 255, 0.55)",
      textPrimary: "#082f49",
      textSecondary: "#1e6088",
      divider: "rgba(3, 105, 161, 0.10)",
      bodyGradient:
        "radial-gradient(ellipse at 0% 0%, rgba(56,189,248,0.25), transparent 50%), radial-gradient(ellipse at 100% 20%, rgba(14,165,233,0.18), transparent 50%), radial-gradient(ellipse at 40% 100%, rgba(125,211,252,0.15), transparent 50%)",
    },
    dark: {
      primary: "#38bdf8",
      secondary: "#22d3ee",
      backgroundDefault: "#051525",
      backgroundPaper: "rgba(8, 28, 48, 0.55)",
      textPrimary: "#e0f2fe",
      textSecondary: "#7dd3fc",
      divider: "rgba(56, 189, 248, 0.10)",
      bodyGradient:
        "radial-gradient(ellipse at 0% 0%, rgba(56,189,248,0.18), transparent 50%), radial-gradient(ellipse at 100% 20%, rgba(34,211,238,0.12), transparent 50%), radial-gradient(ellipse at 50% 100%, rgba(14,165,233,0.10), transparent 50%)",
    },
  },
  {
    id: "forest",
    name: "Forest Green",
    description: "Nature-inspired palette with balanced contrast.",
    light: {
      primary: "#15803d",
      secondary: "#059669",
      backgroundDefault: "#ebf5ee",
      backgroundPaper: "rgba(255, 255, 255, 0.55)",
      textPrimary: "#14532d",
      textSecondary: "#3f7a55",
      divider: "rgba(21, 128, 61, 0.10)",
      bodyGradient:
        "radial-gradient(ellipse at 0% 0%, rgba(74,222,128,0.22), transparent 50%), radial-gradient(ellipse at 100% 20%, rgba(52,211,153,0.16), transparent 50%), radial-gradient(ellipse at 50% 100%, rgba(134,239,172,0.12), transparent 50%)",
    },
    dark: {
      primary: "#4ade80",
      secondary: "#34d399",
      backgroundDefault: "#071a12",
      backgroundPaper: "rgba(10, 32, 22, 0.55)",
      textPrimary: "#dcfce7",
      textSecondary: "#86efac",
      divider: "rgba(74, 222, 128, 0.10)",
      bodyGradient:
        "radial-gradient(ellipse at 0% 0%, rgba(74,222,128,0.15), transparent 50%), radial-gradient(ellipse at 100% 20%, rgba(52,211,153,0.10), transparent 50%), radial-gradient(ellipse at 50% 100%, rgba(16,185,129,0.08), transparent 50%)",
    },
  },
  {
    id: "sunset",
    name: "Sunset Orange",
    description: "Warm orange-red tones for energetic planning.",
    light: {
      primary: "#c2410c",
      secondary: "#e11d48",
      backgroundDefault: "#fef3ec",
      backgroundPaper: "rgba(255, 255, 255, 0.55)",
      textPrimary: "#431407",
      textSecondary: "#9a3412",
      divider: "rgba(194, 65, 12, 0.10)",
      bodyGradient:
        "radial-gradient(ellipse at 0% 0%, rgba(251,146,60,0.25), transparent 50%), radial-gradient(ellipse at 100% 20%, rgba(251,113,133,0.18), transparent 50%), radial-gradient(ellipse at 50% 100%, rgba(253,186,116,0.14), transparent 50%)",
    },
    dark: {
      primary: "#fb923c",
      secondary: "#fb7185",
      backgroundDefault: "#1a0e08",
      backgroundPaper: "rgba(34, 18, 10, 0.55)",
      textPrimary: "#fff7ed",
      textSecondary: "#fdba74",
      divider: "rgba(251, 146, 60, 0.10)",
      bodyGradient:
        "radial-gradient(ellipse at 0% 0%, rgba(251,146,60,0.16), transparent 50%), radial-gradient(ellipse at 100% 20%, rgba(251,113,133,0.10), transparent 50%), radial-gradient(ellipse at 50% 100%, rgba(253,186,116,0.08), transparent 50%)",
    },
  },
  {
    id: "midnight",
    name: "Midnight Violet",
    description: "Cool night palette with electric violet accents.",
    light: {
      primary: "#7c3aed",
      secondary: "#a855f7",
      backgroundDefault: "#f3f0ff",
      backgroundPaper: "rgba(255, 255, 255, 0.55)",
      textPrimary: "#2e1065",
      textSecondary: "#6d28d9",
      divider: "rgba(124, 58, 237, 0.10)",
      bodyGradient:
        "radial-gradient(ellipse at 0% 0%, rgba(167,139,250,0.28), transparent 50%), radial-gradient(ellipse at 100% 20%, rgba(192,132,252,0.18), transparent 50%), radial-gradient(ellipse at 50% 100%, rgba(196,181,253,0.14), transparent 50%)",
    },
    dark: {
      primary: "#a78bfa",
      secondary: "#c084fc",
      backgroundDefault: "#0f0720",
      backgroundPaper: "rgba(20, 12, 40, 0.55)",
      textPrimary: "#f5f3ff",
      textSecondary: "#c4b5fd",
      divider: "rgba(167, 139, 250, 0.10)",
      bodyGradient:
        "radial-gradient(ellipse at 0% 0%, rgba(167,139,250,0.18), transparent 50%), radial-gradient(ellipse at 100% 20%, rgba(192,132,252,0.12), transparent 50%), radial-gradient(ellipse at 50% 100%, rgba(139,92,246,0.08), transparent 50%)",
    },
  },
  {
    id: "cherry",
    name: "Cherry Blossom",
    description: "Soft rose palette with high readability.",
    light: {
      primary: "#db2777",
      secondary: "#ec4899",
      backgroundDefault: "#fdf2f8",
      backgroundPaper: "rgba(255, 255, 255, 0.55)",
      textPrimary: "#500724",
      textSecondary: "#9d174d",
      divider: "rgba(219, 39, 119, 0.10)",
      bodyGradient:
        "radial-gradient(ellipse at 0% 0%, rgba(244,114,182,0.25), transparent 50%), radial-gradient(ellipse at 100% 20%, rgba(251,113,133,0.18), transparent 50%), radial-gradient(ellipse at 50% 100%, rgba(249,168,212,0.14), transparent 50%)",
    },
    dark: {
      primary: "#f472b6",
      secondary: "#fb7185",
      backgroundDefault: "#1a0812",
      backgroundPaper: "rgba(32, 12, 24, 0.55)",
      textPrimary: "#fdf2f8",
      textSecondary: "#f9a8d4",
      divider: "rgba(244, 114, 182, 0.10)",
      bodyGradient:
        "radial-gradient(ellipse at 0% 0%, rgba(244,114,182,0.16), transparent 50%), radial-gradient(ellipse at 100% 20%, rgba(251,113,133,0.10), transparent 50%), radial-gradient(ellipse at 50% 100%, rgba(236,72,153,0.08), transparent 50%)",
    },
  },
];

export const isThemePresetId = (value: string | null): value is ThemePresetId => {
  return THEME_PRESETS.some((preset) => preset.id === value);
};

export const getThemePreset = (id: ThemePresetId): ThemePreset => {
  return THEME_PRESETS.find((preset) => preset.id === id) ?? THEME_PRESETS[0];
};
