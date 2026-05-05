import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "../toast/ToastProvider";

interface ConfirmDeleteProps {
  close: () => void;
  cancel: () => void;
  onFolderDeleted: () => void;
  folderName?: string;
}

function ConfirmDelete({
  close,
  onFolderDeleted,
  folderName,
  cancel,
}: ConfirmDeleteProps) {
  const folder = folderName ?? "this folder";
  const [confirmSelected, setConfirmSelected] = useState(false);
  const thisRef = useRef<HTMLDivElement>(null);

  const { addToast } = useToast();

  useEffect(() => {
    thisRef.current?.focus();
  }, []);

  const handleDelete = () => {
    const deleteFolder = async () => {
      try {
        if (!folderName) return;

        await invoke("delete_directory", { dirname: folderName });
        onFolderDeleted();
        close();
      } catch (error) {
        console.error(error);
        addToast("Failed to delete folder", {
          type: "error",
          closable: true,
        });
      }
    };

    deleteFolder();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Toggle confirm selected
    if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "Tab") {
      e.preventDefault();
      setConfirmSelected((prev) => !prev);
    }

    // Perform action depending on which button is selected
    if (e.key === "Enter") {
      e.preventDefault();
      if (confirmSelected) {
        handleDelete();
      } else {
        cancel();
      }
    }

    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cancel();
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Toggle confirm selected
    if (e.deltaY) {
      e.preventDefault();
      setConfirmSelected((prev) => !prev);
    }
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
      ref={thisRef}
      className="h-full text-text overflow-hidden focus:outline-none"
    >
      <h2>Confirm Delete</h2>
      <p className="text-text-secondary">
        Are you sure you want to delete {folder}?
      </p>
      <div className="flex flex-row justify-end items-center gap-2 h-fit">
        <button
          className={`${!confirmSelected ? "bg-transparent text-text border-primary hover:bg-hover" : "bg-active text-text border-bg hover:bg-slate-600"} font-cascadia p-2 border-2 rounded cursor-pointer`}
          onClick={cancel}
        >
          Cancel
        </button>
        <button
          className={`${confirmSelected ? "bg-transparent text-text border-primary hover:bg-hover" : "bg-active text-text border-bg hover:bg-slate-600"} font-cascadia p-2 border-2 rounded cursor-pointer`}
          onClick={handleDelete}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

export default ConfirmDelete;
