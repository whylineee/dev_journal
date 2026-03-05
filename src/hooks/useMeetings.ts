import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { Meeting, MeetingStatus } from "../types";

const MEETINGS_QUERY_KEY = ["meetings"] as const;

const useInvalidateMeetings = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: MEETINGS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
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
      status,
    }: {
      title: string;
      agenda: string;
      start_at: string;
      end_at: string;
      meet_url: string | null;
      calendar_event_url: string | null;
      project_id: number | null;
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
