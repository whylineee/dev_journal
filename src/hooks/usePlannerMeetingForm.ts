import { format, parseISO } from "date-fns";
import { useMemo, useState } from "react";
import { useCreateMeeting, useUpdateMeeting } from "./useMeetings";
import type { Meeting, MeetingRecurrence, MeetingStatus } from "../types";

const toLocalDatetimeInputValue = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const createDefaultMeetingTimeRange = () => {
  const now = new Date();
  now.setSeconds(0, 0);
  const roundedMinutes = Math.ceil(now.getMinutes() / 15) * 15;
  now.setMinutes(roundedMinutes, 0, 0);

  return {
    startAt: toLocalDatetimeInputValue(new Date(now.getTime() + 30 * 60 * 1000)),
    endAt: toLocalDatetimeInputValue(new Date(now.getTime() + 90 * 60 * 1000)),
  };
};

const parseLines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

interface UsePlannerMeetingFormOptions {
  meetings: Meeting[];
  t: (key: string, variables?: Record<string, string | number>) => string;
}

export const usePlannerMeetingForm = ({
  meetings,
  t,
}: UsePlannerMeetingFormOptions) => {
  const createMeeting = useCreateMeeting();
  const updateMeeting = useUpdateMeeting();

  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingAgenda, setMeetingAgenda] = useState("");
  const [meetingMeetUrl, setMeetingMeetUrl] = useState("");
  const [meetingCalendarUrl, setMeetingCalendarUrl] = useState("");
  const [meetingProjectId, setMeetingProjectId] = useState<number | "">("");
  const [meetingParticipants, setMeetingParticipants] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [meetingDecisions, setMeetingDecisions] = useState("");
  const [meetingActionItems, setMeetingActionItems] = useState("");
  const [meetingRecurrence, setMeetingRecurrence] = useState<MeetingRecurrence>("none");
  const [meetingRecurrenceUntil, setMeetingRecurrenceUntil] = useState("");
  const [meetingReminderMinutes, setMeetingReminderMinutes] = useState(10);
  const [meetingStatus, setMeetingStatus] = useState<MeetingStatus>("planned");
  const [editingMeetingId, setEditingMeetingId] = useState<number | null>(null);
  const [meetingStartAt, setMeetingStartAt] = useState(() => createDefaultMeetingTimeRange().startAt);
  const [meetingEndAt, setMeetingEndAt] = useState(() => createDefaultMeetingTimeRange().endAt);
  const [meetingFeedback, setMeetingFeedback] = useState("");

  const editingMeeting = useMemo(
    () => meetings.find((meeting) => meeting.id === editingMeetingId) ?? null,
    [editingMeetingId, meetings]
  );

  const resetMeetingForm = () => {
    const defaultMeetingTimeRange = createDefaultMeetingTimeRange();
    setEditingMeetingId(null);
    setMeetingTitle("");
    setMeetingAgenda("");
    setMeetingMeetUrl("");
    setMeetingCalendarUrl("");
    setMeetingProjectId("");
    setMeetingParticipants("");
    setMeetingNotes("");
    setMeetingDecisions("");
    setMeetingActionItems("");
    setMeetingRecurrence("none");
    setMeetingRecurrenceUntil("");
    setMeetingReminderMinutes(10);
    setMeetingStatus("planned");
    setMeetingStartAt(defaultMeetingTimeRange.startAt);
    setMeetingEndAt(defaultMeetingTimeRange.endAt);
    setMeetingFeedback("");
  };

  const loadMeetingIntoForm = (meeting: Meeting) => {
    setEditingMeetingId(meeting.id);
    setMeetingTitle(meeting.title);
    setMeetingAgenda(meeting.agenda);
    setMeetingMeetUrl(meeting.meet_url ?? "");
    setMeetingCalendarUrl(meeting.calendar_event_url ?? "");
    setMeetingProjectId(meeting.project_id ?? "");
    setMeetingParticipants(meeting.participants.join("\n"));
    setMeetingNotes(meeting.notes);
    setMeetingDecisions(meeting.decisions);
    setMeetingActionItems(meeting.action_items.map((item) => item.title).join("\n"));
    setMeetingRecurrence(meeting.recurrence);
    setMeetingRecurrenceUntil(
      meeting.recurrence_until ? format(parseISO(meeting.recurrence_until), "yyyy-MM-dd") : ""
    );
    setMeetingReminderMinutes(meeting.reminder_minutes);
    setMeetingStatus(
      meeting.status === "live" || meeting.status === "missed" ? "planned" : meeting.status
    );
    setMeetingStartAt(toLocalDatetimeInputValue(parseISO(meeting.start_at)));
    setMeetingEndAt(toLocalDatetimeInputValue(parseISO(meeting.end_at)));
    setMeetingFeedback("");
  };

  const submitMeeting = () => {
    const normalizedTitle = meetingTitle.trim();
    if (!normalizedTitle) {
      return;
    }

    const start = new Date(meetingStartAt);
    const end = new Date(meetingEndAt);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
      setMeetingFeedback(t("Meeting end time must be after start time."));
      return;
    }

    const participants = parseLines(meetingParticipants);
    const action_items = parseLines(meetingActionItems).map((title, index) => {
      const existingItem =
        editingMeeting?.action_items.find((item) => item.title === title) ??
        editingMeeting?.action_items[index];
      return {
        id: existingItem?.id ?? `draft-${Date.now()}-${index}`,
        title,
        completed: existingItem?.completed ?? false,
        task_id: existingItem?.task_id ?? null,
      };
    });
    const recurrence_until =
      meetingRecurrence !== "none" && meetingRecurrenceUntil
        ? `${meetingRecurrenceUntil}T23:59:59.000Z`
        : null;

    const payload = {
      title: normalizedTitle,
      agenda: meetingAgenda.trim(),
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      meet_url: meetingMeetUrl.trim() || null,
      calendar_event_url: meetingCalendarUrl.trim() || null,
      project_id: meetingProjectId === "" ? null : meetingProjectId,
      participants,
      notes: meetingNotes.trim(),
      decisions: meetingDecisions.trim(),
      action_items,
      recurrence: meetingRecurrence,
      recurrence_until,
      reminder_minutes: meetingReminderMinutes,
      status: meetingStatus,
    } as const;

    if (editingMeetingId !== null) {
      updateMeeting.mutate(
        {
          id: editingMeetingId,
          ...payload,
        },
        {
          onSuccess: () => {
            resetMeetingForm();
            setMeetingFeedback(t("Meeting updated."));
          },
          onError: () => {
            setMeetingFeedback(t("Failed to update meeting."));
          },
        }
      );
      return;
    }

    createMeeting.mutate(payload, {
      onSuccess: () => {
        resetMeetingForm();
        setMeetingFeedback(t("Meeting scheduled."));
      },
      onError: () => {
        setMeetingFeedback(t("Failed to schedule meeting."));
      },
    });
  };

  return {
    createMeeting,
    updateMeeting,
    editingMeetingId,
    meetingAgenda,
    meetingActionItems,
    meetingCalendarUrl,
    meetingDecisions,
    meetingEndAt,
    meetingFeedback,
    meetingMeetUrl,
    meetingNotes,
    meetingParticipants,
    meetingProjectId,
    meetingRecurrence,
    meetingRecurrenceUntil,
    meetingReminderMinutes,
    meetingStartAt,
    meetingStatus,
    meetingTitle,
    resetMeetingForm,
    loadMeetingIntoForm,
    setMeetingAgenda,
    setMeetingActionItems,
    setMeetingCalendarUrl,
    setMeetingDecisions,
    setMeetingEndAt,
    setMeetingMeetUrl,
    setMeetingNotes,
    setMeetingParticipants,
    setMeetingProjectId,
    setMeetingRecurrence,
    setMeetingRecurrenceUntil,
    setMeetingReminderMinutes,
    setMeetingStartAt,
    setMeetingStatus,
    setMeetingTitle,
    submitMeeting,
  };
};
