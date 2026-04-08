use crate::models::MeetingActionItem;
use chrono::{NaiveDate, Utc};
use rusqlite::{params, Connection};
use serde_json::{from_str, to_string};

pub(crate) fn normalize_status(status: String) -> String {
    match status.as_str() {
        "todo" | "in_progress" | "done" => status,
        _ => "todo".to_string(),
    }
}

pub(crate) fn normalize_priority(priority: Option<String>) -> String {
    match priority.as_deref() {
        Some("low") | Some("medium") | Some("high") | Some("urgent") => {
            priority.unwrap_or_else(|| "medium".to_string())
        }
        _ => "medium".to_string(),
    }
}

pub(crate) fn normalize_task_recurrence(recurrence: Option<String>) -> String {
    match recurrence.as_deref() {
        Some("none") | Some("daily") | Some("weekdays") | Some("weekly") => {
            recurrence.unwrap_or_else(|| "none".to_string())
        }
        _ => "none".to_string(),
    }
}

pub(crate) fn normalize_time_estimate_minutes(value: Option<i64>) -> i64 {
    value.unwrap_or(0).clamp(0, 10_080)
}

pub(crate) fn normalize_accumulated_seconds(value: Option<i64>) -> i64 {
    value.unwrap_or(0).max(0)
}

pub(crate) fn elapsed_since(started_at: &str) -> i64 {
    let parsed = chrono::DateTime::parse_from_rfc3339(started_at);
    if let Ok(date_time) = parsed {
        return (Utc::now() - date_time.with_timezone(&Utc))
            .num_seconds()
            .max(0);
    }

    0
}

pub(crate) fn normalize_goal_status(status: Option<String>) -> String {
    match status.as_deref() {
        Some("active") | Some("paused") | Some("completed") | Some("archived") => {
            status.unwrap_or_else(|| "active".to_string())
        }
        _ => "active".to_string(),
    }
}

pub(crate) fn normalize_project_status(status: Option<String>) -> String {
    match status.as_deref() {
        Some("active") | Some("paused") | Some("completed") | Some("archived") => {
            status.unwrap_or_else(|| "active".to_string())
        }
        _ => "active".to_string(),
    }
}

pub(crate) fn normalize_project_branch_status(status: Option<String>) -> String {
    match status.as_deref() {
        Some("open") | Some("merged") => status.unwrap_or_else(|| "open".to_string()),
        _ => "open".to_string(),
    }
}

pub(crate) fn normalize_project_branch_name(name: String) -> String {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        "main".to_string()
    } else {
        trimmed.to_string()
    }
}

pub(crate) fn normalize_meeting_title(title: String) -> String {
    let trimmed = title.trim();
    if trimmed.is_empty() {
        "Untitled meeting".to_string()
    } else {
        trimmed.to_string()
    }
}

pub(crate) fn normalize_optional_text(value: Option<String>) -> Option<String> {
    value.and_then(|raw| {
        let trimmed = raw.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    })
}

pub(crate) fn normalize_optional_http_url(value: Option<String>) -> Option<String> {
    normalize_optional_text(value).and_then(|trimmed| {
        let lower = trimmed.to_ascii_lowercase();
        if lower.starts_with("https://") || lower.starts_with("http://") {
            Some(trimmed)
        } else {
            None
        }
    })
}

pub(crate) fn normalize_meeting_status(status: Option<String>) -> String {
    match status.as_deref() {
        Some("planned") | Some("live") | Some("done") | Some("missed") | Some("cancelled") => {
            status.unwrap_or_else(|| "planned".to_string())
        }
        _ => "planned".to_string(),
    }
}

pub(crate) fn normalize_meeting_recurrence(recurrence: Option<String>) -> String {
    match recurrence.as_deref() {
        Some("none") | Some("daily") | Some("weekdays") | Some("weekly") => {
            recurrence.unwrap_or_else(|| "none".to_string())
        }
        _ => "none".to_string(),
    }
}

pub(crate) fn normalize_meeting_reminder_minutes(value: Option<i64>) -> i64 {
    value.unwrap_or(10).clamp(0, 240)
}

pub(crate) fn normalize_meeting_participants(participants: Option<Vec<String>>) -> Vec<String> {
    participants
        .unwrap_or_default()
        .into_iter()
        .map(|participant| participant.trim().to_string())
        .filter(|participant| !participant.is_empty())
        .collect()
}

pub(crate) fn normalize_meeting_action_items(
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

pub(crate) fn encode_json_string_list(values: &[String]) -> Result<String, String> {
    to_string(values).map_err(|e| e.to_string())
}

pub(crate) fn decode_json_string_list(value: String) -> Result<Vec<String>, String> {
    if value.trim().is_empty() {
        return Ok(Vec::new());
    }
    from_str::<Vec<String>>(&value).map_err(|e| e.to_string())
}

pub(crate) fn encode_json_action_items(values: &[MeetingActionItem]) -> Result<String, String> {
    to_string(values).map_err(|e| e.to_string())
}

pub(crate) fn decode_json_action_items(value: String) -> Result<Vec<MeetingActionItem>, String> {
    if value.trim().is_empty() {
        return Ok(Vec::new());
    }
    from_str::<Vec<MeetingActionItem>>(&value).map_err(|e| e.to_string())
}

pub(crate) fn parse_datetime_utc(value: &str) -> Result<chrono::DateTime<Utc>, String> {
    chrono::DateTime::parse_from_rfc3339(value)
        .map(|datetime| datetime.with_timezone(&Utc))
        .map_err(|_| "Invalid date-time format".to_string())
}

pub(crate) fn normalize_meeting_range(
    start_at: String,
    end_at: String,
) -> Result<(String, String), String> {
    let normalized_start = parse_datetime_utc(start_at.trim())?;
    let normalized_end = parse_datetime_utc(end_at.trim())?;

    if normalized_end <= normalized_start {
        return Err("Meeting end time must be after start time".to_string());
    }

    Ok((normalized_start.to_rfc3339(), normalized_end.to_rfc3339()))
}

pub(crate) fn normalize_project_color(color: Option<String>) -> String {
    let fallback = "#60a5fa".to_string();
    let value = color.unwrap_or_else(|| fallback.clone());
    if value.trim().is_empty() {
        fallback
    } else {
        value
    }
}

pub(crate) fn normalize_project_name(name: String) -> String {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        "Untitled project".to_string()
    } else {
        trimmed.to_string()
    }
}

pub(crate) fn normalize_project_id(
    conn: &Connection,
    project_id: Option<i64>,
) -> Result<Option<i64>, String> {
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

    if exists {
        Ok(Some(project_id))
    } else {
        Ok(None)
    }
}

pub(crate) fn normalize_goal_id(
    conn: &Connection,
    goal_id: Option<i64>,
) -> Result<Option<i64>, String> {
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

    if exists {
        Ok(Some(goal_id))
    } else {
        Ok(None)
    }
}

pub(crate) fn normalize_parent_task_id(
    conn: &Connection,
    parent_task_id: Option<i64>,
) -> Result<Option<i64>, String> {
    let Some(parent_task_id) = parent_task_id else {
        return Ok(None);
    };

    if task_exists(conn, parent_task_id)? {
        Ok(Some(parent_task_id))
    } else {
        Ok(None)
    }
}

pub(crate) fn normalize_required_project_id(
    conn: &Connection,
    project_id: i64,
) -> Result<i64, String> {
    match normalize_project_id(conn, Some(project_id))? {
        Some(id) => Ok(id),
        None => Err("Project not found".to_string()),
    }
}

pub(crate) fn normalize_progress(progress: Option<i64>) -> i64 {
    progress.unwrap_or(0).clamp(0, 100)
}

pub(crate) fn normalize_target_per_week(target_per_week: Option<i64>) -> i64 {
    target_per_week.unwrap_or(5).clamp(1, 14)
}

pub(crate) fn normalize_habit_color(color: Option<String>) -> String {
    let fallback = "#60a5fa".to_string();
    let value = color.unwrap_or(fallback.clone());
    if value.trim().is_empty() {
        fallback
    } else {
        value
    }
}

pub(crate) fn normalize_habit_date(date: String) -> String {
    if NaiveDate::parse_from_str(&date, "%Y-%m-%d").is_ok() {
        return date;
    }

    Utc::now().format("%Y-%m-%d").to_string()
}

pub(crate) fn normalize_subtask_title(title: String) -> String {
    let trimmed = title.trim();
    if trimmed.is_empty() {
        "Untitled subtask".to_string()
    } else {
        trimmed.to_string()
    }
}

pub(crate) fn normalize_goal_milestone_title(title: String) -> String {
    let trimmed = title.trim();
    if trimmed.is_empty() {
        "Untitled milestone".to_string()
    } else {
        trimmed.to_string()
    }
}

pub(crate) fn normalize_optional_date(value: Option<String>) -> Option<String> {
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

pub(crate) fn task_exists(conn: &Connection, task_id: i64) -> Result<bool, String> {
    conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM tasks WHERE id = ?1)",
        params![task_id],
        |row| row.get::<_, i64>(0),
    )
    .map(|value| value == 1)
    .map_err(|e| e.to_string())
}

pub(crate) fn habit_exists(conn: &Connection, habit_id: i64) -> Result<bool, String> {
    conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM habits WHERE id = ?1)",
        params![habit_id],
        |row| row.get::<_, i64>(0),
    )
    .map(|value| value == 1)
    .map_err(|e| e.to_string())
}

pub(crate) fn sanitize_meeting_action_item_task_ids(
    conn: &Connection,
    action_items: Vec<MeetingActionItem>,
) -> Result<Vec<MeetingActionItem>, String> {
    action_items
        .into_iter()
        .map(|item| {
            let task_id = match item.task_id {
                Some(task_id) if task_exists(conn, task_id)? => Some(task_id),
                _ => None,
            };

            Ok(MeetingActionItem { task_id, ..item })
        })
        .collect()
}

pub(crate) fn touch_task_updated_at(
    conn: &Connection,
    task_id: i64,
    now: &str,
) -> Result<(), String> {
    conn.execute(
        "UPDATE tasks SET updated_at = ?1 WHERE id = ?2",
        params![now, task_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}
