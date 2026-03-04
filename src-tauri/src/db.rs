use rusqlite::{params, Connection, Result};
use std::fs;
use std::path::PathBuf;

/// Initializes SQLite connection, enables DB PRAGMAs, and applies migrations.
pub fn init(app_data_dir: PathBuf) -> Result<Connection> {
    if !app_data_dir.exists() {
        fs::create_dir_all(&app_data_dir).expect("Failed to create app data directory");
    }

    let db_path = app_data_dir.join("dev_journal.db");
    let conn = Connection::open(db_path)?;

    // Enable PRAGMAs for performance
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;",
    )?;

    run_migrations(&conn)?;

    Ok(conn)
}

fn run_migrations(conn: &Connection) -> Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL
        )",
        [],
    )?;

    // v1: base journal/page/task entities.
    apply_migration(conn, 1, |conn| {
        conn.execute(
            "CREATE TABLE IF NOT EXISTS entries (
                id INTEGER PRIMARY KEY,
                date TEXT NOT NULL UNIQUE,
                yesterday TEXT NOT NULL,
                today TEXT NOT NULL,
                created_at TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS pages (
                id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )?;

        Ok(())
    })?;

    // v2: task priority + due date support.
    apply_migration(conn, 2, |conn| {
        ensure_column(conn, "tasks", "priority", "TEXT NOT NULL DEFAULT 'medium'")?;
        ensure_column(conn, "tasks", "due_date", "TEXT")?;
        ensure_column(conn, "tasks", "completed_at", "TEXT")?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_status_due_date ON tasks(status, due_date)",
            [],
        )?;

        Ok(())
    })?;

    // v3: goals domain.
    apply_migration(conn, 3, |conn| {
        conn.execute(
            "CREATE TABLE IF NOT EXISTS goals (
                id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'active',
                progress INTEGER NOT NULL DEFAULT 0,
                target_date TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_goals_status_target_date ON goals(status, target_date)",
            [],
        )?;

        Ok(())
    })?;

    // v4: habits and daily completion logs.
    apply_migration(conn, 4, |conn| {
        conn.execute(
            "CREATE TABLE IF NOT EXISTS habits (
                id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                target_per_week INTEGER NOT NULL DEFAULT 5,
                color TEXT NOT NULL DEFAULT '#60a5fa',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS habit_logs (
                id INTEGER PRIMARY KEY,
                habit_id INTEGER NOT NULL,
                date TEXT NOT NULL,
                created_at TEXT NOT NULL,
                UNIQUE(habit_id, date),
                FOREIGN KEY(habit_id) REFERENCES habits(id) ON DELETE CASCADE
            )",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_date ON habit_logs(habit_id, date)",
            [],
        )?;

        Ok(())
    })?;

    // v5: persistent task timer fields.
    apply_migration(conn, 5, |conn| {
        ensure_column(
            conn,
            "tasks",
            "time_estimate_minutes",
            "INTEGER NOT NULL DEFAULT 0",
        )?;
        ensure_column(conn, "tasks", "timer_started_at", "TEXT")?;
        ensure_column(
            conn,
            "tasks",
            "timer_accumulated_seconds",
            "INTEGER NOT NULL DEFAULT 0",
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_timer_started_at ON tasks(timer_started_at)",
            [],
        )?;

        Ok(())
    })?;

    // v6: project hub domain + project links for entries/tasks/goals.
    apply_migration(conn, 6, |conn| {
        conn.execute(
            "CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                description TEXT NOT NULL DEFAULT '',
                color TEXT NOT NULL DEFAULT '#60a5fa',
                status TEXT NOT NULL DEFAULT 'active',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )?;

        ensure_column(conn, "entries", "project_id", "INTEGER")?;
        ensure_column(conn, "tasks", "project_id", "INTEGER")?;
        ensure_column(conn, "goals", "project_id", "INTEGER")?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_projects_status_updated_at ON projects(status, updated_at DESC)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_entries_project_id ON entries(project_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_goals_project_id ON goals(project_id)",
            [],
        )?;

        Ok(())
    })?;

    // v7: branches per project workspace.
    apply_migration(conn, 7, |conn| {
        conn.execute(
            "CREATE TABLE IF NOT EXISTS project_branches (
                id INTEGER PRIMARY KEY,
                project_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'open',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
            )",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_project_branches_project_status_updated_at
             ON project_branches(project_id, status, updated_at DESC)",
            [],
        )?;

        Ok(())
    })?;

    // v8: subtasks for task cards.
    apply_migration(conn, 8, |conn| {
        conn.execute(
            "CREATE TABLE IF NOT EXISTS task_subtasks (
                id INTEGER PRIMARY KEY,
                task_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                position INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
            )",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_task_subtasks_task_position ON task_subtasks(task_id, position, id)",
            [],
        )?;

        Ok(())
    })?;

    Ok(())
}

fn apply_migration<F>(conn: &Connection, version: i64, migration: F) -> Result<()>
where
    F: FnOnce(&Connection) -> Result<()>,
{
    let already_applied = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = ?1)",
        [version],
        |row| row.get::<_, i64>(0),
    )? == 1;

    if already_applied {
        return Ok(());
    }

    migration(conn)?;

    conn.execute(
        "INSERT INTO schema_migrations (version, applied_at) VALUES (?1, ?2)",
        params![version, chrono::Utc::now().to_rfc3339()],
    )?;

    Ok(())
}

fn ensure_column(conn: &Connection, table: &str, column: &str, definition: &str) -> Result<()> {
    if has_column(conn, table, column)? {
        return Ok(());
    }

    let sql = format!("ALTER TABLE {table} ADD COLUMN {column} {definition}");
    conn.execute(&sql, [])?;
    Ok(())
}

fn has_column(conn: &Connection, table: &str, column: &str) -> Result<bool> {
    let pragma_sql = format!("PRAGMA table_info({table})");
    let mut stmt = conn.prepare(&pragma_sql)?;
    let mut rows = stmt.query([])?;

    while let Some(row) = rows.next()? {
        let existing_name: String = row.get(1)?;
        if existing_name == column {
            return Ok(true);
        }
    }

    Ok(false)
}
