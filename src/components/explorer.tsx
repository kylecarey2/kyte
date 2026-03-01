import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";

interface File {
  name: string;
  path: string;
}

function Explorer() {
  const [files, setFiles] = useState<File[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // this is the "selected file" in terms of ui
  const [filteredFiles, setFilteredFiles] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result: File[] = await invoke("list_files", {
          path: "../md",
        });

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
    setSelectedFile(file);
    console.log("BACKEND GETS CALLED BY FILE SELECT", file);
    // invoke rust function to open file
  };

  const handleSearch = (query: string) => {
    const queryLower = query.toLowerCase();
    setFilteredFiles(
      files.filter((file) => file.name.toLowerCase().includes(queryLower)),
    );
    setSearchQuery(query);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredFiles.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredFiles.length - 1 ? prev + 1 : prev,
      );
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    }

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const file = filteredFiles[highlightedIndex];
      if (file) {
        // loadFile(file); // call backend here
        console.log("BACKEND GETS CALLED BY ENTER / SPACE", file);
      }
    }
  };

  return (
    <div
      id="explorer"
      tabIndex={0}
      onKeyDown={handleKeyDown}
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
          filteredFiles.map((file, index) => (
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
                  highlightedIndex === index ? "text-primary" : "text-slate-500"
                }
              >
                {file.path}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export default Explorer;
