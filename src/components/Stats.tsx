import { Box, Typography, Paper } from "@mui/material";
import { useEntries } from "../hooks/useEntries";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, subDays } from "date-fns";

export const Stats = () => {
    const { data: entries } = useEntries();

    if (!entries) return null;

    // Calculate Streak
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
            // If today is missing, we check yesterday to keep streak active
            if (dateStr === today) {
                currentDate = subDays(currentDate, 1);
                continue;
            }
            break;
        }
    }

    // Chart Data: Last 7 days activity (words written)
    const chartData = Array.from({ length: 7 }).map((_, i) => {
        const d = subDays(new Date(), 6 - i);
        const dateStr = format(d, "yyyy-MM-dd");
        const entry = entries.find(e => e.date === dateStr);

        let words = 0;
        if (entry) {
            words = (entry.yesterday.split(" ").length + entry.today.split(" ").length);
        }

        return {
            day: format(d, "EEE"),
            words
        };
    });

    return (
        <Box sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom>
                Activity Stats
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                <Box sx={{ width: { xs: '100%', md: '33.33%' } }}>
                    <Paper sx={{ p: 3, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <Typography variant="h6" color="text.secondary">Current Streak</Typography>
                        <Typography variant="h2" color="secondary.main">{streak}</Typography>
                        <Typography variant="subtitle1">Days</Typography>
                    </Paper>
                </Box>
                <Box sx={{ width: { xs: '100%', md: '66.67%' } }}>
                    <Paper sx={{ p: 2, height: 200 }}>
                        <Typography variant="subtitle2" gutterBottom>Words written (Last 7 Days)</Typography>
                        <ResponsiveContainer width="100%" height="80%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis dataKey="day" stroke="#ffffff80" />
                                <YAxis stroke="#ffffff80" />
                                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.1)' }} contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#333' }} />
                                <Bar dataKey="words" fill="#90caf9" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Box>
            </Box>
        </Box>
    );
};
