import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider, Theme } from '@mui/material/styles';

interface ThemeContextType {
    primaryColor: string;
    setPrimaryColor: (color: string) => void;
    resetTheme: () => void;
}

const defaultPrimaryColor = '#60a5fa';

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

export const CustomThemeProvider: React.FC<CustomThemeProviderProps> = ({ children }) => {
    const [primaryColor, setPrimaryColor] = useState<string>(() => {
        return localStorage.getItem('devJournal_primaryColor') || defaultPrimaryColor;
    });

    useEffect(() => {
        localStorage.setItem('devJournal_primaryColor', primaryColor);
    }, [primaryColor]);

    const resetTheme = () => setPrimaryColor(defaultPrimaryColor);

    const theme: Theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode: 'dark',
                    primary: {
                        main: primaryColor,
                    },
                    secondary: {
                        main: '#a78bfa',
                    },
                    background: {
                        default: '#0f172a',
                        paper: '#1e293b',
                    },
                    text: {
                        primary: '#f8fafc',
                        secondary: '#94a3b8',
                    },
                    divider: 'rgba(255, 255, 255, 0.08)',
                },
                shape: { borderRadius: 16 },
                typography: {
                    fontFamily: ['Inter', '"Helvetica Neue"', 'Arial', 'sans-serif'].join(','),
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
                                backgroundColor: '#0f172a',
                                backgroundImage: `radial-gradient(circle at 15% 50%, ${primaryColor}20, transparent 25%), radial-gradient(circle at 85% 30%, rgba(167, 139, 250, 0.08), transparent 25%)`,
                                backgroundAttachment: 'fixed',
                                minHeight: '100vh',
                            },
                            '::-webkit-scrollbar': { width: '8px', height: '8px' },
                            '::-webkit-scrollbar-track': { background: 'transparent' },
                            '::-webkit-scrollbar-thumb': { background: '#334155', borderRadius: '4px' },
                            '::-webkit-scrollbar-thumb:hover': { background: '#475569' },
                        },
                    },
                    MuiPaper: {
                        styleOverrides: {
                            root: {
                                backgroundImage: 'none',
                                backgroundColor: 'rgba(30, 41, 59, 0.7)',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                boxShadow: '0 4px 24px -4px rgba(0, 0, 0, 0.25)',
                            },
                        },
                    },
                    MuiButton: {
                        styleOverrides: {
                            root: {
                                textTransform: 'none',
                                fontWeight: 600,
                                borderRadius: 12,
                                padding: '8px 24px',
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
                        defaultProps: { variant: 'outlined' },
                        styleOverrides: {
                            root: {
                                '& .MuiOutlinedInput-root': {
                                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                                    transition: 'all 0.2s',
                                    borderRadius: 12,
                                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                                    '&.Mui-focused fieldset': { borderColor: primaryColor, borderWidth: '1px' },
                                    '&.Mui-focused': {
                                        backgroundColor: 'rgba(15, 23, 42, 0.8)',
                                        boxShadow: `0 0 0 4px ${primaryColor}20`,
                                    },
                                },
                            },
                        },
                    },
                    MuiDrawer: {
                        styleOverrides: {
                            paper: {
                                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                                backdropFilter: 'blur(20px)',
                                borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                            },
                        },
                    },
                    MuiAppBar: {
                        styleOverrides: {
                            root: {
                                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                                backdropFilter: 'blur(16px)',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                                boxShadow: 'none',
                            },
                        },
                    },
                    MuiListItemButton: {
                        styleOverrides: {
                            root: {
                                borderRadius: 8,
                                margin: '4px 8px',
                                padding: '8px 16px',
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
        [primaryColor]
    );

    return (
        <ThemeContext.Provider value={{ primaryColor, setPrimaryColor, resetTheme }}>
            <MuiThemeProvider theme={theme}>
                {children}
            </MuiThemeProvider>
        </ThemeContext.Provider>
    );
};
