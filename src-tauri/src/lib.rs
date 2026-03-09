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

#[derive(Debug, Serialize)]
pub struct FileNode {
    name: String,
    path: String,
    is_dir: bool,
    children: Option<Vec<FileNode>>,
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

    if resolved_name.starts_with('/') {
        resolved_name = resolved_name.trim_start_matches('/').to_string();
    }

    full_path.push(&resolved_name);

    // Check if file already exists
    if full_path.exists() {
        return Err(format!("File '{}' already exists", resolved_name));
    }

    let nice_filename = &filename[filename
        .rfind(|c| c == '/' || c == '\\')
        .map_or(0, |i| i + 1)..];

    let content = format!("# {}", nice_filename.trim());

    let _ = fs::write(&full_path, content).map_err(|e| e.to_string());

    Ok(full_path.to_string_lossy().to_string())
}

#[tauri::command]
fn delete_file(path: &str) -> Result<(), String> {
    let full_path = get_base_dir()?.join(path);
    std::fs::remove_file(full_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn create_directory(dirname: &str) -> Result<String, String> {
    let mut full_path = get_base_dir()?;

    // Trim and sanitize
    let mut resolved_name = dirname.trim().replace(" ", "-");

    if resolved_name.is_empty() {
        return Err("Directory name cannot be empty".into());
    }

    if resolved_name.contains("..") {
        return Err("Invalid directory name".into());
    }

    if resolved_name.starts_with('/') {
        resolved_name = resolved_name.trim_start_matches('/').to_string();
    }

    full_path.push(&resolved_name);

    // Check if directory already exists
    if full_path.exists() {
        return Err(format!("Directory '{}' already exists", resolved_name));
    }

    fs::create_dir_all(&full_path).map_err(|e| e.to_string())?;

    Ok(full_path.to_string_lossy().to_string())
}

#[tauri::command]
fn delete_directory(dirname: &str) -> Result<(), String> {
    let full_path = get_base_dir()?.join(dirname.trim_start_matches("/").to_string());
    std::fs::remove_dir_all(full_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_file_tree() -> Result<FileNode, String> {
    let path = get_base_dir()?;
    build_tree(path).map_err(|e| e.to_string())
}

fn build_tree(path: PathBuf) -> Result<FileNode, std::io::Error> {
    // Get file/folder name
    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_else(|| path.to_string_lossy().into_owned());

    let path_str = path.to_string_lossy().into_owned();
    let is_dir = path.is_dir();

    let mut children = None;

    if is_dir {
        let mut dir_children = Vec::new();
        for entry in fs::read_dir(&path)? {
            let entry = entry?;
            let child_path = entry.path();

            // Ignore hidden files/folders
            if let Some(file_name) = child_path.file_name() {
                if file_name.to_string_lossy().starts_with('.') {
                    continue;
                }
            }

            if let Ok(child_node) = build_tree(child_path) {
                dir_children.push(child_node);
            }
        }

        // Sort so directories appear at the top followed by files (alphabetically)
        dir_children.sort_by(|a, b| {
            b.is_dir
                .cmp(&a.is_dir)
                .then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
        });

        children = Some(dir_children);
    }

    Ok(FileNode {
        name,
        path: path_str,
        is_dir,
        children,
    })
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
            create_directory,
            delete_directory,
            get_file_tree,
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
