use tauri::{AppHandle,  Manager};

pub fn show_toast(app_handle: &AppHandle, tipo: String, frase: String) {
    if let Some(window) = app_handle.get_webview_window("toast") {
        let payload_json = format!(
            r#"{{"tipo":"{}","frase":"{}"}}"#,
            tipo.replace("\"", "\\\""),
            frase.replace("\"", "\\\"")
        );
        
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