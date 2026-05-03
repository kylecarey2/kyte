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
      className="h-full text-text overflow-hidden focus:outline-none"
    >
      <input
        ref={folderNameRef}
        className="w-full mb-2 bg-transparent border-0 border-b-2 border-border placeholder-border h-8 focus:outline-none font-cascadia text-lg text-text"
        type="text"
        placeholder="Enter folder name..."
        value={folderName}
        onChange={(e) => setFolderName(e.target.value)}
      ></input>
      <div className="flex flex-row justify-between items-center h-fit">
        <p className="text-text-muted my-0">
          {folder}/{folderName}
        </p>
        <button
          className="bg-transparent text-text font-cascadia p-2 border-2 border-primary cursor-pointer hover:bg-hover rounded"
          onClick={() => handleCreate()}
        >
          Create
        </button>
      </div>
    </div>
  );
}

export default NewFolder;
