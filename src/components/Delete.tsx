import { useEffect, useRef, useState } from "react";
import { File } from "../models/File";
import { invoke } from "@tauri-apps/api/core";

interface DeleteNoteProps {
  close: () => void;
  onFileDeleted: () => void;
  currentFile?: File;
}

function DeleteNote({ close, onFileDeleted, currentFile }: DeleteNoteProps) {
  const fileName = currentFile?.name ?? "this file";
  const [confirmSelected, setConfirmSelected] = useState(false);
  const thisRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    thisRef.current?.focus();
  }, []);

  const handleDelete = () => {
    const deleteFile = async () => {
      try {
        await invoke("delete_file", { path: currentFile?.path ?? "" });
        onFileDeleted();
        close();
      } catch (error) {
        console.error(error);
      }
    };

    deleteFile();
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
        close();
      }
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
      className="h-full text-white overflow-hidden focus:outline-none"
    >
      <h2>Confirm Delete</h2>
      <p>Are you sure you want to delete {fileName}?</p>
      <div className="flex flex-row justify-end items-center gap-2 h-fit">
        <button
          className={`${!confirmSelected ? "bg-slate-500 text-white border-primary hover:bg-slate-600" : "bg-transparent text-white border-slate-500 hover:bg-black/20"}  font-cascadia p-2 border-2 cursor-pointer`}
          onClick={close}
        >
          Cancel
        </button>
        <button
          className={`${confirmSelected ? "bg-slate-500 text-white border-primary hover:bg-slate-600" : "bg-transparent text-white border-slate-500 hover:bg-black/20"}  font-cascadia p-2 border-2 cursor-pointer`}
          onClick={handleDelete}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

export default DeleteNote;
