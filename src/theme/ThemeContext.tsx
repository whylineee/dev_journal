import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider, Theme } from '@mui/material/styles';

export type AppearanceMode = 'dark' | 'light';
export type FontPreset = 'inter' | 'roboto' | 'mono';
export type UiDensity = 'comfortable' | 'compact';

interface ThemeContextType {
    primaryColor: string;
    setPrimaryColor: (color: string) => void;
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

const defaultPrimaryColor = '#60a5fa';
const defaultAppearanceMode: AppearanceMode = 'dark';
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

export const CustomThemeProvider: React.FC<CustomThemeProviderProps> = ({ children }) => {
    const [primaryColor, setPrimaryColor] = useState<string>(() => {
        return localStorage.getItem('devJournal_primaryColor') || defaultPrimaryColor;
    });
    const [appearanceMode, setAppearanceMode] = useState<AppearanceMode>(() => {
        const mode = localStorage.getItem('devJournal_appearanceMode');
        return mode === 'light' ? 'light' : defaultAppearanceMode;
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
        localStorage.setItem('devJournal_primaryColor', primaryColor);
    }, [primaryColor]);

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
        setPrimaryColor(defaultPrimaryColor);
        setAppearanceMode(defaultAppearanceMode);
        setFontPreset(defaultFontPreset);
        setUiDensity(defaultUiDensity);
        setBorderRadius(defaultBorderRadius);
    };

    const isDark = appearanceMode === 'dark';
    const fontFamily = resolveFontFamily(fontPreset);

    const theme: Theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode: appearanceMode,
                    primary: {
                        main: primaryColor,
                    },
                    secondary: {
                        main: isDark ? '#a78bfa' : '#7c3aed',
                    },
                    background: {
                        default: isDark ? '#0f172a' : '#f3f6fb',
                        paper: isDark ? '#1e293b' : '#ffffff',
                    },
                    text: {
                        primary: isDark ? '#f8fafc' : '#0f172a',
                        secondary: isDark ? '#94a3b8' : '#475569',
                    },
                    divider: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.12)',
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
                                backgroundColor: isDark ? '#0f172a' : '#f3f6fb',
                                backgroundImage: isDark
                                    ? `radial-gradient(circle at 15% 50%, ${primaryColor}20, transparent 25%), radial-gradient(circle at 85% 30%, rgba(167, 139, 250, 0.08), transparent 25%)`
                                    : `radial-gradient(circle at 15% 50%, ${primaryColor}18, transparent 30%), radial-gradient(circle at 85% 30%, rgba(37, 99, 235, 0.08), transparent 30%)`,
                                backgroundAttachment: 'fixed',
                                minHeight: '100vh',
                            },
                            '::-webkit-scrollbar': { width: '8px', height: '8px' },
                            '::-webkit-scrollbar-track': { background: 'transparent' },
                            '::-webkit-scrollbar-thumb': {
                                background: isDark ? '#334155' : '#cbd5e1',
                                borderRadius: '4px',
                            },
                            '::-webkit-scrollbar-thumb:hover': { background: isDark ? '#475569' : '#94a3b8' },
                        },
                    },
                    MuiPaper: {
                        styleOverrides: {
                            root: {
                                backgroundImage: 'none',
                                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.72)' : 'rgba(255, 255, 255, 0.85)',
                                backdropFilter: 'blur(12px)',
                                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)',
                                boxShadow: isDark ? '0 4px 24px -4px rgba(0, 0, 0, 0.25)' : '0 4px 20px -8px rgba(15, 23, 42, 0.2)',
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
                                boxShadow: `0 4px 14px 0 ${primaryColor}40`,
                                '&:hover': {
                                    boxShadow: `0 6px 20px ${primaryColor}60`,
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
                                    backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(248, 250, 252, 0.75)',
                                    transition: 'all 0.2s',
                                    borderRadius: Math.max(8, borderRadius - 4),
                                    '& fieldset': { borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.12)' },
                                    '&:hover fieldset': { borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(15, 23, 42, 0.25)' },
                                    '&.Mui-focused fieldset': { borderColor: primaryColor, borderWidth: '1px' },
                                    '&.Mui-focused': {
                                        boxShadow: `0 0 0 4px ${primaryColor}20`,
                                    },
                                },
                            },
                        },
                    },
                    MuiDrawer: {
                        styleOverrides: {
                            paper: {
                                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.82)',
                                backdropFilter: 'blur(20px)',
                                borderRight: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)',
                            },
                        },
                    },
                    MuiAppBar: {
                        styleOverrides: {
                            root: {
                                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.75)',
                                backdropFilter: 'blur(16px)',
                                borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)',
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
                                    backgroundColor: `${primaryColor}25`,
                                    '&:hover': { backgroundColor: `${primaryColor}35` },
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        left: -8,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        height: '60%',
                                        width: 4,
                                        backgroundColor: primaryColor,
                                        borderRadius: '0 4px 4px 0',
                                    }
                                },
                            },
                        },
                    },
                },
            }),
        [appearanceMode, borderRadius, fontFamily, isDark, primaryColor, uiDensity]
    );

    return (
        <ThemeContext.Provider
            value={{
                primaryColor,
                setPrimaryColor,
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
