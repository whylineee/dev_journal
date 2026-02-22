import { Box, TextField, Typography, Button, Paper, IconButton, Tooltip, InputBase } from "@mui/material";
import { useState, useEffect } from "react";
import Markdown from "react-markdown";
import { usePage, useCreatePage, useUpdatePage, useDeletePage } from "../hooks/usePages";
import { motion } from "framer-motion";
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import CodeIcon from '@mui/icons-material/Code';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';

interface PageEditorProps {
    pageId: number | null;
    onSaveSuccess: (id: number) => void;
    onDeleteSuccess: () => void;
}

export const PageEditor = ({ pageId, onSaveSuccess, onDeleteSuccess }: PageEditorProps) => {
    const { data: page, isLoading } = usePage(pageId);
    const createMutation = useCreatePage();
    const updateMutation = useUpdatePage();
    const deleteMutation = useDeletePage();

    const [title, setTitle] = useState("Untitled Page");
    const [content, setContent] = useState("");

    useEffect(() => {
        if (pageId && page) {
            setTitle(page.title);
            setContent(page.content);
        } else if (!pageId) {
            setTitle("Untitled Page");
            setContent("");
        }
    }, [page, pageId]);

    const handleSave = async () => {
        if (pageId) {
            updateMutation.mutate({ id: pageId, title, content }, {
                onSuccess: () => onSaveSuccess(pageId)
            });
        } else {
            createMutation.mutate({ title, content }, {
                onSuccess: (newPage) => onSaveSuccess(newPage.id)
            });
        }
    };

    const handleDelete = async () => {
        if (pageId) {
            deleteMutation.mutate(pageId, {
                onSuccess: () => onDeleteSuccess()
            });
        }
    };

    const insertFormat = (prefix: string, suffix: string) => {
        if (content.endsWith('\n') || content.length === 0) {
            setContent(content + `${prefix}text${suffix}`);
        } else {
            setContent(content + `\n${prefix}text${suffix}`);
        }
    };

    if (isLoading && pageId) return (
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
            <Typography variant="h6" color="text.secondary">Loading page...</Typography>
        </Box>
    );

    return (
        <motion.div
            key={pageId || 'new'}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        >
            <Box sx={{ maxWidth: 1000, mx: "auto", width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <InputBase
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Page Title"
                        sx={{
                            typography: 'h3',
                            fontWeight: 700,
                            letterSpacing: '-0.02em',
                            color: 'text.primary',
                            flex: 1,
                            mr: 2
                        }}
                    />

                    {/* Toolbar */}
                    <Paper elevation={0} sx={{ display: 'flex', gap: 0.5, p: 0.5, borderRadius: 3, bgcolor: 'rgba(15, 23, 42, 0.4)' }}>
                        <Tooltip title="Bold">
                            <IconButton size="small" onClick={() => insertFormat('**', '**')}>
                                <FormatBoldIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Italic">
                            <IconButton size="small" onClick={() => insertFormat('*', '*')}>
                                <FormatItalicIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Code">
                            <IconButton size="small" onClick={() => insertFormat('`', '`')}>
                                <CodeIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Bullet List">
                            <IconButton size="small" onClick={() => insertFormat('- ', '')}>
                                <FormatListBulletedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Paper>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, flex: 1 }}>
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <TextField
                            multiline
                            fullWidth
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Type '/' for commands or start writing in Markdown..."
                            sx={{ flex: 1, '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start' } }}
                            InputProps={{ sx: { height: '100%' } }}
                        />
                    </Box>

                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <Paper sx={{ p: 3, flex: 1, bgcolor: 'rgba(30, 41, 59, 0.4)', borderRadius: 2, overflowY: 'auto' }} variant="outlined">
                            {content ? (
                                <Markdown>{content}</Markdown>
                            ) : (
                                <Typography color="text.disabled" sx={{ fontStyle: 'italic' }}>Markdown preview will appear here...</Typography>
                            )}
                        </Paper>
                    </Box>
                </Box>

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', pb: 4 }}>
                    {pageId ? (
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                        >
                            Delete Page
                        </Button>
                    ) : <Box />}

                    <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        startIcon={<SaveIcon />}
                        onClick={handleSave}
                        disabled={createMutation.isPending || updateMutation.isPending}
                        sx={{ px: 4 }}
                    >
                        {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Page"}
                    </Button>
                </Box>
            </Box>
        </motion.div>
    );
};
