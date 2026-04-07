use crate::models::{Meeting, MeetingActionItem, Task};
use chrono::Utc;
use rusqlite::{params, OptionalExtension};
use tauri::State;

use super::validation::{
    decode_json_action_items, decode_json_string_list, encode_json_action_items,
    encode_json_string_list, normalize_meeting_action_items, normalize_meeting_participants,
    normalize_meeting_range, normalize_meeting_recurrence, normalize_meeting_reminder_minutes,
    normalize_meeting_status, normalize_meeting_title, normalize_optional_date,
    normalize_optional_http_url, normalize_project_id,
};
use super::AppState;

#[tauri::command]
pub fn get_meetings(state: State<'_, AppState>) -> Result<Vec<Meeting>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, title, agenda, start_at, end_at, meet_url, calendar_event_url, project_id, participants_json, notes, decisions, action_items_json, recurrence, recurrence_until, reminder_minutes, status, created_at, updated_at
             FROM meetings
             ORDER BY
                CASE status
                    WHEN 'planned' THEN 0
                    WHEN 'live' THEN 1
                    WHEN 'done' THEN 1
                    WHEN 'missed' THEN 2
                    WHEN 'cancelled' THEN 3
                    ELSE 4
                END,
                datetime(start_at) ASC,
                updated_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
    let mut meetings = Vec::new();
    while let Some(row) = rows.next().map_err(|e| e.to_string())? {
        meetings.push(Meeting {
            id: row.get(0).map_err(|e| e.to_string())?,
            title: row.get(1).map_err(|e| e.to_string())?,
            agenda: row.get(2).map_err(|e| e.to_string())?,
            start_at: row.get(3).map_err(|e| e.to_string())?,
            end_at: row.get(4).map_err(|e| e.to_string())?,
            meet_url: row.get(5).map_err(|e| e.to_string())?,
            calendar_event_url: row.get(6).map_err(|e| e.to_string())?,
            project_id: row.get(7).map_err(|e| e.to_string())?,
            participants: decode_json_string_list(row.get(8).map_err(|e| e.to_string())?)?,
            notes: row.get(9).map_err(|e| e.to_string())?,
            decisions: row.get(10).map_err(|e| e.to_string())?,
            action_items: decode_json_action_items(row.get(11).map_err(|e| e.to_string())?)?,
            recurrence: row.get(12).map_err(|e| e.to_string())?,
            recurrence_until: row.get(13).map_err(|e| e.to_string())?,
            reminder_minutes: row.get(14).map_err(|e| e.to_string())?,
            status: row.get(15).map_err(|e| e.to_string())?,
            created_at: row.get(16).map_err(|e| e.to_string())?,
            updated_at: row.get(17).map_err(|e| e.to_string())?,
        });
    }

    Ok(meetings)
}

#[tauri::command]
pub fn create_meeting(
    title: String,
    agenda: String,
    start_at: String,
    end_at: String,
    meet_url: Option<String>,
    calendar_event_url: Option<String>,
    project_id: Option<i64>,
    participants: Option<Vec<String>>,
    notes: Option<String>,
    decisions: Option<String>,
    action_items: Option<Vec<MeetingActionItem>>,
    recurrence: Option<String>,
    recurrence_until: Option<String>,
    reminder_minutes: Option<i64>,
    status: Option<String>,
    state: State<'_, AppState>,
) -> Result<Meeting, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let title = normalize_meeting_title(title);
    let agenda = agenda.trim().to_string();
    let (start_at, end_at) = normalize_meeting_range(start_at, end_at)?;
    let meet_url = normalize_optional_http_url(meet_url);
    let calendar_event_url = normalize_optional_http_url(calendar_event_url);
    let project_id = normalize_project_id(&conn, project_id)?;
    let participants = normalize_meeting_participants(participants);
    let participants_json = encode_json_string_list(&participants)?;
    let notes = notes.unwrap_or_default().trim().to_string();
    let decisions = decisions.unwrap_or_default().trim().to_string();
    let action_items = normalize_meeting_action_items(action_items);
    let action_items_json = encode_json_action_items(&action_items)?;
    let recurrence = normalize_meeting_recurrence(recurrence);
    let recurrence_until = normalize_optional_date(recurrence_until);
    let reminder_minutes = normalize_meeting_reminder_minutes(reminder_minutes);
    let status = normalize_meeting_status(status);

    conn.execute(
        "INSERT INTO meetings (title, agenda, start_at, end_at, meet_url, calendar_event_url, project_id, participants_json, notes, decisions, action_items_json, recurrence, recurrence_until, reminder_minutes, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
        params![
            title,
            agenda,
            start_at,
            end_at,
            meet_url,
            calendar_event_url,
            project_id,
            participants_json,
            notes,
            decisions,
            action_items_json,
            recurrence,
            recurrence_until,
            reminder_minutes,
            status,
            now,
            now
        ],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    Ok(Meeting {
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
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_meeting(
    id: i64,
    title: String,
    agenda: String,
    start_at: String,
    end_at: String,
    meet_url: Option<String>,
    calendar_event_url: Option<String>,
    project_id: Option<i64>,
    participants: Option<Vec<String>>,
    notes: Option<String>,
    decisions: Option<String>,
    action_items: Option<Vec<MeetingActionItem>>,
    recurrence: Option<String>,
    recurrence_until: Option<String>,
    reminder_minutes: Option<i64>,
    status: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let title = normalize_meeting_title(title);
    let agenda = agenda.trim().to_string();
    let (start_at, end_at) = normalize_meeting_range(start_at, end_at)?;
    let meet_url = normalize_optional_http_url(meet_url);
    let calendar_event_url = normalize_optional_http_url(calendar_event_url);
    let project_id = normalize_project_id(&conn, project_id)?;
    let participants_json =
        encode_json_string_list(&normalize_meeting_participants(participants))?;
    let notes = notes.unwrap_or_default().trim().to_string();
    let decisions = decisions.unwrap_or_default().trim().to_string();
    let action_items_json =
        encode_json_action_items(&normalize_meeting_action_items(action_items))?;
    let recurrence = normalize_meeting_recurrence(recurrence);
    let recurrence_until = normalize_optional_date(recurrence_until);
    let reminder_minutes = normalize_meeting_reminder_minutes(reminder_minutes);
    let status = normalize_meeting_status(status);

    conn.execute(
        "UPDATE meetings
         SET title = ?1,
             agenda = ?2,
             start_at = ?3,
             end_at = ?4,
             meet_url = ?5,
             calendar_event_url = ?6,
             project_id = ?7,
             participants_json = ?8,
             notes = ?9,
             decisions = ?10,
             action_items_json = ?11,
             recurrence = ?12,
             recurrence_until = ?13,
             reminder_minutes = ?14,
             status = ?15,
             updated_at = ?16
         WHERE id = ?17",
        params![
            title,
            agenda,
            start_at,
            end_at,
            meet_url,
            calendar_event_url,
            project_id,
            participants_json,
            notes,
            decisions,
            action_items_json,
            recurrence,
            recurrence_until,
            reminder_minutes,
            status,
            now,
            id
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_meeting(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM meetings WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn materialize_meeting_action_items(
    meeting_id: i64,
    due_date: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<Task>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let due_date = normalize_optional_date(due_date);
    let meeting_row: Option<(Option<i64>, String)> = conn
        .query_row(
            "SELECT project_id, action_items_json FROM meetings WHERE id = ?1",
            params![meeting_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    let Some((project_id, action_items_json)) = meeting_row else {
        return Ok(Vec::new());
    };

    let mut action_items = decode_json_action_items(action_items_json)?;
    let mut created_tasks = Vec::new();

    for action_item in &mut action_items {
        if action_item.task_id.is_some() || action_item.title.trim().is_empty() {
            continue;
        }

        conn.execute(
            "INSERT INTO tasks (title, description, status, priority, project_id, goal_id, due_date, completed_at, time_estimate_minutes, timer_started_at, timer_accumulated_seconds, created_at, updated_at)
             VALUES (?1, ?2, 'todo', 'medium', ?3, NULL, ?4, NULL, 0, NULL, 0, ?5, ?6)",
            params![
                action_item.title.trim(),
                String::new(),
                project_id,
                due_date,
                now,
                now
            ],
        )
        .map_err(|e| e.to_string())?;

        let task_id = conn.last_insert_rowid();
        action_item.task_id = Some(task_id);

        created_tasks.push(Task {
            id: task_id,
            title: action_item.title.trim().to_string(),
            description: String::new(),
            status: "todo".to_string(),
            priority: "medium".to_string(),
            project_id,
            goal_id: None,
            due_date: due_date.clone(),
            recurrence: "none".to_string(),
            recurrence_until: None,
            parent_task_id: None,
            completed_at: None,
            time_estimate_minutes: 0,
            timer_started_at: None,
            timer_accumulated_seconds: 0,
            created_at: now.clone(),
            updated_at: now.clone(),
        });
    }

    let updated_action_items_json = encode_json_action_items(&action_items)?;
    conn.execute(
        "UPDATE meetings SET action_items_json = ?1, updated_at = ?2 WHERE id = ?3",
        params![updated_action_items_json, now, meeting_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(created_tasks)
}
