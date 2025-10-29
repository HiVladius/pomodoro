pub const FOCUS_TIME_SECS: u32 = 25 * 60;
pub const BREAK_TIME_SECS: u32 = 5 * 60;
pub const INACTIVITY_LIMIT_SECS: u32 = 2 * 60; // 2 minutos

pub const MOTIVATION_FRASES: &[&str] = &[
    "¡Sigue adelante!",
    "Hoy si andas aplicado.",
    "Miralo.",
    "Toda una maquina.",
    "Te sale fuego.",
    "No te rindas",
    "¡Eso!.",
];

pub const ANGRY_FRASES: &[&str] = &[
    "¡Muevete!",
    "¡Es para hoy!",
    "¡Deja de estar scrolleando!",
    "¡Concéntrate!",
    "¡Hazlo ya!",
    "¡No pierdas el tiempo!",
];

pub const BREAK_FRASES: &[&str] = &[
    "¡A descansar!",
    "¡Estira las piernas!",
    "¡Buen trabajo! Toma un descanso.",
];

pub fn get_random_frase(frases: &[&str]) -> String {
    use rand::Rng;
    let mut rng = rand::rng();
    let index = rng.random_range(0..frases.len());
    frases[index].to_string()
}
