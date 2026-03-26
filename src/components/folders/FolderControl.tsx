import { useEffect, useRef, useState } from "react";
import ConfirmDelete from "./ConfirmDelete";
import NewFolder from "./NewFolder";
import { invoke } from "@tauri-apps/api/core";

type DisplayMode = "main" | "new-folder" | "confirm-delete";

interface FolderControlProps {
  close: () => void;
}

function FolderControl({ close }: FolderControlProps) {
  const [mode, setMode] = useState<DisplayMode>("main");
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const thisRef = useRef<HTMLDivElement>(null);

  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);
  const shownNumber = 5;
  const [shownDirs, setShownDirs] = useState<string[]>([]);
  const [newSelected, setNewSelected] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result: string[] = await invoke("list_dirs");
        setFolders(result);
        setShownDirs(result);
        if (result.length > 0) {
          setSelectedFolder(result[0]);
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
  }, []);

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

  const handleDirSelect = (dir: string, index: number, isNew: boolean) => {
    setSelectedFolder(dir);
    setHighlightedIndex(index);
    setNewSelected(isNew);

    if (isNew) {
      setMode("new-folder");
    } else {
      setMode("confirm-delete");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (shownDirs.length === 0) return;
    if (mode !== "main") return;

    // Calculate the absolute index in the entire list to properly calculate boundaries
    const absoluteIndex = offset + highlightedIndex;

    if (e.key === "ArrowDown" || e.key === "Tab") {
      e.preventDefault();

      if (absoluteIndex >= shownDirs.length - 1) {
        // Very end of list, wrap to top
        setOffset(0);
        setHighlightedIndex(0);
      } else {
        if (highlightedIndex < shownNumber - 1) {
          // Move the highlight down
          setHighlightedIndex((prev) => prev + 1);
        } else {
          // Shift window down
          setOffset((prev) => prev + 1);
        }
      }

      setNewSelected(true);
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();

      const total = folders.length;

      // If at very top wrap to bottom
      if (absoluteIndex <= 0) {
        const lastIndex = total - 1;
        const newOffset = Math.max(0, total - shownNumber);
        setOffset(newOffset);
        setHighlightedIndex(lastIndex - newOffset);
      } else {
        if (highlightedIndex > 0) {
          // Move highlight up within visible window
          setHighlightedIndex((prev) => prev - 1);
        } else {
          // Shift window up
          setOffset((prev) => prev - 1);
        }
      }

      setNewSelected(true);
    }

    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      setNewSelected((prev) => !prev);
    }

    if (e.key === "Enter") {
      // Allow typing a space in the search bar if nothing is highlighted yet
      if (highlightedIndex === -1) return;

      e.preventDefault();
      const dir = shownDirs[absoluteIndex];
      handleDirSelect(dir, highlightedIndex, newSelected);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    const absoluteIndex = offset + highlightedIndex;
    if (mode !== "main") return;

    if (e.deltaY < 0) {
      if (absoluteIndex <= 0) {
        const lastIndex = folders.length - 1;

        // Set offset so last item is visible
        const newOffset = Math.max(0, folders.length - shownNumber);

        setOffset(newOffset);

        // Highlight last visible item
        setHighlightedIndex(lastIndex - newOffset);
      } else {
        if (highlightedIndex > 0) {
          // Move the highlight up visually
          setHighlightedIndex((prev) => prev - 1);
        } else {
          // Shift window up
          setOffset((prev) => prev - 1);
        }
      }
    } else {
      if (absoluteIndex >= shownDirs.length - 1) {
        // Very end of list, wrap to top
        setOffset(0);
        setHighlightedIndex(0);
      } else {
        if (highlightedIndex < shownNumber - 1) {
          // Move the highlight down
          setHighlightedIndex((prev) => prev + 1);
        } else {
          // Shift window down
          setOffset((prev) => prev + 1);
        }
      }
    }
  };

  const view = {
    main: (
      <div className="overflow-hidden focus:outline-none">
        <ul className="list-none p-0 m-0 selection:bg-transparent selection:text-inherit">
          {folders.length === 0 ? (
            <p>No directories found</p>
          ) : (
            shownDirs.slice(offset, offset + shownNumber).map((dir, index) => (
              <li
                key={dir}
                onClick={() => {
                  setSelectedFolder(dir);
                  setNewSelected(true);
                  setHighlightedIndex(index);
                }}
                className={`p-2 rounded-lg ${
                  highlightedIndex === index
                    ? "bg-slate-500"
                    : "hover:bg-black/20"
                } mb-2 cursor-pointer`}
              >
                <div className="flex flex-row justify-between items-center">
                  <div className="flex-1">
                    {dir} &gt;{" "}
                    <span
                      className={
                        highlightedIndex === index
                          ? "text-primary"
                          : "text-slate-500"
                      }
                    >
                      {dir}
                    </span>
                  </div>
                  <div className="flex flex-row gap-2">
                    <span
                      className={`${highlightedIndex === index ? "hover:bg-black/20" : "hover:bg-white/10"} ${newSelected && highlightedIndex === index ? "border-primary" : "border-transparent"} border-2 p-1`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleDirSelect(dir, index, true);
                      }}
                    >
                      New
                    </span>
                    <span
                      className={`${highlightedIndex === index ? "hover:bg-black/20" : "hover:bg-white/10"} ${!newSelected && highlightedIndex === index ? "border-primary" : "border-transparent"} border-2 rounded-r-lg p-1`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleDirSelect(dir, index, false);
                      }}
                    >
                      Del
                    </span>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
        <div className="flex flex-row items-center justify-between">
          <span className="text-sm text-gray-500">
            [Enter] to {newSelected ? "create a new folder" : "delete folder"}
          </span>
          <span className="text-sm text-gray-500">
            [
            {offset + shownNumber < folders.length
              ? offset + shownNumber
              : folders.length}{" "}
            / {folders.length}]
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
        onFolderDeleted={() => {}}
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
      className="text-white focus:outline-none"
    >
      <div className="flex flex-row justify-between items-center border-b-2 border-slate-600 pb-2 mb-2">
        <h2 className="m-0 p-0">Folder Control</h2>
      </div>
      {view[mode]}
    </div>
  );
}

export default FolderControl;
