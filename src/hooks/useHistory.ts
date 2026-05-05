import { useState } from "react";
import { File } from "../models/File";

export function useHistory() {
  const [state, setState] = useState<{
    history: File[];
    currentIdx: number;
    currentFile: File | null;
  }>({
    history: [],
    currentIdx: -1,
    currentFile: null,
  });

  // Open a file, adding it to history if it's not already present
  const open = (file: File | null) => {
    setState((prev) => {
      if (file !== null && file.path === prev.currentFile?.path) {
        return prev; // do not add duplicate to history
      }

      const nextHistory = prev.history.slice(0, prev.currentIdx + 1);
      if (file !== null) {
        nextHistory.push(file);
        if (file.path === prev.history[0]?.path) {
          nextHistory.shift(); // remove old entry so it does not appear twice
        }
      }

      return {
        history: nextHistory,
        currentIdx: nextHistory.length - 1,
        currentFile: file,
      };
    });
  };

  // Go to previous file in history, wrapping around to the end if at the beginning
  const prev = () => {
    setState((prev) => {
      if (prev.history.length === 0) return prev;
      const newIdx =
        prev.currentIdx <= 0 ? prev.history.length - 1 : prev.currentIdx - 1;
      return {
        ...prev,
        currentIdx: newIdx,
        currentFile: prev.history[newIdx],
      };
    });
  };

  // Go to next file in history, wrapping around to the beginning if at the end
  const next = () => {
    setState((prev) => {
      if (prev.history.length === 0) return prev;
      const newIdx =
        prev.currentIdx >= prev.history.length - 1 ? 0 : prev.currentIdx + 1;
      return {
        ...prev,
        currentIdx: newIdx,
        currentFile: prev.history[newIdx],
      };
    });
  };

  // Close the current file and remove it from history, wrapping around to the previous file if at the end
  const close = () => {
    setState((prev) => {
      if (prev.history.length === 0) return prev;
      const nextHistory = [...prev.history];
      nextHistory.splice(prev.currentIdx, 1);
      const newIdx =
        nextHistory.length === 0 ? -1 : Math.max(0, prev.currentIdx - 1);
      return {
        history: nextHistory,
        currentIdx: newIdx,
        currentFile: nextHistory[newIdx] ?? null,
      };
    });
  };

  return {
    history: state.history,
    currentIdx: state.currentIdx,
    currentFile: state.currentFile,
    open,
    prev,
    next,
    close,
  };
}
