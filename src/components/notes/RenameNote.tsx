import { useEffect, useRef, useState } from "react";
import { File } from "../../models/File";
import { invoke } from "@tauri-apps/api/core";

interface RenameNoteProps {
  close: () => void;
  currentFile: File | null;
  onFileRenamed: (file: File) => void;
}

function RenameNote({ close, currentFile, onFileRenamed }: RenameNoteProps) {
  const [newName, setNewName] = useState(currentFile?.name ?? "");
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renameRef.current) {
      renameRef.current.focus();
    }
  }, []);

  const handleRename = () => {
    const rename = async () => {
      try {
        const new_path: string = await invoke("rename_file", {
          path: currentFile!.path,
          newName: newName,
        });
        onFileRenamed({ name: newName, path: new_path });
        close();
      } catch (error) {
        console.error(error);
      }
    };

    if (currentFile && newName.trim() !== "") {
      rename();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRename();
    }
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="h-full text-white overflow-hidden focus:outline-none"
    >
      <input
        ref={renameRef}
        className="w-full mb-2 bg-transparent border-0 border-b-2 border-slate-500 placeholder-slate-500 h-8 focus:outline-none font-cascadia text-lg text-white"
        type="text"
        placeholder="Rename file..."
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
      ></input>
      <div className="flex flex-row justify-between items-center">
        <span className="mr-2">
          {currentFile?.name} &gt; {newName}
        </span>
        <button
          className="bg-transparent text-white font-cascadia p-2 border-2 border-slate-500 cursor-pointer hover:bg-black/20"
          onClick={() => handleRename()}
        >
          Rename
        </button>
      </div>
    </div>
  );
}

export default RenameNote;
