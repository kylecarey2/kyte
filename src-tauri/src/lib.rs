use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;
use walkdir::WalkDir;
use window_vibrancy::*;

const BASE_DIR: &str = "../md";

#[derive(Serialize)]
struct File {
    path: String,
    name: String,
}

fn get_base_dir() -> Result<PathBuf, String> {
    let mut path = std::env::current_dir().map_err(|e| e.to_string())?;
    path.push(BASE_DIR);

    // Create directory if not exists
    if !path.exists() {
        let _ = fs::create_dir_all(&path);
    }

    Ok(path)
}

#[tauri::command]
fn read_file(filename: &str) -> Result<String, String> {
    let mut full_path = get_base_dir()?;
    full_path.push(filename);

    fs::read_to_string(full_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(filename: &str, content: &str) -> Result<(), String> {
    let mut full_path = get_base_dir()?;
    full_path.push(filename);

    fs::write(full_path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_files() -> Result<Vec<File>, String> {
    let full_path = get_base_dir()?;

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

#[tauri::command]
fn list_dirs() -> Result<Vec<String>, String> {
    let full_path = get_base_dir()?;
    let mut dirs = Vec::new();

    for entry in WalkDir::new(&full_path).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_dir() {
            let relative_path = entry
                .path()
                .strip_prefix(&full_path)
                .map_err(|e| e.to_string())?
                .to_string_lossy()
                .to_string()
                .replace("\\", "/");

            dirs.push(relative_path);
        }
    }

    Ok(dirs)
}

#[tauri::command]
fn create_file(filename: &str) -> Result<String, String> {
    let mut full_path = get_base_dir()?;

    // Trim
    let mut resolved_name = filename.trim().replace(" ", "-");

    if !resolved_name.ends_with(".md") {
        resolved_name.push_str(".md");
    }

    full_path.push(&resolved_name);

    // Check if file already exists
    if full_path.exists() {
        return Err(format!("File '{}' already exists", resolved_name));
    }

    let content = format!("# {}", filename.trim());

    let _ = fs::write(&full_path, content).map_err(|e| e.to_string());

    Ok(full_path.to_string_lossy().to_string())
}

#[tauri::command]
fn delete_file(path: &str) -> Result<(), String> {
    let full_path = get_base_dir()?.join(path);
    std::fs::remove_file(full_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            read_file,
            write_file,
            list_files,
            list_dirs,
            create_file,
            delete_file,
        ])
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
