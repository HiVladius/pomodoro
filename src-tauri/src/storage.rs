use crate::state::DailyStat;
use chrono::Local;
use tauri::{AppHandle, Emitter, Manager};

pub fn save_stats_to_disk(app_handle: &AppHandle, concentrated: u32, inactive: u32) {
    let today = Local::now().date_naive().to_string();

    let new_stats = DailyStat {
        concentrated,
        inactive,
    };

    if let Some(window) = app_handle.get_webview_window("main") {
        window
            .emit(
                "update-daily-stats",
                serde_json::json!({
                    "date": today,
                    "stats": new_stats
                }),
            )
            .unwrap();
    }
}
