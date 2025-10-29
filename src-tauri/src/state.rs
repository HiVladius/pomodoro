use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};

#[derive(Clone, Debug, PartialEq)]
pub enum AppState {
    Idle,
    Focus,
    Paused,
    Break,
}

pub struct GlobalState {
    pub app: AppState,
    pub timer_seconds: u32,
    pub inactivity_seconds: u32,
    pub stats_concentrated: u32,
    pub stats_inactive: u32,
    pub stats_pause: u32,
}

pub static GLOBAL_STATE: Lazy<Arc<Mutex<GlobalState>>> = Lazy::new(|| {
    Arc::new(Mutex::new(GlobalState {
        app: AppState::Idle,
        timer_seconds: 25 * 60,
        inactivity_seconds: 0,
        stats_concentrated: 0,
        stats_inactive: 0,
        stats_pause: 0,
    }))
});

// Payloads para eventos
#[derive(Clone, Serialize)]
pub struct TimerPayload {
    pub time: String,
}

#[derive(Clone, Serialize)]
pub struct StatsPayload {
    pub concentrated: u32,
    pub inactive: u32,
    pub pauses: u32,
}

#[derive(Clone, Serialize, Debug)]
pub struct StateChangePayload {
    pub state: String,
}

#[derive(Serialize, Deserialize, Default, Debug)]
pub struct DailyStat {
    pub concentrated: u32,
    pub inactive: u32,
}

#[derive(Serialize)]
pub struct ChartData {
    pub labels: Vec<String>,
    pub concentration: Vec<u32>,
    pub inactivity: Vec<u32>,
}
