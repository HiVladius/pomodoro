use rdev::{listen, Event, EventType};
use std::thread;
use tauri::AppHandle;
use crate::constants::{INACTIVITY_LIMIT_SECS, MOTIVATION_FRASES, get_random_frase};
use crate::state::{GLOBAL_STATE, AppState};
use crate::toast::show_toast;


pub fn start_activity_listener(app_handle: AppHandle) {
    thread::spawn(move || {
        let callback = move |event: Event| {
            match event.event_type {
                EventType::KeyPress(_)
                | EventType::KeyRelease(_)
                | EventType::MouseMove { .. }
                | EventType::ButtonPress(_)
                | EventType::ButtonRelease(_)
                | EventType::Wheel { .. } => {
                    let mut state = GLOBAL_STATE.lock().unwrap();
                    if state.app == AppState::Focus {
                        let was_inactive = state.inactivity_seconds >= INACTIVITY_LIMIT_SECS;

                        if was_inactive {
                            println!(
                                "[Activity] Usuario volvió a estar activo después de {} segundos",
                                state.inactivity_seconds
                            );
                            show_toast(
                                &app_handle,
                                "motivation".to_string(),
                                get_random_frase(MOTIVATION_FRASES),
                            );
                        }

                        state.inactivity_seconds = 0;
                    }
                }
            }
        };

        println!("[Activity Listener] Iniciado correctamente");
        if let Err(error) = listen(callback) {
            eprintln!("[Activity Listener] Error: {:?}", error);
        }
    });
}