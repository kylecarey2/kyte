use notify::{
    event::{CreateKind, ModifyKind, RemoveKind},
    EventKind, RecommendedWatcher, RecursiveMode, Watcher,
};
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, State};
use walkdir::WalkDir;
use window_vibrancy::*;

pub mod search;
use search::{parse_note_file, NoteDoc, SearchHandle, SearchState};

#[derive(Serialize)]
struct File {
    path: String,
    name: String,
}

#[derive(Serialize)]
struct Folder {
    path: String,
    name: String,
    children: Option<Vec<Folder>>,
}

#[derive(Debug, Serialize)]
pub struct FileNode {
    name: String,
    path: String,
    is_dir: bool,
    children: Option<Vec<FileNode>>,
}

fn get_base_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let mut path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    path.push("notes");

    if !path.exists() {
        fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }

    Ok(path)
}

fn get_index_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let mut path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    path.push("search_index");

    // if !path.exists() {
    //     fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    // }

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

// Index a single note by its relative path
fn index_by_path(app: &AppHandle, rel_path: &str) -> Result<(), String> {
    let base = get_base_dir(app)?;
    let full = base.join(rel_path);
    if let Some(note) = parse_note_file(&full, &base) {
        let state: State<SearchHandle> = app.state();
        let state = state.lock().map_err(|e| e.to_string())?;
        state.add_or_update(&note).map_err(|e| e.to_string())?;
    }
    Ok(())
}

// Remove a note from the index by relative path
fn deindex_by_path(app: &AppHandle, rel_path: &str) -> Result<(), String> {
    let state: State<SearchHandle> = app.state();
    let state = state.lock().map_err(|e| e.to_string())?;
    state.remove(rel_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn read_file(app: AppHandle, filename: &str) -> Result<String, String> {
    let mut full_path = get_base_dir(&app)?;
    let rel = sanitize_relative(filename);
    full_path.push(rel);
    fs::read_to_string(full_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(app: AppHandle, filename: &str, content: &str) -> Result<(), String> {
    let mut full_path = get_base_dir(&app)?;
    let rel = sanitize_relative(filename);
    full_path.push(&rel);

    fs::write(&full_path, content).map_err(|e| e.to_string())?; // write the file

    // Auto-index after write
    let base = get_base_dir(&app)?;
    if let Some(note) = parse_note_file(&full_path, &base) {
        let state: State<SearchHandle> = app.state();
        let state = state.lock().map_err(|e| e.to_string())?;
        let _ = state.add_or_update(&note);
    }

    Ok(())
}

#[tauri::command]
fn list_files(app: AppHandle) -> Result<Vec<File>, String> {
    let full_path = get_base_dir(&app)?;
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
    files.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(files)
}

#[tauri::command]
fn list_dirs(app: AppHandle) -> Result<Vec<String>, String> {
    let full_path = get_base_dir(&app)?;
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

            if !relative_path.is_empty() {
                dirs.push(relative_path);
            }
        }
    }
    Ok(dirs)
}

#[tauri::command]
fn create_file(app: AppHandle, filename: &str) -> Result<String, String> {
    let mut full_path = get_base_dir(&app)?;

    // Trim
    let mut resolved_name = filename.trim().replace(" ", "-");

    // Normalize slashes and remove leading slash
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
    fs::write(&full_path, content).map_err(|e| e.to_string())?;

    // Auto-index new file
    let base = get_base_dir(&app)?;
    if let Some(note) = parse_note_file(&full_path, &base) {
        let state: State<SearchHandle> = app.state();
        let state = state.lock().map_err(|e| e.to_string())?;
        let _ = state.add_or_update(&note);
    }

    Ok(resolved_name.replace("\\", "/"))
}

#[tauri::command]
fn delete_file(app: AppHandle, path: &str) -> Result<(), String> {
    let rel = sanitize_relative(path);
    let full_path = get_base_dir(&app)?.join(&rel);
    std::fs::remove_file(&full_path).map_err(|e| e.to_string())?;

    // Remove from index
    let _ = deindex_by_path(&app, &rel);

    Ok(())
}

#[tauri::command]
fn create_directory(app: AppHandle, dirname: &str) -> Result<String, String> {
    let mut full_path = get_base_dir(&app)?;

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
fn delete_directory(app: AppHandle, dirname: &str) -> Result<(), String> {
    let rel = sanitize_relative(dirname);
    let full_path = get_base_dir(&app)?.join(rel);
    std::fs::remove_dir_all(full_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_file_tree(app: AppHandle) -> Result<FileNode, String> {
    let base = get_base_dir(&app)?;
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
fn rename_file(app: AppHandle, path: String, new_name: String) -> Result<String, String> {
    // Prevent directory traversal or invalid names in new name
    if new_name.contains('/') || new_name.contains('\\') {
        return Err("Invalid file name".into());
    }

    let mut resolved_name = new_name.trim().replace(" ", "-");
    if !resolved_name.ends_with(".md") {
        resolved_name.push_str(".md");
    }

    let base = get_base_dir(&app)?;
    let rel = sanitize_relative(&path);
    let full_old = base.join(&rel);

    let parent = full_old
        .parent()
        .ok_or_else(|| "Invalid path".to_string())?
        .to_path_buf();

    let new_path = parent.join(&resolved_name);

    if new_path.exists() {
        return Err("File already exists".into());
    }

    std::fs::rename(&full_old, &new_path).map_err(|e| e.to_string())?;

    // Update index: remove old, add new
    let _ = deindex_by_path(&app, &rel);
    let new_rel = full_to_relative(new_path.as_path(), base.as_path());
    let _ = index_by_path(&app, &new_rel);

    Ok(new_rel)
}

#[tauri::command]
fn get_folder_tree(app: AppHandle) -> Result<Folder, String> {
    let base = get_base_dir(&app)?;
    build_folder_tree(base.clone(), &base).map_err(|e| e.to_string())
}

fn build_folder_tree(path: PathBuf, base: &PathBuf) -> Result<Folder, std::io::Error> {
    // For root, use the base dir name or default to empty
    let name = if path == *base {
        path.file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_else(|| "".to_string())
    } else {
        path.file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_else(|| path.to_string_lossy().into_owned())
    };

    let path_str = full_to_relative(&path, base);
    let mut children = Vec::new();

    if path.is_dir() {
        for entry in fs::read_dir(&path)? {
            let entry = entry?;
            let child_path = entry.path();

            if child_path.is_dir() {
                // Ignore hidden folders
                if let Some(file_name) = child_path.file_name() {
                    if file_name.to_string_lossy().starts_with('.') {
                        continue;
                    }
                }

                if let Ok(child_node) = build_folder_tree(child_path, base) {
                    children.push(child_node);
                }
            }
        }
        // Sort folders alphabetically
        children.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    }

    Ok(Folder {
        name,
        path: path_str,
        children: if children.is_empty() {
            None
        } else {
            Some(children)
        },
    })
}

#[tauri::command]
async fn search_notes(
    state: State<'_, SearchHandle>,
    query: String,
    limit: usize,
) -> Result<Vec<NoteDoc>, String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    state.search(&query, limit).map_err(|e| e.to_string())
}

#[tauri::command]
async fn rebuild_search_index(app: AppHandle) -> Result<(), String> {
    let base = get_base_dir(&app)?;
    let mut notes = Vec::new();

    for entry in WalkDir::new(&base).into_iter().filter_map(|e| e.ok()) {
        if let Some(note) = parse_note_file(entry.path(), &base) {
            notes.push(note);
        }
    }

    let state: State<SearchHandle> = app.state();
    let state = Arc::clone(&state);
    let app_handle = app.clone();

    // Run in background so UI isn't blocked
    tauri::async_runtime::spawn(async move {
        let locked = state.lock().unwrap();
        let _ = locked.clear_and_rebuild(notes, |done, total| {
            let _ = app_handle.emit("search:rebuild-progress", (done, total));
        });
        let _ = app_handle.emit("search:rebuild-complete", ());
    });

    Ok(())
}

struct WatcherState {
    watcher: Mutex<Option<RecommendedWatcher>>,
}

#[tauri::command]
fn watch_folder(app: AppHandle, state: State<'_, WatcherState>) -> Result<(), String> {
    let path = get_base_dir(&app)?;
    let (tx, rx) = std::sync::mpsc::channel();

    let mut watcher = notify::RecommendedWatcher::new(tx, notify::Config::default())
        .map_err(|e| e.to_string())?;

    watcher
        .watch(std::path::Path::new(&path), RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    *state.watcher.lock().unwrap() = Some(watcher);

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

                    // Auto-reindex on external changes
                    // If a markdown file was modified/created/deleted outside the app,
                    // update the search index accordingly.
                    for p in event.paths {
                        if let Some(ext) = p.extension() {
                            if ext == "md" {
                                let base = get_base_dir(&app).ok();
                                if let Some(ref b) = base {
                                    let rel = full_to_relative(&p, b);
                                    match event.kind {
                                        EventKind::Remove(_) => {
                                            let _ = deindex_by_path(&app, &rel);
                                        }
                                        EventKind::Create(_) | EventKind::Modify(_) => {
                                            let _ = index_by_path(&app, &rel);
                                        }
                                        _ => {}
                                    }
                                }
                            }
                        }
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
            get_folder_tree,
            rename_file,
            watch_folder,
            // search
            search_notes,
            rebuild_search_index,
        ])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            #[cfg(target_os = "windows")]
            apply_acrylic(&window, Some((0, 0, 0, 0)))
                .expect("Unsupported platform! 'apply_blur' is only supported on Windows");

            // Initialize search index
            let index_dir = get_index_dir(app.handle())?;
            let search = SearchState::open(index_dir).expect("failed to open search index");
            app.manage(Arc::new(Mutex::new(search)));

            // Build index on startup
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let _ = rebuild_search_index(app_handle).await;
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
