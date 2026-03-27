import { invoke } from "@tauri-apps/api/core";
import { useState, useRef, useEffect } from "react";

interface NewFolderProps {
  close: () => void;
  folder: string;
  cancel: () => void;
}

function NewFolder({ close, folder, cancel }: NewFolderProps) {
  const [folderName, setFolderName] = useState("");
  const folderNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (folderNameRef.current) {
      folderNameRef.current.focus();
    }
  }, []);

  const handleCreate = async () => {
    let result: string;
    try {
      if (!folderName.trim()) return;
      const cleanFolderName = folderName.trim();
      result = await invoke("create_directory", {
        dirname: `${folder}/${cleanFolderName}`,
      });
    } catch (error) {
      console.error(error);
      return;
    }

    console.log(result);
    close();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCreate();
    }

    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cancel();
    }
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="h-full text-white overflow-hidden focus:outline-none"
    >
      <input
        ref={folderNameRef}
        className="w-full mb-2 bg-transparent border-0 border-b-2 border-slate-500 placeholder-slate-500 h-8 focus:outline-none font-cascadia text-lg text-white"
        type="text"
        placeholder="Enter folder name..."
        value={folderName}
        onChange={(e) => setFolderName(e.target.value)}
      ></input>
      <div className="flex flex-row justify-between items-center h-fit">
        <p className="text-slate-600 my-0">
          {folder}/{folderName}
        </p>
        <button
          className="bg-transparent text-white font-cascadia p-2 border-2 border-slate-500 cursor-pointer hover:bg-black/20 rounded"
          onClick={() => handleCreate()}
        >
          Create
        </button>
      </div>
    </div>
  );
}

export default NewFolder;
