import { Box, Typography, Paper, Tooltip as MuiTooltip, Button } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useEntries } from "../hooks/useEntries";
import { useTasks } from "../hooks/useTasks";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, subDays } from "date-fns";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import EditNoteIcon from '@mui/icons-material/EditNote';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import DownloadIcon from '@mui/icons-material/Download';

type EnergyTag = "focused" | "deep_work" | "tired" | "distracted";
const ENERGY_STORAGE_KEY = "devJournal_entry_energy_tags";
const APP_USAGE_STORAGE_KEY = "devJournal_app_usage_seconds";

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
    const muiTheme = useTheme();
    const { data: entries } = useEntries();
    const { data: tasks = [] } = useTasks();
    const entriesData = entries ?? [];
    const [energyMap, setEnergyMap] = useState<Record<string, EnergyTag>>({});
    const [usageMap, setUsageMap] = useState<Record<string, number>>({});

    useEffect(() => {
        const loadEnergyMap = () => {
            try {
                const raw = localStorage.getItem(ENERGY_STORAGE_KEY);
                if (!raw) {
                    setEnergyMap({});
                    return;
                }

                const parsed = JSON.parse(raw) as Record<string, EnergyTag>;
                setEnergyMap(parsed);
            } catch {
                setEnergyMap({});
            }
        };

        loadEnergyMap();
        window.addEventListener("devJournal:energyTagUpdated", loadEnergyMap);
        window.addEventListener("storage", loadEnergyMap);
        return () => {
            window.removeEventListener("devJournal:energyTagUpdated", loadEnergyMap);
            window.removeEventListener("storage", loadEnergyMap);
        };
    }, []);

    useEffect(() => {
        const loadUsageMap = () => {
            try {
                const raw = localStorage.getItem(APP_USAGE_STORAGE_KEY);
                if (!raw) {
                    setUsageMap({});
                    return;
                }

                const parsed = JSON.parse(raw) as Record<string, number>;
                setUsageMap(parsed && typeof parsed === "object" ? parsed : {});
            } catch {
                setUsageMap({});
            }
        };

        loadUsageMap();
        window.addEventListener("devJournal:usageUpdated", loadUsageMap);
        window.addEventListener("storage", loadUsageMap);
        return () => {
            window.removeEventListener("devJournal:usageUpdated", loadUsageMap);
            window.removeEventListener("storage", loadUsageMap);
        };
    }, []);

    // Calculate Total Words
    let totalWords = 0;

    const sortedEntries = [...entriesData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedEntries.forEach((entry) => {
        const words = entry.yesterday.split(/\s+/).filter(w => w.length > 0).length +
            entry.today.split(/\s+/).filter(w => w.length > 0).length;
        totalWords += words;
    });

    // Activity Map (Last 90 Days)
    const activityData = Array.from({ length: 90 }).map((_, i) => {
        const d = subDays(new Date(), 89 - i);
        const dateStr = format(d, "yyyy-MM-dd");
        const entry = entriesData.find(e => e.date === dateStr);
        let words = 0;
        if (entry) {
            words = entry.yesterday.split(/\s+/).filter(w => w.length > 0).length +
                entry.today.split(/\s+/).filter(w => w.length > 0).length;
        }
        const usageSeconds = usageMap[dateStr] ?? 0;
        return { date: dateStr, words, usageSeconds };
    });

    const formatUsageDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) {
            return `${h}h ${m}m`;
        }
        return `${m}m`;
    };

    const getHeatmapColor = (words: number) => {
        if (words === 0) return alpha(muiTheme.palette.text.primary, 0.08);
        if (words < 50) return alpha(muiTheme.palette.success.main, 0.32);
        if (words < 100) return alpha(muiTheme.palette.success.main, 0.48);
        if (words < 200) return alpha(muiTheme.palette.success.main, 0.68);
        return muiTheme.palette.success.main;
    };

    // Chart Data (Last 14 Days)
    const chartData = Array.from({ length: 14 }).map((_, i) => {
        const d = subDays(new Date(), 13 - i);
        const dateStr = format(d, "yyyy-MM-dd");
        const entry = entriesData.find(e => e.date === dateStr);
        let words = 0;
        if (entry) {
            words = entry.yesterday.split(/\s+/).filter(w => w.length > 0).length +
                entry.today.split(/\s+/).filter(w => w.length > 0).length;
        }
        return { day: format(d, "MMM d"), words };
    });

    const priorityWeight = {
        low: 1,
        medium: 2,
        high: 3,
        urgent: 4,
    } as const;

    const completedTasks = tasks.filter((task) => task.status === "done");
    const openTasks = tasks.filter((task) => task.status !== "done");

    const weightedCompletedTasks = completedTasks.reduce((sum, task) => {
        return sum + (priorityWeight[task.priority] ?? 1);
    }, 0);

    const executionPenalty = Math.max(0, openTasks.length - completedTasks.length);
    const weeklyJournalConsistency = activityData.slice(-7).filter((day) => day.words > 0).length;
    const impactScore = Math.max(
        0,
        weightedCompletedTasks * 8 + weeklyJournalConsistency * 5 - executionPenalty * 3
    );

    const energyCorrelation = useMemo(() => {
        const tagBuckets: Record<EnergyTag, { days: number; words: number }> = {
            focused: { days: 0, words: 0 },
            deep_work: { days: 0, words: 0 },
            tired: { days: 0, words: 0 },
            distracted: { days: 0, words: 0 },
        };

        entriesData.forEach((entry) => {
            const tag = energyMap[entry.date];
            if (!tag) {
                return;
            }

            const words = `${entry.yesterday} ${entry.today}`.split(/\s+/).filter((word) => word.length > 0).length;
            tagBuckets[tag].days += 1;
            tagBuckets[tag].words += words;
        });

        return (Object.keys(tagBuckets) as EnergyTag[]).map((tag) => {
            const bucket = tagBuckets[tag];
            const average = bucket.days === 0 ? 0 : Math.round(bucket.words / bucket.days);
            return { tag, days: bucket.days, average };
        });
    }, [energyMap, entriesData]);

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
                                const mdContent = "# Dev Journal Export\n\n" + [...entriesData].sort((a, b) => b.date.localeCompare(a.date)).map(e => `## ${e.date}\n### Yesterday\n${e.yesterday}\n\n### Today\n${e.today}\n`).join("\n---\n\n");
                                const blob = new Blob([mdContent], { type: 'text/markdown' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `dev-journal-export-${format(new Date(), 'yyyy-MM-dd')}.md`;
                                a.click();
                                URL.revokeObjectURL(url);
                            }}
                            sx={{
                                borderColor: 'divider',
                                color: 'text.secondary',
                                '&:hover': {
                                    borderColor: 'primary.main',
                                    color: 'primary.main',
                                    bgcolor: alpha(muiTheme.palette.primary.main, 0.08),
                                }
                            }}
                        >
                            Export Data
                        </Button>
                    </Box>
                </motion.div>

                {/* KPI Cards */}
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' },
                        gap: 2.5
                    }}
                >
                    {[
                        { title: "Impact Score", value: impactScore, icon: LocalFireDepartmentIcon, color: '#f59e0b', suffix: 'Impact' },
                        { title: "Execution Weight", value: weightedCompletedTasks, icon: MilitaryTechIcon, color: '#3b82f6', suffix: 'Weighted tasks' },
                        { title: "Total Entries", value: entriesData.length, icon: EditNoteIcon, color: '#10b981', suffix: 'Entries' },
                        { title: "Total Words", value: totalWords, icon: AnalyticsIcon, color: '#8b5cf6', suffix: 'Words' }
                    ].map((stat, i) => (
                        <Box key={i} component={motion.div} variants={itemVariants}>
                            <Paper sx={{
                                p: 2.75,
                                height: '100%',
                                background: muiTheme.palette.mode === "dark"
                                    ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.7) 100%)'
                                    : 'linear-gradient(145deg, rgba(255, 255, 255, 0.86) 0%, rgba(241, 245, 249, 0.9) 100%)',
                                display: 'flex',
                                flexDirection: 'column',
                                border: `1px solid ${alpha(stat.color, 0.35)}`
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.75 }}>
                                    <Box
                                        sx={{
                                            width: 34,
                                            height: 34,
                                            borderRadius: 1.5,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: stat.color,
                                            bgcolor: alpha(stat.color, 0.16),
                                            border: `1px solid ${alpha(stat.color, 0.4)}`
                                        }}
                                    >
                                        <stat.icon sx={{ fontSize: 20 }} />
                                    </Box>
                                    <Typography variant="body2" color="text.secondary">
                                        {stat.title}
                                    </Typography>
                                </Box>
                                <Typography variant="h3" sx={{ color: stat.color, fontWeight: 700, mb: 0.5, lineHeight: 1 }}>
                                    {stat.value}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: "0.02em" }}>
                                    {stat.suffix}
                                </Typography>
                            </Paper>
                        </Box>
                    ))}
                </Box>

                {/* Heatmap & Chart */}
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 3 }}>
                    <Box component={motion.div} variants={itemVariants} sx={{ flex: 1 }}>
                        <Paper sx={{ p: 3, height: '100%', minHeight: 300, display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="subtitle2" gutterBottom color="text.secondary">Words Written (Last 14 Days)</Typography>
                            <Box sx={{ flexGrow: 1, mt: 2, minWidth: 0, minHeight: 220 }}>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha(muiTheme.palette.text.primary, 0.1)} />
                                        <XAxis
                                            dataKey="day"
                                            stroke={alpha(muiTheme.palette.text.primary, 0.35)}
                                            tick={{ fill: muiTheme.palette.text.secondary, fontSize: 12 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            stroke={alpha(muiTheme.palette.text.primary, 0.35)}
                                            tick={{ fill: muiTheme.palette.text.secondary, fontSize: 12 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            cursor={{ fill: alpha(muiTheme.palette.primary.main, 0.08) }}
                                            contentStyle={{
                                                backgroundColor: muiTheme.palette.background.paper,
                                                borderRadius: '8px',
                                                border: `1px solid ${muiTheme.palette.divider}`,
                                                color: muiTheme.palette.text.primary,
                                            }}
                                            itemStyle={{ color: muiTheme.palette.primary.main }}
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
                                    <MuiTooltip
                                        key={i}
                                        title={day.usageSeconds > 0
                                            ? `${day.words} words on ${day.date} • In app: ${formatUsageDuration(day.usageSeconds)}`
                                            : `${day.words} words on ${day.date}`}
                                        arrow
                                    >
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
                                <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: alpha(muiTheme.palette.text.primary, 0.08) }} />
                                <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: alpha(muiTheme.palette.success.main, 0.32) }} />
                                <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: alpha(muiTheme.palette.success.main, 0.48) }} />
                                <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: alpha(muiTheme.palette.success.main, 0.68) }} />
                                <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: muiTheme.palette.success.main }} />
                                More
                            </Box>
                        </Paper>
                    </Box>
                </Box>

                <Box component={motion.div} variants={itemVariants}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="subtitle2" gutterBottom color="text.secondary">
                            Energy Tag Correlation
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                            {energyCorrelation.map((row) => (
                                <Paper key={row.tag} variant="outlined" sx={{ p: 1.25, minWidth: 160 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                        {row.tag.replace("_", " ")}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                                        Days tagged: {row.days}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Avg words/day: {row.average}
                                    </Typography>
                                </Paper>
                            ))}
                        </Box>
                    </Paper>
                </Box>
            </Box>
        </motion.div>
    );
};
