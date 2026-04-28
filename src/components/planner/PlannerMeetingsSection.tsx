import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import VideoCallIcon from "@mui/icons-material/VideoCall";
import { alpha, type SxProps, type Theme } from "@mui/material/styles";
import {
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { format, parseISO } from "date-fns";
import { type MouseEvent, useState } from "react";
import type { Meeting, MeetingRecurrence, MeetingStatus } from "../../types";

interface PlannerMeetingsSectionProps {
  busy: boolean;
  buildGoogleCalendarLink: (params: {
    title: string;
    details: string;
    startAt: string;
    endAt: string;
    location?: string;
  }) => string;
  deleteMeeting: (meetingId: number) => void;
  editingMeetingId: number | null;
  isSectionCollapsed: (section: "meetings") => boolean;
  loadMeetingIntoForm: (meeting: Meeting) => void;
  materializeMeetingActionItems: (meetingId: number, dueDate: string) => void;
  meetingActionItems: string;
  meetingCalendarUrl: string;
  meetingDayBuckets: Array<{ day: string; count: number }>;
  meetingDecisions: string;
  meetingEndAt: string;
  meetingFeedback: string;
  meetingMeetUrl: string;
  meetingNotes: string;
  meetingParticipants: string;
  meetingProjectId: number | "";
  meetingRecurrence: MeetingRecurrence;
  meetingRecurrenceUntil: string;
  meetingReminderMinutes: number;
  meetingStartAt: string;
  meetingStatus: MeetingStatus;
  meetingTitle: string;
  onOpenExternalUrl: (url: string, fallbackMessage: string) => void;
  plannerSurfaceSx: SxProps<Theme>;
  projects: Array<{ id: number; name: string }>;
  resetMeetingForm: () => void;
  setMeetingActionItems: (value: string) => void;
  setMeetingAgenda: (value: string) => void;
  setMeetingCalendarUrl: (value: string) => void;
  setMeetingDecisions: (value: string) => void;
  setMeetingEndAt: (value: string) => void;
  setMeetingMeetUrl: (value: string) => void;
  setMeetingNotes: (value: string) => void;
  setMeetingParticipants: (value: string) => void;
  setMeetingProjectId: (value: number | "") => void;
  setMeetingRecurrence: (value: MeetingRecurrence) => void;
  setMeetingRecurrenceUntil: (value: string) => void;
  setMeetingReminderMinutes: (value: number) => void;
  setMeetingStartAt: (value: string) => void;
  setMeetingStatus: (value: MeetingStatus) => void;
  setMeetingTitle: (value: string) => void;
  setWorkflowStatus: (meeting: Meeting, status: MeetingStatus) => void;
  submitMeeting: () => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
  today: string;
  toggleSection: (section: "meetings") => void;
  upcomingMeetings: Array<{
    occurrence_id: string;
    meeting_id: number;
    title: string;
    start: Date;
    end: Date;
    status: MeetingStatus;
    meeting: Meeting;
  }>;
  meetingAgenda: string;
}

export const PlannerMeetingsSection = ({
  busy,
  buildGoogleCalendarLink,
  deleteMeeting,
  editingMeetingId,
  isSectionCollapsed,
  loadMeetingIntoForm,
  materializeMeetingActionItems,
  meetingActionItems,
  meetingAgenda,
  meetingCalendarUrl,
  meetingDayBuckets,
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
  onOpenExternalUrl,
  plannerSurfaceSx,
  projects,
  resetMeetingForm,
  setMeetingActionItems,
  setMeetingAgenda,
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
  setWorkflowStatus,
  submitMeeting,
  t,
  today,
  toggleSection,
  upcomingMeetings,
}: PlannerMeetingsSectionProps) => {
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuMeetingId, setMenuMeetingId] = useState<number | null>(null);
  const [showAdvancedFormFields, setShowAdvancedFormFields] = useState(false);
  const isMenuOpen = Boolean(menuAnchorEl) && menuMeetingId !== null;

  const openMeetingMenu = (event: MouseEvent<HTMLElement>, meetingId: number) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuMeetingId(meetingId);
  };

  const closeMeetingMenu = () => {
    setMenuAnchorEl(null);
    setMenuMeetingId(null);
  };

  const renderSectionToggle = () => (
    <IconButton
      size="small"
      onClick={() => toggleSection("meetings")}
      aria-label={isSectionCollapsed("meetings") ? t("Expand section") : t("Collapse section")}
      title={isSectionCollapsed("meetings") ? t("Expand section") : t("Collapse section")}
      sx={{ opacity: 0.5, "&:hover": { opacity: 1 } }}
    >
      {isSectionCollapsed("meetings") ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
    </IconButton>
  );

  return (
    <Box sx={{ ...plannerSurfaceSx, mb: { xs: 2, md: 2.5 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {t("Meetings")}
        </Typography>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Chip
            size="small"
            variant="outlined"
            icon={<CalendarMonthIcon sx={{ fontSize: 14 }} />}
            label={`${meetingDayBuckets.reduce((sum, item) => sum + item.count, 0)} ${t("this week")}`}
          />
          {renderSectionToggle()}
        </Stack>
      </Stack>

      <Collapse in={!isSectionCollapsed("meetings")} timeout="auto" unmountOnExit>
        <Box sx={{ mt: 2, display: "grid", gap: 2 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "1.1fr 1fr" }, gap: 2 }}>
            <Box>
              <Stack direction="row" spacing={0.8} sx={{ mb: 1.5, flexWrap: "wrap" }}>
                {meetingDayBuckets.map((bucket) => (
                  <Chip
                    key={bucket.day}
                    size="small"
                    variant={bucket.day === today ? "filled" : "outlined"}
                    color={bucket.day === today ? "primary" : "default"}
                    label={`${format(parseISO(bucket.day), "EEE d")} · ${bucket.count}`}
                  />
                ))}
              </Stack>

              <Stack spacing={1}>
                {upcomingMeetings.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {t("No meetings yet.")}
                  </Typography>
                ) : (
                  upcomingMeetings.map((occurrence) => {
                    const meeting = occurrence.meeting;
                    const meetingProject = projects.find((project) => project.id === meeting.project_id) ?? null;
                    const calendarUrl =
                      meeting.calendar_event_url ??
                      buildGoogleCalendarLink({
                        title: meeting.title,
                        details: [meeting.agenda, meeting.notes, meeting.decisions].filter(Boolean).join("\n\n"),
                        startAt: occurrence.start.toISOString(),
                        endAt: occurrence.end.toISOString(),
                        location: meeting.meet_url ?? undefined,
                      });

                    const statusLabel =
                      occurrence.status === "done"
                        ? t("Done")
                        : occurrence.status === "live"
                          ? t("Live")
                          : occurrence.status === "missed"
                            ? t("Missed")
                            : occurrence.status === "cancelled"
                              ? t("Cancelled")
                              : t("Planned");
                    const primaryActionLabel =
                      occurrence.status !== "done" ? t("Mark done") : t("Reopen");
                    return (
                      <Box
                        key={occurrence.occurrence_id}
                        sx={{
                          borderRadius: 2,
                          border: "1px solid",
                          borderColor: "divider",
                          p: 1.25,
                          bgcolor: alpha("#ffffff", 0.03),
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" spacing={1}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                              {meeting.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {format(occurrence.start, "MMM d, HH:mm")} - {format(occurrence.end, "HH:mm")}
                            </Typography>
                            {meetingProject ? (
                              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                {t("Project")}: {meetingProject.name}
                              </Typography>
                            ) : null}
                            {meeting.agenda ? (
                              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.35 }}>
                                {meeting.agenda}
                              </Typography>
                            ) : null}
                          </Box>
                          <Stack alignItems="flex-end" spacing={0.5}>
                            <Chip
                              size="small"
                              label={statusLabel}
                              color={
                                occurrence.status === "done"
                                  ? "success"
                                  : occurrence.status === "live"
                                    ? "warning"
                                    : occurrence.status === "missed"
                                      ? "error"
                                      : occurrence.status === "cancelled"
                                        ? "default"
                                        : "primary"
                              }
                              variant={occurrence.status === "planned" ? "filled" : "outlined"}
                            />
                            {meeting.recurrence !== "none" ? (
                              <Chip size="small" variant="outlined" label={t(meeting.recurrence === "weekdays" ? "Weekdays" : meeting.recurrence === "weekly" ? "Weekly" : "Daily")} />
                            ) : null}
                          </Stack>
                        </Stack>

                        <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: "wrap" }}>
                          {meeting.participants.slice(0, 3).map((participant, index) => (
                            <Chip key={`${participant}-${index}`} size="small" variant="outlined" label={participant} />
                          ))}
                          {meeting.action_items.length > 0 ? (
                            <Chip size="small" variant="outlined" label={`${t("Action items")}: ${meeting.action_items.length}`} />
                          ) : null}
                          {meeting.reminder_minutes > 0 ? (
                            <Chip size="small" variant="outlined" label={`${t("Reminder")}: ${meeting.reminder_minutes}m`} />
                          ) : null}
                        </Stack>

                        <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: "wrap" }}>
                          {meeting.meet_url ? (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<VideoCallIcon />}
                              onClick={() => onOpenExternalUrl(meeting.meet_url!, t("Unable to open meeting URL."))}
                            >
                              {t("Open Meet")}
                            </Button>
                          ) : null}
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<CalendarMonthIcon />}
                            onClick={() => onOpenExternalUrl(calendarUrl, t("Unable to open calendar URL."))}
                          >
                            {t("Open Calendar")}
                          </Button>
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => materializeMeetingActionItems(meeting.id, format(occurrence.start, "yyyy-MM-dd"))}
                            disabled={busy || meeting.action_items.every((item) => item.task_id !== null)}
                          >
                            {t("Create tasks")}
                          </Button>
                          <Button size="small" onClick={() => loadMeetingIntoForm(meeting)} startIcon={<EditOutlinedIcon />}>
                            {t("Edit")}
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() =>
                              setWorkflowStatus(
                                meeting,
                                occurrence.status !== "done" ? "done" : "planned"
                              )
                            }
                            disabled={busy}
                          >
                            {primaryActionLabel}
                          </Button>
                          <IconButton
                            size="small"
                            aria-label={t("More actions")}
                            onClick={(event) => openMeetingMenu(event, meeting.id)}
                          >
                            <MoreHorizIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Box>
                    );
                  })
                )}
              </Stack>
              <Menu
                anchorEl={menuAnchorEl}
                open={isMenuOpen}
                onClose={closeMeetingMenu}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
              >
                {(() => {
                  const targetMeeting = upcomingMeetings.find(
                    (occurrence) => occurrence.meeting.id === menuMeetingId
                  )?.meeting;
                  if (!targetMeeting) {
                    return null;
                  }
                  const targetOccurrence = upcomingMeetings.find(
                    (occurrence) => occurrence.meeting.id === menuMeetingId
                  );

                  return (
                    <>
                      {targetOccurrence &&
                      targetOccurrence.status !== "live" &&
                      targetOccurrence.status !== "done" ? (
                        <MenuItem
                          onClick={() => {
                            setWorkflowStatus(targetMeeting, "live");
                            closeMeetingMenu();
                          }}
                        >
                          <ListItemText>{t("Go live")}</ListItemText>
                        </MenuItem>
                      ) : null}
                      {targetMeeting.status !== "cancelled" ? (
                        <MenuItem
                          onClick={() => {
                            setWorkflowStatus(targetMeeting, "cancelled");
                            closeMeetingMenu();
                          }}
                        >
                          <ListItemText>{t("Cancel")}</ListItemText>
                        </MenuItem>
                      ) : null}
                      <MenuItem
                        onClick={() => {
                          deleteMeeting(targetMeeting.id);
                          closeMeetingMenu();
                        }}
                        sx={{ color: "error.main" }}
                      >
                        <ListItemIcon sx={{ color: "error.main" }}>
                          <DeleteOutlineIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{t("Delete")}</ListItemText>
                      </MenuItem>
                    </>
                  );
                })()}
              </Menu>
            </Box>

            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: alpha("#ffffff", 0.03),
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {editingMeetingId === null ? t("Schedule meeting") : t("Edit meeting")}
                </Typography>
                {editingMeetingId !== null ? (
                  <Button size="small" color="inherit" onClick={resetMeetingForm}>
                    {t("Cancel")}
                  </Button>
                ) : null}
              </Stack>
              <Stack spacing={1}>
                <TextField fullWidth size="small" placeholder={t("Meeting title")} value={meetingTitle} onChange={(event) => setMeetingTitle(event.target.value)} />
                <TextField fullWidth size="small" multiline minRows={2} placeholder={t("Agenda")} value={meetingAgenda} onChange={(event) => setMeetingAgenda(event.target.value)} />
                <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                  <TextField fullWidth size="small" type="datetime-local" label={t("Start")} value={meetingStartAt} onChange={(event) => setMeetingStartAt(event.target.value)} InputLabelProps={{ shrink: true }} />
                  <TextField fullWidth size="small" type="datetime-local" label={t("End")} value={meetingEndAt} onChange={(event) => setMeetingEndAt(event.target.value)} InputLabelProps={{ shrink: true }} />
                </Stack>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                  <TextField
                    select
                    size="small"
                    label={t("Repeat")}
                    value={meetingRecurrence}
                    onChange={(event) => setMeetingRecurrence(event.target.value as MeetingRecurrence)}
                    SelectProps={{ native: true }}
                    fullWidth
                  >
                    <option value="none">{t("Does not repeat")}</option>
                    <option value="daily">{t("Daily")}</option>
                    <option value="weekdays">{t("Weekdays")}</option>
                    <option value="weekly">{t("Weekly")}</option>
                  </TextField>
                  <TextField fullWidth size="small" type="date" label={t("Repeat until")} value={meetingRecurrenceUntil} onChange={(event) => setMeetingRecurrenceUntil(event.target.value)} InputLabelProps={{ shrink: true }} disabled={meetingRecurrence === "none"} />
                </Stack>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                  <TextField fullWidth size="small" label={t("Reminder (minutes)")} type="number" value={meetingReminderMinutes} onChange={(event) => setMeetingReminderMinutes(Number(event.target.value) || 0)} inputProps={{ min: 0, max: 240, step: 5 }} />
                  <TextField
                    select
                    size="small"
                    label={t("Status")}
                    value={meetingStatus}
                    onChange={(event) => setMeetingStatus(event.target.value as MeetingStatus)}
                    SelectProps={{ native: true }}
                    fullWidth
                  >
                    <option value="planned">{t("Planned")}</option>
                    <option value="live">{t("Live")}</option>
                    <option value="done">{t("Done")}</option>
                    <option value="missed">{t("Missed")}</option>
                    <option value="cancelled">{t("Cancelled")}</option>
                  </TextField>
                </Stack>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setShowAdvancedFormFields((prev) => !prev)}
                  sx={{ alignSelf: "flex-start" }}
                >
                  {showAdvancedFormFields ? t("Hide advanced fields") : t("Show advanced fields")}
                </Button>
                <Collapse in={showAdvancedFormFields} timeout="auto" unmountOnExit>
                  <Stack spacing={1}>
                    <TextField fullWidth size="small" placeholder={t("Google Meet URL")} value={meetingMeetUrl} onChange={(event) => setMeetingMeetUrl(event.target.value)} />
                    <TextField fullWidth size="small" placeholder={t("Calendar event URL (optional)")} value={meetingCalendarUrl} onChange={(event) => setMeetingCalendarUrl(event.target.value)} />
                    <TextField
                      select
                      size="small"
                      value={meetingProjectId === "" ? "" : String(meetingProjectId)}
                      onChange={(event) => setMeetingProjectId(event.target.value === "" ? "" : Number(event.target.value))}
                      SelectProps={{ native: true }}
                      fullWidth
                    >
                      <option value="">{t("No project")}</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </TextField>
                    <TextField fullWidth size="small" multiline minRows={2} label={t("Participants")} placeholder={t("One participant per line")} value={meetingParticipants} onChange={(event) => setMeetingParticipants(event.target.value)} />
                    <TextField fullWidth size="small" multiline minRows={3} label={t("Notes")} value={meetingNotes} onChange={(event) => setMeetingNotes(event.target.value)} />
                    <TextField fullWidth size="small" multiline minRows={2} label={t("Decisions")} value={meetingDecisions} onChange={(event) => setMeetingDecisions(event.target.value)} />
                    <TextField fullWidth size="small" multiline minRows={3} label={t("Action items")} placeholder={t("One action item per line")} value={meetingActionItems} onChange={(event) => setMeetingActionItems(event.target.value)} />
                  </Stack>
                </Collapse>

                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                  <Button variant="contained" size="small" startIcon={<VideoCallIcon />} disabled={busy || meetingTitle.trim().length === 0} onClick={submitMeeting}>
                    {editingMeetingId === null ? t("Add meeting") : t("Save meeting")}
                  </Button>
                  {editingMeetingId !== null ? (
                    <Button variant="outlined" size="small" onClick={resetMeetingForm}>
                      {t("Clear")}
                    </Button>
                  ) : null}
                </Stack>
                {meetingFeedback ? (
                  <Typography variant="caption" color="text.secondary">
                    {meetingFeedback}
                  </Typography>
                ) : null}
              </Stack>
            </Box>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
};
