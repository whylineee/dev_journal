use rusqlite::{Connection, Result};
use std::fs;
use std::path::PathBuf;

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

    // Create entries table
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

    Ok(conn)
}
