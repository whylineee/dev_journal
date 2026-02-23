use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Entry {
    pub id: i64,
    pub date: String,
    pub yesterday: String,
    pub today: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Page {
    pub id: i64,
    pub title: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Task {
    pub id: i64,
    pub title: String,
    pub description: String,
    pub status: String,
    pub priority: String,
    pub due_date: Option<String>,
    pub completed_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Goal {
    pub id: i64,
    pub title: String,
    pub description: String,
    pub status: String,
    pub progress: i64,
    pub target_date: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Habit {
    pub id: i64,
    pub title: String,
    pub description: String,
    pub target_per_week: i64,
    pub color: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HabitWithLogs {
    pub id: i64,
    pub title: String,
    pub description: String,
    pub target_per_week: i64,
    pub color: String,
    pub completed_dates: Vec<String>,
    pub current_streak: i64,
    pub this_week_count: i64,
    pub created_at: String,
    pub updated_at: String,
}
