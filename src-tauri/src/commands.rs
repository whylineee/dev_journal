pub mod backup;
pub mod meetings;
pub mod tasks;
mod validation;

use crate::models::{
    Entry, Goal, GoalMilestone, Habit, HabitWithLogs, MeetingActionItem, Page, Project,
    ProjectBranch,
};
use chrono::{Datelike, Duration, NaiveDate, Utc};
use rusqlite::Connection;
use rusqlite::{params, OptionalExtension};
use serde::Deserialize;
use std::collections::HashSet;
use std::sync::Mutex;
use tauri::State;

#[cfg(test)]
pub(crate) use backup::import_backup_into_conn;
#[cfg(test)]
pub(crate) use tasks::{compute_next_due_date, materialize_recurring_successor};
pub(crate) use validation::*;

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

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;
    use std::fs;

    fn test_link_connection() -> Connection {
        let conn = Connection::open_in_memory().expect("in-memory db");

        conn.execute("CREATE TABLE projects (id INTEGER PRIMARY KEY)", [])
            .expect("projects table");
        conn.execute("CREATE TABLE goals (id INTEGER PRIMARY KEY)", [])
            .expect("goals table");
        conn.execute("CREATE TABLE tasks (id INTEGER PRIMARY KEY)", [])
            .expect("tasks table");
        conn.execute("CREATE TABLE habits (id INTEGER PRIMARY KEY)", [])
            .expect("habits table");

        conn
    }

    fn command_test_connection() -> Connection {
        let temp_dir = std::env::temp_dir().join(format!(
            "dev-journal-commands-test-{}",
            Utc::now().timestamp_nanos_opt().unwrap_or_default()
        ));
        let conn = crate::db::init(temp_dir.clone()).expect("db init");
        fs::remove_dir_all(temp_dir).ok();
        conn
    }

    #[test]
    fn compute_next_due_date_advances_supported_recurrence_patterns() {
        assert_eq!(
            compute_next_due_date("2026-04-06", "daily"),
            Some("2026-04-07".to_string())
        );
        assert_eq!(
            compute_next_due_date("2026-04-10", "weekdays"),
            Some("2026-04-13".to_string())
        );
        assert_eq!(
            compute_next_due_date("2026-04-06", "weekly"),
            Some("2026-04-13".to_string())
        );
        assert_eq!(compute_next_due_date("2026-04-06", "none"), None);
    }

    #[test]
    fn normalize_meeting_range_rejects_invalid_ranges() {
        let normalized = normalize_meeting_range(
            " 2026-04-06T10:00:00+02:00 ".to_string(),
            "2026-04-06T11:30:00+02:00 ".to_string(),
        )
        .expect("expected valid range");

        assert_eq!(normalized.0, "2026-04-06T08:00:00+00:00");
        assert_eq!(normalized.1, "2026-04-06T09:30:00+00:00");
        assert_eq!(
            normalize_meeting_range(
                "2026-04-06T10:00:00Z".to_string(),
                "2026-04-06T10:00:00Z".to_string()
            ),
            Err("Meeting end time must be after start time".to_string())
        );
    }

    #[test]
    fn normalize_meeting_action_items_trims_titles_and_generates_missing_ids() {
        let items = normalize_meeting_action_items(Some(vec![
            MeetingActionItem {
                id: " custom-id ".to_string(),
                title: " Review PR ".to_string(),
                completed: false,
                task_id: None,
            },
            MeetingActionItem {
                id: " ".to_string(),
                title: " Follow up ".to_string(),
                completed: true,
                task_id: Some(9),
            },
            MeetingActionItem {
                id: "skip".to_string(),
                title: "   ".to_string(),
                completed: false,
                task_id: None,
            },
        ]));

        assert_eq!(items.len(), 2);
        assert_eq!(items[0].id, "custom-id");
        assert_eq!(items[0].title, "Review PR");
        assert_eq!(items[1].title, "Follow up");
        assert!(items[1].id.starts_with("item-"));
        assert_eq!(items[1].task_id, Some(9));
    }

    #[test]
    fn normalize_optional_http_url_allows_only_http_and_https() {
        assert_eq!(
            normalize_optional_http_url(Some(" https://example.com/meet ".to_string())),
            Some("https://example.com/meet".to_string())
        );
        assert_eq!(
            normalize_optional_http_url(Some("http://localhost:3000".to_string())),
            Some("http://localhost:3000".to_string())
        );
        assert_eq!(
            normalize_optional_http_url(Some("file:///tmp/notes.md".to_string())),
            None
        );
        assert_eq!(
            normalize_optional_http_url(Some("zoommtg://join".to_string())),
            None
        );
    }

    #[test]
    fn normalize_optional_date_discards_invalid_values() {
        assert_eq!(
            normalize_optional_date(Some(" 2026-04-08 ".to_string())),
            Some("2026-04-08".to_string())
        );
        assert_eq!(normalize_optional_date(Some("2026-02-31".to_string())), None);
        assert_eq!(
            normalize_optional_date(Some("2026-04-08T10:00:00Z".to_string())),
            None
        );
        assert_eq!(normalize_optional_date(Some("   ".to_string())), None);
    }

    #[test]
    fn compute_current_streak_counts_today_or_yesterday_runs() {
        let today = Utc::now().date_naive();
        let yesterday = today - Duration::days(1);
        let two_days_ago = today - Duration::days(2);
        let last_week = today - Duration::days(7);

        let current = vec![
            today.format("%Y-%m-%d").to_string(),
            yesterday.format("%Y-%m-%d").to_string(),
            two_days_ago.format("%Y-%m-%d").to_string(),
        ];
        let stale = vec![last_week.format("%Y-%m-%d").to_string()];

        assert_eq!(compute_current_streak(&current), 3);
        assert_eq!(compute_current_streak(&stale), 0);
    }

    #[test]
    fn compute_this_week_count_ignores_dates_outside_current_week() {
        let today = Utc::now().date_naive();
        let days_from_monday = i64::from(today.weekday().num_days_from_monday());
        let week_start = today - Duration::days(days_from_monday);
        let previous_week_day = week_start - Duration::days(1);
        let week_mid = week_start + Duration::days(2);
        let week_end = week_start + Duration::days(6);

        let completed_dates = vec![
            week_start.format("%Y-%m-%d").to_string(),
            week_mid.format("%Y-%m-%d").to_string(),
            week_end.format("%Y-%m-%d").to_string(),
            previous_week_day.format("%Y-%m-%d").to_string(),
        ];

        assert_eq!(compute_this_week_count(&completed_dates), 3);
    }

    #[test]
    fn sanitize_meeting_action_item_task_ids_clears_missing_links() {
        let conn = test_link_connection();
        conn.execute("INSERT INTO tasks (id) VALUES (1)", [])
            .expect("task row");

        let sanitized = sanitize_meeting_action_item_task_ids(
            &conn,
            vec![
                MeetingActionItem {
                    id: "a".to_string(),
                    title: "Keep".to_string(),
                    completed: false,
                    task_id: Some(1),
                },
                MeetingActionItem {
                    id: "b".to_string(),
                    title: "Clear".to_string(),
                    completed: false,
                    task_id: Some(999),
                },
            ],
        )
        .expect("sanitize items");

        assert_eq!(sanitized[0].task_id, Some(1));
        assert_eq!(sanitized[1].task_id, None);
    }

    #[test]
    fn normalize_parent_task_id_returns_none_for_missing_tasks() {
        let conn = test_link_connection();
        conn.execute("INSERT INTO tasks (id) VALUES (7)", [])
            .expect("task row");

        assert_eq!(
            normalize_parent_task_id(&conn, Some(7)).expect("existing parent"),
            Some(7)
        );
        assert_eq!(
            normalize_parent_task_id(&conn, Some(99)).expect("missing parent"),
            None
        );
    }

    #[test]
    fn materialize_recurring_successor_creates_single_next_task() {
        let conn = command_test_connection();
        conn.execute(
            "INSERT INTO tasks (
                id, title, description, status, priority, due_date, recurrence, recurrence_until,
                parent_task_id, completed_at, time_estimate_minutes, timer_started_at,
                timer_accumulated_seconds, created_at, updated_at
             ) VALUES (
                1, 'Write release notes', '', 'done', 'high', '2026-04-07', 'weekly', '2026-04-30',
                NULL, '2026-04-07T09:00:00Z', 30, NULL, 0, '2026-04-01T09:00:00Z', '2026-04-07T09:00:00Z'
             )",
            [],
        )
        .expect("seed recurring task");

        materialize_recurring_successor(&conn, 1).expect("materialize successor");
        materialize_recurring_successor(&conn, 1).expect("do not duplicate successor");

        let child_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM tasks WHERE parent_task_id = 1",
                [],
                |row| row.get(0),
            )
            .expect("child count");
        assert_eq!(child_count, 1);

        let child_due_date: String = conn
            .query_row(
                "SELECT due_date FROM tasks WHERE parent_task_id = 1",
                [],
                |row| row.get(0),
            )
            .expect("child due date");
        assert_eq!(child_due_date, "2026-04-14");
    }

    #[test]
    fn materialize_recurring_successor_skips_invalid_recurrence_limit() {
        let conn = command_test_connection();
        conn.execute(
            "INSERT INTO tasks (
                id, title, description, status, priority, due_date, recurrence, recurrence_until,
                parent_task_id, completed_at, time_estimate_minutes, timer_started_at,
                timer_accumulated_seconds, created_at, updated_at
             ) VALUES (
                1, 'Broken recurrence', '', 'done', 'medium', '2026-04-07', 'weekly', 'not-a-date',
                NULL, '2026-04-07T09:00:00Z', 15, NULL, 0, '2026-04-01T09:00:00Z', '2026-04-07T09:00:00Z'
             )",
            [],
        )
        .expect("seed recurring task");

        materialize_recurring_successor(&conn, 1).expect("invalid limit is ignored safely");

        let child_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM tasks WHERE parent_task_id = 1",
                [],
                |row| row.get(0),
            )
            .expect("child count");
        assert_eq!(child_count, 0);
    }

    #[test]
    fn sync_goal_progress_from_milestones_updates_progress_and_status() {
        let conn = command_test_connection();
        conn.execute(
            "INSERT INTO goals (id, title, description, status, progress, created_at, updated_at)
             VALUES (1, 'Ship planner', '', 'active', 0, '2026-04-01T09:00:00Z', '2026-04-01T09:00:00Z')",
            [],
        )
        .expect("seed goal");
        conn.execute(
            "INSERT INTO goal_milestones (goal_id, title, completed, position, created_at, updated_at)
             VALUES
             (1, 'Design', 1, 0, '2026-04-01T09:00:00Z', '2026-04-01T09:00:00Z'),
             (1, 'Implement', 1, 1, '2026-04-01T09:00:00Z', '2026-04-01T09:00:00Z')",
            [],
        )
        .expect("seed milestones");

        sync_goal_progress_from_milestones(&conn, 1).expect("sync goal");

        let (progress, status): (i64, String) = conn
            .query_row(
                "SELECT progress, status FROM goals WHERE id = 1",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .expect("goal state");
        assert_eq!(progress, 100);
        assert_eq!(status, "completed");
    }

    #[test]
    fn import_backup_replaces_existing_data_and_sanitizes_links() {
        let mut conn = command_test_connection();
        conn.execute(
            "INSERT INTO projects (id, name, description, color, status, created_at, updated_at)
             VALUES (999, 'Old', '', '#000000', 'active', '2026-04-01T09:00:00Z', '2026-04-01T09:00:00Z')",
            [],
        )
        .expect("seed old project");

        import_backup_into_conn(
            &mut conn,
            BackupPayload {
                projects: vec![BackupProjectInput {
                    id: Some(1),
                    name: "Platform".to_string(),
                    description: Some("Core workspace".to_string()),
                    color: Some("#60a5fa".to_string()),
                    status: Some("active".to_string()),
                    created_at: Some("2026-04-01T09:00:00Z".to_string()),
                    updated_at: Some("2026-04-01T09:00:00Z".to_string()),
                }],
                project_branches: vec![BackupProjectBranchInput {
                    id: Some(1),
                    project_id: 1,
                    name: "main".to_string(),
                    description: Some("Primary branch".to_string()),
                    status: Some("open".to_string()),
                    created_at: Some("2026-04-01T09:00:00Z".to_string()),
                    updated_at: Some("2026-04-01T09:00:00Z".to_string()),
                }],
                goals: vec![BackupGoalInput {
                    id: Some(1),
                    title: "Ship analytics".to_string(),
                    description: Some("Milestone-driven".to_string()),
                    status: Some("active".to_string()),
                    progress: Some(0),
                    project_id: Some(1),
                    target_date: Some("2026-04-30".to_string()),
                    created_at: Some("2026-04-01T09:00:00Z".to_string()),
                    updated_at: Some("2026-04-01T09:00:00Z".to_string()),
                }],
                goal_milestones: vec![
                    BackupGoalMilestoneInput {
                        id: Some(1),
                        goal_id: 1,
                        title: "Design".to_string(),
                        completed: Some(true),
                        position: Some(0),
                        due_date: Some("2026-04-10".to_string()),
                        created_at: Some("2026-04-01T09:00:00Z".to_string()),
                        updated_at: Some("2026-04-01T09:00:00Z".to_string()),
                    },
                    BackupGoalMilestoneInput {
                        id: Some(2),
                        goal_id: 1,
                        title: "Build".to_string(),
                        completed: Some(false),
                        position: Some(1),
                        due_date: Some("2026-04-20".to_string()),
                        created_at: Some("2026-04-01T09:00:00Z".to_string()),
                        updated_at: Some("2026-04-01T09:00:00Z".to_string()),
                    },
                ],
                tasks: vec![BackupTaskInput {
                    id: Some(1),
                    title: "Review dashboard".to_string(),
                    description: "".to_string(),
                    status: "todo".to_string(),
                    priority: Some("high".to_string()),
                    project_id: Some(9999),
                    goal_id: Some(1),
                    due_date: Some("2026-04-08".to_string()),
                    recurrence: Some("none".to_string()),
                    recurrence_until: None,
                    parent_task_id: None,
                    completed_at: None,
                    time_estimate_minutes: Some(45),
                    timer_started_at: None,
                    timer_accumulated_seconds: Some(0),
                    created_at: Some("2026-04-01T09:00:00Z".to_string()),
                    updated_at: Some("2026-04-01T09:00:00Z".to_string()),
                }],
                meetings: vec![BackupMeetingInput {
                    id: Some(1),
                    title: "Weekly sync".to_string(),
                    agenda: Some("Check progress".to_string()),
                    start_at: "2026-04-09T10:00:00Z".to_string(),
                    end_at: "2026-04-09T11:00:00Z".to_string(),
                    meet_url: None,
                    calendar_event_url: None,
                    project_id: Some(1),
                    participants: Some(vec!["dev@example.com".to_string()]),
                    notes: Some(String::new()),
                    decisions: Some(String::new()),
                    action_items: Some(vec![MeetingActionItem {
                        id: "m1".to_string(),
                        title: "Follow up".to_string(),
                        completed: false,
                        task_id: Some(404),
                    }]),
                    recurrence: Some("none".to_string()),
                    recurrence_until: None,
                    reminder_minutes: Some(15),
                    status: Some("planned".to_string()),
                    created_at: Some("2026-04-01T09:00:00Z".to_string()),
                    updated_at: Some("2026-04-01T09:00:00Z".to_string()),
                }],
                entries: vec![BackupEntryInput {
                    date: "2026-04-04".to_string(),
                    yesterday: "Code review".to_string(),
                    today: "Ship tests".to_string(),
                    project_id: Some(1),
                    created_at: Some("2026-04-04T09:00:00Z".to_string()),
                }],
                ..BackupPayload::default()
            },
            true,
        )
        .expect("import backup");

        let project_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM projects", [], |row| row.get(0))
            .expect("project count");
        assert_eq!(project_count, 1);

        let task_project_and_goal: (Option<i64>, Option<i64>) = conn
            .query_row(
                "SELECT project_id, goal_id FROM tasks WHERE id = 1",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .expect("task links");
        assert_eq!(task_project_and_goal.0, None);
        assert_eq!(task_project_and_goal.1, Some(1));

        let meeting_action_items_json: String = conn
            .query_row(
                "SELECT action_items_json FROM meetings WHERE id = 1",
                [],
                |row| row.get(0),
            )
            .expect("meeting action items");
        let imported_action_items =
            decode_json_action_items(meeting_action_items_json).expect("decode action items");
        assert_eq!(imported_action_items.len(), 1);
        assert_eq!(imported_action_items[0].task_id, None);

        let goal_progress: i64 = conn
            .query_row("SELECT progress FROM goals WHERE id = 1", [], |row| row.get(0))
            .expect("goal progress");
        assert_eq!(goal_progress, 50);

        let imported_entry_project_id: Option<i64> = conn
            .query_row(
                "SELECT project_id FROM entries WHERE date = '2026-04-04'",
                [],
                |row| row.get(0),
            )
            .expect("entry project");
        assert_eq!(imported_entry_project_id, Some(1));
    }

    #[test]
    fn import_backup_drops_invalid_dates_and_external_urls() {
        let mut conn = command_test_connection();

        import_backup_into_conn(
            &mut conn,
            BackupPayload {
                tasks: vec![BackupTaskInput {
                    id: Some(1),
                    title: "Imported task".to_string(),
                    description: "".to_string(),
                    status: "todo".to_string(),
                    priority: Some("medium".to_string()),
                    project_id: None,
                    goal_id: None,
                    due_date: Some("2026-02-31".to_string()),
                    recurrence: Some("weekly".to_string()),
                    recurrence_until: Some("tomorrow".to_string()),
                    parent_task_id: None,
                    completed_at: None,
                    time_estimate_minutes: Some(20),
                    timer_started_at: None,
                    timer_accumulated_seconds: Some(0),
                    created_at: Some("2026-04-01T09:00:00Z".to_string()),
                    updated_at: Some("2026-04-01T09:00:00Z".to_string()),
                }],
                meetings: vec![BackupMeetingInput {
                    id: Some(1),
                    title: "Imported meeting".to_string(),
                    agenda: Some("Agenda".to_string()),
                    start_at: "2026-04-09T10:00:00Z".to_string(),
                    end_at: "2026-04-09T11:00:00Z".to_string(),
                    meet_url: Some("zoommtg://join".to_string()),
                    calendar_event_url: Some("file:///tmp/calendar.ics".to_string()),
                    project_id: None,
                    participants: Some(vec![" dev@example.com ".to_string()]),
                    notes: Some(String::new()),
                    decisions: Some(String::new()),
                    action_items: Some(vec![MeetingActionItem {
                        id: "m1".to_string(),
                        title: "Follow up".to_string(),
                        completed: false,
                        task_id: Some(404),
                    }]),
                    recurrence: Some("weekly".to_string()),
                    recurrence_until: Some("bad-date".to_string()),
                    reminder_minutes: Some(15),
                    status: Some("planned".to_string()),
                    created_at: Some("2026-04-01T09:00:00Z".to_string()),
                    updated_at: Some("2026-04-01T09:00:00Z".to_string()),
                }],
                ..BackupPayload::default()
            },
            false,
        )
        .expect("import backup");

        let task_dates: (Option<String>, Option<String>) = conn
            .query_row(
                "SELECT due_date, recurrence_until FROM tasks WHERE id = 1",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .expect("task dates");
        assert_eq!(task_dates.0, None);
        assert_eq!(task_dates.1, None);

        let meeting_urls_and_limit: (Option<String>, Option<String>, Option<String>) = conn
            .query_row(
                "SELECT meet_url, calendar_event_url, recurrence_until FROM meetings WHERE id = 1",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .expect("meeting fields");
        assert_eq!(meeting_urls_and_limit.0, None);
        assert_eq!(meeting_urls_and_limit.1, None);
        assert_eq!(meeting_urls_and_limit.2, None);
    }
}
