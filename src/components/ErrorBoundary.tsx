import { Component, ReactNode } from "react";
import { Box, Button, Paper, Typography } from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { useI18n } from "../i18n/I18nContext";

const ErrorFallback = ({ message }: { message: string }) => {
  const { t } = useI18n();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
      }}
    >
      <Paper variant="outlined" sx={{ p: 4, maxWidth: 480, textAlign: "center", borderRadius: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          {t("Something went wrong")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {t("The app hit an unexpected error. Your data is safe — reload to continue.")}
        </Typography>
        {message && (
          <Typography
            variant="caption"
            color="text.secondary"
            component="pre"
            sx={{ mb: 2, whiteSpace: "pre-wrap", wordBreak: "break-word" }}
          >
            {message}
          </Typography>
        )}
        <Button
          variant="contained"
          startIcon={<RestartAltIcon />}
          onClick={() => window.location.reload()}
        >
          {t("Reload app")}
        </Button>
      </Paper>
    </Box>
  );
};

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string | null }) {
    console.error("Unhandled render error:", error, errorInfo.componentStack);
  }

  render() {
    if (this.state.error) {
      return <ErrorFallback message={this.state.error.message} />;
    }

    return this.props.children;
  }
}
