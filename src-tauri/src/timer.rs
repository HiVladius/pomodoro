use std::thread;
use std::time::Duration;
use tauri::{Emitter, AppHandle};
use crate::constants::*;
use crate::state::{GLOBAL_STATE, AppState, TimerPayload, StatsPayload, StateChangePayload};
use crate::storage::save_stats_to_disk;
use crate::toast::show_toast;

pub fn start_timer_thread(app_handle: AppHandle) {
    thread::spawn(move || {
        let mut last_state = AppState::Idle;
        
        loop {
            thread::sleep(Duration::from_secs(1));

            let mut state = GLOBAL_STATE.lock().unwrap();

            // Emitir cambio de estado
            if state.app != last_state {
                last_state = state.app.clone();
                let state_str = match state.app {
                    AppState::Focus => "Focus",
                    AppState::Break => "Break",
                    AppState::Paused => "Paused",
                    AppState::Idle => "Idle",
                };
                app_handle
                    .emit("state-changed", StateChangePayload { 
                        state: state_str.to_string() 
                    })
                    .unwrap();
            }

            // Timer countdown (solo en Focus y Break)
            if state.app == AppState::Focus || state.app == AppState::Break {
                state.timer_seconds -= 1;

                let minutes = state.timer_seconds / 60;
                let seconds = state.timer_seconds % 60;
                let time_string = format!("{:02}:{:02}", minutes, seconds);

                app_handle
                    .emit("timer-tick", TimerPayload { time: time_string })
                    .unwrap();

                // Gestión de inactividad en Focus
                if state.app == AppState::Focus {
                    state.inactivity_seconds += 1;

                    if state.inactivity_seconds % 60 == 0 {
                        println!("[Timer] Inactividad: {} min", state.inactivity_seconds / 60);
                    }

                    if state.inactivity_seconds >= INACTIVITY_LIMIT_SECS 
                        && state.inactivity_seconds % INACTIVITY_LIMIT_SECS == 0 {
                        
                        state.stats_inactive += 2;
                        println!("[Stats] +2 min inactividad (total: {})", state.stats_inactive);
                        
                        save_stats_to_disk(
                            &app_handle,
                            state.stats_concentrated,
                            state.stats_inactive,
                        );
                        
                        app_handle
                            .emit("stats-update", StatsPayload {
                                concentrated: state.stats_concentrated,
                                inactive: state.stats_inactive,
                                pauses: state.stats_pause,
                            })
                            .unwrap();
                        
                        show_toast(
                            &app_handle,
                            "angry".to_string(),
                            get_random_frase(ANGRY_FRASES),
                        );
                    }
                }

                // Fin de ciclo
                if state.timer_seconds == 0 {
                    if state.app == AppState::Focus {
                        if state.inactivity_seconds < INACTIVITY_LIMIT_SECS {
                            state.stats_concentrated += 25;
                            println!("[Stats] Ciclo completo: +25 min");
                        }
                        
                        state.app = AppState::Break;
                        state.timer_seconds = BREAK_TIME_SECS;
                        state.stats_pause += 1;
                        
                        save_stats_to_disk(
                            &app_handle,
                            state.stats_concentrated,
                            state.stats_inactive,
                        );
                        
                        app_handle
                            .emit("stats-update", StatsPayload {
                                concentrated: state.stats_concentrated,
                                inactive: state.stats_inactive,
                                pauses: state.stats_pause,
                            })
                            .unwrap();
                        
                        show_toast(
                            &app_handle,
                            "break".to_string(),
                            get_random_frase(BREAK_FRASES),
                        );
                    } else {
                        // Fin de Break
                        state.app = AppState::Idle;
                        state.timer_seconds = FOCUS_TIME_SECS;
                        
                        app_handle
                            .emit("timer-tick", TimerPayload {
                                time: "25:00".to_string(),
                            })
                            .unwrap();
                    }
                }
            }
        }
    });
}