import { Alert, Snackbar } from "@mui/material";
import { ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react";

type NotificationSeverity = "success" | "info" | "warning" | "error";

interface NotificationState {
  id: number;
  message: string;
  severity: NotificationSeverity;
}

interface AppNotificationsContextValue {
  notify: (message: string, severity?: NotificationSeverity) => void;
}

const AppNotificationsContext = createContext<AppNotificationsContextValue | undefined>(undefined);

export const AppNotificationsProvider = ({ children }: { children: ReactNode }) => {
  const [activeNotification, setActiveNotification] = useState<NotificationState | null>(null);

  const notify = useCallback((message: string, severity: NotificationSeverity = "info") => {
    setActiveNotification({
      id: Date.now(),
      message,
      severity,
    });
  }, []);

  const value = useMemo<AppNotificationsContextValue>(() => ({ notify }), [notify]);

  return (
    <AppNotificationsContext.Provider value={value}>
      {children}
      <Snackbar
        open={Boolean(activeNotification)}
        autoHideDuration={2800}
        onClose={() => setActiveNotification(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          elevation={6}
          variant="filled"
          onClose={() => setActiveNotification(null)}
          severity={activeNotification?.severity ?? "info"}
          sx={{ width: "100%" }}
        >
          {activeNotification?.message ?? ""}
        </Alert>
      </Snackbar>
    </AppNotificationsContext.Provider>
  );
};

export const useAppNotifications = () => {
  const context = useContext(AppNotificationsContext);
  if (!context) {
    throw new Error("useAppNotifications must be used within AppNotificationsProvider");
  }
  return context;
};
