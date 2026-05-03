// import { useState } from "react";
import { useEffect, useRef, useState } from "react";
import { useSearch } from "../../hooks/useSearch";
import { File } from "../../models/File";

interface SearchNotesProps {
  close: () => void;
  onFileSelected: (file: File) => void;
}

function SearchNotes({ onFileSelected, close }: SearchNotesProps) {
  const { query, setQuery, results } = useSearch(10);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);
  const shownNumber = 5;

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    // setVisibleResults(results);
    setHighlightedIndex(0);
    setOffset(0);
  }, [results]);

  const handleFileSelect = (file: File, index: number) => {
    setHighlightedIndex(index);
    console.log(file);
    onFileSelected(file);
    close();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return;

    // Calculate the absolute index in the entire list to properly calculate boundaries
    const absoluteIndex = offset + highlightedIndex;

    if (e.key === "ArrowDown" || e.key === "Tab") {
      e.preventDefault();

      if (absoluteIndex >= results.length - 1) {
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
      const file = results[absoluteIndex];
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
      if (absoluteIndex >= results.length - 1) {
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
      className="h-full text-text overflow-hidden focus:outline-none"
    >
      <input
        ref={searchInputRef}
        className="w-full mb-2 bg-transparent border-0 border-b-2 border-border placeholder-border h-8 focus:outline-none font-cascadia text-lg text-text"
        type="text"
        placeholder="Search notes..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      ></input>
      <ul className="list-none p-0 m-0 selection:bg-transparent selection:text-inherit">
        {results.length === 0 ? (
          <p>No files found</p>
        ) : (
          results.slice(offset, offset + shownNumber).map((file, index) => (
            <li
              key={file.path}
              onClick={() => handleFileSelect(file, index)}
              className={`p-2 rounded-lg ${
                highlightedIndex === index ? "bg-active" : "hover:bg-hover"
              } mb-2 cursor-pointer`}
            >
              {file.name} &gt;{" "}
              <span className="text-text-muted">{file.path}</span>
            </li>
          ))
        )}
      </ul>
      <div className="flex flex-row justify-end">
        <p className="text-text-muted my-0">
          [
          {shownNumber < results.length ? shownNumber + offset : results.length}{" "}
          / {results.length}]
        </p>
      </div>
    </div>
  );
}

export default SearchNotes;
