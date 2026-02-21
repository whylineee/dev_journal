import { Box, AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemText, ListItemButton, Divider, InputBase, alpha, Chip } from "@mui/material";
import { ReactNode, useState } from "react";
import { useEntries, useSearchEntries } from "../hooks/useEntries";
import { format, parseISO } from "date-fns";
import SearchIcon from '@mui/icons-material/Search';
import EditNoteIcon from '@mui/icons-material/EditNote';
import TodayIcon from '@mui/icons-material/Today';
import EventNoteIcon from '@mui/icons-material/EventNote';

const drawerWidth = 280;

interface LayoutProps {
    children: ReactNode;
    selectedDate: string;
    onSelectDate: (date: string) => void;
}

export const Layout = ({ children, selectedDate, onSelectDate }: LayoutProps) => {
    const [searchQuery, setSearchQuery] = useState("");
    const { data: allEntries } = useEntries();
    const { data: searchResults } = useSearchEntries(searchQuery);

    const displayEntries = searchQuery ? searchResults : allEntries;

    const navItemStyle = (isSelected: boolean) => ({
        borderRadius: 2,
        mb: 0.5,
        mx: 1,
        transition: 'all 0.2s',
        color: isSelected ? 'primary.main' : 'text.primary',
    });

    return (
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <Toolbar>
                    <EditNoteIcon sx={{ mr: 2, color: 'primary.main', fontSize: 28 }} />
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: '-0.02em', color: 'text.primary' }}>
                        Dev Journal
                    </Typography>

                    <Box sx={{
                        position: 'relative',
                        borderRadius: 2,
                        backgroundColor: alpha('#f8fafc', 0.1),
                        '&:hover': {
                            backgroundColor: alpha('#f8fafc', 0.15),
                        },
                        ml: 2,
                        width: '100%',
                        maxWidth: 300,
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <Box sx={{ padding: '0 12px', height: '100%', position: 'absolute', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                        </Box>
                        <InputBase
                            placeholder="Search entries..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            sx={{
                                color: 'inherit',
                                width: '100%',
                                '& .MuiInputBase-input': {
                                    padding: '8px 8px 8px 0',
                                    paddingLeft: '36px',
                                    transition: 'width 0.2s',
                                    width: '100%',
                                },
                            }}
                        />
                    </Box>
                </Toolbar>
            </AppBar>

            <Drawer
                variant="permanent"
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    [`& .MuiDrawer-paper`]: {
                        width: drawerWidth,
                        boxSizing: 'border-box',
                        borderRight: '1px solid rgba(255,255,255,0.05)',
                        backgroundColor: 'rgba(15, 23, 42, 0.5)',
                        backdropFilter: 'blur(20px)'
                    },
                }}
            >
                <Toolbar />
                <Box sx={{ overflow: 'auto', py: 2 }}>
                    <List>
                        <ListItem disablePadding>
                            <ListItemButton
                                selected={selectedDate === format(new Date(), "yyyy-MM-dd")}
                                onClick={() => {
                                    setSearchQuery("");
                                    onSelectDate(format(new Date(), "yyyy-MM-dd"));
                                }}
                                sx={navItemStyle(selectedDate === format(new Date(), "yyyy-MM-dd"))}
                            >
                                <TodayIcon sx={{ mr: 2, fontSize: 20, opacity: 0.8 }} />
                                <ListItemText primary="Today" primaryTypographyProps={{ fontWeight: 600 }} />
                                {allEntries && allEntries.find(e => e.date === format(new Date(), "yyyy-MM-dd")) && (
                                    <Chip label="Done" size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                                )}
                            </ListItemButton>
                        </ListItem>

                        <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.05)', mx: 2 }} />

                        <Typography variant="overline" sx={{ px: 3, mb: 1, display: 'block', color: 'text.secondary', letterSpacing: '0.1em' }}>
                            History
                        </Typography>

                        {displayEntries?.map((entry) => (
                            <ListItem key={entry.id} disablePadding>
                                <ListItemButton
                                    selected={selectedDate === entry.date}
                                    onClick={() => onSelectDate(entry.date)}
                                    sx={navItemStyle(selectedDate === entry.date)}
                                >
                                    <EventNoteIcon sx={{ mr: 2, fontSize: 20, opacity: 0.6 }} />
                                    <ListItemText
                                        primary={format(parseISO(entry.date), "MMM d, yyyy")}
                                        primaryTypographyProps={{ fontSize: '0.9rem' }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}

                        {displayEntries?.length === 0 && (
                            <ListItem sx={{ px: 3, py: 2 }}>
                                <ListItemText
                                    secondary={searchQuery ? "No matching entries" : "No past entries"}
                                    secondaryTypographyProps={{ textAlign: 'center' }}
                                />
                            </ListItem>
                        )}
                    </List>
                </Box>
            </Drawer>

            <Box component="main" sx={{
                flexGrow: 1,
                p: { xs: 2, md: 4 },
                pt: { xs: 10, md: 10 },
                overflow: 'auto',
                position: 'relative'
            }}>
                {children}
            </Box>
        </Box>
    );
};
