import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { Meeting, MeetingActionItem, MeetingRecurrence, MeetingStatus, Task } from "../types";

const MEETINGS_QUERY_KEY = ["meetings"] as const;

const useInvalidateMeetings = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: MEETINGS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  };
};

export const useMeetings = () => {
  return useQuery({
    queryKey: MEETINGS_QUERY_KEY,
    queryFn: async () => {
      return await invoke<Meeting[]>("get_meetings");
    },
  });
};

export const useCreateMeeting = () => {
  const invalidateMeetings = useInvalidateMeetings();

  return useMutation({
    mutationFn: async ({
      title,
      agenda,
      start_at,
      end_at,
      meet_url,
      calendar_event_url,
      project_id,
      participants,
      notes,
      decisions,
      action_items,
      recurrence,
      recurrence_until,
      reminder_minutes,
      status,
    }: {
      title: string;
      agenda: string;
      start_at: string;
      end_at: string;
      meet_url: string | null;
      calendar_event_url: string | null;
      project_id: number | null;
      participants: string[];
      notes: string;
      decisions: string;
      action_items: MeetingActionItem[];
      recurrence: MeetingRecurrence;
      recurrence_until: string | null;
      reminder_minutes: number;
      status: MeetingStatus;
    }) => {
      return await invoke<Meeting>("create_meeting", {
        title,
        agenda,
        startAt: start_at,
        endAt: end_at,
        meetUrl: meet_url,
        calendarEventUrl: calendar_event_url,
        projectId: project_id,
        participants,
        notes,
        decisions,
        actionItems: action_items,
        recurrence,
        recurrenceUntil: recurrence_until,
        reminderMinutes: reminder_minutes,
        status,
      });
    },
    onSuccess: invalidateMeetings,
  });
};

export const useUpdateMeeting = () => {
  const invalidateMeetings = useInvalidateMeetings();

  return useMutation({
    mutationFn: async ({
      id,
      title,
      agenda,
      start_at,
      end_at,
      meet_url,
      calendar_event_url,
      project_id,
      participants,
      notes,
      decisions,
      action_items,
      recurrence,
      recurrence_until,
      reminder_minutes,
      status,
    }: {
      id: number;
      title: string;
      agenda: string;
      start_at: string;
      end_at: string;
      meet_url: string | null;
      calendar_event_url: string | null;
      project_id: number | null;
      participants: string[];
      notes: string;
      decisions: string;
      action_items: MeetingActionItem[];
      recurrence: MeetingRecurrence;
      recurrence_until: string | null;
      reminder_minutes: number;
      status: MeetingStatus;
    }) => {
      await invoke("update_meeting", {
        id,
        title,
        agenda,
        startAt: start_at,
        endAt: end_at,
        meetUrl: meet_url,
        calendarEventUrl: calendar_event_url,
        projectId: project_id,
        participants,
        notes,
        decisions,
        actionItems: action_items,
        recurrence,
        recurrenceUntil: recurrence_until,
        reminderMinutes: reminder_minutes,
        status,
      });
    },
    onSuccess: invalidateMeetings,
  });
};

export const useDeleteMeeting = () => {
  const invalidateMeetings = useInvalidateMeetings();

  return useMutation({
    mutationFn: async (id: number) => {
      await invoke("delete_meeting", { id });
    },
    onSuccess: invalidateMeetings,
  });
};

export const useMaterializeMeetingActionItems = () => {
  const invalidateMeetings = useInvalidateMeetings();

  return useMutation({
    mutationFn: async ({
      meeting_id,
      due_date,
    }: {
      meeting_id: number;
      due_date: string | null;
    }) => {
      return await invoke<Task[]>("materialize_meeting_action_items", {
        meetingId: meeting_id,
        dueDate: due_date,
      });
    },
    onSuccess: invalidateMeetings,
  });
};
