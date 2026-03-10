import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { FileNode } from "../../models/FileNode";
import { File } from "../../models/File";
import TreeNode from "./TreeNode";

interface FileExplorerProps {
  onFileSelected: (file: File) => void;
  currentFile?: File;
}

function FileExplorer({ onFileSelected, currentFile }: FileExplorerProps) {
  const [fileTree, setFileTree] = useState<FileNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const tree = await invoke<FileNode>("get_file_tree");
        setFileTree(tree);
        setError(null);
      } catch (err) {
        console.error("Failed to load file tree:", err);
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="w-3xs shrink-0 h-full border-r-2 border-slate-600 overflow-y-auto overflow-x-hidden">
      <div className="p-2.5 font-bold text-sm text-slate-500">Explorer</div>

      {loading && <div className="p-2.5">Loading...</div>}
      {error && <div className="p-2.5 text-slate-500">{error}</div>}

      {fileTree && fileTree.children && (
        <div>
          {fileTree.children.map((child, idx) => (
            <TreeNode
              key={idx}
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
