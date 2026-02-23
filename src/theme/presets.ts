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
      primary: "#111111",
      secondary: "#4b5563",
      backgroundDefault: "#f7f7f7",
      backgroundPaper: "#ffffff",
      textPrimary: "#111111",
      textSecondary: "#4b5563",
      divider: "rgba(17, 17, 17, 0.12)",
      bodyGradient:
        "radial-gradient(circle at 10% 10%, rgba(17,17,17,0.06), transparent 35%), radial-gradient(circle at 90% 20%, rgba(17,17,17,0.05), transparent 35%)",
    },
    dark: {
      primary: "#f5f5f5",
      secondary: "#a3a3a3",
      backgroundDefault: "#0b0b0b",
      backgroundPaper: "#141414",
      textPrimary: "#f5f5f5",
      textSecondary: "#a3a3a3",
      divider: "rgba(245, 245, 245, 0.14)",
      bodyGradient:
        "radial-gradient(circle at 15% 20%, rgba(255,255,255,0.09), transparent 35%), radial-gradient(circle at 85% 10%, rgba(255,255,255,0.06), transparent 35%)",
    },
  },
  {
    id: "ocean",
    name: "Ocean Blue",
    description: "Deep blue workspace with calm aqua accents.",
    light: {
      primary: "#0f4c81",
      secondary: "#1d7ca8",
      backgroundDefault: "#eef6fb",
      backgroundPaper: "#ffffff",
      textPrimary: "#0f1f2e",
      textSecondary: "#355064",
      divider: "rgba(15, 76, 129, 0.16)",
      bodyGradient:
        "radial-gradient(circle at 10% 5%, rgba(15,76,129,0.18), transparent 34%), radial-gradient(circle at 90% 10%, rgba(29,124,168,0.16), transparent 33%)",
    },
    dark: {
      primary: "#6ec1ff",
      secondary: "#3fa7d6",
      backgroundDefault: "#071723",
      backgroundPaper: "#0e2536",
      textPrimary: "#e8f4ff",
      textSecondary: "#9bc2dd",
      divider: "rgba(110, 193, 255, 0.18)",
      bodyGradient:
        "radial-gradient(circle at 15% 20%, rgba(110,193,255,0.16), transparent 35%), radial-gradient(circle at 85% 12%, rgba(63,167,214,0.16), transparent 35%)",
    },
  },
  {
    id: "forest",
    name: "Forest Green",
    description: "Nature-inspired palette with balanced contrast.",
    light: {
      primary: "#146c43",
      secondary: "#4f8a52",
      backgroundDefault: "#eef6ef",
      backgroundPaper: "#ffffff",
      textPrimary: "#11251a",
      textSecondary: "#3f5f49",
      divider: "rgba(20, 108, 67, 0.16)",
      bodyGradient:
        "radial-gradient(circle at 12% 8%, rgba(20,108,67,0.16), transparent 35%), radial-gradient(circle at 86% 10%, rgba(79,138,82,0.16), transparent 35%)",
    },
    dark: {
      primary: "#7ddf9d",
      secondary: "#4fb879",
      backgroundDefault: "#091b13",
      backgroundPaper: "#11281d",
      textPrimary: "#e9faef",
      textSecondary: "#9ed6b1",
      divider: "rgba(125, 223, 157, 0.18)",
      bodyGradient:
        "radial-gradient(circle at 12% 15%, rgba(125,223,157,0.14), transparent 35%), radial-gradient(circle at 88% 10%, rgba(79,184,121,0.16), transparent 35%)",
    },
  },
  {
    id: "sunset",
    name: "Sunset Orange",
    description: "Warm orange-red tones for energetic planning.",
    light: {
      primary: "#c2410c",
      secondary: "#ef4444",
      backgroundDefault: "#fff4ec",
      backgroundPaper: "#ffffff",
      textPrimary: "#2b1408",
      textSecondary: "#6b3b24",
      divider: "rgba(194, 65, 12, 0.15)",
      bodyGradient:
        "radial-gradient(circle at 12% 8%, rgba(194,65,12,0.17), transparent 34%), radial-gradient(circle at 88% 12%, rgba(239,68,68,0.16), transparent 33%)",
    },
    dark: {
      primary: "#fdba74",
      secondary: "#f87171",
      backgroundDefault: "#1c0f08",
      backgroundPaper: "#2a1810",
      textPrimary: "#fff3e8",
      textSecondary: "#f1bea2",
      divider: "rgba(253, 186, 116, 0.2)",
      bodyGradient:
        "radial-gradient(circle at 12% 16%, rgba(253,186,116,0.15), transparent 35%), radial-gradient(circle at 86% 8%, rgba(248,113,113,0.14), transparent 35%)",
    },
  },
  {
    id: "midnight",
    name: "Midnight Violet",
    description: "Cool night palette with electric violet accents.",
    light: {
      primary: "#5b21b6",
      secondary: "#7c3aed",
      backgroundDefault: "#f4f1ff",
      backgroundPaper: "#ffffff",
      textPrimary: "#1f1538",
      textSecondary: "#5a4a85",
      divider: "rgba(91, 33, 182, 0.16)",
      bodyGradient:
        "radial-gradient(circle at 10% 8%, rgba(91,33,182,0.18), transparent 34%), radial-gradient(circle at 88% 10%, rgba(124,58,237,0.16), transparent 34%)",
    },
    dark: {
      primary: "#c4b5fd",
      secondary: "#a78bfa",
      backgroundDefault: "#150f26",
      backgroundPaper: "#201735",
      textPrimary: "#f5f3ff",
      textSecondary: "#c4b5fd",
      divider: "rgba(196, 181, 253, 0.18)",
      bodyGradient:
        "radial-gradient(circle at 12% 15%, rgba(196,181,253,0.14), transparent 35%), radial-gradient(circle at 88% 12%, rgba(167,139,250,0.16), transparent 35%)",
    },
  },
  {
    id: "cherry",
    name: "Cherry Blossom",
    description: "Soft rose palette with high readability.",
    light: {
      primary: "#be185d",
      secondary: "#e11d48",
      backgroundDefault: "#fff1f5",
      backgroundPaper: "#ffffff",
      textPrimary: "#3a0f24",
      textSecondary: "#7f3b5b",
      divider: "rgba(190, 24, 93, 0.16)",
      bodyGradient:
        "radial-gradient(circle at 10% 8%, rgba(190,24,93,0.16), transparent 34%), radial-gradient(circle at 89% 12%, rgba(225,29,72,0.14), transparent 34%)",
    },
    dark: {
      primary: "#f9a8d4",
      secondary: "#fb7185",
      backgroundDefault: "#240c18",
      backgroundPaper: "#311424",
      textPrimary: "#ffe7f2",
      textSecondary: "#f3b4ce",
      divider: "rgba(249, 168, 212, 0.2)",
      bodyGradient:
        "radial-gradient(circle at 12% 18%, rgba(249,168,212,0.14), transparent 35%), radial-gradient(circle at 86% 10%, rgba(251,113,133,0.14), transparent 35%)",
    },
  },
];

export const isThemePresetId = (value: string | null): value is ThemePresetId => {
  return THEME_PRESETS.some((preset) => preset.id === value);
};

export const getThemePreset = (id: ThemePresetId): ThemePreset => {
  return THEME_PRESETS.find((preset) => preset.id === id) ?? THEME_PRESETS[0];
};
