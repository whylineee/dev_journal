import { Box, Typography, Paper } from "@mui/material";
import { useEntries } from "../hooks/useEntries";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, subDays } from "date-fns";
import { motion } from "framer-motion";
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';

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

    let streak = 0;
    const today = format(new Date(), "yyyy-MM-dd");
    let currentDate = new Date();

    while (true) {
        const dateStr = format(currentDate, "yyyy-MM-dd");
        const found = entries.find(e => e.date === dateStr);
        if (found) {
            streak++;
            currentDate = subDays(currentDate, 1);
        } else {
            if (dateStr === today) {
                currentDate = subDays(currentDate, 1);
                continue;
            }
            break;
        }
    }

    const chartData = Array.from({ length: 7 }).map((_, i) => {
        const d = subDays(new Date(), 6 - i);
        const dateStr = format(d, "yyyy-MM-dd");
        const entry = entries.find(e => e.date === dateStr);

        let words = 0;
        if (entry) {
            words = (entry.yesterday.split(" ").length + entry.today.split(" ").length);
        }

        return { day: format(d, "EEE"), words };
    });

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show">
            <Box sx={{ mt: 4 }}>
                <motion.div variants={itemVariants}>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'text.primary' }}>
                        Activity Stats
                    </Typography>
                </motion.div>

                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                    <Box component={motion.div} variants={itemVariants} sx={{ width: { xs: '100%', md: '33.33%' } }}>
                        <Paper sx={{
                            p: 3,
                            textAlign: 'center',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.7) 100%)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            {streak > 0 && <LocalFireDepartmentIcon sx={{ position: 'absolute', top: 16, right: 16, color: '#f59e0b', fontSize: 32, opacity: 0.8 }} />}
                            <Typography variant="h6" color="text.secondary" sx={{ zIndex: 1 }}>Current Streak</Typography>
                            <Typography variant="h2" sx={{
                                color: streak > 0 ? '#f59e0b' : 'text.disabled',
                                fontWeight: 800,
                                my: 1,
                                textShadow: streak > 0 ? '0 0 20px rgba(245, 158, 11, 0.4)' : 'none',
                                zIndex: 1
                            }}>
                                {streak}
                            </Typography>
                            <Typography variant="subtitle1" sx={{ zIndex: 1 }}>Days</Typography>
                        </Paper>
                    </Box>

                    <Box component={motion.div} variants={itemVariants} sx={{ width: { xs: '100%', md: '66.67%' } }}>
                        <Paper sx={{ p: 3, height: 250, display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="subtitle2" gutterBottom color="text.secondary">Words written (Last 7 Days)</Typography>
                            <Box sx={{ flexGrow: 1, mt: 1 }}>
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
                                        <Bar dataKey="words" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                        </Paper>
                    </Box>
                </Box>
            </Box>
        </motion.div>
    );
};
