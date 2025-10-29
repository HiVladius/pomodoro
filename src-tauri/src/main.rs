#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod activity;
mod commands;
mod constants;
mod notifications;
mod state;
mod storage;
mod timer;
mod toast;

use activity::start_activity_listener;
use commands::*;
use notifications::{send_break_reminder, send_concentration_alert, send_pomodoro_notification};
use timer::start_timer_thread;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            start_activity_listener(app.handle().clone());
            start_timer_thread(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_pomodoro,
            pause_pomodoro,
            resume_pomodoro,
            stop_pomodoro,
            reset_daily_stats,
            initialize_stats,
            get_daily_stats,
            send_pomodoro_notification,
            send_break_reminder,
            send_concentration_alert,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
