import { getCurrentWindow } from "@tauri-apps/api/window";
import Editor from "./components/editor";
import { useState, useEffect, useRef } from "react";

function App() {
  const [focused, setFocused] = useState(true);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appWindow = getCurrentWindow();

  const minimize = () => {
    appWindow.minimize();
  };

  const close = () => {
    appWindow.close();
  };

  useEffect(() => {
    const unlistenBlur = appWindow.listen("tauri://blur", () => {
      // Clear any pending timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      // Debounce the blur event - only apply if it lasts more than 100ms
      debounceTimeoutRef.current = setTimeout(() => {
        setFocused(false);
      }, 100);
    });

    const unlistenFocus = appWindow.listen("tauri://focus", () => {
      // Clear any pending blur timeout immediately
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      setFocused(true);
    });

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      unlistenBlur.then((f) => f());
      unlistenFocus.then((f) => f());
    };
  }, []);

  return (
    <div
      className={`${focused ? "bg-primary-tint" : "bg-primary"} transition-colors duration-100 flex flex-col h-screen`}
    >
      <div
        data-tauri-drag-region
        onContextMenu={(e) => e.preventDefault()}
        className="flex flex-row justify-between items-center border-b-2 border-slate-600"
      >
        <p data-tauri-drag-region className="text-white ml-2 m-0 select-none">
          Kyte
        </p>
        <div className="flex flex-row">
          <svg
            onClick={minimize}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            className="size-6 text-white hover:bg-black/20 hover:cursor-pointer transition-colors duration-200 p-2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14" />
          </svg>

          <svg
            onClick={close}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            className="size-6 text-white hover:bg-black/20 hover:cursor-pointer transition-colors duration-200 p-2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <Editor />
      </div>
    </div>
  );
}

export default App;
