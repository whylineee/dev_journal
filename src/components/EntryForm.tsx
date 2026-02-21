import { Box, TextField, Typography, Button, Paper } from "@mui/material";
import { useState, useEffect } from "react";
import Markdown from "react-markdown";
import { useEntry, useSaveEntry } from "../hooks/useEntries";
import { format, parseISO } from "date-fns";

interface EntryFormProps {
    date: string;
}

export const EntryForm = ({ date }: EntryFormProps) => {
    const { data: entry, isLoading } = useEntry(date);
    const saveMutation = useSaveEntry();

    const [yesterday, setYesterday] = useState("");
    const [today, setToday] = useState("");

    useEffect(() => {
        if (entry) {
            setYesterday(entry.yesterday);
            setToday(entry.today);
        } else {
            setYesterday("");
            setToday("");
        }
    }, [entry, date]);

    const handleSave = () => {
        saveMutation.mutate({ date, yesterday, today });
    };

    const isToday = format(new Date(), "yyyy-MM-dd") === date;
    const displayDate = isToday ? "Today" : format(parseISO(date), "MMMM d, yyyy");

    if (isLoading) return <Typography>Loading...</Typography>;

    return (
        <Box sx={{ maxWidth: 800, mx: "auto" }}>
            <Typography variant="h4" gutterBottom>
                Dev Journal - {displayDate}
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" gutterBottom color="primary.main">
                        What did you do yesterday?
                    </Typography>
                    <TextField
                        multiline
                        rows={8}
                        fullWidth
                        value={yesterday}
                        onChange={(e) => setYesterday(e.target.value)}
                        placeholder="Fixed auth bugs..."
                    />
                    <Paper sx={{ mt: 2, p: 2, minHeight: 100, bgcolor: 'background.paper' }} variant="outlined">
                        <Typography variant="caption" color="text.secondary">Preview</Typography>
                        <Markdown>{yesterday || "*No content*"}</Markdown>
                    </Paper>
                </Box>

                <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" gutterBottom color="secondary.main">
                        What are you planning today?
                    </Typography>
                    <TextField
                        multiline
                        rows={8}
                        fullWidth
                        value={today}
                        onChange={(e) => setToday(e.target.value)}
                        placeholder="Implement new UI..."
                    />
                    <Paper sx={{ mt: 2, p: 2, minHeight: 100, bgcolor: 'background.paper' }} variant="outlined">
                        <Typography variant="caption" color="text.secondary">Preview</Typography>
                        <Markdown>{today || "*No content*"}</Markdown>
                    </Paper>
                </Box>
            </Box>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    variant="contained"
                    size="large"
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                >
                    {saveMutation.isPending ? "Saving..." : "Save Journal"}
                </Button>
            </Box>
        </Box>
    );
};
