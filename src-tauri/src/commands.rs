use crate::models::{
    Entry, Goal, GoalMilestone, Habit, HabitWithLogs, Meeting, MeetingActionItem, Page, Project,
    ProjectBranch, Task, TaskSubtask,
};
use chrono::{Datelike, Duration, NaiveDate, Utc};
use rusqlite::Connection;
use rusqlite::{params, OptionalExtension};
use serde::Deserialize;
use serde_json::{from_str, to_string};
use std::collections::HashSet;
use std::sync::Mutex;
use tauri::State;

pub struct AppState {
    pub db: Mutex<Connection>,
}

/// JSON payload accepted by the import command.
/// Each field is optional in incoming backup files.
#[derive(Debug, Default, Deserialize)]
pub struct BackupPayload {
    #[serde(default)]
    pub entries: Vec<BackupEntryInput>,
    #[serde(default)]
    pub pages: Vec<BackupPageInput>,
    #[serde(default)]
    pub tasks: Vec<BackupTaskInput>,
    #[serde(default)]
    pub task_subtasks: Vec<BackupTaskSubtaskInput>,
    #[serde(default)]
    pub goals: Vec<BackupGoalInput>,
    #[serde(default)]
    pub goal_milestones: Vec<BackupGoalMilestoneInput>,
    #[serde(default)]
    pub projects: Vec<BackupProjectInput>,
    #[serde(default)]
    pub project_branches: Vec<BackupProjectBranchInput>,
    #[serde(default)]
    pub habits: Vec<BackupHabitInput>,
    #[serde(default)]
    pub habit_logs: Vec<BackupHabitLogInput>,
    #[serde(default)]
    pub meetings: Vec<BackupMeetingInput>,
}

#[derive(Debug, Deserialize)]
pub struct BackupEntryInput {
    pub date: String,
    pub yesterday: String,
    pub today: String,
    pub project_id: Option<i64>,
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BackupPageInput {
    pub id: Option<i64>,
    pub title: String,
    pub content: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BackupTaskInput {
    pub id: Option<i64>,
    pub title: String,
    pub description: String,
    pub status: String,
    pub priority: Option<String>,
    pub project_id: Option<i64>,
    pub goal_id: Option<i64>,
    pub due_date: Option<String>,
    pub recurrence: Option<String>,
    pub recurrence_until: Option<String>,
    pub parent_task_id: Option<i64>,
    pub completed_at: Option<String>,
    pub time_estimate_minutes: Option<i64>,
    pub timer_started_at: Option<String>,
    pub timer_accumulated_seconds: Option<i64>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BackupTaskSubtaskInput {
    pub id: Option<i64>,
    pub task_id: i64,
    pub title: String,
    pub completed: Option<bool>,
    pub position: Option<i64>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BackupGoalInput {
    pub id: Option<i64>,
    pub title: String,
    pub description: Option<String>,
    pub status: Option<String>,
    pub progress: Option<i64>,
    pub project_id: Option<i64>,
    pub target_date: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BackupGoalMilestoneInput {
    pub id: Option<i64>,
    pub goal_id: i64,
    pub title: String,
    pub completed: Option<bool>,
    pub position: Option<i64>,
    pub due_date: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BackupProjectInput {
    pub id: Option<i64>,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub status: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BackupProjectBranchInput {
    pub id: Option<i64>,
    pub project_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub status: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BackupHabitInput {
    pub id: Option<i64>,
    pub title: String,
    pub description: Option<String>,
    pub target_per_week: Option<i64>,
    pub color: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BackupHabitLogInput {
    pub id: Option<i64>,
    pub habit_id: i64,
    pub date: String,
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BackupMeetingInput {
    pub id: Option<i64>,
    pub title: String,
    pub agenda: Option<String>,
    pub start_at: String,
    pub end_at: String,
    pub meet_url: Option<String>,
    pub calendar_event_url: Option<String>,
    pub project_id: Option<i64>,
    pub participants: Option<Vec<String>>,
    pub notes: Option<String>,
    pub decisions: Option<String>,
    pub action_items: Option<Vec<MeetingActionItem>>,
    pub recurrence: Option<String>,
    pub recurrence_until: Option<String>,
    pub reminder_minutes: Option<i64>,
    pub status: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

fn normalize_status(status: String) -> String {
    match status.as_str() {
        "todo" | "in_progress" | "done" => status,
        _ => "todo".to_string(),
    }
}

fn normalize_priority(priority: Option<String>) -> String {
    match priority.as_deref() {
        Some("low") | Some("medium") | Some("high") | Some("urgent") => {
            priority.unwrap_or_else(|| "medium".to_string())
        }
        _ => "medium".to_string(),
    }
}

fn normalize_task_recurrence(recurrence: Option<String>) -> String {
    match recurrence.as_deref() {
        Some("none") | Some("daily") | Some("weekdays") | Some("weekly") => {
            recurrence.unwrap_or_else(|| "none".to_string())
        }
        _ => "none".to_string(),
    }
}

/// Caps estimate to a sane range (0..=7 days) to avoid malformed values.
fn normalize_time_estimate_minutes(value: Option<i64>) -> i64 {
    value.unwrap_or(0).clamp(0, 10_080)
}

fn normalize_accumulated_seconds(value: Option<i64>) -> i64 {
    value.unwrap_or(0).max(0)
}

/// Converts an RFC3339 timestamp into seconds from now.
/// Invalid timestamps are treated as zero elapsed seconds.
fn elapsed_since(started_at: &str) -> i64 {
    let parsed = chrono::DateTime::parse_from_rfc3339(started_at);
    if let Ok(date_time) = parsed {
        return (Utc::now() - date_time.with_timezone(&Utc))
            .num_seconds()
            .max(0);
    }

    0
}

fn normalize_goal_status(status: Option<String>) -> String {
    match status.as_deref() {
        Some("active") | Some("paused") | Some("completed") | Some("archived") => {
            status.unwrap_or_else(|| "active".to_string())
        }
        _ => "active".to_string(),
    }
}

fn normalize_project_status(status: Option<String>) -> String {
    match status.as_deref() {
        Some("active") | Some("paused") | Some("completed") | Some("archived") => {
            status.unwrap_or_else(|| "active".to_string())
        }
        _ => "active".to_string(),
    }
}

fn normalize_project_branch_status(status: Option<String>) -> String {
    match status.as_deref() {
        Some("open") | Some("merged") => status.unwrap_or_else(|| "open".to_string()),
        _ => "open".to_string(),
    }
}

fn normalize_project_branch_name(name: String) -> String {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        "main".to_string()
    } else {
        trimmed.to_string()
    }
}

fn normalize_meeting_title(title: String) -> String {
    let trimmed = title.trim();
    if trimmed.is_empty() {
        "Untitled meeting".to_string()
    } else {
        trimmed.to_string()
    }
}

fn normalize_optional_text(value: Option<String>) -> Option<String> {
    value.and_then(|raw| {
        let trimmed = raw.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    })
}

fn normalize_meeting_status(status: Option<String>) -> String {
    match status.as_deref() {
        Some("planned") | Some("live") | Some("done") | Some("missed") | Some("cancelled") => {
            status.unwrap_or_else(|| "planned".to_string())
        }
        _ => "planned".to_string(),
    }
}

fn normalize_meeting_recurrence(recurrence: Option<String>) -> String {
    match recurrence.as_deref() {
        Some("none") | Some("daily") | Some("weekdays") | Some("weekly") => {
            recurrence.unwrap_or_else(|| "none".to_string())
        }
        _ => "none".to_string(),
    }
}

fn normalize_meeting_reminder_minutes(value: Option<i64>) -> i64 {
    value.unwrap_or(10).clamp(0, 240)
}

fn normalize_meeting_participants(participants: Option<Vec<String>>) -> Vec<String> {
    participants
        .unwrap_or_default()
        .into_iter()
        .map(|participant| participant.trim().to_string())
        .filter(|participant| !participant.is_empty())
        .collect()
}

fn normalize_meeting_action_items(
    action_items: Option<Vec<MeetingActionItem>>,
) -> Vec<MeetingActionItem> {
    action_items
        .unwrap_or_default()
        .into_iter()
        .enumerate()
        .filter_map(|(index, item)| {
            let title = item.title.trim().to_string();
            if title.is_empty() {
                return None;
            }

            let id = if item.id.trim().is_empty() {
                format!("item-{}-{}", Utc::now().timestamp_millis(), index)
            } else {
                item.id.trim().to_string()
            };

            Some(MeetingActionItem {
                id,
                title,
                completed: item.completed,
                task_id: item.task_id,
            })
        })
        .collect()
}

fn encode_json_string_list(values: &[String]) -> Result<String, String> {
    to_string(values).map_err(|e| e.to_string())
}

fn decode_json_string_list(value: String) -> Result<Vec<String>, String> {
    if value.trim().is_empty() {
        return Ok(Vec::new());
    }
    from_str::<Vec<String>>(&value).map_err(|e| e.to_string())
}

fn encode_json_action_items(values: &[MeetingActionItem]) -> Result<String, String> {
    to_string(values).map_err(|e| e.to_string())
}

fn decode_json_action_items(value: String) -> Result<Vec<MeetingActionItem>, String> {
    if value.trim().is_empty() {
        return Ok(Vec::new());
    }
    from_str::<Vec<MeetingActionItem>>(&value).map_err(|e| e.to_string())
}

fn parse_datetime_utc(value: &str) -> Result<chrono::DateTime<Utc>, String> {
    chrono::DateTime::parse_from_rfc3339(value)
        .map(|datetime| datetime.with_timezone(&Utc))
        .map_err(|_| "Invalid date-time format".to_string())
}

fn normalize_meeting_range(start_at: String, end_at: String) -> Result<(String, String), String> {
    let normalized_start = parse_datetime_utc(start_at.trim())?;
    let normalized_end = parse_datetime_utc(end_at.trim())?;

    if normalized_end <= normalized_start {
        return Err("Meeting end time must be after start time".to_string());
    }

    Ok((normalized_start.to_rfc3339(), normalized_end.to_rfc3339()))
}

fn normalize_project_color(color: Option<String>) -> String {
    let fallback = "#60a5fa".to_string();
    let value = color.unwrap_or_else(|| fallback.clone());
    if value.trim().is_empty() {
        fallback
    } else {
        value
    }
}

fn normalize_project_name(name: String) -> String {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        "Untitled project".to_string()
    } else {
        trimmed.to_string()
    }
}

fn normalize_project_id(conn: &Connection, project_id: Option<i64>) -> Result<Option<i64>, String> {
    let Some(project_id) = project_id else {
        return Ok(None);
    };

    let exists = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM projects WHERE id = ?1)",
            params![project_id],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|e| e.to_string())?
        == 1;

    if exists { Ok(Some(project_id)) } else { Ok(None) }
}

fn normalize_goal_id(conn: &Connection, goal_id: Option<i64>) -> Result<Option<i64>, String> {
    let Some(goal_id) = goal_id else {
        return Ok(None);
    };

    let exists = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM goals WHERE id = ?1)",
            params![goal_id],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|e| e.to_string())?
        == 1;

    if exists { Ok(Some(goal_id)) } else { Ok(None) }
}

fn normalize_required_project_id(conn: &Connection, project_id: i64) -> Result<i64, String> {
    match normalize_project_id(conn, Some(project_id))? {
        Some(id) => Ok(id),
        None => Err("Project not found".to_string()),
    }
}

fn normalize_progress(progress: Option<i64>) -> i64 {
    progress.unwrap_or(0).clamp(0, 100)
}

fn normalize_target_per_week(target_per_week: Option<i64>) -> i64 {
    target_per_week.unwrap_or(5).clamp(1, 14)
}

fn normalize_habit_color(color: Option<String>) -> String {
    let fallback = "#60a5fa".to_string();
    let value = color.unwrap_or(fallback.clone());
    if value.trim().is_empty() {
        fallback
    } else {
        value
    }
}

fn normalize_habit_date(date: String) -> String {
    if NaiveDate::parse_from_str(&date, "%Y-%m-%d").is_ok() {
        return date;
    }

    Utc::now().format("%Y-%m-%d").to_string()
}

fn normalize_subtask_title(title: String) -> String {
    let trimmed = title.trim();
    if trimmed.is_empty() {
        "Untitled subtask".to_string()
    } else {
        trimmed.to_string()
    }
}

fn normalize_goal_milestone_title(title: String) -> String {
    let trimmed = title.trim();
    if trimmed.is_empty() {
        "Untitled milestone".to_string()
    } else {
        trimmed.to_string()
    }
}

fn normalize_optional_date(value: Option<String>) -> Option<String> {
    value.and_then(|raw| {
        let trimmed = raw.trim().to_string();
        if trimmed.is_empty() {
            return None;
        }

        if NaiveDate::parse_from_str(&trimmed, "%Y-%m-%d").is_ok() {
            Some(trimmed)
        } else {
            None
        }
    })
}

fn task_exists(conn: &Connection, task_id: i64) -> Result<bool, String> {
    conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM tasks WHERE id = ?1)",
        params![task_id],
        |row| row.get::<_, i64>(0),
    )
    .map(|value| value == 1)
    .map_err(|e| e.to_string())
}

fn touch_task_updated_at(conn: &Connection, task_id: i64, now: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE tasks SET updated_at = ?1 WHERE id = ?2",
        params![now, task_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

fn compute_next_due_date(current_due_date: &str, recurrence: &str) -> Option<String> {
    let date = NaiveDate::parse_from_str(current_due_date, "%Y-%m-%d").ok()?;
    let next = match recurrence {
        "daily" => date + Duration::days(1),
        "weekdays" => {
            let mut candidate = date + Duration::days(1);
            while matches!(candidate.weekday(), chrono::Weekday::Sat | chrono::Weekday::Sun) {
                candidate += Duration::days(1);
            }
            candidate
        }
        "weekly" => date + Duration::days(7),
        _ => return None,
    };

    Some(next.format("%Y-%m-%d").to_string())
}

fn materialize_recurring_successor(conn: &Connection, task_id: i64) -> Result<(), String> {
    let task = conn
        .query_row(
            "SELECT title, description, priority, project_id, goal_id, due_date, time_estimate_minutes, recurrence, recurrence_until
             FROM tasks WHERE id = ?1",
            params![task_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, Option<i64>>(3)?,
                    row.get::<_, Option<i64>>(4)?,
                    row.get::<_, Option<String>>(5)?,
                    row.get::<_, i64>(6)?,
                    row.get::<_, String>(7)?,
                    row.get::<_, Option<String>>(8)?,
                ))
            },
        )
        .optional()
        .map_err(|e| e.to_string())?;

    let Some((title, description, priority, project_id, goal_id, due_date, time_estimate_minutes, recurrence, recurrence_until)) = task else {
        return Ok(());
    };

    if recurrence == "none" {
        return Ok(());
    }

    let Some(due_date) = due_date else {
        return Ok(());
    };

    let child_exists = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM tasks WHERE parent_task_id = ?1)",
            params![task_id],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|e| e.to_string())?
        == 1;
    if child_exists {
        return Ok(());
    }

    let Some(next_due_date) = compute_next_due_date(&due_date, &recurrence) else {
        return Ok(());
    };

    if let Some(limit) = recurrence_until.as_deref() {
        let Ok(limit_date) = NaiveDate::parse_from_str(limit, "%Y-%m-%d") else {
            return Ok(());
        };
        let Ok(next_date) = NaiveDate::parse_from_str(&next_due_date, "%Y-%m-%d") else {
            return Ok(());
        };
        if next_date > limit_date {
            return Ok(());
        }
    }

    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO tasks (
            title, description, status, priority, project_id, goal_id, due_date, recurrence,
            recurrence_until, parent_task_id, completed_at, time_estimate_minutes, timer_started_at,
            timer_accumulated_seconds, created_at, updated_at
         ) VALUES (?1, ?2, 'todo', ?3, ?4, ?5, ?6, ?7, ?8, ?9, NULL, ?10, NULL, 0, ?11, ?12)",
        params![
            title,
            description,
            priority,
            project_id,
            goal_id,
            next_due_date,
            recurrence,
            recurrence_until,
            task_id,
            time_estimate_minutes,
            now,
            now,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

fn sync_goal_progress_from_milestones(conn: &Connection, goal_id: i64) -> Result<(), String> {
    let counts = conn
        .query_row(
            "SELECT COUNT(*), COALESCE(SUM(completed), 0) FROM goal_milestones WHERE goal_id = ?1",
            params![goal_id],
            |row| Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?)),
        )
        .map_err(|e| e.to_string())?;

    let (total, completed) = counts;
    if total == 0 {
        return Ok(());
    }

    let next_progress = ((completed as f64 / total as f64) * 100.0).round() as i64;
    let current_status: String = conn
        .query_row("SELECT status FROM goals WHERE id = ?1", params![goal_id], |row| row.get(0))
        .optional()
        .map_err(|e| e.to_string())?
        .unwrap_or_else(|| "active".to_string());

    let next_status = if current_status == "archived" {
        current_status
    } else if next_progress >= 100 {
        "completed".to_string()
    } else if current_status == "completed" {
        "active".to_string()
    } else {
        current_status
    };

    conn.execute(
        "UPDATE goals SET progress = ?1, status = ?2, updated_at = ?3 WHERE id = ?4",
        params![next_progress, next_status, Utc::now().to_rfc3339(), goal_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

fn compute_current_streak(completed_dates: &[String]) -> i64 {
    let parsed_dates: HashSet<NaiveDate> = completed_dates
        .iter()
        .filter_map(|date| NaiveDate::parse_from_str(date, "%Y-%m-%d").ok())
        .collect();

    if parsed_dates.is_empty() {
        return 0;
    }

    let today = Utc::now().date_naive();
    let yesterday = today - Duration::days(1);
    let mut cursor = if parsed_dates.contains(&today) {
        today
    } else if parsed_dates.contains(&yesterday) {
        yesterday
    } else {
        return 0;
    };

    let mut streak = 0;
    while parsed_dates.contains(&cursor) {
        streak += 1;
        cursor -= Duration::days(1);
    }

    streak
}

fn compute_this_week_count(completed_dates: &[String]) -> i64 {
    let today = Utc::now().date_naive();
    let days_from_monday = i64::from(today.weekday().num_days_from_monday());
    let week_start = today - Duration::days(days_from_monday);
    let week_end = week_start + Duration::days(6);

    completed_dates
        .iter()
        .filter_map(|date| NaiveDate::parse_from_str(date, "%Y-%m-%d").ok())
        .filter(|date| *date >= week_start && *date <= week_end)
        .count() as i64
}

#[tauri::command]
pub fn get_entries(state: State<'_, AppState>) -> Result<Vec<Entry>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, date, yesterday, today, project_id, created_at FROM entries ORDER BY date DESC")
        .map_err(|e| e.to_string())?;

    let entries_iter = stmt
        .query_map([], |row| {
            Ok(Entry {
                id: row.get(0)?,
                date: row.get(1)?,
                yesterday: row.get(2)?,
                today: row.get(3)?,
                project_id: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut entries = Vec::new();
    for entry in entries_iter {
        let entry = entry.map_err(|e| e.to_string())?;
        entries.push(entry);
    }

    Ok(entries)
}

#[tauri::command]
pub fn get_entry(date: String, state: State<'_, AppState>) -> Result<Option<Entry>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, date, yesterday, today, project_id, created_at FROM entries WHERE date = ?1")
        .map_err(|e| e.to_string())?;

    let mut entries_iter = stmt
        .query_map(params![date], |row| {
            Ok(Entry {
                id: row.get(0)?,
                date: row.get(1)?,
                yesterday: row.get(2)?,
                today: row.get(3)?,
                project_id: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    if let Some(entry) = entries_iter.next() {
        Ok(Some(entry.map_err(|e| e.to_string())?))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn save_entry(
    date: String,
    yesterday: String,
    today: String,
    project_id: Option<i64>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let created_at = chrono::Utc::now().to_rfc3339();
    let project_id = normalize_project_id(&conn, project_id)?;

    conn.execute(
        "INSERT INTO entries (date, yesterday, today, project_id, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(date) DO UPDATE SET
            yesterday = excluded.yesterday,
            today = excluded.today,
            project_id = excluded.project_id",
        params![date, yesterday, today, project_id, created_at],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_entry(date: String, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM entries WHERE date = ?1", params![date])
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn search_entries(query: String, state: State<'_, AppState>) -> Result<Vec<Entry>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let search_term = format!("%{}%", query);
    let mut stmt = conn.prepare("SELECT id, date, yesterday, today, project_id, created_at FROM entries WHERE yesterday LIKE ?1 OR today LIKE ?1 ORDER BY date DESC").map_err(|e| e.to_string())?;

    let entries_iter = stmt
        .query_map(params![search_term], |row| {
            Ok(Entry {
                id: row.get(0)?,
                date: row.get(1)?,
                yesterday: row.get(2)?,
                today: row.get(3)?,
                project_id: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut entries = Vec::new();
    for entry in entries_iter {
        entries.push(entry.map_err(|e| e.to_string())?);
    }

    Ok(entries)
}

#[tauri::command]
pub fn get_git_commits() -> Result<Vec<String>, String> {
    let output = match std::process::Command::new("git")
        .args(["log", "--since=midnight", "--oneline"])
        .current_dir(std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from(".")))
        .output()
    {
        Ok(output) => output,
        Err(_) => return Ok(vec![]),
    };

    if output.status.success() {
        let stdout = String::from_utf8(output.stdout).unwrap_or_default();
        let commits: Vec<String> = stdout.lines().map(|s| s.to_string()).collect();
        Ok(commits)
    } else {
        Ok(vec![])
    }
}

#[tauri::command]
pub fn get_pages(state: State<'_, AppState>) -> Result<Vec<Page>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, title, content, created_at, updated_at FROM pages ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let pages_iter = stmt
        .query_map([], |row| {
            Ok(Page {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut pages = Vec::new();
    for page in pages_iter {
        pages.push(page.map_err(|e| e.to_string())?);
    }

    Ok(pages)
}

#[tauri::command]
pub fn get_page(id: i64, state: State<'_, AppState>) -> Result<Option<Page>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, title, content, created_at, updated_at FROM pages WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    let mut pages_iter = stmt
        .query_map(params![id], |row| {
            Ok(Page {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    if let Some(page) = pages_iter.next() {
        Ok(Some(page.map_err(|e| e.to_string())?))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn create_page(
    title: String,
    content: String,
    state: State<'_, AppState>,
) -> Result<Page, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO pages (title, content, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
        params![title, content, now, now],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    Ok(Page {
        id,
        title,
        content,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_page(
    id: i64,
    title: String,
    content: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE pages SET title = ?1, content = ?2, updated_at = ?3 WHERE id = ?4",
        params![title, content, now, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_page(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM pages WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_tasks(state: State<'_, AppState>) -> Result<Vec<Task>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, title, description, status, priority, project_id, goal_id, due_date, recurrence, recurrence_until, parent_task_id, completed_at, time_estimate_minutes, timer_started_at, timer_accumulated_seconds, created_at, updated_at FROM tasks ORDER BY updated_at DESC").map_err(|e| e.to_string())?;

    let tasks_iter = stmt
        .query_map([], |row| {
            Ok(Task {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                status: row.get(3)?,
                priority: row.get(4)?,
                project_id: row.get(5)?,
                goal_id: row.get(6)?,
                due_date: row.get(7)?,
                recurrence: row.get(8)?,
                recurrence_until: row.get(9)?,
                parent_task_id: row.get(10)?,
                completed_at: row.get(11)?,
                time_estimate_minutes: row.get(12)?,
                timer_started_at: row.get(13)?,
                timer_accumulated_seconds: row.get(14)?,
                created_at: row.get(15)?,
                updated_at: row.get(16)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut tasks = Vec::new();
    for task in tasks_iter {
        tasks.push(task.map_err(|e| e.to_string())?);
    }

    Ok(tasks)
}

#[tauri::command]
pub fn create_task(
    title: String,
    description: String,
    status: String,
    priority: Option<String>,
    project_id: Option<i64>,
    goal_id: Option<i64>,
    due_date: Option<String>,
    recurrence: Option<String>,
    recurrence_until: Option<String>,
    time_estimate_minutes: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Task, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let status = normalize_status(status);
    let priority = normalize_priority(priority);
    let completed_at = if status == "done" {
        Some(now.clone())
    } else {
        None
    };
    let time_estimate_minutes = normalize_time_estimate_minutes(time_estimate_minutes);
    let project_id = normalize_project_id(&conn, project_id)?;
    let goal_id = normalize_goal_id(&conn, goal_id)?;
    let recurrence = normalize_task_recurrence(recurrence);
    let recurrence_until = normalize_optional_date(recurrence_until);
    let timer_started_at: Option<String> = None;
    let timer_accumulated_seconds = 0_i64;
    let parent_task_id: Option<i64> = None;

    conn.execute(
        "INSERT INTO tasks (title, description, status, priority, project_id, goal_id, due_date, recurrence, recurrence_until, parent_task_id, completed_at, time_estimate_minutes, timer_started_at, timer_accumulated_seconds, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
        params![
            title,
            description,
            status,
            priority,
            project_id,
            goal_id,
            due_date,
            recurrence,
            recurrence_until,
            parent_task_id,
            completed_at,
            time_estimate_minutes,
            timer_started_at,
            timer_accumulated_seconds,
            now,
            now
        ],
    ).map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    Ok(Task {
        id,
        title,
        description,
        status,
        priority,
        project_id,
        goal_id,
        due_date,
        recurrence,
        recurrence_until,
        parent_task_id,
        completed_at,
        time_estimate_minutes,
        timer_started_at,
        timer_accumulated_seconds,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_task(
    id: i64,
    title: String,
    description: String,
    status: String,
    priority: Option<String>,
    project_id: Option<i64>,
    goal_id: Option<i64>,
    due_date: Option<String>,
    recurrence: Option<String>,
    recurrence_until: Option<String>,
    time_estimate_minutes: Option<i64>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let status = normalize_status(status);
    let normalized_priority = normalize_priority(priority);
    let normalized_project_id = normalize_project_id(&conn, project_id)?;
    let normalized_goal_id = normalize_goal_id(&conn, goal_id)?;
    let normalized_recurrence = normalize_task_recurrence(recurrence);
    let normalized_recurrence_until = normalize_optional_date(recurrence_until);
    let normalized_time_estimate_minutes = normalize_time_estimate_minutes(time_estimate_minutes);
    let previous_status: String = conn
        .query_row("SELECT status FROM tasks WHERE id = ?1", params![id], |row| row.get(0))
        .optional()
        .map_err(|e| e.to_string())?
        .unwrap_or_else(|| "todo".to_string());
    let mut timer_started_at: Option<String> = conn
        .query_row(
            "SELECT timer_started_at FROM tasks WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?
        .flatten();
    let mut timer_accumulated_seconds: i64 = conn
        .query_row(
            "SELECT timer_accumulated_seconds FROM tasks WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?
        .unwrap_or(0);

    if status == "done" {
        if let Some(started_at) = timer_started_at.as_deref() {
            timer_accumulated_seconds += elapsed_since(started_at);
        }
        timer_started_at = None;
    }

    let completed_at = if status == "done" {
        Some(now.clone())
    } else {
        None
    };

    conn.execute(
        "UPDATE tasks SET title = ?1, description = ?2, status = ?3, priority = ?4, project_id = ?5, goal_id = ?6, due_date = ?7, recurrence = ?8, recurrence_until = ?9, completed_at = ?10, time_estimate_minutes = ?11, timer_started_at = ?12, timer_accumulated_seconds = ?13, updated_at = ?14 WHERE id = ?15",
        params![
            title,
            description,
            status,
            normalized_priority,
            normalized_project_id,
            normalized_goal_id,
            due_date,
            normalized_recurrence,
            normalized_recurrence_until,
            completed_at,
            normalized_time_estimate_minutes,
            timer_started_at,
            timer_accumulated_seconds,
            now,
            id
        ],
    ).map_err(|e| e.to_string())?;

    if status == "done" && previous_status != "done" {
        materialize_recurring_successor(&conn, id)?;
    }

    Ok(())
}

#[tauri::command]
pub fn update_task_status(
    id: i64,
    status: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let status = normalize_status(status);
    let previous_status: String = conn
        .query_row("SELECT status FROM tasks WHERE id = ?1", params![id], |row| row.get(0))
        .optional()
        .map_err(|e| e.to_string())?
        .unwrap_or_else(|| "todo".to_string());
    let mut timer_started_at: Option<String> = conn
        .query_row(
            "SELECT timer_started_at FROM tasks WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?
        .flatten();
    let mut timer_accumulated_seconds: i64 = conn
        .query_row(
            "SELECT timer_accumulated_seconds FROM tasks WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?
        .unwrap_or(0);

    if status == "done" {
        if let Some(started_at) = timer_started_at.as_deref() {
            timer_accumulated_seconds += elapsed_since(started_at);
        }
        timer_started_at = None;
    }

    let completed_at = if status == "done" {
        Some(now.clone())
    } else {
        None
    };

    conn.execute(
        "UPDATE tasks SET status = ?1, completed_at = ?2, timer_started_at = ?3, timer_accumulated_seconds = ?4, updated_at = ?5 WHERE id = ?6",
        params![status, completed_at, timer_started_at, timer_accumulated_seconds, now, id],
    )
    .map_err(|e| e.to_string())?;

    if status == "done" && previous_status != "done" {
        materialize_recurring_successor(&conn, id)?;
    }

    Ok(())
}

#[tauri::command]
pub fn start_task_timer(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    let task_row: Option<(String, Option<String>)> = conn
        .query_row(
            "SELECT status, timer_started_at FROM tasks WHERE id = ?1",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    let Some((status, existing_started_at)) = task_row else {
        return Ok(());
    };

    if existing_started_at.is_some() {
        return Ok(());
    }

    let next_status = if status == "done" {
        "in_progress".to_string()
    } else {
        status
    };
    let completed_at: Option<String> = if next_status == "done" {
        Some(now.clone())
    } else {
        None
    };

    conn.execute(
        "UPDATE tasks SET status = ?1, completed_at = ?2, timer_started_at = ?3, updated_at = ?4 WHERE id = ?5",
        params![next_status, completed_at, now, now, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn pause_task_timer(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    let task_row: Option<(Option<String>, i64)> = conn
        .query_row(
            "SELECT timer_started_at, timer_accumulated_seconds FROM tasks WHERE id = ?1",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    let Some((timer_started_at, timer_accumulated_seconds)) = task_row else {
        return Ok(());
    };

    let Some(started_at) = timer_started_at else {
        return Ok(());
    };

    let next_accumulated_seconds = timer_accumulated_seconds + elapsed_since(&started_at);

    conn.execute(
        "UPDATE tasks SET timer_started_at = NULL, timer_accumulated_seconds = ?1, updated_at = ?2 WHERE id = ?3",
        params![next_accumulated_seconds, now, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn reset_task_timer(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE tasks SET timer_started_at = NULL, timer_accumulated_seconds = 0, updated_at = ?1 WHERE id = ?2",
        params![now, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_task(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM tasks WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_task_subtasks(
    task_id: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<TaskSubtask>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut subtasks = Vec::new();
    if let Some(task_id) = task_id {
        let mut stmt = conn
            .prepare(
                "SELECT id, task_id, title, completed, position, created_at, updated_at
                 FROM task_subtasks
                 WHERE task_id = ?1
                 ORDER BY position ASC, id ASC",
            )
            .map_err(|e| e.to_string())?;

        let subtasks_iter = stmt
            .query_map(params![task_id], |row| {
                let completed: i64 = row.get(3)?;
                Ok(TaskSubtask {
                    id: row.get(0)?,
                    task_id: row.get(1)?,
                    title: row.get(2)?,
                    completed: completed == 1,
                    position: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            })
            .map_err(|e| e.to_string())?;

        for subtask in subtasks_iter {
            subtasks.push(subtask.map_err(|e| e.to_string())?);
        }
    } else {
        let mut stmt = conn
            .prepare(
                "SELECT id, task_id, title, completed, position, created_at, updated_at
                 FROM task_subtasks
                 ORDER BY task_id ASC, position ASC, id ASC",
            )
            .map_err(|e| e.to_string())?;

        let subtasks_iter = stmt
            .query_map([], |row| {
                let completed: i64 = row.get(3)?;
                Ok(TaskSubtask {
                    id: row.get(0)?,
                    task_id: row.get(1)?,
                    title: row.get(2)?,
                    completed: completed == 1,
                    position: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            })
            .map_err(|e| e.to_string())?;

        for subtask in subtasks_iter {
            subtasks.push(subtask.map_err(|e| e.to_string())?);
        }
    }

    Ok(subtasks)
}

#[tauri::command]
pub fn create_task_subtask(
    task_id: i64,
    title: String,
    state: State<'_, AppState>,
) -> Result<TaskSubtask, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    if !task_exists(&conn, task_id)? {
        return Err("Task not found".to_string());
    }

    let now = chrono::Utc::now().to_rfc3339();
    let normalized_title = normalize_subtask_title(title);
    let position: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(position), -1) + 1 FROM task_subtasks WHERE task_id = ?1",
            params![task_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO task_subtasks (task_id, title, completed, position, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![task_id, &normalized_title, 0_i64, position, &now, &now],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();

    touch_task_updated_at(&conn, task_id, &now)?;

    Ok(TaskSubtask {
        id,
        task_id,
        title: normalized_title,
        completed: false,
        position,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_task_subtask(
    id: i64,
    title: Option<String>,
    completed: Option<bool>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let existing_subtask: Option<(i64, String, i64)> = conn
        .query_row(
            "SELECT task_id, title, completed FROM task_subtasks WHERE id = ?1",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    let Some((task_id, current_title, current_completed)) = existing_subtask else {
        return Ok(());
    };

    let next_title = title
        .map(normalize_subtask_title)
        .unwrap_or_else(|| normalize_subtask_title(current_title));
    let next_completed = completed.unwrap_or(current_completed == 1);
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE task_subtasks SET title = ?1, completed = ?2, updated_at = ?3 WHERE id = ?4",
        params![
            next_title,
            if next_completed { 1_i64 } else { 0_i64 },
            &now,
            id
        ],
    )
    .map_err(|e| e.to_string())?;

    touch_task_updated_at(&conn, task_id, &now)?;

    Ok(())
}

#[tauri::command]
pub fn delete_task_subtask(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let task_id: Option<i64> = conn
        .query_row(
            "SELECT task_id FROM task_subtasks WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM task_subtasks WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    if let Some(task_id) = task_id {
        let now = chrono::Utc::now().to_rfc3339();
        touch_task_updated_at(&conn, task_id, &now)?;
    }

    Ok(())
}

#[tauri::command]
pub fn get_goal_milestones(
    goal_id: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<GoalMilestone>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut milestones = Vec::new();

    if let Some(goal_id) = goal_id {
        let mut stmt = conn
            .prepare(
                "SELECT id, goal_id, title, completed, position, due_date, created_at, updated_at
                 FROM goal_milestones
                 WHERE goal_id = ?1
                 ORDER BY position ASC, id ASC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![goal_id], |row| {
                Ok(GoalMilestone {
                    id: row.get(0)?,
                    goal_id: row.get(1)?,
                    title: row.get(2)?,
                    completed: row.get::<_, i64>(3)? == 1,
                    position: row.get(4)?,
                    due_date: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                })
            })
            .map_err(|e| e.to_string())?;

        for row in rows {
            milestones.push(row.map_err(|e| e.to_string())?);
        }
    } else {
        let mut stmt = conn
            .prepare(
                "SELECT id, goal_id, title, completed, position, due_date, created_at, updated_at
                 FROM goal_milestones
                 ORDER BY goal_id ASC, position ASC, id ASC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                Ok(GoalMilestone {
                    id: row.get(0)?,
                    goal_id: row.get(1)?,
                    title: row.get(2)?,
                    completed: row.get::<_, i64>(3)? == 1,
                    position: row.get(4)?,
                    due_date: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                })
            })
            .map_err(|e| e.to_string())?;

        for row in rows {
            milestones.push(row.map_err(|e| e.to_string())?);
        }
    }

    Ok(milestones)
}

#[tauri::command]
pub fn create_goal_milestone(
    goal_id: i64,
    title: String,
    due_date: Option<String>,
    state: State<'_, AppState>,
) -> Result<GoalMilestone, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let Some(goal_id) = normalize_goal_id(&conn, Some(goal_id))? else {
        return Err("Goal not found".to_string());
    };
    let title = normalize_goal_milestone_title(title);
    let due_date = normalize_optional_date(due_date);
    let now = Utc::now().to_rfc3339();
    let position: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(position), -1) + 1 FROM goal_milestones WHERE goal_id = ?1",
            params![goal_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO goal_milestones (goal_id, title, completed, position, due_date, created_at, updated_at)
         VALUES (?1, ?2, 0, ?3, ?4, ?5, ?6)",
        params![goal_id, title, position, due_date, now, now],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    sync_goal_progress_from_milestones(&conn, goal_id)?;

    Ok(GoalMilestone {
        id,
        goal_id,
        title,
        completed: false,
        position,
        due_date,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_goal_milestone(
    id: i64,
    title: Option<String>,
    completed: Option<bool>,
    due_date: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let current = conn
        .query_row(
            "SELECT goal_id, title, completed, due_date FROM goal_milestones WHERE id = ?1",
            params![id],
            |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, i64>(2)? == 1,
                    row.get::<_, Option<String>>(3)?,
                ))
            },
        )
        .optional()
        .map_err(|e| e.to_string())?;

    let Some((goal_id, current_title, current_completed, current_due_date)) = current else {
        return Ok(());
    };

    let next_title = match title {
        Some(value) => normalize_goal_milestone_title(value),
        None => current_title,
    };
    let next_completed = completed.unwrap_or(current_completed);
    let next_due_date = match due_date {
        Some(value) => normalize_optional_date(Some(value)),
        None => current_due_date,
    };

    conn.execute(
        "UPDATE goal_milestones
         SET title = ?1, completed = ?2, due_date = ?3, updated_at = ?4
         WHERE id = ?5",
        params![
            next_title,
            if next_completed { 1_i64 } else { 0_i64 },
            next_due_date,
            Utc::now().to_rfc3339(),
            id
        ],
    )
    .map_err(|e| e.to_string())?;

    sync_goal_progress_from_milestones(&conn, goal_id)?;
    Ok(())
}

#[tauri::command]
pub fn delete_goal_milestone(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let goal_id: Option<i64> = conn
        .query_row(
            "SELECT goal_id FROM goal_milestones WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?
        .flatten();

    conn.execute("DELETE FROM goal_milestones WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    if let Some(goal_id) = goal_id {
        sync_goal_progress_from_milestones(&conn, goal_id)?;
    }

    Ok(())
}

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
    let meet_url = normalize_optional_text(meet_url);
    let calendar_event_url = normalize_optional_text(calendar_event_url);
    let project_id = normalize_project_id(&conn, project_id)?;
    let participants = normalize_meeting_participants(participants);
    let participants_json = encode_json_string_list(&participants)?;
    let notes = notes.unwrap_or_default().trim().to_string();
    let decisions = decisions.unwrap_or_default().trim().to_string();
    let action_items = normalize_meeting_action_items(action_items);
    let action_items_json = encode_json_action_items(&action_items)?;
    let recurrence = normalize_meeting_recurrence(recurrence);
    let recurrence_until = normalize_optional_text(recurrence_until);
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
    let meet_url = normalize_optional_text(meet_url);
    let calendar_event_url = normalize_optional_text(calendar_event_url);
    let project_id = normalize_project_id(&conn, project_id)?;
    let participants_json =
        encode_json_string_list(&normalize_meeting_participants(participants))?;
    let notes = notes.unwrap_or_default().trim().to_string();
    let decisions = decisions.unwrap_or_default().trim().to_string();
    let action_items_json =
        encode_json_action_items(&normalize_meeting_action_items(action_items))?;
    let recurrence = normalize_meeting_recurrence(recurrence);
    let recurrence_until = normalize_optional_text(recurrence_until);
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

#[tauri::command]
pub fn get_projects(state: State<'_, AppState>) -> Result<Vec<Project>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, description, color, status, created_at, updated_at
             FROM projects
             ORDER BY
                CASE status
                    WHEN 'active' THEN 0
                    WHEN 'paused' THEN 1
                    WHEN 'completed' THEN 2
                    WHEN 'archived' THEN 3
                    ELSE 4
                END,
                updated_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let projects_iter = stmt
        .query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                color: row.get(3)?,
                status: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut projects = Vec::new();
    for project in projects_iter {
        projects.push(project.map_err(|e| e.to_string())?);
    }

    Ok(projects)
}

#[tauri::command]
pub fn create_project(
    name: String,
    description: String,
    color: Option<String>,
    status: Option<String>,
    state: State<'_, AppState>,
) -> Result<Project, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let name = normalize_project_name(name);
    let color = normalize_project_color(color);
    let status = normalize_project_status(status);
    let description = description.trim().to_string();

    conn.execute(
        "INSERT INTO projects (name, description, color, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![name, description, color, status, now, now],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    Ok(Project {
        id,
        name,
        description,
        color,
        status,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_project(
    id: i64,
    name: String,
    description: String,
    color: Option<String>,
    status: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let name = normalize_project_name(name);
    let color = normalize_project_color(color);
    let status = normalize_project_status(status);
    let description = description.trim().to_string();

    conn.execute(
        "UPDATE projects
         SET name = ?1, description = ?2, color = ?3, status = ?4, updated_at = ?5
         WHERE id = ?6",
        params![name, description, color, status, now, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_project(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute("UPDATE entries SET project_id = NULL WHERE project_id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    tx.execute("UPDATE tasks SET project_id = NULL WHERE project_id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    tx.execute("UPDATE goals SET project_id = NULL WHERE project_id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    tx.execute(
        "UPDATE meetings SET project_id = NULL WHERE project_id = ?1",
        params![id],
    )
    .map_err(|e| e.to_string())?;
    tx.execute(
        "DELETE FROM project_branches WHERE project_id = ?1",
        params![id],
    )
    .map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM projects WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_project_branches(
    project_id: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<ProjectBranch>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut branches = Vec::new();

    if let Some(project_id) = project_id {
        let mut stmt = conn
            .prepare(
                "SELECT id, project_id, name, description, status, created_at, updated_at
                 FROM project_branches
                 WHERE project_id = ?1
                 ORDER BY
                    CASE status
                        WHEN 'open' THEN 0
                        WHEN 'merged' THEN 1
                        ELSE 2
                    END,
                    updated_at DESC",
            )
            .map_err(|e| e.to_string())?;

        let iter = stmt
            .query_map(params![project_id], |row| {
                Ok(ProjectBranch {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    name: row.get(2)?,
                    description: row.get(3)?,
                    status: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            })
            .map_err(|e| e.to_string())?;

        for branch in iter {
            branches.push(branch.map_err(|e| e.to_string())?);
        }
    } else {
        let mut stmt = conn
            .prepare(
                "SELECT id, project_id, name, description, status, created_at, updated_at
                 FROM project_branches
                 ORDER BY project_id ASC, updated_at DESC",
            )
            .map_err(|e| e.to_string())?;

        let iter = stmt
            .query_map([], |row| {
                Ok(ProjectBranch {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    name: row.get(2)?,
                    description: row.get(3)?,
                    status: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            })
            .map_err(|e| e.to_string())?;

        for branch in iter {
            branches.push(branch.map_err(|e| e.to_string())?);
        }
    }

    Ok(branches)
}

#[tauri::command]
pub fn create_project_branch(
    project_id: i64,
    name: String,
    description: String,
    status: Option<String>,
    state: State<'_, AppState>,
) -> Result<ProjectBranch, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let project_id = normalize_required_project_id(&conn, project_id)?;
    let name = normalize_project_branch_name(name);
    let description = description.trim().to_string();
    let status = normalize_project_branch_status(status);

    conn.execute(
        "INSERT INTO project_branches (project_id, name, description, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![project_id, name, description, status, now, now],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    conn.execute(
        "UPDATE projects SET updated_at = ?1 WHERE id = ?2",
        params![now, project_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(ProjectBranch {
        id,
        project_id,
        name,
        description,
        status,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_project_branch(
    id: i64,
    name: String,
    description: String,
    status: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let name = normalize_project_branch_name(name);
    let description = description.trim().to_string();
    let status = normalize_project_branch_status(status);

    conn.execute(
        "UPDATE project_branches
         SET name = ?1, description = ?2, status = ?3, updated_at = ?4
         WHERE id = ?5",
        params![name, description, status, now, id],
    )
    .map_err(|e| e.to_string())?;

    let project_id: Option<i64> = conn
        .query_row(
            "SELECT project_id FROM project_branches WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    if let Some(project_id) = project_id {
        conn.execute(
            "UPDATE projects SET updated_at = ?1 WHERE id = ?2",
            params![now, project_id],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn delete_project_branch(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let project_id: Option<i64> = conn
        .query_row(
            "SELECT project_id FROM project_branches WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM project_branches WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    if let Some(project_id) = project_id {
        conn.execute(
            "UPDATE projects SET updated_at = ?1 WHERE id = ?2",
            params![now, project_id],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn get_goals(state: State<'_, AppState>) -> Result<Vec<Goal>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, title, description, status, progress, project_id, target_date, created_at, updated_at
             FROM goals
             ORDER BY
                CASE status
                    WHEN 'active' THEN 0
                    WHEN 'paused' THEN 1
                    WHEN 'completed' THEN 2
                    WHEN 'archived' THEN 3
                    ELSE 4
                END,
                target_date IS NULL,
                target_date ASC,
                updated_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let goals_iter = stmt
        .query_map([], |row| {
            Ok(Goal {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                status: row.get(3)?,
                progress: row.get(4)?,
                project_id: row.get(5)?,
                target_date: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut goals = Vec::new();
    for goal in goals_iter {
        goals.push(goal.map_err(|e| e.to_string())?);
    }

    Ok(goals)
}

#[tauri::command]
pub fn create_goal(
    title: String,
    description: String,
    status: Option<String>,
    progress: Option<i64>,
    project_id: Option<i64>,
    target_date: Option<String>,
    state: State<'_, AppState>,
) -> Result<Goal, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let normalized_status = normalize_goal_status(status);
    let mut normalized_progress = normalize_progress(progress);
    if normalized_status == "completed" {
        normalized_progress = 100;
    }
    let project_id = normalize_project_id(&conn, project_id)?;

    conn.execute(
        "INSERT INTO goals (title, description, status, progress, project_id, target_date, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            title,
            description,
            normalized_status,
            normalized_progress,
            project_id,
            target_date,
            now,
            now
        ],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    Ok(Goal {
        id,
        title,
        description,
        status: normalized_status,
        progress: normalized_progress,
        project_id,
        target_date,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_goal(
    id: i64,
    title: String,
    description: String,
    status: Option<String>,
    progress: Option<i64>,
    project_id: Option<i64>,
    target_date: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let normalized_status = normalize_goal_status(status);
    let mut normalized_progress = normalize_progress(progress);
    if normalized_status == "completed" {
        normalized_progress = 100;
    }
    let project_id = normalize_project_id(&conn, project_id)?;

    conn.execute(
        "UPDATE goals
         SET title = ?1, description = ?2, status = ?3, progress = ?4, project_id = ?5, target_date = ?6, updated_at = ?7
         WHERE id = ?8",
        params![
            title,
            description,
            normalized_status,
            normalized_progress,
            project_id,
            target_date,
            now,
            id
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_goal(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("UPDATE tasks SET goal_id = NULL WHERE goal_id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM goal_milestones WHERE goal_id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM goals WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_habits(state: State<'_, AppState>) -> Result<Vec<HabitWithLogs>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut habits_stmt = conn
        .prepare(
            "SELECT id, title, description, target_per_week, color, created_at, updated_at
             FROM habits
             ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let mut logs_stmt = conn
        .prepare("SELECT date FROM habit_logs WHERE habit_id = ?1 ORDER BY date DESC")
        .map_err(|e| e.to_string())?;

    let habits_iter = habits_stmt
        .query_map([], |row| {
            Ok(Habit {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                target_per_week: row.get(3)?,
                color: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut habits = Vec::new();
    for habit in habits_iter {
        let habit = habit.map_err(|e| e.to_string())?;
        let dates_iter = logs_stmt
            .query_map(params![habit.id], |row| row.get::<_, String>(0))
            .map_err(|e| e.to_string())?;

        let mut completed_dates = Vec::new();
        for date in dates_iter {
            completed_dates.push(date.map_err(|e| e.to_string())?);
        }

        let current_streak = compute_current_streak(&completed_dates);
        let this_week_count = compute_this_week_count(&completed_dates);

        habits.push(HabitWithLogs {
            id: habit.id,
            title: habit.title,
            description: habit.description,
            target_per_week: habit.target_per_week,
            color: habit.color,
            completed_dates,
            current_streak,
            this_week_count,
            created_at: habit.created_at,
            updated_at: habit.updated_at,
        });
    }

    Ok(habits)
}

#[tauri::command]
pub fn create_habit(
    title: String,
    description: String,
    target_per_week: Option<i64>,
    color: Option<String>,
    state: State<'_, AppState>,
) -> Result<Habit, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let target_per_week = normalize_target_per_week(target_per_week);
    let color = normalize_habit_color(color);

    conn.execute(
        "INSERT INTO habits (title, description, target_per_week, color, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![title, description, target_per_week, color, now, now],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    Ok(Habit {
        id,
        title,
        description,
        target_per_week,
        color,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_habit(
    id: i64,
    title: String,
    description: String,
    target_per_week: Option<i64>,
    color: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let target_per_week = normalize_target_per_week(target_per_week);
    let color = normalize_habit_color(color);

    conn.execute(
        "UPDATE habits
         SET title = ?1, description = ?2, target_per_week = ?3, color = ?4, updated_at = ?5
         WHERE id = ?6",
        params![title, description, target_per_week, color, now, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_habit(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute("DELETE FROM habit_logs WHERE habit_id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM habits WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn toggle_habit_completion(
    habit_id: i64,
    date: String,
    completed: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let normalized_date = normalize_habit_date(date);
    let now = Utc::now().to_rfc3339();

    if completed {
        tx.execute(
            "INSERT INTO habit_logs (habit_id, date, created_at)
             VALUES (?1, ?2, ?3)
             ON CONFLICT(habit_id, date) DO UPDATE SET created_at = excluded.created_at",
            params![habit_id, normalized_date, now],
        )
        .map_err(|e| e.to_string())?;
    } else {
        tx.execute(
            "DELETE FROM habit_logs WHERE habit_id = ?1 AND date = ?2",
            params![habit_id, normalized_date],
        )
        .map_err(|e| e.to_string())?;
    }

    tx.execute(
        "UPDATE habits SET updated_at = ?1 WHERE id = ?2",
        params![now, habit_id],
    )
    .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn import_backup(
    payload: BackupPayload,
    replace_existing: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    if replace_existing {
        tx.execute("DELETE FROM entries", [])
            .map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM pages", [])
            .map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM goal_milestones", [])
            .map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM task_subtasks", [])
            .map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM tasks", [])
            .map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM meetings", [])
            .map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM goals", [])
            .map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM project_branches", [])
            .map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM projects", [])
            .map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM habit_logs", [])
            .map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM habits", [])
            .map_err(|e| e.to_string())?;
    }

    let now = chrono::Utc::now().to_rfc3339();

    for entry in payload.entries {
        tx.execute(
            "INSERT INTO entries (date, yesterday, today, project_id, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(date) DO UPDATE SET
                yesterday = excluded.yesterday,
                today = excluded.today,
                project_id = excluded.project_id,
                created_at = excluded.created_at",
            params![
                entry.date,
                entry.yesterday,
                entry.today,
                entry.project_id,
                entry.created_at.unwrap_or_else(|| now.clone())
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    for page in payload.pages {
        let created_at = page.created_at.unwrap_or_else(|| now.clone());
        let updated_at = page.updated_at.unwrap_or_else(|| created_at.clone());

        if let Some(id) = page.id {
            tx.execute(
                "INSERT INTO pages (id, title, content, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)
                 ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    content = excluded.content,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at",
                params![id, page.title, page.content, created_at, updated_at],
            )
            .map_err(|e| e.to_string())?;
        } else {
            tx.execute(
                "INSERT INTO pages (title, content, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4)",
                params![page.title, page.content, created_at, updated_at],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    for project in payload.projects {
        let created_at = project.created_at.unwrap_or_else(|| now.clone());
        let updated_at = project.updated_at.unwrap_or_else(|| created_at.clone());
        let name = normalize_project_name(project.name);
        let description = project.description.unwrap_or_default();
        let color = normalize_project_color(project.color);
        let status = normalize_project_status(project.status);

        if let Some(id) = project.id {
            tx.execute(
                "INSERT INTO projects (id, name, description, color, status, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                 ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    description = excluded.description,
                    color = excluded.color,
                    status = excluded.status,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at",
                params![id, name, description, color, status, created_at, updated_at],
            )
            .map_err(|e| e.to_string())?;
        } else {
            tx.execute(
                "INSERT INTO projects (name, description, color, status, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![name, description, color, status, created_at, updated_at],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    for branch in payload.project_branches {
        let created_at = branch.created_at.unwrap_or_else(|| now.clone());
        let updated_at = branch.updated_at.unwrap_or_else(|| created_at.clone());
        let Some(project_id) = normalize_project_id(&tx, Some(branch.project_id))? else {
            continue;
        };
        let name = normalize_project_branch_name(branch.name);
        let description = branch.description.unwrap_or_default();
        let status = normalize_project_branch_status(branch.status);

        if let Some(id) = branch.id {
            tx.execute(
                "INSERT INTO project_branches (id, project_id, name, description, status, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                 ON CONFLICT(id) DO UPDATE SET
                    project_id = excluded.project_id,
                    name = excluded.name,
                    description = excluded.description,
                    status = excluded.status,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at",
                params![id, project_id, name, description, status, created_at, updated_at],
            )
            .map_err(|e| e.to_string())?;
        } else {
            tx.execute(
                "INSERT INTO project_branches (project_id, name, description, status, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![project_id, name, description, status, created_at, updated_at],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    for task in payload.tasks {
        let created_at = task.created_at.unwrap_or_else(|| now.clone());
        let updated_at = task.updated_at.unwrap_or_else(|| created_at.clone());
        let status = normalize_status(task.status);
        let priority = normalize_priority(task.priority);
        let project_id = task.project_id;
        let goal_id = task.goal_id;
        let due_date = task.due_date;
        let recurrence = normalize_task_recurrence(task.recurrence);
        let recurrence_until = normalize_optional_date(task.recurrence_until);
        let parent_task_id = task.parent_task_id;
        let completed_at = task.completed_at;
        let time_estimate_minutes = normalize_time_estimate_minutes(task.time_estimate_minutes);
        let mut timer_started_at = task.timer_started_at;
        let mut timer_accumulated_seconds =
            normalize_accumulated_seconds(task.timer_accumulated_seconds);

        if status == "done" {
            if let Some(started_at) = timer_started_at.as_deref() {
                timer_accumulated_seconds += elapsed_since(started_at);
            }
            timer_started_at = None;
        }

        if let Some(id) = task.id {
            tx.execute(
                "INSERT INTO tasks (id, title, description, status, priority, project_id, goal_id, due_date, recurrence, recurrence_until, parent_task_id, completed_at, time_estimate_minutes, timer_started_at, timer_accumulated_seconds, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)
                 ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    description = excluded.description,
                    status = excluded.status,
                    priority = excluded.priority,
                    project_id = excluded.project_id,
                    goal_id = excluded.goal_id,
                    due_date = excluded.due_date,
                    recurrence = excluded.recurrence,
                    recurrence_until = excluded.recurrence_until,
                    parent_task_id = excluded.parent_task_id,
                    completed_at = excluded.completed_at,
                    time_estimate_minutes = excluded.time_estimate_minutes,
                    timer_started_at = excluded.timer_started_at,
                    timer_accumulated_seconds = excluded.timer_accumulated_seconds,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at",
                params![
                    id,
                    task.title,
                    task.description,
                    status,
                    priority,
                    project_id,
                    goal_id,
                    due_date,
                    recurrence,
                    recurrence_until,
                    parent_task_id,
                    completed_at,
                    time_estimate_minutes,
                    timer_started_at,
                    timer_accumulated_seconds,
                    created_at,
                    updated_at
                ],
            )
            .map_err(|e| e.to_string())?;
        } else {
            tx.execute(
                "INSERT INTO tasks (title, description, status, priority, project_id, goal_id, due_date, recurrence, recurrence_until, parent_task_id, completed_at, time_estimate_minutes, timer_started_at, timer_accumulated_seconds, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
                params![
                    task.title,
                    task.description,
                    status,
                    priority,
                    project_id,
                    goal_id,
                    due_date,
                    recurrence,
                    recurrence_until,
                    parent_task_id,
                    completed_at,
                    time_estimate_minutes,
                    timer_started_at,
                    timer_accumulated_seconds,
                    created_at,
                    updated_at
                ],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    for subtask in payload.task_subtasks {
        let task_exists = tx
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM tasks WHERE id = ?1)",
                params![subtask.task_id],
                |row| row.get::<_, i64>(0),
            )
            .map_err(|e| e.to_string())?
            == 1;
        if !task_exists {
            continue;
        }

        let created_at = subtask.created_at.unwrap_or_else(|| now.clone());
        let updated_at = subtask.updated_at.unwrap_or_else(|| created_at.clone());
        let title = normalize_subtask_title(subtask.title);
        let completed = if subtask.completed.unwrap_or(false) {
            1_i64
        } else {
            0_i64
        };
        let position = subtask.position.unwrap_or(0).max(0);

        if let Some(id) = subtask.id {
            tx.execute(
                "INSERT INTO task_subtasks (id, task_id, title, completed, position, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                 ON CONFLICT(id) DO UPDATE SET
                    task_id = excluded.task_id,
                    title = excluded.title,
                    completed = excluded.completed,
                    position = excluded.position,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at",
                params![
                    id,
                    subtask.task_id,
                    title,
                    completed,
                    position,
                    created_at,
                    updated_at
                ],
            )
            .map_err(|e| e.to_string())?;
        } else {
            tx.execute(
                "INSERT INTO task_subtasks (task_id, title, completed, position, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    subtask.task_id,
                    title,
                    completed,
                    position,
                    created_at,
                    updated_at
                ],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    for goal in payload.goals {
        let created_at = goal.created_at.unwrap_or_else(|| now.clone());
        let updated_at = goal.updated_at.unwrap_or_else(|| created_at.clone());
        let status = normalize_goal_status(goal.status);
        let mut progress = normalize_progress(goal.progress);
        if status == "completed" {
            progress = 100;
        }
        let description = goal.description.unwrap_or_default();
        let project_id = goal.project_id;

        if let Some(id) = goal.id {
            tx.execute(
                "INSERT INTO goals (id, title, description, status, progress, project_id, target_date, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
                 ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    description = excluded.description,
                    status = excluded.status,
                    progress = excluded.progress,
                    project_id = excluded.project_id,
                    target_date = excluded.target_date,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at",
                params![id, goal.title, description, status, progress, project_id, goal.target_date, created_at, updated_at],
            )
            .map_err(|e| e.to_string())?;
        } else {
            tx.execute(
                "INSERT INTO goals (title, description, status, progress, project_id, target_date, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![goal.title, description, status, progress, project_id, goal.target_date, created_at, updated_at],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    for milestone in payload.goal_milestones {
        let Some(goal_id) = normalize_goal_id(&tx, Some(milestone.goal_id))? else {
            continue;
        };

        let created_at = milestone.created_at.unwrap_or_else(|| now.clone());
        let updated_at = milestone.updated_at.unwrap_or_else(|| created_at.clone());
        let title = normalize_goal_milestone_title(milestone.title);
        let completed = if milestone.completed.unwrap_or(false) { 1_i64 } else { 0_i64 };
        let position = milestone.position.unwrap_or(0).max(0);
        let due_date = normalize_optional_date(milestone.due_date);

        if let Some(id) = milestone.id {
            tx.execute(
                "INSERT INTO goal_milestones (id, goal_id, title, completed, position, due_date, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
                 ON CONFLICT(id) DO UPDATE SET
                    goal_id = excluded.goal_id,
                    title = excluded.title,
                    completed = excluded.completed,
                    position = excluded.position,
                    due_date = excluded.due_date,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at",
                params![id, goal_id, title, completed, position, due_date, created_at, updated_at],
            )
            .map_err(|e| e.to_string())?;
        } else {
            tx.execute(
                "INSERT INTO goal_milestones (goal_id, title, completed, position, due_date, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![goal_id, title, completed, position, due_date, created_at, updated_at],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    let mut goal_ids_to_sync = HashSet::new();
    for goal in tx
        .prepare("SELECT DISTINCT goal_id FROM goal_milestones")
        .map_err(|e| e.to_string())?
        .query_map([], |row| row.get::<_, i64>(0))
        .map_err(|e| e.to_string())?
    {
        goal_ids_to_sync.insert(goal.map_err(|e| e.to_string())?);
    }
    for goal_id in goal_ids_to_sync {
        sync_goal_progress_from_milestones(&tx, goal_id)?;
    }

    for meeting in payload.meetings {
        let created_at = meeting.created_at.unwrap_or_else(|| now.clone());
        let updated_at = meeting.updated_at.unwrap_or_else(|| created_at.clone());
        let title = normalize_meeting_title(meeting.title);
        let agenda = meeting.agenda.unwrap_or_default().trim().to_string();
        let (start_at, end_at) = normalize_meeting_range(meeting.start_at, meeting.end_at)?;
        let meet_url = normalize_optional_text(meeting.meet_url);
        let calendar_event_url = normalize_optional_text(meeting.calendar_event_url);
        let project_id = normalize_project_id(&tx, meeting.project_id)?;
        let participants = normalize_meeting_participants(meeting.participants);
        let participants_json = encode_json_string_list(&participants)?;
        let notes = meeting.notes.unwrap_or_default().trim().to_string();
        let decisions = meeting.decisions.unwrap_or_default().trim().to_string();
        let action_items = normalize_meeting_action_items(meeting.action_items);
        let action_items_json = encode_json_action_items(&action_items)?;
        let recurrence = normalize_meeting_recurrence(meeting.recurrence);
        let recurrence_until = normalize_optional_text(meeting.recurrence_until);
        let reminder_minutes = normalize_meeting_reminder_minutes(meeting.reminder_minutes);
        let status = normalize_meeting_status(meeting.status);

        if let Some(id) = meeting.id {
            tx.execute(
                "INSERT INTO meetings (id, title, agenda, start_at, end_at, meet_url, calendar_event_url, project_id, participants_json, notes, decisions, action_items_json, recurrence, recurrence_until, reminder_minutes, status, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)
                 ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    agenda = excluded.agenda,
                    start_at = excluded.start_at,
                    end_at = excluded.end_at,
                    meet_url = excluded.meet_url,
                    calendar_event_url = excluded.calendar_event_url,
                    project_id = excluded.project_id,
                    participants_json = excluded.participants_json,
                    notes = excluded.notes,
                    decisions = excluded.decisions,
                    action_items_json = excluded.action_items_json,
                    recurrence = excluded.recurrence,
                    recurrence_until = excluded.recurrence_until,
                    reminder_minutes = excluded.reminder_minutes,
                    status = excluded.status,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at",
                params![
                    id,
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
                    created_at,
                    updated_at
                ],
            )
            .map_err(|e| e.to_string())?;
        } else {
            tx.execute(
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
                    created_at,
                    updated_at
                ],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    for habit in payload.habits {
        let created_at = habit.created_at.unwrap_or_else(|| now.clone());
        let updated_at = habit.updated_at.unwrap_or_else(|| created_at.clone());
        let description = habit.description.unwrap_or_default();
        let target_per_week = normalize_target_per_week(habit.target_per_week);
        let color = normalize_habit_color(habit.color);

        if let Some(id) = habit.id {
            tx.execute(
                "INSERT INTO habits (id, title, description, target_per_week, color, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                 ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    description = excluded.description,
                    target_per_week = excluded.target_per_week,
                    color = excluded.color,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at",
                params![
                    id,
                    habit.title,
                    description,
                    target_per_week,
                    color,
                    created_at,
                    updated_at
                ],
            )
            .map_err(|e| e.to_string())?;
        } else {
            tx.execute(
                "INSERT INTO habits (title, description, target_per_week, color, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    habit.title,
                    description,
                    target_per_week,
                    color,
                    created_at,
                    updated_at
                ],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    for log in payload.habit_logs {
        let created_at = log.created_at.unwrap_or_else(|| now.clone());
        let date = normalize_habit_date(log.date);

        if let Some(id) = log.id {
            tx.execute(
                "INSERT INTO habit_logs (id, habit_id, date, created_at)
                 VALUES (?1, ?2, ?3, ?4)
                 ON CONFLICT(id) DO UPDATE SET
                    habit_id = excluded.habit_id,
                    date = excluded.date,
                    created_at = excluded.created_at",
                params![id, log.habit_id, date, created_at],
            )
            .map_err(|e| e.to_string())?;
        } else {
            tx.execute(
                "INSERT INTO habit_logs (habit_id, date, created_at)
                 VALUES (?1, ?2, ?3)
                 ON CONFLICT(habit_id, date) DO UPDATE SET
                    created_at = excluded.created_at",
                params![log.habit_id, date, created_at],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}
