import { Box, AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemText, ListItemButton, Divider, TextField } from "@mui/material";
import { ReactNode, useState } from "react";
import { useEntries, useSearchEntries } from "../hooks/useEntries";
import { format, parseISO } from "date-fns";

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

    return (
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar>
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                        Dev Journal
                    </Typography>
                    <TextField
                        size="small"
                        placeholder="Search entries..."
                        variant="outlined"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        sx={{
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: 1,
                            '& fieldset': { border: 'none' },
                            input: { color: 'white' }
                        }}
                    />
                </Toolbar>
            </AppBar>
            <Drawer
                variant="permanent"
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
                }}
            >
                <Toolbar />
                <Box sx={{ overflow: 'auto' }}>
                    <List>
                        <ListItem disablePadding>
                            <ListItemButton
                                selected={selectedDate === format(new Date(), "yyyy-MM-dd")}
                                onClick={() => {
                                    setSearchQuery("");
                                    onSelectDate(format(new Date(), "yyyy-MM-dd"));
                                }}
                            >
                                <ListItemText primary="Today" />
                            </ListItemButton>
                        </ListItem>
                        <Divider />
                        {displayEntries?.map((entry) => (
                            <ListItem key={entry.id} disablePadding>
                                <ListItemButton
                                    selected={selectedDate === entry.date}
                                    onClick={() => onSelectDate(entry.date)}
                                >
                                    <ListItemText
                                        primary={format(parseISO(entry.date), "MMM d, yyyy")}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                        {displayEntries?.length === 0 && (
                            <ListItem>
                                <ListItemText secondary="No entries found" />
                            </ListItem>
                        )}
                    </List>
                </Box>
            </Drawer>
            <Box component="main" sx={{ flexGrow: 1, p: 3, pt: 10, overflow: 'auto', bgcolor: 'background.default' }}>
                {children}
            </Box>
        </Box>
    );
};
