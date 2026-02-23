use crate::models::Entry;
use rusqlite::params;
use std::sync::Mutex;
use tauri::State;
use rusqlite::Connection;
use serde::Deserialize;

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
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[tauri::command]
pub fn get_entries(state: State<'_, AppState>) -> Result<Vec<Entry>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, date, yesterday, today, created_at FROM entries ORDER BY date DESC").map_err(|e| e.to_string())?;
    
    let entries_iter = stmt.query_map([], |row| {
        Ok(Entry {
            id: row.get(0)?,
            date: row.get(1)?,
            yesterday: row.get(2)?,
            today: row.get(3)?,
            created_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;

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
    let mut stmt = conn.prepare("SELECT id, date, yesterday, today, created_at FROM entries WHERE date = ?1").map_err(|e| e.to_string())?;
    
    let mut entries_iter = stmt.query_map(params![date], |row| {
        Ok(Entry {
            id: row.get(0)?,
            date: row.get(1)?,
            yesterday: row.get(2)?,
            today: row.get(3)?,
            created_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;

    if let Some(entry) = entries_iter.next() {
        Ok(Some(entry.map_err(|e| e.to_string())?))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn save_entry(date: String, yesterday: String, today: String, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let created_at = chrono::Utc::now().to_rfc3339();
    
    conn.execute(
        "INSERT INTO entries (date, yesterday, today, created_at)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(date) DO UPDATE SET
            yesterday = excluded.yesterday,
            today = excluded.today",
        params![date, yesterday, today, created_at],
    ).map_err(|e| e.to_string())?;
    
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
    
    let entries_iter = stmt.query_map(params![search_term], |row| {
        Ok(Entry {
            id: row.get(0)?,
            date: row.get(1)?,
            yesterday: row.get(2)?,
            today: row.get(3)?,
            created_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;

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

use crate::models::Page;

#[tauri::command]
pub fn get_pages(state: State<'_, AppState>) -> Result<Vec<Page>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, title, content, created_at, updated_at FROM pages ORDER BY updated_at DESC").map_err(|e| e.to_string())?;
    
    let pages_iter = stmt.query_map([], |row| {
        Ok(Page {
            id: row.get(0)?,
            title: row.get(1)?,
            content: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut pages = Vec::new();
    for page in pages_iter {
        pages.push(page.map_err(|e| e.to_string())?);
    }
    
    Ok(pages)
}

#[tauri::command]
pub fn get_page(id: i64, state: State<'_, AppState>) -> Result<Option<Page>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, title, content, created_at, updated_at FROM pages WHERE id = ?1").map_err(|e| e.to_string())?;
    
    let mut pages_iter = stmt.query_map(params![id], |row| {
        Ok(Page {
            id: row.get(0)?,
            title: row.get(1)?,
            content: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;

    if let Some(page) = pages_iter.next() {
        Ok(Some(page.map_err(|e| e.to_string())?))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn create_page(title: String, content: String, state: State<'_, AppState>) -> Result<Page, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    
    conn.execute(
        "INSERT INTO pages (title, content, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
        params![title, content, now, now],
    ).map_err(|e| e.to_string())?;
    
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
pub fn update_page(id: i64, title: String, content: String, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    
    conn.execute(
        "UPDATE pages SET title = ?1, content = ?2, updated_at = ?3 WHERE id = ?4",
        params![title, content, now, id],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn delete_page(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    
    conn.execute(
        "DELETE FROM pages WHERE id = ?1",
        params![id],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

use crate::models::Task;

#[tauri::command]
pub fn get_tasks(state: State<'_, AppState>) -> Result<Vec<Task>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, title, description, status, created_at, updated_at FROM tasks ORDER BY updated_at DESC").map_err(|e| e.to_string())?;
    
    let tasks_iter = stmt.query_map([], |row| {
        Ok(Task {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            status: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut tasks = Vec::new();
    for task in tasks_iter {
        tasks.push(task.map_err(|e| e.to_string())?);
    }
    
    Ok(tasks)
}

#[tauri::command]
pub fn create_task(title: String, description: String, status: String, state: State<'_, AppState>) -> Result<Task, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    
    conn.execute(
        "INSERT INTO tasks (title, description, status, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![title, description, status, now, now],
    ).map_err(|e| e.to_string())?;
    
    let id = conn.last_insert_rowid();
    
    Ok(Task {
        id,
        title,
        description,
        status,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_task(id: i64, title: String, description: String, status: String, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    
    conn.execute(
        "UPDATE tasks SET title = ?1, description = ?2, status = ?3, updated_at = ?4 WHERE id = ?5",
        params![title, description, status, now, id],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn update_task_status(id: i64, status: String, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    
    conn.execute(
        "UPDATE tasks SET status = ?1, updated_at = ?2 WHERE id = ?3",
        params![status, now, id],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn delete_task(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    
    conn.execute(
        "DELETE FROM tasks WHERE id = ?1",
        params![id],
    ).map_err(|e| e.to_string())?;
    
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
        tx.execute("DELETE FROM entries", []).map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM pages", []).map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM tasks", []).map_err(|e| e.to_string())?;
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

        if let Some(id) = task.id {
            tx.execute(
                "INSERT INTO tasks (id, title, description, status, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)
                 ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    description = excluded.description,
                    status = excluded.status,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at",
                params![id, task.title, task.description, task.status, created_at, updated_at],
            )
            .map_err(|e| e.to_string())?;
        } else {
            tx.execute(
                "INSERT INTO tasks (title, description, status, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![task.title, task.description, task.status, created_at, updated_at],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}
