import { Box, Typography, Paper, Tooltip as MuiTooltip, Button } from "@mui/material";
import { useEntries } from "../hooks/useEntries";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, subDays, differenceInDays } from "date-fns";
import { motion } from "framer-motion";
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import EditNoteIcon from '@mui/icons-material/EditNote';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import DownloadIcon from '@mui/icons-material/Download';

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

export const Stats = () => {
    const { data: entries } = useEntries();

    if (!entries) return null;

    // Calculate Streak
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;

    const today = format(new Date(), "yyyy-MM-dd");
    let checkDate = new Date();

    // Check Current Streak
    while (true) {
        const dateStr = format(checkDate, "yyyy-MM-dd");
        const found = entries.find(e => e.date === dateStr);
        if (found) {
            currentStreak++;
            checkDate = subDays(checkDate, 1);
        } else {
            if (dateStr === today) {
                checkDate = subDays(checkDate, 1);
                continue;
            }
            break;
        }
    }

    // Calculate Max Streak & Total Words
    let totalWords = 0;
    let lastDateObj: Date | null = null;

    const sortedEntries = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedEntries.forEach((entry) => {
        const words = entry.yesterday.split(/\s+/).filter(w => w.length > 0).length +
            entry.today.split(/\s+/).filter(w => w.length > 0).length;
        totalWords += words;

        const currentEntryDate = new Date(entry.date);
        if (!lastDateObj) {
            tempStreak = 1;
        } else {
            const diff = differenceInDays(currentEntryDate, lastDateObj);
            if (diff === 1) {
                tempStreak++;
            } else if (diff > 1) {
                tempStreak = 1; // broken
            }
        }
        if (tempStreak > maxStreak) {
            maxStreak = tempStreak;
        }
        lastDateObj = currentEntryDate;
    });

    // Activity Map (Last 90 Days)
    const activityData = Array.from({ length: 90 }).map((_, i) => {
        const d = subDays(new Date(), 89 - i);
        const dateStr = format(d, "yyyy-MM-dd");
        const entry = entries.find(e => e.date === dateStr);
        let words = 0;
        if (entry) {
            words = entry.yesterday.split(/\s+/).filter(w => w.length > 0).length +
                entry.today.split(/\s+/).filter(w => w.length > 0).length;
        }
        return { date: dateStr, words };
    });

    const getHeatmapColor = (words: number) => {
        if (words === 0) return 'rgba(255, 255, 255, 0.05)';
        if (words < 50) return '#0e4429';
        if (words < 100) return '#006d32';
        if (words < 200) return '#26a641';
        return '#39d353';
    };

    // Chart Data (Last 14 Days)
    const chartData = Array.from({ length: 14 }).map((_, i) => {
        const d = subDays(new Date(), 13 - i);
        const dateStr = format(d, "yyyy-MM-dd");
        const entry = entries.find(e => e.date === dateStr);
        let words = 0;
        if (entry) {
            words = entry.yesterday.split(/\s+/).filter(w => w.length > 0).length +
                entry.today.split(/\s+/).filter(w => w.length > 0).length;
        }
        return { day: format(d, "MMM d"), words };
    });

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show">
            <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <motion.div variants={itemVariants}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AnalyticsIcon color="primary" /> Dashboard
                        </Typography>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<DownloadIcon />}
                            onClick={() => {
                                const mdContent = "# Dev Journal Export\n\n" + [...entries].sort((a, b) => b.date.localeCompare(a.date)).map(e => `## ${e.date}\n### Yesterday\n${e.yesterday}\n\n### Today\n${e.today}\n`).join("\n---\n\n");
                                const blob = new Blob([mdContent], { type: 'text/markdown' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `dev-journal-export-${format(new Date(), 'yyyy-MM-dd')}.md`;
                                a.click();
                                URL.revokeObjectURL(url);
                            }}
                            sx={{
                                borderColor: 'rgba(255,255,255,0.1)',
                                color: 'text.secondary',
                                '&:hover': {
                                    borderColor: 'primary.main',
                                    color: 'primary.main',
                                    bgcolor: 'rgba(59, 130, 246, 0.05)'
                                }
                            }}
                        >
                            Export Data
                        </Button>
                    </Box>
                </motion.div>

                {/* KPI Cards */}
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                    {[
                        { title: "Current Streak", value: currentStreak, icon: <LocalFireDepartmentIcon sx={{ fontSize: 40, opacity: 0.2 }} />, color: '#f59e0b', suffix: 'Days' },
                        { title: "Longest Streak", value: maxStreak, icon: <MilitaryTechIcon sx={{ fontSize: 40, opacity: 0.2 }} />, color: '#3b82f6', suffix: 'Days' },
                        { title: "Total Entries", value: entries.length, icon: <EditNoteIcon sx={{ fontSize: 40, opacity: 0.2 }} />, color: '#10b981', suffix: 'Entries' },
                        { title: "Total Words", value: totalWords, icon: <AnalyticsIcon sx={{ fontSize: 40, opacity: 0.2 }} />, color: '#8b5cf6', suffix: 'Words' }
                    ].map((stat, i) => (
                        <Box key={i} component={motion.div} variants={itemVariants} sx={{ flex: 1 }}>
                            <Paper sx={{
                                p: 3, position: 'relative', overflow: 'hidden', height: '100%',
                                background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.7) 100%)',
                                display: 'flex', flexDirection: 'column', justifyContent: 'center'
                            }}>
                                <Box sx={{ position: 'absolute', top: -10, right: -10, color: stat.color }}>
                                    {stat.icon}
                                </Box>
                                <Typography variant="body2" color="text.secondary" sx={{ zIndex: 1, mb: 1 }}>{stat.title}</Typography>
                                <Typography variant="h3" sx={{ color: stat.color, fontWeight: 700, zIndex: 1, mb: 0.5 }}>
                                    {stat.value}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">{stat.suffix}</Typography>
                            </Paper>
                        </Box>
                    ))}
                </Box>

                {/* Heatmap & Chart */}
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 3 }}>
                    <Box component={motion.div} variants={itemVariants} sx={{ flex: 1 }}>
                        <Paper sx={{ p: 3, height: '100%', minHeight: 300, display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="subtitle2" gutterBottom color="text.secondary">Words Written (Last 14 Days)</Typography>
                            <Box sx={{ flexGrow: 1, mt: 2 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
                                            itemStyle={{ color: '#60a5fa' }}
                                        />
                                        <Bar dataKey="words" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                        </Paper>
                    </Box>

                    <Box component={motion.div} variants={itemVariants} sx={{ flex: 1 }}>
                        <Paper sx={{ p: 3, height: '100%', minHeight: 300, display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="subtitle2" gutterBottom color="text.secondary">Activity Map (Last 90 Days)</Typography>
                            <Box sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(15, 1fr)',
                                gap: 1,
                                mt: 2,
                                overflowX: 'auto',
                                pb: 1
                            }}>
                                {activityData.map((day, i) => (
                                    <MuiTooltip key={i} title={`${day.words} words on ${day.date}`} arrow>
                                        <Box sx={{
                                            width: 14,
                                            height: 14,
                                            borderRadius: '3px',
                                            bgcolor: getHeatmapColor(day.words),
                                            transition: 'transform 0.1s',
                                            '&:hover': { transform: 'scale(1.2)', zIndex: 1 }
                                        }} />
                                    </MuiTooltip>
                                ))}
                            </Box>
                            <Box sx={{ mt: 'auto', pt: 2, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, color: 'text.secondary', fontSize: '0.75rem' }}>
                                Less
                                <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: 'rgba(255, 255, 255, 0.05)' }} />
                                <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: '#0e4429' }} />
                                <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: '#006d32' }} />
                                <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: '#26a641' }} />
                                <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: '#39d353' }} />
                                More
                            </Box>
                        </Paper>
                    </Box>
                </Box>
            </Box>
        </motion.div>
    );
};
