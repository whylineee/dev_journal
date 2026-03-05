import { Box, TextField, Typography, Button, Paper, IconButton, Tooltip, InputBase, Chip } from "@mui/material";
import { useState, useEffect, useMemo, useCallback } from "react";
import Markdown from "react-markdown";
import { usePage, useCreatePage, useUpdatePage, useDeletePage } from "../hooks/usePages";
import { motion } from "framer-motion";
import { alpha, useTheme } from "@mui/material/styles";
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import CodeIcon from '@mui/icons-material/Code';
import DataObjectIcon from '@mui/icons-material/DataObject';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

interface PageEditorProps {
    pageId: number | null;
    previewEnabled: boolean;
    autosaveEnabled: boolean;
    onSaveSuccess: (id: number) => void;
    onDeleteSuccess: () => void;
}

const countWords = (value: string) => value.split(/\s+/).filter((word) => word.length > 0).length;

export const PageEditor = ({ pageId, previewEnabled, autosaveEnabled, onSaveSuccess, onDeleteSuccess }: PageEditorProps) => {
    const muiTheme = useTheme();
    const { data: page, isLoading } = usePage(pageId);
    const createMutation = useCreatePage();
    const updateMutation = useUpdatePage();
    const deleteMutation = useDeletePage();

    const [title, setTitle] = useState("Untitled Page");
    const [content, setContent] = useState("");
    const [draftRestored, setDraftRestored] = useState(false);
    const draftKey = useMemo(() => `devJournal_page_draft_${pageId ?? 'new'}`, [pageId]);

    useEffect(() => {
        const pageTitle = page?.title ?? "Untitled Page";
        const pageContent = page?.content ?? "";

        let nextTitle = pageTitle;
        let nextContent = pageContent;
        let restored = false;

        const rawDraft = localStorage.getItem(draftKey);
        if (rawDraft) {
            try {
                const draft = JSON.parse(rawDraft) as { title?: string; content?: string };
                if (typeof draft.title === "string") {
                    nextTitle = draft.title;
                }
                if (typeof draft.content === "string") {
                    nextContent = draft.content;
                }
                restored = true;
            } catch {
                localStorage.removeItem(draftKey);
            }
        }

        setTitle(nextTitle);
        setContent(nextContent);
        setDraftRestored(restored);
    }, [page, pageId, draftKey]);

    useEffect(() => {
        if (!autosaveEnabled) {
            return;
        }

        const timeout = setTimeout(() => {
            localStorage.setItem(
                draftKey,
                JSON.stringify({
                    title,
                    content,
                    updatedAt: new Date().toISOString(),
                })
            );
        }, 700);

        return () => clearTimeout(timeout);
    }, [autosaveEnabled, content, draftKey, title]);

    const handleSave = useCallback(() => {
        if (pageId) {
            updateMutation.mutate({ id: pageId, title, content }, {
                onSuccess: () => {
                    localStorage.removeItem(draftKey);
                    setDraftRestored(false);
                    onSaveSuccess(pageId);
                }
            });
        } else {
            createMutation.mutate({ title, content }, {
                onSuccess: (newPage) => {
                    localStorage.removeItem(draftKey);
                    setDraftRestored(false);
                    onSaveSuccess(newPage.id);
                }
            });
        }
    }, [content, createMutation, draftKey, onSaveSuccess, pageId, title, updateMutation]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
                event.preventDefault();
                if (!createMutation.isPending && !updateMutation.isPending) {
                    handleSave();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [createMutation.isPending, handleSave, updateMutation.isPending]);

    const handleDelete = () => {
        if (pageId) {
            deleteMutation.mutate(pageId, {
                onSuccess: () => {
                    localStorage.removeItem(draftKey);
                    onDeleteSuccess();
                }
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

    const insertTemplate = () => {
        const template = `## Goal\n\n## Context\n\n## Plan\n- Step 1\n- Step 2\n\n## Risks\n\n## Notes`;
        setContent((prev) => (prev.trim().length === 0 ? template : `${prev}\n\n${template}`));
    };

    const insertCodeBlock = () => {
        const snippet = "```ts\n// code\n```";
        setContent((prev) => (prev.trim().length === 0 ? snippet : `${prev}${prev.endsWith("\n") ? "" : "\n"}\n${snippet}`));
    };

    const clearDraft = () => {
        localStorage.removeItem(draftKey);
        setDraftRestored(false);
        setTitle(page?.title ?? "Untitled Page");
        setContent(page?.content ?? "");
    };

    const words = countWords(content);
    const toolbarButtonSx = {
        color: "text.secondary",
        "&:hover": {
            color: "text.primary",
            bgcolor: alpha(muiTheme.palette.primary.main, 0.12),
        },
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
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", md: "center" }}
                    mb={1}
                    gap={2}
                    flexDirection={{ xs: "column", md: "row" }}
                >
                    <InputBase
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Page Title"
                        sx={{
                            typography: { xs: "h4", md: "h3" },
                            fontWeight: 700,
                            letterSpacing: '-0.02em',
                            color: 'text.primary',
                            flex: 1,
                            minWidth: 0,
                            width: "100%",
                            mr: { md: 2 },
                        }}
                    />

                    <Paper
                        elevation={0}
                        sx={{
                            display: 'flex',
                            gap: 0.5,
                            p: 0.5,
                            borderRadius: 3,
                            border: "1px solid",
                            borderColor: "divider",
                            bgcolor: alpha(muiTheme.palette.background.paper, 0.94),
                            alignSelf: { xs: "flex-end", md: "auto" },
                        }}
                    >
                        <Tooltip title="Bold">
                            <IconButton size="small" onClick={() => insertFormat('**', '**')} sx={toolbarButtonSx}>
                                <FormatBoldIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Italic">
                            <IconButton size="small" onClick={() => insertFormat('*', '*')} sx={toolbarButtonSx}>
                                <FormatItalicIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Code">
                            <IconButton size="small" onClick={() => insertFormat('`', '`')} sx={toolbarButtonSx}>
                                <CodeIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Code Block">
                            <IconButton size="small" onClick={insertCodeBlock} sx={toolbarButtonSx}>
                                <DataObjectIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Bullet List">
                            <IconButton size="small" onClick={() => insertFormat('- ', '')} sx={toolbarButtonSx}>
                                <FormatListBulletedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Paper>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: "center" }}>
                    <Chip label={`Words: ${words}`} size="small" variant="outlined" />
                    <Chip label={autosaveEnabled ? 'Autosave on' : 'Autosave off'} size="small" color={autosaveEnabled ? 'success' : 'default'} variant="outlined" />
                    <Chip label="Ctrl/Cmd+S to save" size="small" variant="outlined" />
                    {draftRestored ? <Chip label="Draft restored" size="small" color="info" variant="outlined" /> : null}
                    <Button size="small" onClick={insertTemplate}>Insert template</Button>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 2, md: 4 }, flex: 1 }}>
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

                    {previewEnabled ? (
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <Paper
                                sx={{
                                    p: 3,
                                    flex: 1,
                                    borderRadius: 2,
                                    overflowY: 'auto',
                                    borderColor: "divider",
                                    bgcolor: alpha(muiTheme.palette.background.paper, 0.72),
                                }}
                                variant="outlined"
                            >
                                {content ? (
                                    <Markdown>{content}</Markdown>
                                ) : (
                                    <Typography color="text.disabled" sx={{ fontStyle: 'italic' }}>Markdown preview will appear here...</Typography>
                                )}
                            </Paper>
                        </Box>
                    ) : null}
                </Box>

                <Box
                    sx={{
                        mt: 3,
                        pb: 4,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: { xs: "stretch", md: "center" },
                        flexDirection: { xs: "column", md: "row" },
                        flexWrap: "wrap",
                        gap: 1.25,
                    }}
                >
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: "wrap", order: { xs: 2, md: 1 } }}>
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
                            variant="text"
                            color="inherit"
                            startIcon={<RestartAltIcon />}
                            onClick={clearDraft}
                        >
                            Reset Draft
                        </Button>
                    </Box>

                    <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        startIcon={<SaveIcon />}
                        onClick={handleSave}
                        disabled={createMutation.isPending || updateMutation.isPending}
                        sx={{ px: 4, minWidth: { xs: "100%", md: 220 }, order: { xs: 1, md: 2 } }}
                    >
                        {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Page"}
                    </Button>
                </Box>
            </Box>
        </motion.div>
    );
};
