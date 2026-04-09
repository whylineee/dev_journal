use chrono::Utc;
use rusqlite::{params, Connection};
use std::collections::HashSet;
use tauri::State;

use super::validation::{
    elapsed_since, encode_json_action_items, encode_json_string_list, habit_exists,
    normalize_accumulated_seconds, normalize_goal_id, normalize_goal_milestone_title,
    normalize_goal_status, normalize_habit_color, normalize_habit_date,
    normalize_meeting_action_items, normalize_meeting_participants, normalize_meeting_range,
    normalize_meeting_recurrence, normalize_meeting_reminder_minutes, normalize_meeting_status,
    normalize_meeting_title, normalize_optional_date, normalize_optional_http_url,
    normalize_priority, normalize_progress, normalize_project_branch_name,
    normalize_project_branch_status, normalize_project_color, normalize_project_id,
    normalize_project_name, normalize_project_status, normalize_status, normalize_subtask_title,
    normalize_target_per_week, normalize_task_recurrence, normalize_time_estimate_minutes,
    normalize_parent_task_id, sanitize_meeting_action_item_task_ids,
};
use super::{sync_goal_progress_from_milestones, AppState, BackupPayload};

#[tauri::command]
pub fn import_backup(
    payload: BackupPayload,
    replace_existing: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    import_backup_into_conn(&mut conn, payload, replace_existing)
}

pub(crate) fn import_backup_into_conn(
    conn: &mut Connection,
    payload: BackupPayload,
    replace_existing: bool,
) -> Result<(), String> {
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    if replace_existing {
        tx.execute("DELETE FROM entries", [])
            .map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM pages", [])
            .map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM goal_milestones", [])
            .map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM task_subtasks", [])
            .map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM tasks", [])
            .map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM meetings", [])
            .map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM goals", [])
            .map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM project_branches", [])
            .map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM projects", [])
            .map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM habit_logs", [])
            .map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM habits", [])
            .map_err(|e| e.to_string())?;
    }

    let now = Utc::now().to_rfc3339();

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

    for project in payload.projects {
        let created_at = project.created_at.unwrap_or_else(|| now.clone());
        let updated_at = project.updated_at.unwrap_or_else(|| created_at.clone());
        let name = normalize_project_name(project.name);
        let description = project.description.unwrap_or_default();
        let color = normalize_project_color(project.color);
        let status = normalize_project_status(project.status);

        if let Some(id) = project.id {
            tx.execute(
                "INSERT INTO projects (id, name, description, color, status, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                 ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    description = excluded.description,
                    color = excluded.color,
                    status = excluded.status,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at",
                params![id, name, description, color, status, created_at, updated_at],
            )
            .map_err(|e| e.to_string())?;
        } else {
            tx.execute(
                "INSERT INTO projects (name, description, color, status, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![name, description, color, status, created_at, updated_at],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    for branch in payload.project_branches {
        let created_at = branch.created_at.unwrap_or_else(|| now.clone());
        let updated_at = branch.updated_at.unwrap_or_else(|| created_at.clone());
        let Some(project_id) = normalize_project_id(&tx, Some(branch.project_id))? else {
            continue;
        };
        let name = normalize_project_branch_name(branch.name);
        let description = branch.description.unwrap_or_default();
        let status = normalize_project_branch_status(branch.status);

        if let Some(id) = branch.id {
            tx.execute(
                "INSERT INTO project_branches (id, project_id, name, description, status, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                 ON CONFLICT(id) DO UPDATE SET
                    project_id = excluded.project_id,
                    name = excluded.name,
                    description = excluded.description,
                    status = excluded.status,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at",
                params![id, project_id, name, description, status, created_at, updated_at],
            )
            .map_err(|e| e.to_string())?;
        } else {
            tx.execute(
                "INSERT INTO project_branches (project_id, name, description, status, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![project_id, name, description, status, created_at, updated_at],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    for entry in payload.entries {
        let project_id = normalize_project_id(&tx, entry.project_id)?;

        tx.execute(
            "INSERT INTO entries (date, yesterday, today, project_id, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(date) DO UPDATE SET
                yesterday = excluded.yesterday,
                today = excluded.today,
                project_id = excluded.project_id,
                created_at = excluded.created_at",
            params![
                entry.date,
                entry.yesterday,
                entry.today,
                project_id,
                entry.created_at.unwrap_or_else(|| now.clone())
            ],
        )
        .map_err(|e| e.to_string())?;
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
        let project_id = normalize_project_id(&tx, goal.project_id)?;
        let target_date = normalize_optional_date(goal.target_date);

        if let Some(id) = goal.id {
            tx.execute(
                "INSERT INTO goals (id, title, description, status, progress, project_id, target_date, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
                 ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    description = excluded.description,
                    status = excluded.status,
                    progress = excluded.progress,
                    project_id = excluded.project_id,
                    target_date = excluded.target_date,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at",
                params![id, goal.title, description, status, progress, project_id, target_date, created_at, updated_at],
            )
            .map_err(|e| e.to_string())?;
        } else {
            tx.execute(
                "INSERT INTO goals (title, description, status, progress, project_id, target_date, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![goal.title, description, status, progress, project_id, target_date, created_at, updated_at],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    for milestone in payload.goal_milestones {
        let Some(goal_id) = normalize_goal_id(&tx, Some(milestone.goal_id))? else {
            continue;
        };

        let created_at = milestone.created_at.unwrap_or_else(|| now.clone());
        let updated_at = milestone.updated_at.unwrap_or_else(|| created_at.clone());
        let title = normalize_goal_milestone_title(milestone.title);
        let completed = if milestone.completed.unwrap_or(false) { 1_i64 } else { 0_i64 };
        let position = milestone.position.unwrap_or(0).max(0);
        let due_date = normalize_optional_date(milestone.due_date);

        if let Some(id) = milestone.id {
            tx.execute(
                "INSERT INTO goal_milestones (id, goal_id, title, completed, position, due_date, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
                 ON CONFLICT(id) DO UPDATE SET
                    goal_id = excluded.goal_id,
                    title = excluded.title,
                    completed = excluded.completed,
                    position = excluded.position,
                    due_date = excluded.due_date,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at",
                params![id, goal_id, title, completed, position, due_date, created_at, updated_at],
            )
            .map_err(|e| e.to_string())?;
        } else {
            tx.execute(
                "INSERT INTO goal_milestones (goal_id, title, completed, position, due_date, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![goal_id, title, completed, position, due_date, created_at, updated_at],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    let mut deferred_parent_links = Vec::new();

    for task in payload.tasks {
        let created_at = task.created_at.unwrap_or_else(|| now.clone());
        let updated_at = task.updated_at.unwrap_or_else(|| created_at.clone());
        let status = normalize_status(task.status);
        let priority = normalize_priority(task.priority);
        let project_id = normalize_project_id(&tx, task.project_id)?;
        let goal_id = normalize_goal_id(&tx, task.goal_id)?;
        let due_date = normalize_optional_date(task.due_date);
        let recurrence = normalize_task_recurrence(task.recurrence);
        let recurrence_until = normalize_optional_date(task.recurrence_until);
        let raw_parent_task_id = task.parent_task_id;
        let parent_task_id = None::<i64>;
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
                "INSERT INTO tasks (id, title, description, status, priority, project_id, goal_id, due_date, recurrence, recurrence_until, parent_task_id, completed_at, time_estimate_minutes, timer_started_at, timer_accumulated_seconds, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)
                 ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    description = excluded.description,
                    status = excluded.status,
                    priority = excluded.priority,
                    project_id = excluded.project_id,
                    goal_id = excluded.goal_id,
                    due_date = excluded.due_date,
                    recurrence = excluded.recurrence,
                    recurrence_until = excluded.recurrence_until,
                    parent_task_id = excluded.parent_task_id,
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
                    created_at,
                    updated_at
                ],
            )
            .map_err(|e| e.to_string())?;

            if let Some(parent_task_id) = raw_parent_task_id {
                deferred_parent_links.push((id, parent_task_id));
            }
        } else {
            tx.execute(
                "INSERT INTO tasks (title, description, status, priority, project_id, goal_id, due_date, recurrence, recurrence_until, parent_task_id, completed_at, time_estimate_minutes, timer_started_at, timer_accumulated_seconds, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
                params![
                    task.title,
                    task.description,
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
                    created_at,
                    updated_at
                ],
            )
            .map_err(|e| e.to_string())?;

            if let Some(parent_task_id) = raw_parent_task_id {
                let inserted_id = tx.last_insert_rowid();
                deferred_parent_links.push((inserted_id, parent_task_id));
            }
        }
    }

    for (task_id, parent_task_id) in deferred_parent_links {
        if let Some(normalized_parent_task_id) = normalize_parent_task_id(&tx, Some(parent_task_id))? {
            tx.execute(
                "UPDATE tasks SET parent_task_id = ?1 WHERE id = ?2",
                params![normalized_parent_task_id, task_id],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    for subtask in payload.task_subtasks {
        let task_exists = tx
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM tasks WHERE id = ?1)",
                params![subtask.task_id],
                |row| row.get::<_, i64>(0),
            )
            .map_err(|e| e.to_string())?
            == 1;
        if !task_exists {
            continue;
        }

        let created_at = subtask.created_at.unwrap_or_else(|| now.clone());
        let updated_at = subtask.updated_at.unwrap_or_else(|| created_at.clone());
        let title = normalize_subtask_title(subtask.title);
        let completed = if subtask.completed.unwrap_or(false) { 1_i64 } else { 0_i64 };
        let position = subtask.position.unwrap_or(0).max(0);

        if let Some(id) = subtask.id {
            tx.execute(
                "INSERT INTO task_subtasks (id, task_id, title, completed, position, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                 ON CONFLICT(id) DO UPDATE SET
                    task_id = excluded.task_id,
                    title = excluded.title,
                    completed = excluded.completed,
                    position = excluded.position,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at",
                params![
                    id,
                    subtask.task_id,
                    title,
                    completed,
                    position,
                    created_at,
                    updated_at
                ],
            )
            .map_err(|e| e.to_string())?;
        } else {
            tx.execute(
                "INSERT INTO task_subtasks (task_id, title, completed, position, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    subtask.task_id,
                    title,
                    completed,
                    position,
                    created_at,
                    updated_at
                ],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    let mut goal_ids_to_sync = HashSet::new();
    for goal in tx
        .prepare("SELECT DISTINCT goal_id FROM goal_milestones")
        .map_err(|e| e.to_string())?
        .query_map([], |row| row.get::<_, i64>(0))
        .map_err(|e| e.to_string())?
    {
        goal_ids_to_sync.insert(goal.map_err(|e| e.to_string())?);
    }
    for goal_id in goal_ids_to_sync {
        sync_goal_progress_from_milestones(&tx, goal_id)?;
    }

    for meeting in payload.meetings {
        let created_at = meeting.created_at.unwrap_or_else(|| now.clone());
        let updated_at = meeting.updated_at.unwrap_or_else(|| created_at.clone());
        let title = normalize_meeting_title(meeting.title);
        let agenda = meeting.agenda.unwrap_or_default().trim().to_string();
        let (start_at, end_at) = normalize_meeting_range(meeting.start_at, meeting.end_at)?;
        let meet_url = normalize_optional_http_url(meeting.meet_url);
        let calendar_event_url = normalize_optional_http_url(meeting.calendar_event_url);
        let project_id = normalize_project_id(&tx, meeting.project_id)?;
        let participants = normalize_meeting_participants(meeting.participants);
        let participants_json = encode_json_string_list(&participants)?;
        let notes = meeting.notes.unwrap_or_default().trim().to_string();
        let decisions = meeting.decisions.unwrap_or_default().trim().to_string();
        let action_items = sanitize_meeting_action_item_task_ids(
            &tx,
            normalize_meeting_action_items(meeting.action_items),
        )?;
        let action_items_json = encode_json_action_items(&action_items)?;
        let recurrence = normalize_meeting_recurrence(meeting.recurrence);
        let recurrence_until = normalize_optional_date(meeting.recurrence_until);
        let reminder_minutes = normalize_meeting_reminder_minutes(meeting.reminder_minutes);
        let status = normalize_meeting_status(meeting.status);

        if let Some(id) = meeting.id {
            tx.execute(
                "INSERT INTO meetings (id, title, agenda, start_at, end_at, meet_url, calendar_event_url, project_id, participants_json, notes, decisions, action_items_json, recurrence, recurrence_until, reminder_minutes, status, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)
                 ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    agenda = excluded.agenda,
                    start_at = excluded.start_at,
                    end_at = excluded.end_at,
                    meet_url = excluded.meet_url,
                    calendar_event_url = excluded.calendar_event_url,
                    project_id = excluded.project_id,
                    participants_json = excluded.participants_json,
                    notes = excluded.notes,
                    decisions = excluded.decisions,
                    action_items_json = excluded.action_items_json,
                    recurrence = excluded.recurrence,
                    recurrence_until = excluded.recurrence_until,
                    reminder_minutes = excluded.reminder_minutes,
                    status = excluded.status,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at",
                params![
                    id,
                    title,
                    agenda,
                    start_at,
                    end_at,
                    meet_url,
                    calendar_event_url,
                    project_id,
                    participants_json,
                    notes,
                    decisions,
                    action_items_json,
                    recurrence,
                    recurrence_until,
                    reminder_minutes,
                    status,
                    created_at,
                    updated_at
                ],
            )
            .map_err(|e| e.to_string())?;
        } else {
            tx.execute(
                "INSERT INTO meetings (title, agenda, start_at, end_at, meet_url, calendar_event_url, project_id, participants_json, notes, decisions, action_items_json, recurrence, recurrence_until, reminder_minutes, status, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
                params![
                    title,
                    agenda,
                    start_at,
                    end_at,
                    meet_url,
                    calendar_event_url,
                    project_id,
                    participants_json,
                    notes,
                    decisions,
                    action_items_json,
                    recurrence,
                    recurrence_until,
                    reminder_minutes,
                    status,
                    created_at,
                    updated_at
                ],
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
        if !habit_exists(&tx, log.habit_id)? {
            continue;
        }

        let created_at = log.created_at.unwrap_or_else(|| now.clone());
        let date = match normalize_habit_date(log.date) {
            Ok(d) => d,
            Err(_) => continue,
        };

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
