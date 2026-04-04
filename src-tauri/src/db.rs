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

    configure_connection(&conn)?;

    run_migrations(&conn)?;
    enable_foreign_keys(&conn)?;

    Ok(conn)
}

fn configure_connection(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;",
    )?;

    Ok(())
}

fn enable_foreign_keys(conn: &Connection) -> Result<()> {
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    Ok(())
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

    // v9: link tasks to goals.
    apply_migration(conn, 9, |conn| {
        ensure_column(conn, "tasks", "goal_id", "INTEGER")?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON tasks(goal_id)",
            [],
        )?;
        Ok(())
    })?;

    // v10: meetings and calendar planning.
    apply_migration(conn, 10, |conn| {
        conn.execute(
            "CREATE TABLE IF NOT EXISTS meetings (
                id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                agenda TEXT NOT NULL DEFAULT '',
                start_at TEXT NOT NULL,
                end_at TEXT NOT NULL,
                meet_url TEXT,
                calendar_event_url TEXT,
                project_id INTEGER,
                status TEXT NOT NULL DEFAULT 'planned',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_meetings_start_status ON meetings(start_at, status)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_meetings_project_id ON meetings(project_id)",
            [],
        )?;

        Ok(())
    })?;

    // v11: enrich meetings with reminders, recurrence, notes, participants, and action items.
    apply_migration(conn, 11, |conn| {
        ensure_column(
            conn,
            "meetings",
            "participants_json",
            "TEXT NOT NULL DEFAULT '[]'",
        )?;
        ensure_column(conn, "meetings", "notes", "TEXT NOT NULL DEFAULT ''")?;
        ensure_column(conn, "meetings", "decisions", "TEXT NOT NULL DEFAULT ''")?;
        ensure_column(
            conn,
            "meetings",
            "action_items_json",
            "TEXT NOT NULL DEFAULT '[]'",
        )?;
        ensure_column(
            conn,
            "meetings",
            "recurrence",
            "TEXT NOT NULL DEFAULT 'none'",
        )?;
        ensure_column(conn, "meetings", "recurrence_until", "TEXT")?;
        ensure_column(
            conn,
            "meetings",
            "reminder_minutes",
            "INTEGER NOT NULL DEFAULT 10",
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_meetings_recurrence ON meetings(recurrence, recurrence_until)",
            [],
        )?;

        Ok(())
    })?;

    // v12: recurring tasks + goal milestones.
    apply_migration(conn, 12, |conn| {
        ensure_column(
            conn,
            "tasks",
            "recurrence",
            "TEXT NOT NULL DEFAULT 'none'",
        )?;
        ensure_column(conn, "tasks", "recurrence_until", "TEXT")?;
        ensure_column(conn, "tasks", "parent_task_id", "INTEGER")?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_due_date
             ON tasks(recurrence, due_date)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id
             ON tasks(parent_task_id)",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS goal_milestones (
                id INTEGER PRIMARY KEY,
                goal_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                position INTEGER NOT NULL DEFAULT 0,
                due_date TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE CASCADE
            )",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal_position
             ON goal_milestones(goal_id, position, id)",
            [],
        )?;

        Ok(())
    })?;

    // v13: enforce referential integrity on project/goal/task links and clean invalid references.
    apply_migration(conn, 13, |conn| {
        conn.execute_batch("PRAGMA foreign_keys = OFF;")?;

        conn.execute(
            "DELETE FROM project_branches
             WHERE NOT EXISTS (SELECT 1 FROM projects WHERE projects.id = project_branches.project_id)",
            [],
        )?;
        conn.execute(
            "DELETE FROM task_subtasks
             WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_subtasks.task_id)",
            [],
        )?;
        conn.execute(
            "DELETE FROM goal_milestones
             WHERE NOT EXISTS (SELECT 1 FROM goals WHERE goals.id = goal_milestones.goal_id)",
            [],
        )?;
        conn.execute(
            "DELETE FROM habit_logs
             WHERE NOT EXISTS (SELECT 1 FROM habits WHERE habits.id = habit_logs.habit_id)",
            [],
        )?;
        conn.execute(
            "UPDATE meetings
             SET project_id = NULL
             WHERE project_id IS NOT NULL
               AND NOT EXISTS (SELECT 1 FROM projects WHERE projects.id = meetings.project_id)",
            [],
        )?;

        conn.execute(
            "ALTER TABLE entries RENAME TO entries_old_v13",
            [],
        )?;
        conn.execute(
            "CREATE TABLE entries (
                id INTEGER PRIMARY KEY,
                date TEXT NOT NULL UNIQUE,
                yesterday TEXT NOT NULL,
                today TEXT NOT NULL,
                created_at TEXT NOT NULL,
                project_id INTEGER,
                FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL
            )",
            [],
        )?;
        conn.execute(
            "INSERT INTO entries (id, date, yesterday, today, created_at, project_id)
             SELECT
                id,
                date,
                yesterday,
                today,
                created_at,
                CASE
                    WHEN project_id IS NOT NULL
                     AND EXISTS (SELECT 1 FROM projects WHERE projects.id = entries_old_v13.project_id)
                    THEN project_id
                    ELSE NULL
                END
             FROM entries_old_v13",
            [],
        )?;
        conn.execute("DROP TABLE entries_old_v13", [])?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_entries_project_id ON entries(project_id)",
            [],
        )?;

        conn.execute(
            "ALTER TABLE goals RENAME TO goals_old_v13",
            [],
        )?;
        conn.execute(
            "CREATE TABLE goals (
                id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'active',
                progress INTEGER NOT NULL DEFAULT 0,
                target_date TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                project_id INTEGER,
                FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL
            )",
            [],
        )?;
        conn.execute(
            "INSERT INTO goals (id, title, description, status, progress, target_date, created_at, updated_at, project_id)
             SELECT
                id,
                title,
                description,
                status,
                progress,
                target_date,
                created_at,
                updated_at,
                CASE
                    WHEN project_id IS NOT NULL
                     AND EXISTS (SELECT 1 FROM projects WHERE projects.id = goals_old_v13.project_id)
                    THEN project_id
                    ELSE NULL
                END
             FROM goals_old_v13",
            [],
        )?;
        conn.execute("DROP TABLE goals_old_v13", [])?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_goals_status_target_date ON goals(status, target_date)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_goals_project_id ON goals(project_id)",
            [],
        )?;

        conn.execute(
            "ALTER TABLE tasks RENAME TO tasks_old_v13",
            [],
        )?;
        conn.execute(
            "CREATE TABLE tasks (
                id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                priority TEXT NOT NULL DEFAULT 'medium',
                due_date TEXT,
                completed_at TEXT,
                time_estimate_minutes INTEGER NOT NULL DEFAULT 0,
                timer_started_at TEXT,
                timer_accumulated_seconds INTEGER NOT NULL DEFAULT 0,
                project_id INTEGER,
                goal_id INTEGER,
                recurrence TEXT NOT NULL DEFAULT 'none',
                recurrence_until TEXT,
                parent_task_id INTEGER,
                FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL,
                FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE SET NULL,
                FOREIGN KEY(parent_task_id) REFERENCES tasks(id) ON DELETE SET NULL
            )",
            [],
        )?;
        conn.execute(
            "INSERT INTO tasks (
                id, title, description, status, created_at, updated_at, priority, due_date, completed_at,
                time_estimate_minutes, timer_started_at, timer_accumulated_seconds, project_id, goal_id,
                recurrence, recurrence_until, parent_task_id
             )
             SELECT
                id,
                title,
                description,
                status,
                created_at,
                updated_at,
                priority,
                due_date,
                completed_at,
                time_estimate_minutes,
                timer_started_at,
                timer_accumulated_seconds,
                CASE
                    WHEN project_id IS NOT NULL
                     AND EXISTS (SELECT 1 FROM projects WHERE projects.id = tasks_old_v13.project_id)
                    THEN project_id
                    ELSE NULL
                END,
                CASE
                    WHEN goal_id IS NOT NULL
                     AND EXISTS (SELECT 1 FROM goals WHERE goals.id = tasks_old_v13.goal_id)
                    THEN goal_id
                    ELSE NULL
                END,
                recurrence,
                recurrence_until,
                CASE
                    WHEN parent_task_id IS NOT NULL
                     AND EXISTS (SELECT 1 FROM tasks_old_v13 AS parent WHERE parent.id = tasks_old_v13.parent_task_id)
                    THEN parent_task_id
                    ELSE NULL
                END
             FROM tasks_old_v13",
            [],
        )?;
        conn.execute("DROP TABLE tasks_old_v13", [])?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_status_due_date ON tasks(status, due_date)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_timer_started_at ON tasks(timer_started_at)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON tasks(goal_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_due_date ON tasks(recurrence, due_date)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id)",
            [],
        )?;

        conn.execute_batch("PRAGMA foreign_keys = ON;")?;

        Ok(())
    })?;

    // v14: rebuild child tables whose foreign keys still targeted pre-v13 renamed parents.
    apply_migration(conn, 14, |conn| {
        conn.execute_batch("PRAGMA foreign_keys = OFF;")?;

        conn.execute(
            "ALTER TABLE task_subtasks RENAME TO task_subtasks_old_v14",
            [],
        )?;
        conn.execute(
            "CREATE TABLE task_subtasks (
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
            "INSERT INTO task_subtasks (id, task_id, title, completed, position, created_at, updated_at)
             SELECT
                id,
                task_id,
                title,
                completed,
                position,
                created_at,
                updated_at
             FROM task_subtasks_old_v14
             WHERE EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_subtasks_old_v14.task_id)",
            [],
        )?;
        conn.execute("DROP TABLE task_subtasks_old_v14", [])?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_task_subtasks_task_position ON task_subtasks(task_id, position, id)",
            [],
        )?;

        conn.execute(
            "ALTER TABLE goal_milestones RENAME TO goal_milestones_old_v14",
            [],
        )?;
        conn.execute(
            "CREATE TABLE goal_milestones (
                id INTEGER PRIMARY KEY,
                goal_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                position INTEGER NOT NULL DEFAULT 0,
                due_date TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE CASCADE
            )",
            [],
        )?;
        conn.execute(
            "INSERT INTO goal_milestones (id, goal_id, title, completed, position, due_date, created_at, updated_at)
             SELECT
                id,
                goal_id,
                title,
                completed,
                position,
                due_date,
                created_at,
                updated_at
             FROM goal_milestones_old_v14
             WHERE EXISTS (SELECT 1 FROM goals WHERE goals.id = goal_milestones_old_v14.goal_id)",
            [],
        )?;
        conn.execute("DROP TABLE goal_milestones_old_v14", [])?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal_position
             ON goal_milestones(goal_id, position, id)",
            [],
        )?;

        conn.execute_batch("PRAGMA foreign_keys = ON;")?;

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn run_migrations_enables_integrity_schema() {
        let conn = Connection::open_in_memory().expect("in-memory db");
        configure_connection(&conn).expect("configure");
        run_migrations(&conn).expect("migrate");
        enable_foreign_keys(&conn).expect("fk pragma");

        let foreign_keys_enabled: i64 = conn
            .query_row("PRAGMA foreign_keys", [], |row| row.get(0))
            .expect("pragma");
        assert_eq!(foreign_keys_enabled, 1);

        let task_goal_fk_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_foreign_key_list('tasks') WHERE \"from\" = 'goal_id'",
                [],
                |row| row.get(0),
            )
            .expect("task goal fk");
        assert_eq!(task_goal_fk_count, 1);

        let goal_milestone_fk_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_foreign_key_list('goal_milestones') WHERE \"from\" = 'goal_id' AND \"table\" = 'goals'",
                [],
                |row| row.get(0),
            )
            .expect("goal milestone fk");
        assert_eq!(goal_milestone_fk_count, 1);

        let task_subtask_fk_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_foreign_key_list('task_subtasks') WHERE \"from\" = 'task_id' AND \"table\" = 'tasks'",
                [],
                |row| row.get(0),
            )
            .expect("task subtask fk");
        assert_eq!(task_subtask_fk_count, 1);
    }

    #[test]
    fn migration_v13_cleans_invalid_project_and_goal_links() {
        let conn = Connection::open_in_memory().expect("in-memory db");
        configure_connection(&conn).expect("configure");

        conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL
            )",
            [],
        )
        .expect("schema table");
        for version in 1..=12 {
            conn.execute(
                "INSERT INTO schema_migrations (version, applied_at) VALUES (?1, ?2)",
                params![version, "2026-04-02T00:00:00Z"],
            )
            .expect("seed old migrations");
        }

        conn.execute(
            "CREATE TABLE projects (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                description TEXT NOT NULL DEFAULT '',
                color TEXT NOT NULL DEFAULT '#60a5fa',
                status TEXT NOT NULL DEFAULT 'active',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )
        .expect("projects");
        conn.execute(
            "CREATE TABLE goals (
                id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'active',
                progress INTEGER NOT NULL DEFAULT 0,
                target_date TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                project_id INTEGER
            )",
            [],
        )
        .expect("goals");
        conn.execute(
            "CREATE TABLE tasks (
                id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                priority TEXT NOT NULL DEFAULT 'medium',
                due_date TEXT,
                completed_at TEXT,
                time_estimate_minutes INTEGER NOT NULL DEFAULT 0,
                timer_started_at TEXT,
                timer_accumulated_seconds INTEGER NOT NULL DEFAULT 0,
                project_id INTEGER,
                goal_id INTEGER,
                recurrence TEXT NOT NULL DEFAULT 'none',
                recurrence_until TEXT,
                parent_task_id INTEGER
            )",
            [],
        )
        .expect("tasks");
        conn.execute(
            "CREATE TABLE entries (
                id INTEGER PRIMARY KEY,
                date TEXT NOT NULL UNIQUE,
                yesterday TEXT NOT NULL,
                today TEXT NOT NULL,
                created_at TEXT NOT NULL,
                project_id INTEGER
            )",
            [],
        )
        .expect("entries");
        conn.execute(
            "CREATE TABLE meetings (
                id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                agenda TEXT NOT NULL DEFAULT '',
                start_at TEXT NOT NULL,
                end_at TEXT NOT NULL,
                meet_url TEXT,
                calendar_event_url TEXT,
                project_id INTEGER,
                status TEXT NOT NULL DEFAULT 'planned',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                participants_json TEXT NOT NULL DEFAULT '[]',
                notes TEXT NOT NULL DEFAULT '',
                decisions TEXT NOT NULL DEFAULT '',
                action_items_json TEXT NOT NULL DEFAULT '[]',
                recurrence TEXT NOT NULL DEFAULT 'none',
                recurrence_until TEXT,
                reminder_minutes INTEGER NOT NULL DEFAULT 10
            )",
            [],
        )
        .expect("meetings");
        conn.execute(
            "CREATE TABLE habits (
                id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                target_per_week INTEGER NOT NULL DEFAULT 5,
                color TEXT NOT NULL DEFAULT '#60a5fa',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )
        .expect("habits");
        conn.execute(
            "CREATE TABLE project_branches (
                id INTEGER PRIMARY KEY,
                project_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'open',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )
        .expect("project_branches");
        conn.execute(
            "CREATE TABLE task_subtasks (
                id INTEGER PRIMARY KEY,
                task_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                position INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )
        .expect("task_subtasks");
        conn.execute(
            "CREATE TABLE goal_milestones (
                id INTEGER PRIMARY KEY,
                goal_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                position INTEGER NOT NULL DEFAULT 0,
                due_date TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )
        .expect("goal_milestones");
        conn.execute(
            "CREATE TABLE habit_logs (
                id INTEGER PRIMARY KEY,
                habit_id INTEGER NOT NULL,
                date TEXT NOT NULL,
                created_at TEXT NOT NULL
            )",
            [],
        )
        .expect("habit_logs");

        conn.execute(
            "INSERT INTO projects (id, name, description, color, status, created_at, updated_at)
             VALUES (1, 'Core', '', '#60a5fa', 'active', '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z')",
            [],
        )
        .expect("project row");
        conn.execute(
            "INSERT INTO goals (id, title, description, status, progress, target_date, created_at, updated_at, project_id)
             VALUES (10, 'Goal', '', 'active', 0, NULL, '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z', 999)",
            [],
        )
        .expect("goal row");
        conn.execute(
            "INSERT INTO tasks (id, title, description, status, created_at, updated_at, priority, due_date, completed_at, time_estimate_minutes, timer_started_at, timer_accumulated_seconds, project_id, goal_id, recurrence, recurrence_until, parent_task_id)
             VALUES (100, 'Task', '', 'todo', '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z', 'medium', NULL, NULL, 0, NULL, 0, 999, 999, 'none', NULL, 999)",
            [],
        )
        .expect("task row");
        conn.execute(
            "INSERT INTO entries (id, date, yesterday, today, created_at, project_id)
             VALUES (1, '2026-04-02', '', '', '2026-04-02T00:00:00Z', 999)",
            [],
        )
        .expect("entry row");

        run_migrations(&conn).expect("apply v13");
        enable_foreign_keys(&conn).expect("fk pragma");

        let goal_project_id: Option<i64> = conn
            .query_row("SELECT project_id FROM goals WHERE id = 10", [], |row| row.get(0))
            .expect("goal project id");
        let task_links: (Option<i64>, Option<i64>, Option<i64>) = conn
            .query_row(
                "SELECT project_id, goal_id, parent_task_id FROM tasks WHERE id = 100",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .expect("task links");
        let entry_project_id: Option<i64> = conn
            .query_row(
                "SELECT project_id FROM entries WHERE id = 1",
                [],
                |row| row.get(0),
            )
            .expect("entry project id");

        assert_eq!(goal_project_id, None);
        assert_eq!(task_links, (None, None, None));
        assert_eq!(entry_project_id, None);
    }
}
