use notify::{
    event::{CreateKind, ModifyKind, RemoveKind},
    EventKind, RecommendedWatcher, RecursiveMode, Watcher,
};
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};
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

fn sanitize_relative(input: &str) -> String {
    let s = input.trim().replace("\\", "/");
    s.trim_start_matches('/')
        .trim_start_matches('\\')
        .to_string()
}

fn full_to_relative(full: &Path, base: &Path) -> String {
    full.strip_prefix(base)
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| full.to_string_lossy().into_owned())
        .replace("\\", "/")
}

#[tauri::command]
fn read_file(filename: &str) -> Result<String, String> {
    let mut full_path = get_base_dir()?;
    let rel = sanitize_relative(filename);
    full_path.push(rel);

    fs::read_to_string(full_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(filename: &str, content: &str) -> Result<(), String> {
    let mut full_path = get_base_dir()?;
    let rel = sanitize_relative(filename);
    full_path.push(rel);

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

            // Skip the root directory
            if relative_path.is_empty() {
                // continue;
            }

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

    // normalize slashes and remove leading slash
    resolved_name = sanitize_relative(&resolved_name);

    if !resolved_name.ends_with(".md") {
        resolved_name.push_str(".md");
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

    // Return relative path only
    Ok(resolved_name.replace("\\", "/"))
}

#[tauri::command]
fn delete_file(path: &str) -> Result<(), String> {
    let rel = sanitize_relative(path);
    let full_path = get_base_dir()?.join(rel);
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

    // normalize slashes and remove leading slash
    resolved_name = sanitize_relative(&resolved_name);

    full_path.push(&resolved_name);

    // Check if directory already exists
    if full_path.exists() {
        return Err(format!("Directory '{}' already exists", resolved_name));
    }

    fs::create_dir_all(&full_path).map_err(|e| e.to_string())?;

    // Return relative path only
    Ok(resolved_name.replace("\\", "/"))
}

#[tauri::command]
fn delete_directory(dirname: &str) -> Result<(), String> {
    let rel = sanitize_relative(dirname);
    let full_path = get_base_dir()?.join(rel);
    std::fs::remove_dir_all(full_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_file_tree() -> Result<FileNode, String> {
    let base = get_base_dir()?;
    build_tree(base.clone(), &base).map_err(|e| e.to_string())
}

fn build_tree(path: PathBuf, base: &PathBuf) -> Result<FileNode, std::io::Error> {
    // Determine display name (file or directory name). For root, use the base dir name if available.
    let name = if path == *base {
        path.file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_else(|| "".to_string())
    } else {
        path.file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_else(|| path.to_string_lossy().into_owned())
    };

    // Build relative path from base. For the base itself this will be an empty string.
    let path_str = full_to_relative(&path, base);

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

            if let Ok(child_node) = build_tree(child_path, base) {
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

#[tauri::command]
fn rename_file(path: String, new_name: String) -> Result<String, String> {
    // Prevent directory traversal or invalid names in new name
    if new_name.contains('/') || new_name.contains('\\') {
        return Err("Invalid file name".into());
    }

    let base = get_base_dir()?;
    let rel = sanitize_relative(&path);
    let full_old = base.join(rel);

    let parent = full_old
        .parent()
        .ok_or_else(|| "Invalid path".to_string())?
        .to_path_buf();

    let new_path = parent.join(&new_name);

    if new_path.exists() {
        return Err("File already exists".into());
    }

    std::fs::rename(&full_old, &new_path).map_err(|e| e.to_string())?;

    Ok(full_to_relative(new_path.as_path(), base.as_path()))
}

struct WatcherState {
    watcher: Mutex<Option<RecommendedWatcher>>,
}

#[tauri::command]
fn watch_folder(app: AppHandle, state: State<'_, WatcherState>) -> Result<(), String> {
    let path = get_base_dir()?;

    // Create a channel between watcher thread and main thread
    let (tx, rx) = std::sync::mpsc::channel();

    // Initialize the watcher
    let mut watcher = notify::RecommendedWatcher::new(tx, notify::Config::default())
        .map_err(|e| e.to_string())?;

    // Watch path recursively
    watcher
        .watch(std::path::Path::new(&path), RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    // Store the watcher in app state.
    *state.watcher.lock().unwrap() = Some(watcher);

    // Spawn a background thread to listen for file system events
    std::thread::spawn(move || {
        for res in rx {
            match res {
                Ok(event) => {
                    let should_emit = match event.kind {
                        EventKind::Create(CreateKind::File)
                        | EventKind::Create(CreateKind::Any)
                        | EventKind::Remove(RemoveKind::File)
                        | EventKind::Remove(RemoveKind::Any)
                        | EventKind::Modify(ModifyKind::Name(_)) => true,
                        _ => false,
                    };

                    if should_emit {
                        let _ = app.emit("fs-change", ());
                    }
                }
                Err(_) => break,
            }
        }
    });

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(WatcherState {
            watcher: Mutex::new(None),
        })
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
            rename_file,
            watch_folder
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
