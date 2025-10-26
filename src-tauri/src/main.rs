// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use chrono::Local;
use once_cell::sync::Lazy;
use rdev::{listen, Event, EventType};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{Emitter, Manager, AppHandle};

#[derive(Clone, Debug, PartialEq)]
enum AppState {
    Idle,   // Esperando
    Focus,  // En Pomodoro (25 min)
    Paused, // Pausado (mantiene el tiempo)
    Break,  // En Descanso (5 min)
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
const INACTIVITY_LIMIT_SECS: u32 = 2 * 60; // 2 minutos de tolerancia

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
    let mut rng = rand::rng();
    let index = rng.random_range(0..frases.len());
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

#[derive(Clone, serde::Serialize, Debug)]
struct StateChangePayload {
    state: String, // "Idle", "Focus", "Paused", "Break"
}




// Función para guardar estadísticas al disco

/// Inicia el listener de actividad global (rdev) en un hilo separado
fn start_activity_listener(app_handle: AppHandle) {
    thread::spawn(move || {
        let callback = move |event: Event| {
            match event.event_type {
                // Si hay actividad de teclado, mouse o scroll
                EventType::KeyPress(_) | 
                EventType::KeyRelease(_) |
                EventType::MouseMove { .. } | 
                EventType::ButtonPress(_) |
                EventType::ButtonRelease(_) |
                EventType::Wheel { .. } => {
                    let mut state = GLOBAL_STATE.lock().unwrap();
                    if state.app == AppState::Focus {
                        let was_inactive = state.inactivity_seconds >= INACTIVITY_LIMIT_SECS;
                        
                        // Si estaba inactivo (superó el límite), ahora está activo de nuevo
                        if was_inactive {
                            println!("[Activity] Usuario volvió a estar activo después de {} segundos", state.inactivity_seconds);
                            // Enviar toast de motivación por volver
                            show_toast(
                                &app_handle,
                                "motivation".to_string(),
                                get_random_frase(MOTIVATION_FRASES),
                            );
                        }
                        
                        // Resetea inactividad con cualquier actividad
                        state.inactivity_seconds = 0;
                    }
                }
            }
        };

        println!("[Activity Listener] Iniciado correctamente");
        if let Err(error) = listen(callback) {
            eprintln!("[Activity Listener] Error al escuchar eventos de rdev: {:?}", error);
        }
    });
}

fn start_timer_thread(app_handle: AppHandle) {
    thread::spawn(move || {
        let mut last_state = AppState::Idle;
        
        loop {
            thread::sleep(Duration::from_secs(1)); // Se ejecuta cada segundo

            let mut state = GLOBAL_STATE.lock().unwrap();

            // Emitir evento si el estado cambió
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

            // Solo contamos si estamos en Focus o Break (NO en Paused)
            if state.app == AppState::Focus || state.app == AppState::Break {
                state.timer_seconds -= 1;

                // Formatear tiempo "MM:SS"
                let minutes = state.timer_seconds / 60;
                let seconds = state.timer_seconds % 60;
                let time_string = format!("{:02}:{:02}", minutes, seconds);

                // Enviar "tick" a React
                app_handle
                    .emit("timer-tick", TimerPayload { time: time_string })
                    .unwrap();

                // Lógica de Focus (Inactividad)
                if state.app == AppState::Focus {
                    state.inactivity_seconds += 1;

                    // Debug: mostrar cada minuto el estado de inactividad
                    if state.inactivity_seconds % 60 == 0 {
                        println!("[Timer] Inactividad: {} segundos ({} minutos)", 
                            state.inactivity_seconds, 
                            state.inactivity_seconds / 60);
                    }

                    // Si alcanza el límite de inactividad (2 minutos) o cada 2 minutos adicionales
                    if state.inactivity_seconds >= INACTIVITY_LIMIT_SECS 
                        && state.inactivity_seconds % INACTIVITY_LIMIT_SECS == 0 {
                        println!("[Timer] ¡Usuario INACTIVO! {} segundos sin actividad", state.inactivity_seconds);
                        
                        // Solo incrementar stats_inactive la primera vez
                        if state.inactivity_seconds == INACTIVITY_LIMIT_SECS {
                            state.stats_inactive += 1;
                            
                            // Guardar estadísticas
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
                        }
                        
                        // Mostrar toast cada 2 minutos de inactividad
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
                        // Si completó el ciclo de Focus sin estar inactivo al final, contar como concentrado
                        if state.inactivity_seconds < INACTIVITY_LIMIT_SECS {
                            state.stats_concentrated += 1;
                        }
                        
                        // Fin de Focus -> Iniciar Break
                        state.app = AppState::Break;
                        state.timer_seconds = BREAK_TIME_SECS;
                        state.stats_pause += 1; // Contar descanso
                        
                        // Guardar estadísticas
                        save_stats_to_disk(
                            &app_handle,
                            state.stats_concentrated,
                            state.stats_inactive,
                        );
                        
                        // Emitir stats actualizadas
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
                        // Fin de Break -> Volver a Idle
                        state.app = AppState::Idle;
                        state.timer_seconds = FOCUS_TIME_SECS;
                        // NO reseteamos las estadísticas - se acumulan durante el día
                        
                        // Enviar tiempo reseteado
                        app_handle
                            .emit(
                                "timer-tick",
                                TimerPayload {
                                    time: "25:00".to_string(),
                                },
                            )
                            .unwrap();
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
        // NO reseteamos las estadísticas aquí - se acumulan durante el día
    }
}

#[tauri::command]
fn pause_pomodoro(app_handle: AppHandle) {
    let mut state = GLOBAL_STATE.lock().unwrap();
    // Solo pausar si estamos en Focus
    if state.app == AppState::Focus {
        state.app = AppState::Paused;
        state.stats_pause += 1; // Incrementar contador de pausas
        // Emitir evento de stats actualizado
        app_handle
            .emit("stats-update", StatsPayload {
                concentrated: state.stats_concentrated,
                inactive: state.stats_inactive,
                pauses: state.stats_pause,
            })
            .unwrap();
        // NO reiniciamos timer_seconds, se mantiene
    }
}

#[tauri::command]
fn resume_pomodoro() {
    let mut state = GLOBAL_STATE.lock().unwrap();
    // Solo reanudar si estamos pausados
    if state.app == AppState::Paused {
        state.app = AppState::Focus;
        state.inactivity_seconds = 0; // Resetear inactividad al reanudar
    }
}

#[tauri::command]
fn stop_pomodoro(app_handle: AppHandle) {
    let mut state = GLOBAL_STATE.lock().unwrap();
    
    // Si estaba en Focus o Paused, contar como un ciclo de concentración completado
    if state.app == AppState::Focus || state.app == AppState::Paused {
        state.stats_concentrated += 1;
        
        // Emitir stats actualizadas inmediatamente
        app_handle
            .emit("stats-update", StatsPayload {
                concentrated: state.stats_concentrated,
                inactive: state.stats_inactive,
                pauses: state.stats_pause,
            })
            .unwrap();
        
        // Guardar estadísticas
        save_stats_to_disk(
            &app_handle,
            state.stats_concentrated,
            state.stats_inactive,
        );
    }
    
    state.app = AppState::Idle;
    state.timer_seconds = FOCUS_TIME_SECS;
    state.inactivity_seconds = 0;
    // NO reseteamos las estadísticas - se mantienen durante el día
    
    // Enviar tiempo reseteado
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
fn reset_daily_stats(app_handle: AppHandle) {
    let mut state = GLOBAL_STATE.lock().unwrap();
    state.stats_concentrated = 0;
    state.stats_inactive = 0;
    state.stats_pause = 0;
    
    // Emitir stats reseteadas
    app_handle
        .emit("stats-update", StatsPayload {
            concentrated: 0,
            inactive: 0,
            pauses: 0,
        })
        .unwrap();
}

#[tauri::command]
fn initialize_stats(concentrated: u32, inactive: u32) {
    let mut state = GLOBAL_STATE.lock().unwrap();
    state.stats_concentrated = concentrated;
    state.stats_inactive = inactive;
    state.stats_pause = 0; // Las pausas siempre empiezan en 0
    println!("[Stats] Inicializadas desde store: concentrated={}, inactive={}", concentrated, inactive);
}



// Función para mostrar toasts
//helper: to send event show toast - usando eval para ejecutar JS directamente
fn show_toast(app_handle: &AppHandle, tipo: String, frase: String) {
    if let Some(window) = app_handle.get_webview_window("toast") {
        // Crear payload JSON manualmente para evitar problemas de escape
        let payload_json = format!(
            r#"{{"tipo":"{}","frase":"{}"}}"#,
            tipo.replace("\"", "\\\""),
            frase.replace("\"", "\\\"")
        );
        
        // Ejecutar JavaScript directamente en la ventana toast
        let js_code = format!(
            r#"window.dispatchEvent(new CustomEvent('show-toast', {{ detail: {} }}));"#,
            payload_json
        );
        
        if let Err(e) = window.eval(&js_code) {
            eprintln!("[Toast] Error al ejecutar JavaScript: {:?}", e);
        }
    } else {
        eprintln!("[Toast] ERROR: No se encontró la ventana 'toast'");
    }
}

#[derive(Serialize, Deserialize, Default, Debug)]
struct DailyStat {
    concentrated: u32,
    inactive: u32,
}

// Función para guardar stats - ahora emite evento para que el frontend maneje el store
fn save_stats_to_disk(app_handle: &AppHandle, concentrated: u32, inactive: u32) {
    let today = Local::now().date_naive().to_string();
    
    let new_stats = DailyStat {
        concentrated,
        inactive,
    };
    
    // Emitir evento para que el frontend actualice el store
    if let Some(window) = app_handle.get_webview_window("main") {
        window.emit("update-daily-stats", serde_json::json!({
            "date": today,
            "stats": new_stats
        })).unwrap();
    }
}

#[derive(Serialize)]
struct ChartData {
    labels: Vec<String>,
    concentration: Vec<u32>,
    inactivity: Vec<u32>,
}

#[tauri::command]
fn get_daily_stats(_app_handle: AppHandle) -> ChartData {
    // Los datos ahora se manejan desde el frontend con el store de Tauri
    // Esta función puede devolver datos por defecto o ser removida
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



fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            // Inicia los hilos de fondo al arrancar la app
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}