import { useState, useEffect } from "react";
import { Layout } from "./components/Layout";
import { EntryForm } from "./components/EntryForm";
import { GitCommits } from "./components/GitCommits";
import { Stats } from "./components/Stats";
import { format } from "date-fns";
import { Box, Container } from "@mui/material";
import { useEntries } from "./hooks/useEntries";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

function App() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const { data: entries } = useEntries();

  useEffect(() => {
    let notificationSent = false;

    const checkTime = async () => {
      const now = new Date();
      if (now.getHours() >= 18 && !notificationSent) {
        // Check if an entry for today exists
        const todayStr = format(now, "yyyy-MM-dd");
        const hasTodayEntry = entries && entries.find(e => e.date === todayStr);

        if (!hasTodayEntry) {
          let permissionGranted = await isPermissionGranted();
          if (!permissionGranted) {
            const permission = await requestPermission();
            permissionGranted = permission === 'granted';
          }
          if (permissionGranted) {
            sendNotification({ title: 'Dev Journal Reminder', body: "It's past 18:00. Time to write your dev journal!" });
            notificationSent = true;
          }
        }
      }

      // Reset sent flag next morning
      if (now.getHours() < 6) {
        notificationSent = false;
      }
    };

    // Check every minute
    const interval = setInterval(checkTime, 60000);
    // Initial check
    checkTime();

    return () => clearInterval(interval);
  }, [entries]);

  return (
    <Layout selectedDate={selectedDate} onSelectDate={setSelectedDate}>
      <Container maxWidth="lg">
        <EntryForm date={selectedDate} />

        <Box sx={{ mt: 6 }}>
          <Stats />
        </Box>

        <Box sx={{ mt: 4 }}>
          <GitCommits />
        </Box>
      </Container>
    </Layout>
  );
}

export default App;
