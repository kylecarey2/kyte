# Kyte - Lightweight Markdown Editor

A fast, keyboard-first Markdown notes app built with [Tauri](https://v2.tauri.app/) (Rust backend) and React frontend. I built Kyte because I was frustrated with the default Windows notepad experience and didn’t want something bloated like Obsidian. The goal was to build a notes app I actually enjoy using every day.

Kyte keeps your notes local, plain-text, and easy to manage while still feeling fast and native.

# Installation

You can download the latest release from the [Releases](https://github.com/kylecarey/kyte/releases) page. This release is currently only available for Windows (x64) with plans for macOS and Linux in the future.

# Features

- Live Markdown editing
- Built-in full-notes search (**Ctrl+Shift+F**) powered by a native Rust inverted index
- Performant, lightweight, and local-first
- Keyboard-first workflows with extensive shortcuts
- Distraction free UI

# Keybinds

## Notes & folders

- New note - **Ctrl+N**
- Delete note - **Ctrl+Shift+Del**
- Rename note - **F2**
- Quick open note - **Ctrl+P**
- Open folder editor - **Ctrl+M**

## Navigation

- Toggle file explorer - **Ctrl+E**
- Search all notes - **Ctrl+Shift+F**
- Next note - **Ctrl+Tab**
- Previous note - **Ctrl+Shift+Tab**
- Toggle notes - **Ctrl+T**

## Miscellaneous

- Refresh workspace - **Ctrl+Shift+R**
- Toggle transparency - **Ctrl+Shift+T**
- Open help note - **Ctrl+H**

# How it Works

Kyte stores notes as regular Markdown files in your local app-data notes directory. The frontend (React + TypeScript) handles editing and keyboard-driven UI, while the Tauri Rust backend manages file operations, native window behavior, and search indexing.

For search, Kyte uses a Rust-based inverted index (Tantivy) so global note search stays near-instant even with large note collections. The indexing thread runs in the background to ensure that the user facing part of the app is never slowed down.

# Tech Stack

- Desktop Runtime: Tauri v2
- Backend: Rust
  - `tauri`, `notify`, `walkdir`, `tantivy`, `window-vibrancy`
- Frontend: React + TypeScript + Vite
  - `@mdxeditor/editor`
  - `tailwindcss`

# Running Locally

## Prerequisites

- Node.js 20+
- npm
- Rust (developed using 1.93.1)
- Tauri prerequisites for your OS (WebView2 on Windows, etc.)

For Tauri setup details, see the official docs: [https://v2.tauri.app/start/prerequisites/](https://v2.tauri.app/start/prerequisites/)

## Setup

```bash
npm install
```

## Development

```bash
npm run tauri dev
```

## Build

```bash
npm run tauri build
```

# Notes Storage

Kyte stores notes in:

- `%appdata%/com.kyte.app/notes` (Windows)

The app also creates and maintains a local search index in app data, along with other metadata.

# Why I Built This

I built Kyte for myself first.

I wanted something simple, fast, and focused that doesn’t fight me while writing notes. If other people enjoy using it too, that’s awesome, but the original goal was to make something I actually wanted to use every day.

# Future Improvements

- Editor customizability
- Storing additional note metadata
- Additional quality of life shortcuts and commands
- Performance and stability improvements

# Contributing

Feel free to open a pull request or fork this with extended features. If you run into an issue while using Kyte, feel free to open an issue on GitHub. However, there is no guaranteeing when I will get to reviewing the issues.

# License

MIT License
