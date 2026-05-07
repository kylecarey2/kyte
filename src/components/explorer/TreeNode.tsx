import React, { useState } from "react";
import { FileNode } from "../../models/FileNode";
import { File } from "../../models/File";

interface TreeNodeProps {
  node: FileNode;
  onFileSelected: (file: File) => void;
  currentFile?: File;
  depth?: number;
}

function TreeNode({
  node,
  onFileSelected,
  currentFile,
  depth = 0,
}: TreeNodeProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (node.is_dir) {
      setIsOpen((prev) => !prev);
    } else {
      // Pass information up
      if (node.path === currentFile?.path) return;
      onFileSelected({ name: node.name, path: node.path });
    }
  };

  return (
    <div>
      <div
        onClick={toggleOpen}
        style={{
          paddingLeft: `${depth * 12 + 10}px`,
        }}
        className={`text-text py-1 flex items-center cursor-pointer overflow-hidden text-ellipsis select-none hover:${node.path === currentFile?.path ? "bg-active" : "bg-hover"} ${node.path === currentFile?.path ? "bg-active" : ""}`}
      >
        <div className="mr-1.5 text-sm flex items-center shrink-0">
          {node.is_dir ? (
            isOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                className="size-5 text-text"
              >
                <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                className="size-5 text-text"
              >
                <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
              </svg>
            )
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              className="size-5 text-text"
            >
              <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
              <path d="M14 2v5a1 1 0 0 0 1 1h5" />
            </svg>
          )}
        </div>
        <span className="text-sm">{node.name}</span>
      </div>

      {/* Render Children if Folder is Open */}
      {isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onFileSelected={onFileSelected}
              currentFile={currentFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default TreeNode;
