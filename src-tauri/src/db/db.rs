use serde::{Deserialize, Serialize};

// Estructuras de datos que se comparten entre frontend y backend
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DailyStatRecord {
    pub id: i32,
    pub date: String,
    pub concentrated: i32,
    pub inactive: i32,
    pub pauses: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StateUpdate {
    pub date: String,
    pub concentrated: i32,
    pub inactive: i32,
    pub pauses: i32,
}


