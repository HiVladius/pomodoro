// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use chrono::{Local, NaiveDate};
use once_cell::sync::Lazy;
use rdev::{Event, EventType, ListenError, listen};
use serde::{Deserialize, Serialize};
use tauri::Emitter;
use std::fs::read;
use std::sync::{mpsc, Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{
    plugin::{Builder, TauriPlugin},
    AppHandle, Manager, RunEvent, Runtime, State,
};
use tauri_plugin_store::{StoreBuilder, StoreExt};

#[derive(Clone, Debug, PartialEq)]
enum AppState {
    Idle,  // Esperando
    Focus, // En Pomodoro (25 min )
    Break, // En Descanso (5 min)
}

struct GlobalState {
    app: AppState,
    timer_seconds: u32,
    inactivity_seconds: u32,
    stats_concentrated: u32,
    stats_inactive: u32,
    stats_pause: u32,
}

static GLOBAL_STATE: Lazy<Arc<Mutex<GlobalState>>> = Lazy::new(|| {
    Arc::new(Mutex::new(GlobalState {
        app: AppState::Idle,
        timer_seconds: 25 * 60, // 25 minutes
        inactivity_seconds: 0,
        stats_concentrated: 0,
        stats_inactive: 0,
        stats_pause: 0,
    }))
});

const FOCUS_TIME_SECS: u32 = 25 * 60;
const BREAK_TIME_SECS: u32 = 5 * 60;
const INACTIVITY_LIMIT_SECS: u32 = 5 * 60;

const MOTIVATION_FRASES: &[&str] = &[
    "¡Sigue adelante!",
    "Hoy si andas aplicado.",
    "Miralo.",
    "Toda una maquina.",
    "Te sale fuego.",
    "No te rindas",
    "¡Eso!.",
];
const ANGRY_FRASES: &[&str] = &[
    "¡Muevete!",
    "¡Es para hoy!",
    "¡Deja de estar scrolleando!",
    "¡Concéntrate!",
    "¡Hazlo ya!",
    "¡No pierdas el tiempo!",
];
const BREAK_FRASES: &[&str] = &[
    "¡A descansar!",
    "¡Estira las piernas!",
    "¡Buen trabajo! Toma un descanso.",
];

fn get_random_frase(frases: &[&str]) -> String {
    use rand::Rng;
    let index = rand::thread_rng().gen_range(0..frases.len());
    frases[index].to_string()
}

#[derive(Clone, serde::Serialize)]
struct TimerPayload {
    time: String,
}
#[derive(Clone, serde::Serialize)]
struct StatsPayload {
    concentrated: u32,
    inactive: u32,
    pauses: u32,
}

#[derive(Clone, serde::Serialize)]
struct ToastPayload {
    tipo: String, // "angry", "motivation", "break"
    frase: String,
}

// Función para mostrar toasts
fn show_toast(app_handle: &AppHandle, tipo: String, frase: String) {
    let payload = ToastPayload { tipo, frase };
    let _ = app_handle.emit("show-toast", payload);
}

// Función para guardar estadísticas al disco
fn save_stats_to_disk(app_handle: &AppHandle, concentrated: u32, inactive: u32) {
    // Implementar guardado de estadísticas
    println!("Guardando estadísticas: concentrated={}, inactive={}", concentrated, inactive);
}

/// Inicia el listener de actividad global (rdev) en un hilo separado
fn start_activity_listener(app_handle: AppHandle) {
    let _ = thread::spawn(move || {
        let callback = move |event: Event| {
            match event.event_type {
                // Si hay actividad, reseteamos el contador de inactividad
                EventType::KeyPress(_) | EventType::MouseMove { .. } | EventType::Wheel { .. } => {
                    let mut state = GLOBAL_STATE.lock().unwrap();
                    if state.app == AppState::Focus {
                        // Si estaba inactivo, ahora está activo
                        if state.inactivity_seconds >= INACTIVITY_LIMIT_SECS {
                            // Enviar toast de motivación por volver
                            show_toast(
                                &app_handle,
                                "motivation".to_string(),
                                get_random_frase(MOTIVATION_FRASES),
                            );
                            state.stats_concentrated += 1; // Contar como "concentrado"
                            let _ = app_handle.emit("stats-update", state.stats_concentrated);
                        }
                        state.inactivity_seconds = 0; // Resetea inactividad
                    }
                }
                _ => (),
            }
        };

        if let Err(error) = listen(callback) {
            eprintln!("Error al escuchar eventos de rdev: {:?}", error);
        }
    });
}

fn start_timer_thread(app_handle: AppHandle) {
    thread::spawn(move || {
        loop {
            thread::sleep(Duration::from_secs(1)); // Se ejecuta cada segundo

            let mut state = GLOBAL_STATE.lock().unwrap();

            // Solo contamos si estamos en Focus o Break
            if state.app == AppState::Focus || state.app == AppState::Break {
                state.timer_seconds -= 1;

                // Formatear tiempo "MM:SS"
                let minutes = state.timer_seconds / 60;
                let seconds = state.timer_seconds % 60;
                let time_string = format!("{:02}:{:02}", minutes, seconds);

                // Enviar "tick" a React
                app_handle.emit("timer-tick", TimerPayload { time: time_string }).unwrap();

                // Lógica de Focus (Inactividad)
                if state.app == AppState::Focus {
                    state.inactivity_seconds += 1;

                    // Si se pasa del límite, manda toast "angry"
                    if state.inactivity_seconds == INACTIVITY_LIMIT_SECS {
                        state.stats_inactive += 1; // Contar como "inactivo"
                        app_handle.emit("stats-update", state.stats_inactive).unwrap();
                        show_toast(
                            &app_handle,
                            "angry".to_string(),
                            get_random_frase(ANGRY_FRASES),
                        );
                    }
                }

                // Lógica de cambio de estado (Fin de ciclo)
                if state.timer_seconds == 0 {
                    if state.app == AppState::Focus {
                        // Fin de Focus -> Iniciar Break
                        state.app = AppState::Break;
                        state.timer_seconds = BREAK_TIME_SECS;
                        save_stats_to_disk(&app_handle, state.stats_concentrated, state.stats_inactive);
                        show_toast(
                            &app_handle,
                            "break".to_string(),
                            get_random_frase(BREAK_FRASES),
                        );
                    } else {
                        // Fin de Break -> Volver a Idle
                        state.app = AppState::Idle;
                        state.timer_seconds = FOCUS_TIME_SECS;
                        // Enviar tiempo reseteado
                        app_handle.emit("timer-tick", TimerPayload { time: "25:00".to_string() }).unwrap();
                    }
                }
            }
        }
    });
}

#[tauri::command]
fn start_pomodoro() {
    let mut state = GLOBAL_STATE.lock().unwrap();
    if state.app == AppState::Idle {
        state.app = AppState::Focus;
        state.timer_seconds = FOCUS_TIME_SECS;
        state.inactivity_seconds = 0;
        state.stats_concentrated = 0;
        state.stats_inactive = 0;
        state.stats_pause = 0;
    }
}

#[tauri::command]
fn pause_pomodoro(app_handle: AppHandle){
    let mut state = GLOBAL_STATE.lock().unwrap();
}

fn main() {
    toast_lib::run()
}
