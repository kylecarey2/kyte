use serde::Serialize;
use std::fs;
use tauri::Manager;
use walkdir::WalkDir;
use window_vibrancy::*;

#[derive(Serialize)]
struct File {
    path: String,
    name: String,
}

#[tauri::command]
fn read_file(path: &str) -> Result<String, String> {
    let mut full_path = std::env::current_dir().map_err(|e| e.to_string())?;

    full_path.push(path);

    fs::read_to_string(full_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(path: &str, content: &str) -> Result<(), String> {
    let mut full_path = std::env::current_dir().map_err(|e| e.to_string())?;

    full_path.push(path);

    fs::write(full_path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_files(path: &str) -> Result<Vec<File>, String> {
    let mut full_path = std::env::current_dir().map_err(|e| e.to_string())?;
    full_path.push(path);

    let mut files = Vec::new();

    for entry in WalkDir::new(&full_path).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            let relative_path = entry
                .path()
                .strip_prefix(&full_path)
                .map_err(|e| e.to_string())?
                .to_string_lossy()
                .to_string()
                .replace("\\", "/");

            let file_name = entry.file_name().to_string_lossy().to_string();

            files.push(File {
                path: relative_path,
                name: file_name,
            });
        }
    }

    Ok(files)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![read_file, write_file, list_files])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            #[cfg(target_os = "windows")]
            apply_acrylic(&window, Some((0, 0, 0, 0)))
                .expect("Unsupported platform! 'apply_blur' is only supported on Windows");

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
