import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";
import { File } from "../models/File";

interface QuickPickProps {
  close: () => void;
  onFileSelected: (file: File) => void;
}

function QuickPick({ close, onFileSelected }: QuickPickProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);
  const shownNumber = 5;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result: File[] = await invoke("list_files");

        setFilteredFiles(result);
        setFiles(result);
      } catch (error) {
        console.error("Error reading files:", error);
      }
    };

    fetchData();

    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const handleFileSelect = (file: File, index: number) => {
    setHighlightedIndex(index);
    onFileSelected(file);
    close();
  };

  const handleSearch = (query: string) => {
    const queryLower = query.toLowerCase();
    setFilteredFiles(
      files.filter((file) => file.name.toLowerCase().includes(queryLower)),
    );
    setSearchQuery(query);
    setHighlightedIndex(filteredFiles.length ? 0 : -1);
    setOffset(0); // reset offset on search
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredFiles.length === 0) return;

    // Calculate the absolute index in the entire list to properly calculate boundaries
    const absoluteIndex = offset + highlightedIndex;

    if (e.key === "ArrowDown" || e.key === "Tab") {
      e.preventDefault();

      if (absoluteIndex >= filteredFiles.length - 1) {
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
        if (searchInputRef.current) {
          searchInputRef.current.focus();
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
      const file = filteredFiles[absoluteIndex];
      if (file) {
        console.log("BACKEND GETS CALLED BY ENTER / SPACE", file);
        handleFileSelect(file, highlightedIndex);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    const absoluteIndex = offset + highlightedIndex;

    if (e.deltaY < 0) {
      if (absoluteIndex <= 0) {
        // Top of list, clear highlight
        setHighlightedIndex(-1);
        if (searchInputRef.current) {
          searchInputRef.current.focus();
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
      if (absoluteIndex >= filteredFiles.length - 1) {
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
        ref={searchInputRef}
        className="w-full mb-2 bg-transparent border-0 border-b-2 border-slate-500 placeholder-slate-500 h-8 focus:outline-none font-cascadia text-lg text-white"
        type="text"
        placeholder="Search for a file..."
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
      ></input>
      <ul className="list-none p-0 m-0 selection:bg-transparent selection:text-inherit">
        {filteredFiles.length === 0 ? (
          <p>No files found</p>
        ) : (
          filteredFiles
            .slice(offset, offset + shownNumber)
            .map((file, index) => (
              <li
                key={file.path}
                onClick={() => handleFileSelect(file, index)}
                className={`p-2 rounded-lg ${
                  highlightedIndex === index
                    ? "bg-slate-500"
                    : "hover:bg-black/20"
                } mb-2 cursor-pointer`}
              >
                {file.name} &gt;{" "}
                <span
                  className={
                    highlightedIndex === index
                      ? "text-primary"
                      : "text-slate-500"
                  }
                >
                  {file.path}
                </span>
              </li>
            ))
        )}
      </ul>
      <div className="flex flex-row justify-end">
        <p className="text-slate-600 my-0">
          [
          {shownNumber < filteredFiles.length
            ? shownNumber + offset
            : filteredFiles.length}{" "}
          / {filteredFiles.length}]
        </p>
      </div>
    </div>
  );
}

export default QuickPick;
