use crate::models::{Task, TaskSubtask};
use chrono::{Datelike, Utc};
use rusqlite::{params, OptionalExtension};
use tauri::State;

use super::validation::{
    elapsed_since, normalize_goal_id, normalize_optional_date,
    normalize_priority, normalize_status, normalize_subtask_title,
    normalize_task_recurrence, normalize_time_estimate_minutes, normalize_project_id,
    task_exists, touch_task_updated_at,
};
use super::AppState;

pub(crate) fn compute_next_due_date(current_due_date: &str, recurrence: &str) -> Option<String> {
    let date = chrono::NaiveDate::parse_from_str(current_due_date, "%Y-%m-%d").ok()?;
    let next = match recurrence {
        "daily" => date + chrono::Duration::days(1),
        "weekdays" => {
            let mut candidate = date + chrono::Duration::days(1);
            while matches!(candidate.weekday(), chrono::Weekday::Sat | chrono::Weekday::Sun) {
                candidate += chrono::Duration::days(1);
            }
            candidate
        }
        "weekly" => date + chrono::Duration::days(7),
        _ => return None,
    };

    Some(next.format("%Y-%m-%d").to_string())
}

pub(crate) fn materialize_recurring_successor(
    conn: &rusqlite::Connection,
    task_id: i64,
) -> Result<(), String> {
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
        let Ok(limit_date) = chrono::NaiveDate::parse_from_str(limit, "%Y-%m-%d") else {
            return Ok(());
        };
        let Ok(next_date) = chrono::NaiveDate::parse_from_str(&next_due_date, "%Y-%m-%d") else {
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

#[tauri::command]
pub fn get_tasks(state: State<'_, AppState>) -> Result<Vec<Task>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, title, description, status, priority, project_id, goal_id, due_date, recurrence, recurrence_until, parent_task_id, completed_at, time_estimate_minutes, timer_started_at, timer_accumulated_seconds, created_at, updated_at FROM tasks ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;

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
    let now = Utc::now().to_rfc3339();
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
    let due_date = normalize_optional_date(due_date);
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
    )
    .map_err(|e| e.to_string())?;

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
    let now = Utc::now().to_rfc3339();
    let status = normalize_status(status);
    let normalized_priority = normalize_priority(priority);
    let normalized_project_id = normalize_project_id(&conn, project_id)?;
    let normalized_goal_id = normalize_goal_id(&conn, goal_id)?;
    let normalized_due_date = normalize_optional_date(due_date);
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
            normalized_due_date,
            normalized_recurrence,
            normalized_recurrence_until,
            completed_at,
            normalized_time_estimate_minutes,
            timer_started_at,
            timer_accumulated_seconds,
            now,
            id
        ],
    )
    .map_err(|e| e.to_string())?;

    if status == "done" && previous_status != "done" {
        materialize_recurring_successor(&conn, id)?;
    }

    Ok(())
}

#[tauri::command]
pub fn update_task_status(id: i64, status: String, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
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
    let now = Utc::now().to_rfc3339();

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
    let now = Utc::now().to_rfc3339();

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
    let now = Utc::now().to_rfc3339();

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

    let now = Utc::now().to_rfc3339();
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
    let now = Utc::now().to_rfc3339();

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
        touch_task_updated_at(&conn, task_id, &Utc::now().to_rfc3339())?;
    }

    Ok(())
}
