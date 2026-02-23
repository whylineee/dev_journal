import { useState, useEffect, useRef } from "react";
import { Layout } from "./components/Layout";
import { EntryForm } from "./components/EntryForm";
import { PageEditor } from "./components/PageEditor";
import { GitCommits } from "./components/GitCommits";
import { Stats } from "./components/Stats";
import { TasksBoard } from "./components/TasksBoard";
import { WeeklySummary } from "./components/WeeklySummary";
import { format } from "date-fns";
import { Box, Container } from "@mui/material";
import { useEntries } from "./hooks/useEntries";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

function App() {
  const [activeTab, setActiveTab] = useState<'journal' | 'page' | 'tasks'>('journal');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(() => {
    return localStorage.getItem("devJournal_reminderEnabled") !== "false";
  });
  const [reminderHour, setReminderHour] = useState<number>(() => {
    const value = Number(localStorage.getItem("devJournal_reminderHour"));
    return Number.isInteger(value) && value >= 0 && value <= 23 ? value : 18;
  });
  const [journalPreviewEnabled, setJournalPreviewEnabled] = useState<boolean>(() => {
    return localStorage.getItem("devJournal_journalPreviewEnabled") !== "false";
  });
  const [pagePreviewEnabled, setPagePreviewEnabled] = useState<boolean>(() => {
    return localStorage.getItem("devJournal_pagePreviewEnabled") !== "false";
  });
  const [autosaveEnabled, setAutosaveEnabled] = useState<boolean>(() => {
    return localStorage.getItem("devJournal_autosaveEnabled") !== "false";
  });

  const { data: entries } = useEntries();
  const lastReminderDateRef = useRef<string | null>(localStorage.getItem("devJournal_lastReminderDate"));

  useEffect(() => {
    localStorage.setItem("devJournal_reminderEnabled", String(reminderEnabled));
  }, [reminderEnabled]);

  useEffect(() => {
    localStorage.setItem("devJournal_reminderHour", String(reminderHour));
  }, [reminderHour]);
  useEffect(() => {
    localStorage.setItem("devJournal_journalPreviewEnabled", String(journalPreviewEnabled));
  }, [journalPreviewEnabled]);
  useEffect(() => {
    localStorage.setItem("devJournal_pagePreviewEnabled", String(pagePreviewEnabled));
  }, [pagePreviewEnabled]);
  useEffect(() => {
    localStorage.setItem("devJournal_autosaveEnabled", String(autosaveEnabled));
  }, [autosaveEnabled]);

  useEffect(() => {
    const checkTime = async () => {
      if (!reminderEnabled) {
        return;
      }

      const now = new Date();
      if (now.getHours() < reminderHour) {
        return;
      }

      const todayStr = format(now, "yyyy-MM-dd");
      if (lastReminderDateRef.current === todayStr) {
        return;
      }

      const hasTodayEntry = entries?.some((entry) => entry.date === todayStr);
      if (hasTodayEntry) {
        return;
      }

      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }

      if (permissionGranted) {
        sendNotification({
          title: 'Dev Journal Reminder',
          body: `It's past ${String(reminderHour).padStart(2, "0")}:00. Time to write your dev journal!`,
        });
        lastReminderDateRef.current = todayStr;
        localStorage.setItem("devJournal_lastReminderDate", todayStr);
      }
    };

    const interval = setInterval(checkTime, 60000);
    checkTime();

    return () => clearInterval(interval);
  }, [entries, reminderEnabled, reminderHour]);

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      selectedDate={selectedDate}
      onSelectDate={setSelectedDate}
      selectedPageId={selectedPageId}
      onSelectPage={setSelectedPageId}
      reminderEnabled={reminderEnabled}
      onReminderEnabledChange={setReminderEnabled}
      reminderHour={reminderHour}
      onReminderHourChange={setReminderHour}
      journalPreviewEnabled={journalPreviewEnabled}
      onJournalPreviewEnabledChange={setJournalPreviewEnabled}
      pagePreviewEnabled={pagePreviewEnabled}
      onPagePreviewEnabledChange={setPagePreviewEnabled}
      autosaveEnabled={autosaveEnabled}
      onAutosaveEnabledChange={setAutosaveEnabled}
    >
      <Container maxWidth="lg" sx={{ height: '100%', pb: 4 }}>
        {activeTab === 'journal' ? (
          <>
            <EntryForm
              date={selectedDate}
              previewEnabled={journalPreviewEnabled}
              autosaveEnabled={autosaveEnabled}
            />
            <Box sx={{ mt: 4 }}>
              <WeeklySummary />
            </Box>
            <Box sx={{ mt: 6 }}>
              <Stats />
            </Box>
            <Box sx={{ mt: 4 }}>
              <GitCommits />
            </Box>
          </>
        ) : activeTab === 'tasks' ? (
          <TasksBoard />
        ) : (
          <PageEditor
            pageId={selectedPageId}
            previewEnabled={pagePreviewEnabled}
            autosaveEnabled={autosaveEnabled}
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
