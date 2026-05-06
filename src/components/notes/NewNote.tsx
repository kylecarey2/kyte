import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";
import { File } from "../../models/File";
import { FolderNode } from "../../models/FolderNode";
import { useToast } from "../toast/ToastProvider";

interface NewNoteProps {
  close: () => void;
  onFileCreated: (file: File) => void;
}

// Flat representation for UI rendering & keyboard navigation
interface VisibleNode {
  path: string;
  name: string;
  depth: number;
  hasChildren: boolean;
}

function NewNote({ close, onFileCreated }: NewNoteProps) {
  const [fileName, setFileName] = useState("");
  const fileNameRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [rootFolder, setRootFolder] = useState<FolderNode | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    new Set([""]),
  );
  const [visibleDirs, setVisibleDirs] = useState<VisibleNode[]>([]);

  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);
  const shownNumber = 5;

  const { addToast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const root: FolderNode = await invoke("get_folder_tree");
        setRootFolder(root);
      } catch (error) {
        console.error(error);
        addToast("Failed to load folder tree", {
          type: "error",
          closable: true,
        });
      }
    };

    fetchData();

    if (fileNameRef.current) {
      fileNameRef.current.focus();
    }
  }, []);

  // Flattens the tree dynamically based on what is expanded
  useEffect(() => {
    if (!rootFolder) return;

    const flattenTree = (node: FolderNode, depth = 0): VisibleNode[] => {
      const result: VisibleNode[] = [];
      const hasChildren = !!node.children && node.children.length > 0;

      result.push({
        path: node.path,
        name: node.path === "" ? "/" : node.name,
        depth,
        hasChildren,
      });

      if (expandedPaths.has(node.path) && hasChildren) {
        for (const child of node.children!) {
          result.push(...flattenTree(child, depth + 1));
        }
      }
      return result;
    };

    const newVisibleDirs = flattenTree(rootFolder);
    setVisibleDirs(newVisibleDirs);

    // Recalculate boundaries on collapse so highlight doesn't go out of bounds
    const absoluteIndex = offset + highlightedIndex;
    if (newVisibleDirs.length > 0 && absoluteIndex >= newVisibleDirs.length) {
      const newAbsolute = newVisibleDirs.length - 1;
      const newOffset = Math.max(0, newAbsolute - shownNumber + 1);
      setOffset(newOffset);
      setHighlightedIndex(newAbsolute - newOffset);
    }
  }, [rootFolder, expandedPaths, offset, highlightedIndex]);

  const toggleExpand = (path: string) => {
    if (path === "") return; // Disable collapsing root
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleCreate = async (dirPath: string) => {
    if (!fileName.trim()) return;

    try {
      // If root is selected, just use filename. Otherwise, join path
      const targetPath = dirPath === "" ? fileName : `${dirPath}/${fileName}`;

      const result: string = await invoke("create_file", {
        filename: targetPath,
      });

      const createdFileName = result.substring(result.lastIndexOf("/") + 1);
      onFileCreated({ name: createdFileName, path: result });
      close();
      addToast(`Successfully created '${createdFileName}'`, {
        type: "success",
        duration: 3000,
        closable: true,
      });
    } catch (error) {
      console.error(error);
      addToast("Failed to create file", {
        type: "error",
        closable: true,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (visibleDirs.length === 0) return;

    const isInputFocused = e.target === fileNameRef.current;
    const absoluteIndex = offset + highlightedIndex;
    const currentPath = visibleDirs[absoluteIndex]?.path || "";

    if (e.key === "ArrowDown" || e.key === "Tab") {
      e.preventDefault();
      if (isInputFocused) {
        // Just move focus to the list, leave highlight where it is
        listRef.current?.focus();
      } else if (absoluteIndex >= visibleDirs.length - 1) {
        // Wrap from bottom of list back up to top and focus input
        setOffset(0);
        setHighlightedIndex(0);
        // fileNameRef.current?.focus();
      } else {
        if (highlightedIndex < shownNumber - 1) {
          setHighlightedIndex((prev) => prev + 1);
        } else {
          setOffset((prev) => prev + 1);
        }
      }
    } else if (e.key === "ArrowUp") {
      // If typing in input, let the user move their text cursor naturally!
      if (isInputFocused) return;
      e.preventDefault();

      if (absoluteIndex <= 0) {
        // Wrap from top of list back to input
        fileNameRef.current?.focus();
      } else {
        if (highlightedIndex > 0) {
          setHighlightedIndex((prev) => prev - 1);
        } else {
          setOffset((prev) => prev - 1);
        }
      }
    } else if (e.key === " ") {
      // If typing in input, insert a normal space!
      if (isInputFocused) return;

      if (!visibleDirs[absoluteIndex]?.hasChildren) {
        e.preventDefault();
        fileNameRef.current?.focus();
        // Append it to React state natively
        setFileName((prev) => prev + e.key);
        return;
      }

      // If focused on list, expand the tree
      e.preventDefault();
      toggleExpand(currentPath);
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleCreate(currentPath);
    } else if (e.key === "Backspace") {
      // If they hit Backspace while in the tree, jump back and delete last char
      if (!isInputFocused) {
        e.preventDefault();
        fileNameRef.current?.focus();
        setFileName((prev) => prev.slice(0, -1));
      }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      // Capture all printable characters a-z, 0-9, etc.
      if (!isInputFocused) {
        e.preventDefault();
        fileNameRef.current?.focus();
        // Append it to React state natively
        setFileName((prev) => prev + e.key);
      }
    } else if (e.key === "Escape") {
      if (isInputFocused) {
        if (!fileNameRef.current?.value.trim()) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();

        fileNameRef.current?.blur();
        listRef.current?.focus();
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (visibleDirs.length === 0) return;
    const absoluteIndex = offset + highlightedIndex;

    if (e.deltaY < 0) {
      if (absoluteIndex <= 0) {
        fileNameRef.current?.focus();
      } else {
        if (highlightedIndex > 0) {
          setHighlightedIndex((prev) => prev - 1);
        } else {
          setOffset((prev) => prev - 1);
        }
      }
    } else {
      if (absoluteIndex >= visibleDirs.length - 1) {
        setOffset(0);
        setHighlightedIndex(0);
        fileNameRef.current?.focus();
      } else {
        if (highlightedIndex < shownNumber - 1) {
          setHighlightedIndex((prev) => prev + 1);
        } else {
          setOffset((prev) => prev + 1);
        }
      }
    }
  };

  return (
    <div
      ref={listRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
      className="h-full text-text overflow-hidden focus:outline-none flex flex-col"
    >
      <input
        ref={fileNameRef}
        className="w-full mb-2 bg-transparent border-0 border-b-2 border-border placeholder-border h-8 focus:outline-none font-cascadia text-lg text-text"
        type="text"
        placeholder="Enter file name..."
        value={fileName}
        onChange={(e) => setFileName(e.target.value)}
      />

      <div className="flex-1 overflow-hidden focus:outline-none">
        <ul className="list-none p-0 m-0 selection:bg-transparent selection:text-inherit">
          {visibleDirs.length === 0 ? (
            <p>No directories found</p>
          ) : (
            visibleDirs
              .slice(offset, offset + shownNumber)
              .map((dir, index) => {
                const isHighlighted = highlightedIndex === index;

                return (
                  <li
                    key={dir.path}
                    onClick={() => {
                      setHighlightedIndex(index);
                      if (dir.path !== "") toggleExpand(dir.path);
                      // Pull focus back to list so keyboard navigation works after click
                      listRef.current?.focus();
                    }}
                    className={`p-2 rounded-lg flex flex-row items-center ${
                      isHighlighted ? "bg-active" : "hover:bg-hover"
                    } mb-2 cursor-pointer`}
                  >
                    <div
                      className="flex-1 flex items-center gap-2"
                      style={{ paddingLeft: `${(dir.depth - 0.75) * 1}rem` }}
                    >
                      {/* Tree expansion logic for non-root elements */}
                      {dir.path !== "" && (
                        <span
                          className={`w-4.75 flex items-center justify-center ${
                            dir.hasChildren ? "text-primary" : "text-text"
                          }`}
                        >
                          {dir.hasChildren ? (
                            expandedPaths.has(dir.path) ? (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="size-5"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 12h14"
                                />
                              </svg>
                            ) : (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="size-5"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M12 4.5v15m7.5-7.5h-15"
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
                              className="size-5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 12h14"
                              />
                            </svg>
                          )}
                        </span>
                      )}
                      <span className="text-text">{dir.name}</span>
                    </div>
                  </li>
                );
              })
          )}
        </ul>
      </div>

      <div className="flex flex-row justify-between items-center h-fit mt-2">
        <p className="text-text-muted my-0">
          [
          {shownNumber < visibleDirs.length
            ? shownNumber + offset
            : visibleDirs.length}{" "}
          / {visibleDirs.length}]
        </p>
        <button
          className="bg-transparent text-text font-cascadia p-2 border-2 border-primary cursor-pointer hover:bg-hover rounded"
          onClick={() => {
            const currentPath =
              visibleDirs[offset + highlightedIndex]?.path || "";
            handleCreate(currentPath);
          }}
        >
          Create
        </button>
      </div>
    </div>
  );
}

export default NewNote;
