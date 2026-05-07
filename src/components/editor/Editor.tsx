import {
  headingsPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  MDXEditor,
  MDXEditorMethods,
  quotePlugin,
  thematicBreakPlugin,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { File } from "../../models/File";
import "./Editor.overrides.css";
import { useToast } from "../toast/ToastProvider";

interface EditorProps {
  file: File | null;
}

function Editor({ file }: EditorProps) {
  const [markdown, setMarkdown] = useState("");
  const editor = useRef<MDXEditorMethods>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isUnsaved, setIsUnsaved] = useState(false);

  const { addToast } = useToast();

  const path = file?.path ?? "tmp.md";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result: string = await invoke("read_file", {
          filename: path,
        });
        console.log(result);
        setMarkdown(result);
        editor.current?.setMarkdown(result);
        setIsUnsaved(false);
      } catch (error) {
        console.error("Error reading file:", error);
        addToast("Failed to load file", {
          type: "error",
          closable: true,
        });
      }
    };

    fetchData();

    // Cleanup timeout on component unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [path]);

  // Debounced save handler
  const handleEditorChange = useCallback(
    (newContent: string) => {
      // Update the local state immediately
      setMarkdown(newContent);
      setIsUnsaved(true);

      // Clear the previous timeout if user still typing
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set new timeout to save the file after 500ms of inactivity
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await invoke("write_file", {
            filename: path,
            content: newContent,
          });
          console.log("File saved automatically!");
          setIsUnsaved(false);
        } catch (error) {
          console.error("Error writing file:", error);
          addToast("Failed to save file", {
            type: "error",
            closable: true,
          });
        }
      }, 1500);
    },
    [path],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <MDXEditor
          contentEditableClassName="selectableEditor"
          className="flex h-full min-h-0 flex-col"
          markdown={markdown}
          onChange={handleEditorChange}
          ref={editor}
          plugins={[
            headingsPlugin(),
            listsPlugin(),
            quotePlugin(),
            thematicBreakPlugin(),
            linkPlugin(),
            markdownShortcutPlugin(),
          ]}
        />
        <div className="absolute right-2 top-0">
          {isUnsaved && (
            <svg
              className="m-2 h-4 w-4 text-text-secondary"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 4V20M18 6L6 18M20 12H4M18 18L6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>

      <div
        className="flex h-8 shrink-0 items-center justify-end gap-3 border-t-2 border-border bg-transparent px-3 text-xs text-text-muted"
        aria-label="Editor footer"
      >
        <span className="whitespace-nowrap">Ln 1, Col 1</span>
        <span className="whitespace-nowrap">UTF-8</span>
        <span className="whitespace-nowrap">Markdown</span>
        <span className="whitespace-nowrap">{markdown.length} characters</span>
        <span className="whitespace-nowrap">
          {isUnsaved ? "Unsaved changes" : "All changes saved"}
        </span>
      </div>
    </div>
  );
}

export default Editor;
