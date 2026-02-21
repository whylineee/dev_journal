import { Box, Typography, List, ListItem, ListItemText, Paper, Avatar } from "@mui/material";
import { useGitCommits } from "../hooks/useEntries";
import { motion } from "framer-motion";
import CommitIcon from '@mui/icons-material/Commit';

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0, transition: { duration: 0.3 } }
};

export const GitCommits = () => {
    const { data: commits, isLoading } = useGitCommits();

    if (isLoading) return <Box p={2}><Typography>Loading commits...</Typography></Box>;

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
            <Paper sx={{ mt: 4, p: 3, border: 'none', background: 'rgba(30, 41, 59, 0.5)' }}>
                <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary', fontWeight: 600 }}>
                    <CommitIcon color="primary" /> Today's Commits
                </Typography>

                {commits && commits.length > 0 ? (
                    <List dense component={motion.ul} variants={containerVariants} initial="hidden" animate="show" sx={{ pt: 1 }}>
                        {commits.map((commit, idx) => {
                            const hash = commit.substring(0, 7);
                            const msg = commit.substring(8);
                            return (
                                <ListItem key={idx} component={motion.li} variants={itemVariants} sx={{
                                    mb: 1,
                                    background: 'rgba(15, 23, 42, 0.4)',
                                    borderRadius: 2,
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        background: 'rgba(15, 23, 42, 0.7)',
                                        borderColor: 'primary.dark'
                                    }
                                }}>
                                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.dark', mr: 2, fontSize: 13, fontWeight: 'bold' }}>
                                        {hash.substring(0, 2)}
                                    </Avatar>
                                    <ListItemText
                                        primary={msg}
                                        secondary={hash}
                                        primaryTypographyProps={{ variant: 'body1', color: 'text.primary' }}
                                        secondaryTypographyProps={{ variant: 'caption', color: 'primary.light', fontFamily: 'monospace' }}
                                    />
                                </ListItem>
                            );
                        })}
                    </List>
                ) : (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                        <Typography variant="body1" color="text.secondary">
                            No commits found for today in this project directory.
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
                            Make some changes and commit!
                        </Typography>
                    </Box>
                )}
            </Paper>
        </motion.div>
    );
};
