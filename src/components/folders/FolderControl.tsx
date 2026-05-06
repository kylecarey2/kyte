import { useEffect, useRef, useState } from "react";
import ConfirmDelete from "./ConfirmDelete";
import NewFolder from "./NewFolder";
import { invoke } from "@tauri-apps/api/core";
import { FolderNode } from "../../models/FolderNode";
import { useToast } from "../toast/ToastProvider";

type DisplayMode = "main" | "new-folder" | "confirm-delete";

// Flat representation for UI rendering & keyboard navigation
interface VisibleNode {
  path: string;
  name: string;
  depth: number;
  hasChildren: boolean;
}

interface FolderControlProps {
  close: () => void;
  pathDeleted: (path: string) => void;
}

function FolderControl({ close, pathDeleted }: FolderControlProps) {
  const [mode, setMode] = useState<DisplayMode>("main");
  const [rootFolder, setRootFolder] = useState<FolderNode | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    new Set([""]),
  ); // Start with root expanded
  const [visibleDirs, setVisibleDirs] = useState<VisibleNode[]>([]);

  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const thisRef = useRef<HTMLDivElement>(null);

  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);
  const shownNumber = 5;
  const [newSelected, setNewSelected] = useState<boolean>(true);

  const { addToast } = useToast();

  // Fetch the tree
  useEffect(() => {
    const fetchData = async () => {
      try {
        const root: FolderNode = await invoke("get_folder_tree");
        setRootFolder(root);

        // Ensure first item is selected initially
        if (!selectedFolder) {
          setSelectedFolder(root.path);
        }
      } catch (error) {
        console.error(error);
        addToast("Failed to load folder tree", {
          type: "error",
          closable: true,
        });
      }
    };

    fetchData();
  }, []);

  // Flattens the tree dynamically based on what is expanded
  useEffect(() => {
    if (!rootFolder) return;

    const flattenTree = (node: FolderNode, depth = 0): VisibleNode[] => {
      const result: VisibleNode[] = [];
      const hasChildren = !!node.children && node.children.length > 0;

      // Push the current node
      result.push({
        path: node.path,
        name: node.path === "" ? "/" : node.name, // Format root path beautifully
        depth,
        hasChildren,
      });

      // Recursively push children if expanded
      if (expandedPaths.has(node.path) && hasChildren) {
        for (const child of node.children!) {
          result.push(...flattenTree(child, depth + 1));
        }
      }
      return result;
    };

    const newVisibleDirs = flattenTree(rootFolder);
    setVisibleDirs(newVisibleDirs);

    // Recalculate boundaries on collapse
    const absoluteIndex = offset + highlightedIndex;
    if (newVisibleDirs.length > 0 && absoluteIndex >= newVisibleDirs.length) {
      const newAbsolute = newVisibleDirs.length - 1;
      const newOffset = Math.max(0, newAbsolute - shownNumber + 1);
      setOffset(newOffset);
      setHighlightedIndex(newAbsolute - newOffset);
    }
  }, [rootFolder, expandedPaths]);

  // Re-focus main menu
  useEffect(() => {
    if (mode === "main") {
      handleFocus();
    }
  }, [mode]);

  const handleFocus = () => {
    if (thisRef.current) {
      thisRef.current.focus();
    }
  };

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

  const handleDirSelect = (dirPath: string, index: number, isNew: boolean) => {
    setSelectedFolder(dirPath);
    setHighlightedIndex(index);
    setNewSelected(isNew);
    setMode(isNew ? "new-folder" : "confirm-delete");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (visibleDirs.length === 0 || mode !== "main") return;

    const absoluteIndex = offset + highlightedIndex;
    const currentPath = visibleDirs[absoluteIndex].path;

    if (e.key === "ArrowDown" || e.key === "Tab") {
      e.preventDefault();
      if (absoluteIndex >= visibleDirs.length - 1) {
        setOffset(0);
        setHighlightedIndex(0);
      } else {
        if (highlightedIndex < shownNumber - 1)
          setHighlightedIndex((p) => p + 1);
        else setOffset((p) => p + 1);
      }
      setNewSelected(true);
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (absoluteIndex <= 0) {
        const lastIndex = visibleDirs.length - 1;
        const newOffset = Math.max(0, visibleDirs.length - shownNumber);
        setOffset(newOffset);
        setHighlightedIndex(lastIndex - newOffset);
      } else {
        if (highlightedIndex > 0) setHighlightedIndex((p) => p - 1);
        else setOffset((p) => p - 1);
      }
      setNewSelected(true);
    }

    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      // Don't allow toggling "Del" for the root folder
      if (currentPath === "") {
        setNewSelected(true);
      } else {
        setNewSelected((prev) => !prev);
      }
    }

    if (e.key === " ") {
      e.preventDefault();
      toggleExpand(currentPath);
    }

    if (e.key === "Enter") {
      if (highlightedIndex === -1) return;
      e.preventDefault();

      handleDirSelect(
        currentPath,
        highlightedIndex,
        currentPath === "" ? true : newSelected, // Force 'New' command if they enter on Root, otherwise respect their selection
      );
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (mode !== "main" || visibleDirs.length === 0) return;
    const absoluteIndex = offset + highlightedIndex;

    if (e.deltaY < 0) {
      if (absoluteIndex <= 0) {
        const lastIndex = visibleDirs.length - 1;
        const newOffset = Math.max(0, visibleDirs.length - shownNumber);
        setOffset(newOffset);
        setHighlightedIndex(lastIndex - newOffset);
      } else {
        if (highlightedIndex > 0) {
          setHighlightedIndex((p) => p - 1);
        } else {
          setOffset((p) => p - 1);
        }
      }

      setNewSelected(true);
    } else {
      if (absoluteIndex >= visibleDirs.length - 1) {
        setOffset(0);
        setHighlightedIndex(0);
      } else {
        if (highlightedIndex < shownNumber - 1) {
          setHighlightedIndex((p) => p + 1);
        } else {
          setOffset((p) => p + 1);
        }
      }

      setNewSelected(true);
    }
  };

  const view = {
    main: (
      <div className="overflow-hidden focus:outline-none">
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
                      setSelectedFolder(dir.path);
                      setHighlightedIndex(index);
                      if (dir.path !== "") toggleExpand(dir.path);
                    }}
                    className={`p-2 rounded-lg flex flex-row justify-between items-center ${
                      isHighlighted ? "bg-active" : "hover:bg-hover"
                    } mb-2 cursor-pointer`}
                  >
                    <div
                      className="flex-1 flex items-center gap-2"
                      style={{ paddingLeft: `${(dir.depth - 0.75) * 1}rem` }}
                    >
                      {/* Only render tree expansion logic for non-root elements */}
                      {dir.path !== "" && (
                        <span
                          className={`w-4.75 flex items-center justify-center ${
                            dir.hasChildren ? "text-primary" : "text-secondary"
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
                                  d="m19.5 8.25-7.5 7.5-7.5-7.5"
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
                                  d="m8.25 4.5 7.5 7.5-7.5 7.5"
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

                    <div className="flex flex-row gap-2">
                      {dir.path === "" ? (
                        <span
                          className={`${
                            isHighlighted
                              ? "hover:bg-hover"
                              : "hover:bg-bg-secondary"
                          } ${
                            isHighlighted
                              ? "border-primary"
                              : "border-transparent"
                          } border-2 rounded p-1 w-18 text-center inline-block`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDirSelect(dir.path, index, true);
                          }}
                        >
                          New
                        </span>
                      ) : (
                        <>
                          <span
                            className={`${
                              isHighlighted
                                ? "hover:bg-hover"
                                : "hover:bg-bg-secondary"
                            } ${
                              newSelected && isHighlighted
                                ? "border-primary"
                                : "border-transparent"
                            } border-2 rounded-l p-1`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDirSelect(dir.path, index, true);
                            }}
                          >
                            New
                          </span>
                          <span
                            className={`${
                              isHighlighted
                                ? "hover:bg-hover"
                                : "hover:bg-bg-secondary"
                            } ${
                              !newSelected && isHighlighted
                                ? "border-primary"
                                : "border-transparent"
                            } border-2 rounded-r p-1`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDirSelect(dir.path, index, false);
                            }}
                          >
                            Del
                          </span>
                        </>
                      )}
                    </div>
                  </li>
                );
              })
          )}
        </ul>
        <div className="flex flex-row items-center justify-between mt-2">
          <span className="text-sm text-text-muted">
            [Space] expand/collapse - [Enter]{" "}
            {newSelected ? "create" : "delete"}
          </span>
          <span className="text-sm text-text-muted">
            [
            {offset + shownNumber < visibleDirs.length
              ? offset + shownNumber
              : visibleDirs.length}{" "}
            / {visibleDirs.length}]
          </span>
        </div>
      </div>
    ),
    "new-folder": (
      <NewFolder
        close={close}
        folder={selectedFolder!}
        cancel={() => setMode("main")}
      />
    ),
    "confirm-delete": (
      <ConfirmDelete
        cancel={() => setMode("main")}
        close={close}
        onFolderDeleted={() => {
          pathDeleted(selectedFolder!);
        }}
        folderName={selectedFolder!}
      />
    ),
  } satisfies Record<DisplayMode, JSX.Element>;

  return mode === "confirm-delete" ? (
    view["confirm-delete"]
  ) : (
    <div
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
      tabIndex={0}
      ref={thisRef}
      className="text-text focus:outline-none"
    >
      <div className="flex flex-row justify-between items-center border-b-2 border-border pb-2 mb-2">
        <h2 className="m-0 p-0">Folder Control</h2>
      </div>
      {view[mode]}
    </div>
  );
}

export default FolderControl;
