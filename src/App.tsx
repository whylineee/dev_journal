import { useState, useEffect } from "react";
import { Layout } from "./components/Layout";
import { EntryForm } from "./components/EntryForm";
import { PageEditor } from "./components/PageEditor";
import { GitCommits } from "./components/GitCommits";
import { Stats } from "./components/Stats";
import { format } from "date-fns";
import { Box, Container } from "@mui/material";
import { useEntries } from "./hooks/useEntries";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

function App() {
  const [activeTab, setActiveTab] = useState<'journal' | 'page'>('journal');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);

  const { data: entries } = useEntries();

  useEffect(() => {
    let notificationSent = false;

    const checkTime = async () => {
      const now = new Date();
      if (now.getHours() >= 18 && !notificationSent) {
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

    const interval = setInterval(checkTime, 60000);
    checkTime();

    return () => clearInterval(interval);
  }, [entries]);

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      selectedDate={selectedDate}
      onSelectDate={setSelectedDate}
      selectedPageId={selectedPageId}
      onSelectPage={setSelectedPageId}
    >
      <Container maxWidth="lg" sx={{ height: '100%', pb: 4 }}>
        {activeTab === 'journal' ? (
          <>
            <EntryForm date={selectedDate} />
            <Box sx={{ mt: 6 }}>
              <Stats />
            </Box>
            <Box sx={{ mt: 4 }}>
              <GitCommits />
            </Box>
          </>
        ) : (
          <PageEditor
            pageId={selectedPageId}
            onSaveSuccess={(id) => {
              setSelectedPageId(id);
            }}
            onDeleteSuccess={() => {
              setSelectedPageId(null);
            }}
          />
        )}
      </Container>
    </Layout>
  );
}

export default App;
