import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { createTheme, Theme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';

export type AppearanceMode = 'dark' | 'light';
export type FontPreset = 'inter' | 'roboto' | 'mono';
export type UiDensity = 'comfortable' | 'compact';
export type ThemePresetId =
    | 'monochrome'
    | 'ocean'
    | 'forest'
    | 'sunset'
    | 'midnight'
    | 'cherry';

interface ThemePresetPalette {
    primary: string;
    secondary: string;
    backgroundDefault: string;
    backgroundPaper: string;
    textPrimary: string;
    textSecondary: string;
    divider: string;
    bodyGradient: string;
}

interface ThemePreset {
    id: ThemePresetId;
    name: string;
    description: string;
    light: ThemePresetPalette;
    dark: ThemePresetPalette;
}

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

export const THEME_PRESETS: ThemePreset[] = [
    {
        id: 'monochrome',
        name: 'Monochrome',
        description: 'Black and white, minimal contrast-first UI.',
        light: {
            primary: '#111111',
            secondary: '#4b5563',
            backgroundDefault: '#f7f7f7',
            backgroundPaper: '#ffffff',
            textPrimary: '#111111',
            textSecondary: '#4b5563',
            divider: 'rgba(17, 17, 17, 0.12)',
            bodyGradient: 'radial-gradient(circle at 10% 10%, rgba(17,17,17,0.06), transparent 35%), radial-gradient(circle at 90% 20%, rgba(17,17,17,0.05), transparent 35%)',
        },
        dark: {
            primary: '#f5f5f5',
            secondary: '#a3a3a3',
            backgroundDefault: '#0b0b0b',
            backgroundPaper: '#141414',
            textPrimary: '#f5f5f5',
            textSecondary: '#a3a3a3',
            divider: 'rgba(245, 245, 245, 0.14)',
            bodyGradient: 'radial-gradient(circle at 15% 20%, rgba(255,255,255,0.09), transparent 35%), radial-gradient(circle at 85% 10%, rgba(255,255,255,0.06), transparent 35%)',
        },
    },
    {
        id: 'ocean',
        name: 'Ocean Blue',
        description: 'Deep blue workspace with calm aqua accents.',
        light: {
            primary: '#0f4c81',
            secondary: '#1d7ca8',
            backgroundDefault: '#eef6fb',
            backgroundPaper: '#ffffff',
            textPrimary: '#0f1f2e',
            textSecondary: '#355064',
            divider: 'rgba(15, 76, 129, 0.16)',
            bodyGradient: 'radial-gradient(circle at 10% 5%, rgba(15,76,129,0.18), transparent 34%), radial-gradient(circle at 90% 10%, rgba(29,124,168,0.16), transparent 33%)',
        },
        dark: {
            primary: '#6ec1ff',
            secondary: '#3fa7d6',
            backgroundDefault: '#071723',
            backgroundPaper: '#0e2536',
            textPrimary: '#e8f4ff',
            textSecondary: '#9bc2dd',
            divider: 'rgba(110, 193, 255, 0.18)',
            bodyGradient: 'radial-gradient(circle at 15% 20%, rgba(110,193,255,0.16), transparent 35%), radial-gradient(circle at 85% 12%, rgba(63,167,214,0.16), transparent 35%)',
        },
    },
    {
        id: 'forest',
        name: 'Forest Green',
        description: 'Nature-inspired palette with balanced contrast.',
        light: {
            primary: '#146c43',
            secondary: '#4f8a52',
            backgroundDefault: '#eef6ef',
            backgroundPaper: '#ffffff',
            textPrimary: '#11251a',
            textSecondary: '#3f5f49',
            divider: 'rgba(20, 108, 67, 0.16)',
            bodyGradient: 'radial-gradient(circle at 12% 8%, rgba(20,108,67,0.16), transparent 35%), radial-gradient(circle at 86% 10%, rgba(79,138,82,0.16), transparent 35%)',
        },
        dark: {
            primary: '#7ddf9d',
            secondary: '#4fb879',
            backgroundDefault: '#091b13',
            backgroundPaper: '#11281d',
            textPrimary: '#e9faef',
            textSecondary: '#9ed6b1',
            divider: 'rgba(125, 223, 157, 0.18)',
            bodyGradient: 'radial-gradient(circle at 12% 15%, rgba(125,223,157,0.14), transparent 35%), radial-gradient(circle at 88% 10%, rgba(79,184,121,0.16), transparent 35%)',
        },
    },
    {
        id: 'sunset',
        name: 'Sunset Orange',
        description: 'Warm orange-red tones for energetic planning.',
        light: {
            primary: '#c2410c',
            secondary: '#ef4444',
            backgroundDefault: '#fff4ec',
            backgroundPaper: '#ffffff',
            textPrimary: '#2b1408',
            textSecondary: '#6b3b24',
            divider: 'rgba(194, 65, 12, 0.15)',
            bodyGradient: 'radial-gradient(circle at 12% 8%, rgba(194,65,12,0.17), transparent 34%), radial-gradient(circle at 88% 12%, rgba(239,68,68,0.16), transparent 33%)',
        },
        dark: {
            primary: '#fdba74',
            secondary: '#f87171',
            backgroundDefault: '#1c0f08',
            backgroundPaper: '#2a1810',
            textPrimary: '#fff3e8',
            textSecondary: '#f1bea2',
            divider: 'rgba(253, 186, 116, 0.2)',
            bodyGradient: 'radial-gradient(circle at 12% 16%, rgba(253,186,116,0.15), transparent 35%), radial-gradient(circle at 86% 8%, rgba(248,113,113,0.14), transparent 35%)',
        },
    },
    {
        id: 'midnight',
        name: 'Midnight Violet',
        description: 'Cool night palette with electric violet accents.',
        light: {
            primary: '#5b21b6',
            secondary: '#7c3aed',
            backgroundDefault: '#f4f1ff',
            backgroundPaper: '#ffffff',
            textPrimary: '#1f1538',
            textSecondary: '#5a4a85',
            divider: 'rgba(91, 33, 182, 0.16)',
            bodyGradient: 'radial-gradient(circle at 10% 8%, rgba(91,33,182,0.18), transparent 34%), radial-gradient(circle at 88% 10%, rgba(124,58,237,0.16), transparent 34%)',
        },
        dark: {
            primary: '#c4b5fd',
            secondary: '#a78bfa',
            backgroundDefault: '#150f26',
            backgroundPaper: '#201735',
            textPrimary: '#f5f3ff',
            textSecondary: '#c4b5fd',
            divider: 'rgba(196, 181, 253, 0.18)',
            bodyGradient: 'radial-gradient(circle at 12% 15%, rgba(196,181,253,0.14), transparent 35%), radial-gradient(circle at 88% 12%, rgba(167,139,250,0.16), transparent 35%)',
        },
    },
    {
        id: 'cherry',
        name: 'Cherry Blossom',
        description: 'Soft rose palette with high readability.',
        light: {
            primary: '#be185d',
            secondary: '#e11d48',
            backgroundDefault: '#fff1f5',
            backgroundPaper: '#ffffff',
            textPrimary: '#3a0f24',
            textSecondary: '#7f3b5b',
            divider: 'rgba(190, 24, 93, 0.16)',
            bodyGradient: 'radial-gradient(circle at 10% 8%, rgba(190,24,93,0.16), transparent 34%), radial-gradient(circle at 89% 12%, rgba(225,29,72,0.14), transparent 34%)',
        },
        dark: {
            primary: '#f9a8d4',
            secondary: '#fb7185',
            backgroundDefault: '#240c18',
            backgroundPaper: '#311424',
            textPrimary: '#ffe7f2',
            textSecondary: '#f3b4ce',
            divider: 'rgba(249, 168, 212, 0.2)',
            bodyGradient: 'radial-gradient(circle at 12% 18%, rgba(249,168,212,0.14), transparent 35%), radial-gradient(circle at 86% 10%, rgba(251,113,133,0.14), transparent 35%)',
        },
    },
];

const defaultThemePreset: ThemePresetId = 'monochrome';
const defaultAppearanceMode: AppearanceMode = 'light';
const defaultFontPreset: FontPreset = 'inter';
const defaultUiDensity: UiDensity = 'comfortable';
const defaultBorderRadius = 16;

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useThemeContext = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useThemeContext must be used within a CustomThemeProvider');
    }
    return context;
};

interface CustomThemeProviderProps {
    children: ReactNode;
}

const resolveFontFamily = (preset: FontPreset) => {
    if (preset === 'roboto') {
        return ['Roboto', 'Inter', 'Arial', 'sans-serif'].join(',');
    }
    if (preset === 'mono') {
        return ['"JetBrains Mono"', '"SFMono-Regular"', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'].join(',');
    }
    return ['Inter', '"Helvetica Neue"', 'Arial', 'sans-serif'].join(',');
};

const isThemePresetId = (value: string | null): value is ThemePresetId => {
    return THEME_PRESETS.some((preset) => preset.id === value);
};

const getThemePreset = (id: ThemePresetId) => {
    return THEME_PRESETS.find((preset) => preset.id === id) ?? THEME_PRESETS[0];
};

export const CustomThemeProvider: React.FC<CustomThemeProviderProps> = ({ children }) => {
    const [themePreset, setThemePreset] = useState<ThemePresetId>(() => {
        const value = localStorage.getItem('devJournal_themePreset');
        return isThemePresetId(value) ? value : defaultThemePreset;
    });
    const [appearanceMode, setAppearanceMode] = useState<AppearanceMode>(() => {
        const mode = localStorage.getItem('devJournal_appearanceMode');
        return mode === 'dark' || mode === 'light' ? mode : defaultAppearanceMode;
    });
    const [fontPreset, setFontPreset] = useState<FontPreset>(() => {
        const preset = localStorage.getItem('devJournal_fontPreset');
        if (preset === 'roboto' || preset === 'mono' || preset === 'inter') {
            return preset;
        }
        return defaultFontPreset;
    });
    const [uiDensity, setUiDensity] = useState<UiDensity>(() => {
        const density = localStorage.getItem('devJournal_uiDensity');
        return density === 'compact' ? 'compact' : defaultUiDensity;
    });
    const [borderRadius, setBorderRadius] = useState<number>(() => {
        const value = Number(localStorage.getItem('devJournal_borderRadius'));
        return Number.isFinite(value) ? Math.min(24, Math.max(6, value)) : defaultBorderRadius;
    });

    useEffect(() => {
        localStorage.setItem('devJournal_themePreset', themePreset);
    }, [themePreset]);

    useEffect(() => {
        localStorage.setItem('devJournal_appearanceMode', appearanceMode);
    }, [appearanceMode]);

    useEffect(() => {
        localStorage.setItem('devJournal_fontPreset', fontPreset);
    }, [fontPreset]);

    useEffect(() => {
        localStorage.setItem('devJournal_uiDensity', uiDensity);
    }, [uiDensity]);

    useEffect(() => {
        localStorage.setItem('devJournal_borderRadius', String(borderRadius));
    }, [borderRadius]);

    const resetTheme = () => {
        setThemePreset(defaultThemePreset);
        setAppearanceMode(defaultAppearanceMode);
        setFontPreset(defaultFontPreset);
        setUiDensity(defaultUiDensity);
        setBorderRadius(defaultBorderRadius);
    };

    const fontFamily = resolveFontFamily(fontPreset);
    const palette = appearanceMode === 'dark'
        ? getThemePreset(themePreset).dark
        : getThemePreset(themePreset).light;

    const theme: Theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode: appearanceMode,
                    primary: {
                        main: palette.primary,
                    },
                    secondary: {
                        main: palette.secondary,
                    },
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
                    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
                    h5: { fontWeight: 600, letterSpacing: '-0.01em' },
                    h6: { fontWeight: 600 },
                    subtitle1: { fontWeight: 500 },
                    subtitle2: { fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' },
                },
                components: {
                    MuiCssBaseline: {
                        styleOverrides: {
                            body: {
                                backgroundColor: palette.backgroundDefault,
                                backgroundImage: palette.bodyGradient,
                                backgroundAttachment: 'fixed',
                                minHeight: '100vh',
                            },
                            '::-webkit-scrollbar': { width: '8px', height: '8px' },
                            '::-webkit-scrollbar-track': { background: 'transparent' },
                            '::-webkit-scrollbar-thumb': {
                                background: appearanceMode === 'dark' ? '#4a4a4a' : '#b0b0b0',
                                borderRadius: '4px',
                            },
                            '::-webkit-scrollbar-thumb:hover': {
                                background: appearanceMode === 'dark' ? '#6b6b6b' : '#8e8e8e',
                            },
                        },
                    },
                    MuiPaper: {
                        styleOverrides: {
                            root: {
                                backgroundImage: 'none',
                                backgroundColor: appearanceMode === 'dark'
                                    ? 'rgba(18, 18, 18, 0.76)'
                                    : 'rgba(255, 255, 255, 0.86)',
                                backdropFilter: 'blur(12px)',
                                border: `1px solid ${palette.divider}`,
                                boxShadow: appearanceMode === 'dark'
                                    ? '0 4px 24px -4px rgba(0, 0, 0, 0.36)'
                                    : '0 4px 20px -8px rgba(15, 23, 42, 0.18)',
                            },
                        },
                    },
                    MuiButton: {
                        defaultProps: {
                            size: uiDensity === 'compact' ? 'small' : 'medium',
                        },
                        styleOverrides: {
                            root: {
                                textTransform: 'none',
                                fontWeight: 600,
                                borderRadius: Math.max(8, borderRadius - 4),
                                padding: uiDensity === 'compact' ? '6px 16px' : '8px 24px',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            },
                            containedPrimary: {
                                boxShadow: `0 4px 14px 0 ${palette.primary}50`,
                                '&:hover': {
                                    boxShadow: `0 6px 20px ${palette.primary}70`,
                                    transform: 'translateY(-1px)',
                                },
                            },
                        },
                    },
                    MuiTextField: {
                        defaultProps: {
                            variant: 'outlined',
                            size: uiDensity === 'compact' ? 'small' : 'medium',
                        },
                        styleOverrides: {
                            root: {
                                '& .MuiOutlinedInput-root': {
                                    backgroundColor: appearanceMode === 'dark' ? 'rgba(0, 0, 0, 0.24)' : 'rgba(255, 255, 255, 0.72)',
                                    transition: 'all 0.2s',
                                    borderRadius: Math.max(8, borderRadius - 4),
                                    '& fieldset': { borderColor: palette.divider },
                                    '&:hover fieldset': { borderColor: palette.secondary },
                                    '&.Mui-focused fieldset': { borderColor: palette.primary, borderWidth: '1px' },
                                    '&.Mui-focused': {
                                        boxShadow: `0 0 0 4px ${palette.primary}26`,
                                    },
                                },
                            },
                        },
                    },
                    MuiDrawer: {
                        styleOverrides: {
                            paper: {
                                backgroundColor: appearanceMode === 'dark'
                                    ? 'rgba(10, 10, 10, 0.72)'
                                    : 'rgba(255, 255, 255, 0.82)',
                                backdropFilter: 'blur(20px)',
                                borderRight: `1px solid ${palette.divider}`,
                            },
                        },
                    },
                    MuiAppBar: {
                        styleOverrides: {
                            root: {
                                backgroundColor: appearanceMode === 'dark'
                                    ? 'rgba(10, 10, 10, 0.62)'
                                    : 'rgba(255, 255, 255, 0.82)',
                                backdropFilter: 'blur(16px)',
                                borderBottom: `1px solid ${palette.divider}`,
                                boxShadow: 'none',
                            },
                        },
                    },
                    MuiListItemButton: {
                        styleOverrides: {
                            root: {
                                borderRadius: Math.max(8, borderRadius - 8),
                                margin: '4px 8px',
                                padding: uiDensity === 'compact' ? '6px 12px' : '8px 16px',
                                '&.Mui-selected': {
                                    backgroundColor: `${palette.primary}25`,
                                    '&:hover': { backgroundColor: `${palette.primary}35` },
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        left: -8,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        height: '60%',
                                        width: 4,
                                        backgroundColor: palette.primary,
                                        borderRadius: '0 4px 4px 0',
                                    },
                                },
                            },
                        },
                    },
                },
            }),
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
            <MuiThemeProvider theme={theme}>
                {children}
            </MuiThemeProvider>
        </ThemeContext.Provider>
    );
};
