use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

#[tauri::command]
pub fn send_pomodoro_notification(app: AppHandle, title: String, body: String) {
    let notification = app.notification().builder().title(title).body(body).show();

    match notification {
        Ok(_) => println!("Notification sent successfully"),
        Err(e) => eprintln!("Failed to send notification: {}", e),
    }
}

#[tauri::command]
pub fn send_break_reminder(app: AppHandle) {
    app.notification()
        .builder()
        .title(" 🎯 ¡Pomodoro Completado")
        .body("Tiempo de tomar 5 minutos para ti")
        .icon("🤖")
        .show()
        .unwrap();
}

#[tauri::command]
pub fn send_concentration_alert(app: AppHandle, minutes: u32) {
    app.notification()
        .builder()
        .title(" ⚠️ Inactividad Detectada")
        .body(format!(
            "Has estado inactivo por {} minutos. ¡Vuelve a concentrarte!",
            minutes
        ))
        .show()
        .unwrap();
}
