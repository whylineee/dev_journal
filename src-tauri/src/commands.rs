use crate::models::{Entry, Goal, Habit, HabitWithLogs, Page, Task};
use chrono::{Datelike, Duration, NaiveDate, Utc};
use rusqlite::Connection;
use rusqlite::{params, OptionalExtension};
use serde::Deserialize;
use std::collections::HashSet;
use std::sync::Mutex;
use tauri::State;

pub struct AppState {
    pub db: Mutex<Connection>,
}

#[derive(Debug, Default, Deserialize)]
pub struct BackupPayload {
    #[serde(default)]
    pub entries: Vec<BackupEntryInput>,
    #[serde(default)]
    pub pages: Vec<BackupPageInput>,
    #[serde(default)]
    pub tasks: Vec<BackupTaskInput>,
    #[serde(default)]
    pub goals: Vec<BackupGoalInput>,
    #[serde(default)]
    pub habits: Vec<BackupHabitInput>,
    #[serde(default)]
    pub habit_logs: Vec<BackupHabitLogInput>,
}

#[derive(Debug, Deserialize)]
pub struct BackupEntryInput {
    pub date: String,
    pub yesterday: String,
    pub today: String,
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
    pub due_date: Option<String>,
    pub completed_at: Option<String>,
    pub time_estimate_minutes: Option<i64>,
    pub timer_started_at: Option<String>,
    pub timer_accumulated_seconds: Option<i64>,
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
    pub target_date: Option<String>,
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

fn normalize_time_estimate_minutes(value: Option<i64>) -> i64 {
    value.unwrap_or(0).clamp(0, 10_080)
}

fn normalize_accumulated_seconds(value: Option<i64>) -> i64 {
    value.unwrap_or(0).max(0)
}

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
        .prepare("SELECT id, date, yesterday, today, created_at FROM entries ORDER BY date DESC")
        .map_err(|e| e.to_string())?;

    let entries_iter = stmt
        .query_map([], |row| {
            Ok(Entry {
                id: row.get(0)?,
                date: row.get(1)?,
                yesterday: row.get(2)?,
                today: row.get(3)?,
                created_at: row.get(4)?,
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
        .prepare("SELECT id, date, yesterday, today, created_at FROM entries WHERE date = ?1")
        .map_err(|e| e.to_string())?;

    let mut entries_iter = stmt
        .query_map(params![date], |row| {
            Ok(Entry {
                id: row.get(0)?,
                date: row.get(1)?,
                yesterday: row.get(2)?,
                today: row.get(3)?,
                created_at: row.get(4)?,
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
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let created_at = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO entries (date, yesterday, today, created_at)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(date) DO UPDATE SET
            yesterday = excluded.yesterday,
            today = excluded.today",
        params![date, yesterday, today, created_at],
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
    let mut stmt = conn.prepare("SELECT id, date, yesterday, today, created_at FROM entries WHERE yesterday LIKE ?1 OR today LIKE ?1 ORDER BY date DESC").map_err(|e| e.to_string())?;

    let entries_iter = stmt
        .query_map(params![search_term], |row| {
            Ok(Entry {
                id: row.get(0)?,
                date: row.get(1)?,
                yesterday: row.get(2)?,
                today: row.get(3)?,
                created_at: row.get(4)?,
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
    let output = std::process::Command::new("git")
        .args(["log", "--since=midnight", "--oneline"])
        .current_dir(std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from(".")))
        .output()
        .map_err(|e| e.to_string())?;

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
    let mut stmt = conn.prepare("SELECT id, title, description, status, priority, due_date, completed_at, time_estimate_minutes, timer_started_at, timer_accumulated_seconds, created_at, updated_at FROM tasks ORDER BY updated_at DESC").map_err(|e| e.to_string())?;

    let tasks_iter = stmt
        .query_map([], |row| {
            Ok(Task {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                status: row.get(3)?,
                priority: row.get(4)?,
                due_date: row.get(5)?,
                completed_at: row.get(6)?,
                time_estimate_minutes: row.get(7)?,
                timer_started_at: row.get(8)?,
                timer_accumulated_seconds: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
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
    due_date: Option<String>,
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
    let timer_started_at: Option<String> = None;
    let timer_accumulated_seconds = 0_i64;

    conn.execute(
        "INSERT INTO tasks (title, description, status, priority, due_date, completed_at, time_estimate_minutes, timer_started_at, timer_accumulated_seconds, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            title,
            description,
            status,
            priority,
            due_date,
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
        due_date,
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
    due_date: Option<String>,
    time_estimate_minutes: Option<i64>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let status = normalize_status(status);
    let normalized_priority = normalize_priority(priority);
    let normalized_time_estimate_minutes = normalize_time_estimate_minutes(time_estimate_minutes);
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
        "UPDATE tasks SET title = ?1, description = ?2, status = ?3, priority = ?4, due_date = ?5, completed_at = ?6, time_estimate_minutes = ?7, timer_started_at = ?8, timer_accumulated_seconds = ?9, updated_at = ?10 WHERE id = ?11",
        params![
            title,
            description,
            status,
            normalized_priority,
            due_date,
            completed_at,
            normalized_time_estimate_minutes,
            timer_started_at,
            timer_accumulated_seconds,
            now,
            id
        ],
    ).map_err(|e| e.to_string())?;

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
pub fn get_goals(state: State<'_, AppState>) -> Result<Vec<Goal>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, title, description, status, progress, target_date, created_at, updated_at
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
                target_date: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
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

    conn.execute(
        "INSERT INTO goals (title, description, status, progress, target_date, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            title,
            description,
            normalized_status,
            normalized_progress,
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

    conn.execute(
        "UPDATE goals
         SET title = ?1, description = ?2, status = ?3, progress = ?4, target_date = ?5, updated_at = ?6
         WHERE id = ?7",
        params![
            title,
            description,
            normalized_status,
            normalized_progress,
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
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM goals WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

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
        tx.execute("DELETE FROM tasks", [])
            .map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM goals", [])
            .map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM habit_logs", [])
            .map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM habits", [])
            .map_err(|e| e.to_string())?;
    }

    let now = chrono::Utc::now().to_rfc3339();

    for entry in payload.entries {
        tx.execute(
            "INSERT INTO entries (date, yesterday, today, created_at)
             VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(date) DO UPDATE SET
                yesterday = excluded.yesterday,
                today = excluded.today,
                created_at = excluded.created_at",
            params![
                entry.date,
                entry.yesterday,
                entry.today,
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

    for task in payload.tasks {
        let created_at = task.created_at.unwrap_or_else(|| now.clone());
        let updated_at = task.updated_at.unwrap_or_else(|| created_at.clone());
        let status = normalize_status(task.status);
        let priority = normalize_priority(task.priority);
        let due_date = task.due_date;
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
                "INSERT INTO tasks (id, title, description, status, priority, due_date, completed_at, time_estimate_minutes, timer_started_at, timer_accumulated_seconds, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
                 ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    description = excluded.description,
                    status = excluded.status,
                    priority = excluded.priority,
                    due_date = excluded.due_date,
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
                    due_date,
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
                "INSERT INTO tasks (title, description, status, priority, due_date, completed_at, time_estimate_minutes, timer_started_at, timer_accumulated_seconds, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                params![
                    task.title,
                    task.description,
                    status,
                    priority,
                    due_date,
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

    for goal in payload.goals {
        let created_at = goal.created_at.unwrap_or_else(|| now.clone());
        let updated_at = goal.updated_at.unwrap_or_else(|| created_at.clone());
        let status = normalize_goal_status(goal.status);
        let mut progress = normalize_progress(goal.progress);
        if status == "completed" {
            progress = 100;
        }
        let description = goal.description.unwrap_or_default();

        if let Some(id) = goal.id {
            tx.execute(
                "INSERT INTO goals (id, title, description, status, progress, target_date, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
                 ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    description = excluded.description,
                    status = excluded.status,
                    progress = excluded.progress,
                    target_date = excluded.target_date,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at",
                params![id, goal.title, description, status, progress, goal.target_date, created_at, updated_at],
            )
            .map_err(|e| e.to_string())?;
        } else {
            tx.execute(
                "INSERT INTO goals (title, description, status, progress, target_date, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![goal.title, description, status, progress, goal.target_date, created_at, updated_at],
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
