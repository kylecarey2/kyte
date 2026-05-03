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
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-5 text-text"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-5 text-text"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
                />
              </svg>
            )
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-5 text-text"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
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
