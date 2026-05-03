import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { File } from "../../models/File";
import { FileNode } from "../../models/FileNode";
import TreeNode from "./TreeNode";

interface FileExplorerProps {
  onFileSelected: (file: File) => void;
  currentFile?: File;
}

function FileExplorer({ onFileSelected, currentFile }: FileExplorerProps) {
  const [fileTree, setFileTree] = useState<FileNode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTree = async () => {
    try {
      const tree = await invoke<FileNode>("get_file_tree");
      setFileTree(tree);
      setError(null);
    } catch (err) {
      console.error("Failed to load file tree:", err);
      setError("Failed to load file tree");
    }
  };

  useEffect(() => {
    fetchTree();
    invoke("watch_folder").catch(console.error);

    let unlisten: () => void;
    let debounceTimer: number;

    listen("fs-change", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchTree();
      }, 50);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      clearTimeout(debounceTimer);
      if (unlisten) unlisten();
    };
  }, []);

  return (
    <div className="w-3xs shrink-0 h-full border-r-2 border-border overflow-y-auto overflow-x-hidden">
      <div className="p-2.5 font-bold text-sm text-text-muted">Explorer</div>

      {error && <div className="p-2.5 text-text-muted">{error}</div>}

      {fileTree && fileTree.children && (
        <div>
          {fileTree.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={0}
              onFileSelected={onFileSelected}
              currentFile={currentFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default FileExplorer;
