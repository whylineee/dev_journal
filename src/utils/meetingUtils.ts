import { addDays, format, isBefore, isEqual, parseISO, startOfDay } from "date-fns";
import { Meeting, MeetingStatus } from "../types";

export interface MeetingOccurrence {
  occurrence_id: string;
  meeting_id: number;
  title: string;
  start: Date;
  end: Date;
  status: MeetingStatus;
  meeting: Meeting;
}

const isWeekday = (date: Date) => {
  const day = date.getDay();
  return day >= 1 && day <= 5;
};

export const getMeetingDisplayStatus = (
  meeting: Meeting,
  occurrenceStart: Date,
  occurrenceEnd: Date,
  now = new Date()
): MeetingStatus => {
  if (meeting.status === "done" || meeting.status === "cancelled" || meeting.status === "missed") {
    return meeting.status;
  }

  if (meeting.status === "live" || (now >= occurrenceStart && now <= occurrenceEnd)) {
    return "live";
  }

  if (now > occurrenceEnd) {
    return "missed";
  }

  return "planned";
};

export const expandMeetingOccurrences = (
  meetings: Meeting[],
  rangeStart: Date,
  numberOfDays: number
) => {
  const dayStart = startOfDay(rangeStart);
  const dayEnd = addDays(dayStart, numberOfDays);
  const occurrences: MeetingOccurrence[] = [];

  meetings.forEach((meeting) => {
    const templateStart = parseISO(meeting.start_at);
    const templateEnd = parseISO(meeting.end_at);
    if (!Number.isFinite(templateStart.getTime()) || !Number.isFinite(templateEnd.getTime())) {
      return;
    }

    if (meeting.recurrence === "none") {
      if (templateEnd > dayStart && templateStart < dayEnd) {
        occurrences.push({
          occurrence_id: `${meeting.id}:${meeting.start_at}`,
          meeting_id: meeting.id,
          title: meeting.title,
          start: templateStart,
          end: templateEnd,
          status: getMeetingDisplayStatus(meeting, templateStart, templateEnd),
          meeting,
        });
      }
      return;
    }

    const recurrenceUntil = meeting.recurrence_until ? parseISO(meeting.recurrence_until) : null;
    for (let offset = 0; offset < numberOfDays; offset += 1) {
      const occurrenceDay = addDays(dayStart, offset);
      if (recurrenceUntil && isBefore(recurrenceUntil, occurrenceDay)) {
        continue;
      }
      if (isBefore(occurrenceDay, startOfDay(templateStart))) {
        continue;
      }

      const sameWeekday = occurrenceDay.getDay() === templateStart.getDay();
      const shouldInclude =
        meeting.recurrence === "daily" ||
        (meeting.recurrence === "weekdays" && isWeekday(occurrenceDay)) ||
        (meeting.recurrence === "weekly" && sameWeekday);

      if (!shouldInclude) {
        continue;
      }

      const occurrenceStart = new Date(occurrenceDay);
      occurrenceStart.setHours(
        templateStart.getHours(),
        templateStart.getMinutes(),
        templateStart.getSeconds(),
        0
      );
      const durationMs = templateEnd.getTime() - templateStart.getTime();
      const occurrenceEnd = new Date(occurrenceStart.getTime() + durationMs);

      if (occurrenceEnd <= dayStart || occurrenceStart >= dayEnd) {
        continue;
      }

      occurrences.push({
        occurrence_id: `${meeting.id}:${format(occurrenceStart, "yyyy-MM-dd'T'HH:mm:ssxxx")}`,
        meeting_id: meeting.id,
        title: meeting.title,
        start: occurrenceStart,
        end: occurrenceEnd,
        status: getMeetingDisplayStatus(meeting, occurrenceStart, occurrenceEnd),
        meeting,
      });
    }
  });

  return occurrences.sort((a, b) => {
    if (isEqual(a.start, b.start)) {
      return a.end.getTime() - b.end.getTime();
    }
    return a.start.getTime() - b.start.getTime();
  });
};
