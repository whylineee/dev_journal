mod commands;
mod db;
mod models;
mod tray;

use std::sync::Mutex;
use tauri::{Manager, WindowEvent};

struct TrayAvailability(bool);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .setup(|app| {
            // Setup DB
            let app_data_dir = app.path().app_data_dir().expect("Cannot get app data dir");
            let conn = db::init(app_data_dir).expect("Failed to initialize database");
            app.manage(commands::AppState {
                db: Mutex::new(conn),
            });

            // Setup Tray
            let tray_available = match tray::setup_tray(app.handle()) {
                Ok(()) => true,
                Err(error) => {
                    eprintln!("Tray setup failed, continuing without tray support: {error}");
                    false
                }
            };
            app.manage(TrayAvailability(tray_available));

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let tray_available = window
                    .app_handle()
                    .try_state::<TrayAvailability>()
                    .map(|state| state.0)
                    .unwrap_or(false);

                if tray_available {
                    if let Err(error) = window.hide() {
                        eprintln!("Failed to hide window on close request: {error}");
                    } else {
                        api.prevent_close();
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            // Entries
            commands::get_entries,
            commands::get_entry,
            commands::save_entry,
            commands::delete_entry,
            commands::search_entries,
            commands::get_git_commits,
            // Pages
            commands::get_pages,
            commands::get_page,
            commands::create_page,
            commands::update_page,
            commands::delete_page,
            // Tasks (from submodule)
            commands::tasks::get_tasks,
            commands::tasks::create_task,
            commands::tasks::update_task,
            commands::tasks::update_task_status,
            commands::tasks::start_task_timer,
            commands::tasks::pause_task_timer,
            commands::tasks::reset_task_timer,
            commands::tasks::delete_task,
            commands::tasks::get_task_subtasks,
            commands::tasks::create_task_subtask,
            commands::tasks::update_task_subtask,
            commands::tasks::delete_task_subtask,
            // Goal milestones
            commands::get_goal_milestones,
            commands::create_goal_milestone,
            commands::update_goal_milestone,
            commands::delete_goal_milestone,
            // Meetings (from submodule)
            commands::meetings::get_meetings,
            commands::meetings::create_meeting,
            commands::meetings::update_meeting,
            commands::meetings::delete_meeting,
            commands::meetings::materialize_meeting_action_items,
            // Projects
            commands::get_projects,
            commands::create_project,
            commands::update_project,
            commands::delete_project,
            commands::get_project_branches,
            commands::create_project_branch,
            commands::update_project_branch,
            commands::delete_project_branch,
            // Goals
            commands::get_goals,
            commands::create_goal,
            commands::update_goal,
            commands::delete_goal,
            // Habits
            commands::get_habits,
            commands::create_habit,
            commands::update_habit,
            commands::delete_habit,
            commands::toggle_habit_completion,
            // Backup
            commands::backup::import_backup,
            // Tray
            tray::set_tray_timer
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
