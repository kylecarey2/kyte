import { invoke } from "@tauri-apps/api/core";
import { useState, useRef, useEffect } from "react";

interface DeleteFolderProps {
  close: () => void;
}

function DeleteFolder({ close }: DeleteFolderProps) {
  const [dirs, setDirs] = useState<string[]>([]);
  const [shownDirs, setShownDirs] = useState<string[]>([]);
  const [folderName, setFolderName] = useState("");
  const folderNameRef = useRef<HTMLInputElement>(null);

  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);
  const shownNumber = 5;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result: string[] = await invoke("list_dirs");
        setDirs(result);
        setShownDirs(result);
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();

    if (folderNameRef.current) {
      folderNameRef.current.focus();
    }
  }, []);

  const handleDirSelect = (dir: string, index: number) => {
    setHighlightedIndex(index);
    const create = async () => {
      let result: string;
      try {
        result = await invoke("delete_directory", {
          dirname: dir,
        });
      } catch (error) {
        console.error(error);
        return;
      }

      console.log(result);
      close();
    };

    create();

    console.log(dir);
  };

  const searchFolder = (value: string) => {
    value = value.trim();
    setFolderName(value);
    setShownDirs(dirs.filter((dir) => dir.includes(value)));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (shownDirs.length === 0) return;

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
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();

      if (absoluteIndex <= 0) {
        // Top of list, clear highlight
        setHighlightedIndex(-1);
        if (folderNameRef.current) {
          folderNameRef.current.focus();
        }
      } else {
        if (highlightedIndex > 0) {
          // Move the highlight up visually
          setHighlightedIndex((prev) => prev - 1);
        } else {
          // Shift window up
          setOffset((prev) => prev - 1);
        }
      }
    }

    if (e.key === "Enter") {
      // Allow typing a space in the search bar if nothing is highlighted yet
      if (highlightedIndex === -1) return;

      e.preventDefault();
      const dir = shownDirs[absoluteIndex];
      handleDirSelect(dir, highlightedIndex);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    const absoluteIndex = offset + highlightedIndex;

    if (e.deltaY < 0) {
      if (absoluteIndex <= 0) {
        // Top of list, clear highlight
        setHighlightedIndex(-1);
        if (folderNameRef.current) {
          folderNameRef.current.focus();
        }
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

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
      className="h-full text-white overflow-hidden focus:outline-none"
    >
      <input
        ref={folderNameRef}
        className="w-full mb-2 bg-transparent border-0 border-b-2 border-slate-500 placeholder-slate-500 h-8 focus:outline-none font-cascadia text-lg text-white"
        type="text"
        placeholder="Search folders..."
        value={folderName}
        onChange={(e) => searchFolder(e.target.value)}
      ></input>
      <ul className="list-none p-0 m-0 selection:bg-transparent selection:text-inherit">
        {dirs.length === 0 ? (
          <p>No directories found</p>
        ) : (
          shownDirs.slice(offset, offset + shownNumber).map((dir, index) => (
            <li
              key={dir}
              onClick={() => handleDirSelect(dir, index)}
              className={`p-2 rounded-lg ${
                highlightedIndex === index
                  ? "bg-slate-500"
                  : "hover:bg-black/20"
              } mb-2 cursor-pointer`}
            >
              {dir} &gt;{" "}
              <span
                className={
                  highlightedIndex === index ? "text-primary" : "text-slate-500"
                }
              >
                {dir}
              </span>
            </li>
          ))
        )}
      </ul>
      <div className="flex flex-row justify-between items-center h-fit">
        <p className="text-slate-600 my-0">
          [{shownNumber < dirs.length ? shownNumber + offset : dirs.length} /{" "}
          {dirs.length}]
        </p>
        <button
          className="bg-transparent text-white font-cascadia p-2 border-2 border-slate-500 cursor-pointer hover:bg-black/20"
          onClick={() =>
            handleDirSelect(
              shownDirs[highlightedIndex + offset],
              highlightedIndex,
            )
          }
        >
          Create
        </button>
      </div>
    </div>
  );
}

export default DeleteFolder;
