#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod activity;
mod commands;
mod constants;
mod notifications;
mod state;
mod storage;
mod timer;
mod toast;

// use toast_lib::db;
use activity::start_activity_listener;
use commands::*;
use notifications::{send_break_reminder, send_concentration_alert, send_pomodoro_notification};
use tauri_plugin_sql::{Builder, Migration, MigrationKind};
use timer::start_timer_thread;

fn main() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_daily_stats_table",
            sql: include_str!("./db/squema.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            Builder::default()
                .add_migrations("postgres://neon:npg@localhost:5432/toast?sslmode=require", migrations)
                .build(),
        )
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
