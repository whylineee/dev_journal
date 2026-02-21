use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Entry {
    pub id: i64,
    pub date: String,
    pub yesterday: String,
    pub today: String,
    pub created_at: String,
}
