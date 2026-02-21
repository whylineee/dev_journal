import { Box, Typography, List, ListItem, ListItemText, Paper } from "@mui/material";
import { useGitCommits } from "../hooks/useEntries";

export const GitCommits = () => {
    const { data: commits, isLoading } = useGitCommits();

    if (isLoading) return <Box p={2}><Typography>Loading commits...</Typography></Box>;

    return (
        <Paper sx={{ mt: 4, p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" gutterBottom>
                Today's Commits
            </Typography>
            {commits && commits.length > 0 ? (
                <List dense>
                    {commits.map((commit, idx) => {
                        const hash = commit.substring(0, 7);
                        const msg = commit.substring(8);
                        return (
                            <ListItem key={idx}>
                                <ListItemText
                                    primary={msg}
                                    secondary={hash}
                                    primaryTypographyProps={{ variant: 'body2' }}
                                    secondaryTypographyProps={{ variant: 'caption', color: 'primary.main' }}
                                />
                            </ListItem>
                        );
                    })}
                </List>
            ) : (
                <Typography variant="body2" color="text.secondary">
                    No commits found for today in this project directory.
                </Typography>
            )}
        </Paper>
    );
};
