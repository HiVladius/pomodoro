use crate::constants::FOCUS_TIME_SECS;
use crate::state::{AppState, ChartData, StatsPayload, TimerPayload, GLOBAL_STATE};
use crate::storage::save_stats_to_disk;
use chrono::Local;
use tauri::{AppHandle, Emitter};

#[tauri::command]
pub fn start_pomodoro() {
    let mut state = GLOBAL_STATE.lock().unwrap();
    if state.app == AppState::Idle {
        state.app = AppState::Focus;
        state.timer_seconds = FOCUS_TIME_SECS;
        state.inactivity_seconds = 0;
    }
}

#[tauri::command]
pub fn pause_pomodoro(app_handle: AppHandle) {
    let mut state = GLOBAL_STATE.lock().unwrap();
    if state.app == AppState::Focus {
        state.app = AppState::Paused;
        state.stats_pause += 1;

        app_handle
            .emit(
                "stats-update",
                StatsPayload {
                    concentrated: state.stats_concentrated,
                    inactive: state.stats_inactive,
                    pauses: state.stats_pause,
                },
            )
            .unwrap();
    }
}

#[tauri::command]
pub fn resume_pomodoro() {
    let mut state = GLOBAL_STATE.lock().unwrap();
    if state.app == AppState::Paused {
        state.app = AppState::Focus;
        state.inactivity_seconds = 0;
    }
}

#[tauri::command]
pub fn stop_pomodoro(app_handle: AppHandle) {
    let mut state = GLOBAL_STATE.lock().unwrap();

    if state.app == AppState::Focus || state.app == AppState::Paused {
        let minutes_worked = (FOCUS_TIME_SECS - state.timer_seconds) / 60;
        state.stats_concentrated += minutes_worked;

        println!("[Stats] Finalizado: {} min", minutes_worked);

        app_handle
            .emit(
                "stats-update",
                StatsPayload {
                    concentrated: state.stats_concentrated,
                    inactive: state.stats_inactive,
                    pauses: state.stats_pause,
                },
            )
            .unwrap();

        save_stats_to_disk(&app_handle, state.stats_concentrated, state.stats_inactive);
    }

    state.app = AppState::Idle;
    state.timer_seconds = FOCUS_TIME_SECS;
    state.inactivity_seconds = 0;

    app_handle
        .emit(
            "timer-tick",
            TimerPayload {
                time: "25:00".to_string(),
            },
        )
        .unwrap();
}

#[tauri::command]
pub fn reset_daily_stats(app_handle: AppHandle) {
    let mut state = GLOBAL_STATE.lock().unwrap();
    state.stats_concentrated = 0;
    state.stats_inactive = 0;
    state.stats_pause = 0;

    app_handle
        .emit(
            "stats-update",
            StatsPayload {
                concentrated: 0,
                inactive: 0,
                pauses: 0,
            },
        )
        .unwrap();
}

#[tauri::command]
pub fn initialize_stats(concentrated: u32, inactive: u32) {
    let mut state = GLOBAL_STATE.lock().unwrap();
    state.stats_concentrated = concentrated;
    state.stats_inactive = inactive;
    state.stats_pause = 0;
    println!(
        "[Stats] Inicializadas: concentrated={}, inactive={}",
        concentrated, inactive
    );
}

#[tauri::command]
pub fn get_daily_stats(_app_handle: AppHandle) -> ChartData {
    let mut labels = Vec::new();
    let concentration_data = vec![0; 7];
    let inactivity_data = vec![0; 7];

    for i in (0..7).rev() {
        let date = Local::now().date_naive() - chrono::Duration::days(i);
        labels.push(date.format("%d/%m").to_string());
    }

    ChartData {
        labels,
        concentration: concentration_data,
        inactivity: inactivity_data,
    }
}
