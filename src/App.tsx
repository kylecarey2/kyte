import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useRef, useState } from "react";
import Editor from "./components/editor";
import Explorer from "./components/explorer";
import Modal from "./components/Modal";
import { File } from "./models/File";
import NewNote from "./components/New";
import DeleteNote from "./components/Delete";

function App() {
  const [focused, setFocused] = useState(true);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appWindow = getCurrentWindow();

  let isModalOpen = false;
  const [openExplorer, setOpenExplorer] = useState(false);
  const [openNewNote, setOpenNewNote] = useState(false);
  const [openDeleteNote, setOpenDeleteNote] = useState(true);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const minimize = () => {
    appWindow.minimize();
  };

  const close = () => {
    appWindow.close();
  };

  useEffect(() => {
    const unlistenBlur = appWindow.listen("tauri://blur", () => {
      // Clear any pending timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      // Debounce the blur event - only apply if it lasts more than 100ms
      debounceTimeoutRef.current = setTimeout(() => {
        setFocused(false);
      }, 100);
    });

    const unlistenFocus = appWindow.listen("tauri://focus", () => {
      // Clear any pending blur timeout immediately
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      setFocused(true);
    });

    // Keydown event listener
    const openExplorerKeydown = (e: KeyboardEvent) => {
      const isModifierKey = e.ctrlKey || e.metaKey;
      if (isModifierKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setOpenExplorer((prev) => !prev);
      }
    };

    const openNewNoteKeydown = (e: KeyboardEvent) => {
      const isModifierKey = e.ctrlKey || e.metaKey;
      if (isModifierKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setOpenNewNote((prev) => !prev);
      }
    };

    const openDeleteNoteKeydown = (e: KeyboardEvent) => {
      const isModifierKey = e.ctrlKey || e.metaKey;
      if (isModifierKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setOpenDeleteNote((prev) => !prev);
      }
    };

    const closeModalKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenExplorer(false);
        setOpenNewNote(false);
        setOpenDeleteNote(false);
      }
    };

    window.addEventListener("keydown", openExplorerKeydown);
    window.addEventListener("keydown", openNewNoteKeydown);
    window.addEventListener("keydown", openDeleteNoteKeydown);
    window.addEventListener("keydown", closeModalKeydown);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      unlistenBlur.then((f) => f());
      unlistenFocus.then((f) => f());

      // Remove keyboard event listener
      window.removeEventListener("keydown", openExplorerKeydown);
      window.removeEventListener("keydown", openNewNoteKeydown);
      window.removeEventListener("keydown", openDeleteNoteKeydown);
      window.removeEventListener("keydown", closeModalKeydown);
    };
  }, []);

  return (
    <div
      className={`${focused ? "bg-primary-tint" : "bg-primary"} transition-colors duration-100 flex flex-col h-screen`}
    >
      <div
        data-tauri-drag-region
        onContextMenu={(e) => e.preventDefault()}
        className="flex flex-row justify-between items-center border-b-2 border-slate-600 relative z-51"
      >
        <p data-tauri-drag-region className="text-white ml-2 m-0 select-none">
          Kyte
        </p>
        <div className="flex flex-row">
          <svg
            onClick={minimize}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            className="size-6 text-white hover:bg-black/20 hover:cursor-pointer transition-colors duration-200 p-2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14" />
          </svg>

          <svg
            onClick={close}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            className="size-6 text-white hover:bg-black/20 hover:cursor-pointer transition-colors duration-200 p-2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        </div>
      </div>

      <Modal isOpen={openExplorer} onClose={() => setOpenExplorer(false)}>
        <Explorer
          close={() => setOpenExplorer(false)}
          onFileSelected={(file: File) => setSelectedFile(file)}
        />
      </Modal>

      <Modal isOpen={openNewNote} onClose={() => setOpenNewNote(false)}>
        <NewNote
          close={() => setOpenNewNote(false)}
          onFileCreated={(file: File) => setSelectedFile(file)}
        />
      </Modal>

      <Modal isOpen={openDeleteNote} onClose={() => setOpenDeleteNote(false)}>
        <DeleteNote
          close={() => setOpenDeleteNote(false)}
          onFileDeleted={() => setSelectedFile(null)}
          currentFile={selectedFile!}
        />
      </Modal>

      <div className="flex-1 overflow-y-auto">
        <Editor file={selectedFile} />
      </div>
    </div>
  );
}

export default App;
