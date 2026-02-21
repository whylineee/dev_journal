mod commands;
mod db;
mod models;
mod tray;

use tauri::{Manager, WindowEvent};
use std::sync::Mutex;

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
            tray::setup_tray(app.handle()).expect("Failed to setup tray");

            Ok(())
        })
        .on_window_event(|window, event| match event {
            WindowEvent::CloseRequested { api, .. } => {
                window.hide().unwrap();
                api.prevent_close();
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_entries,
            commands::get_entry,
            commands::save_entry,
            commands::search_entries,
            commands::get_git_commits
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
