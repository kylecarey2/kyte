import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useRef, useState } from "react";
import Editor from "./components/editor/Editor";
import QuickPick from "./components/QuickPick";
import Modal from "./components/Modal";
import { File } from "./models/File";
import NewNote from "./components/notes/NewNote";
import DeleteNote from "./components/notes/DeleteNote";
import GetStarted from "./components/GetStarted";
import FolderControl from "./components/folders/FolderControl";
import FileExplorer from "./components/explorer/FileExplorer";
import RenameNote from "./components/notes/RenameNote";

type ModalType =
  | "quickPick"
  | "newNote"
  | "deleteNote"
  | "folderControl"
  | "renameNote"
  | null;

function App() {
  const [focused, setFocused] = useState(true);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appWindow = getCurrentWindow();

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [openExplorer, setOpenExplorer] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const minimize = () => appWindow.minimize();
  const close = () => appWindow.close();
  const closeModal = () => setActiveModal(null);

  useEffect(() => {
    let unlistenBlur: (() => void) | null = null;
    let unlistenFocus: (() => void) | null = null;

    const setupListeners = async () => {
      unlistenBlur = await appWindow.listen("tauri://blur", () => {
        if (debounceTimeoutRef.current)
          clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = setTimeout(() => setFocused(false), 100);
      });

      unlistenFocus = await appWindow.listen("tauri://focus", () => {
        if (debounceTimeoutRef.current)
          clearTimeout(debounceTimeoutRef.current);
        setFocused(true);
      });
    };

    setupListeners();

    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      if (unlistenBlur) unlistenBlur();
      if (unlistenFocus) unlistenFocus();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveModal(null);
        return;
      }

      const isModifierKey = e.ctrlKey || e.metaKey;
      if (!isModifierKey) return; // Ignore if not a shortcut

      const key = e.key.toLowerCase();

      if (e.shiftKey && key === "n") {
        e.preventDefault();
        setActiveModal((prev) =>
          prev === "folderControl" ? null : "folderControl",
        );
      } else if (!e.shiftKey && key === "n") {
        e.preventDefault();
        setActiveModal((prev) => (prev === "newNote" ? null : "newNote"));
      } else if (key === "p") {
        e.preventDefault();
        setActiveModal((prev) => (prev === "quickPick" ? null : "quickPick"));
      } else if (e.shiftKey && key === "delete") {
        e.preventDefault();
        setActiveModal((prev) => (prev === "deleteNote" ? null : "deleteNote"));
      } else if (key === "r") {
        e.preventDefault();
        setActiveModal((prev) => (prev === "renameNote" ? null : "renameNote"));
      } else if (key === "e") {
        e.preventDefault();
        setOpenExplorer((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      className={`${focused ? "bg-primary-tint" : "bg-primary"} transition-colors duration-100 flex flex-col h-screen overflow-hidden`}
    >
      <div
        data-tauri-drag-region
        onContextMenu={(e) => e.preventDefault()}
        className="flex flex-row justify-between items-center border-b-2 border-slate-600 relative z-51"
      >
        <span
          data-tauri-drag-region
          className="text-white ml-2 m-0 select-none"
        >
          Kyte
        </span>
        <span data-tauri-drag-region className="text-slate-500 select-none">
          {selectedFile?.name ?? ""}
        </span>
        <div className="flex flex-row">
          <svg
            onClick={minimize}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="size-6 text-white hover:bg-black/20 hover:cursor-pointer transition-colors duration-200 p-2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
          </svg>

          <svg
            onClick={close}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="size-6 text-white hover:bg-black/20 hover:cursor-pointer transition-colors duration-200 p-2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        </div>
      </div>

      <Modal isOpen={activeModal !== null} onClose={closeModal}>
        {activeModal === "quickPick" && (
          <QuickPick
            close={closeModal}
            onFileSelected={(file: File) => setSelectedFile(file)}
          />
        )}
        {activeModal === "newNote" && (
          <NewNote
            close={closeModal}
            onFileCreated={(file: File) => setSelectedFile(file)}
          />
        )}
        {activeModal === "deleteNote" && (
          <DeleteNote
            close={closeModal}
            onFileDeleted={() => setSelectedFile(null)}
            currentFile={selectedFile!}
          />
        )}
        {activeModal === "folderControl" && (
          <FolderControl close={closeModal} />
        )}
        {activeModal === "renameNote" && (
          <RenameNote
            close={closeModal}
            currentFile={selectedFile}
            onFileRenamed={(file: File) => setSelectedFile(file)}
          />
        )}
      </Modal>

      <div className="flex-1 flex flex-row relative min-h-0 overflow-hidden">
        {openExplorer && (
          <FileExplorer
            onFileSelected={(file: File) => setSelectedFile(file)}
            currentFile={selectedFile!}
          />
        )}
        {selectedFile ? (
          <div className="flex-1 min-w-0 overflow-hidden relative h-full">
            <Editor file={selectedFile} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center mb-10 select-none cursor-default">
            <GetStarted
              openQuickPick={() => setActiveModal("quickPick")}
              openNewNote={() => setActiveModal("newNote")}
              openExplorer={() => setOpenExplorer((prev) => !prev)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
