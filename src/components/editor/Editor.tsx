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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { File } from "../../models/File";
import "./Editor.overrides.css";
import { useToast } from "../toast/ToastProvider";
import { useSearchRebuild } from "../../hooks/useSearch";

interface EditorProps {
  file: File | null;
}

function Editor({ file }: EditorProps) {
  const [markdown, setMarkdown] = useState("");
  const editor = useRef<MDXEditorMethods>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isUnsaved, setIsUnsaved] = useState(false);

  const { isRebuilding, rebuild } = useSearchRebuild();
  const { addToast } = useToast();

  const path = file?.path ?? "tmp.md";

  const breadcrumbs = useMemo(() => {
    return path.split("/");
  }, [path]);

  const wordCount = useMemo(() => {
    if (!markdown.trim()) {
      return 0;
    }

    // Remove MD syntax
    const plainText = markdown
      // code blocks
      .replace(/```[\s\S]*?```/g, " ")
      // inline code
      .replace(/`([^`]+)`/g, "$1")
      // images
      .replace(/!\[.*?\]\(.*?\)/g, " ")
      // links -> keep link text
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      // headings, blockquotes, lists
      .replace(/^[#>*+\-]+/gm, " ")
      // emphasis
      .replace(/[*_~]/g, " ")
      // extra whitespace
      .replace(/\s+/g, " ")
      .trim();

    return plainText ? plainText.split(" ").length : 0;
  }, [markdown]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result: string = await invoke("read_file", {
          filename: path,
        });
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
      <div className="relative min-h-0 flex-1 overflow-hidden cursor-text">
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
        className="flex h-8 shrink-0 items-center justify-between gap-3 border-t-2 border-border bg-transparent px-3 text-xs text-text-muted"
        aria-label="Editor footer"
      >
        <div className="flex gap-2">
          {breadcrumbs.map((crumb: string, index: number) => (
            <>
              <span key={index} className="whitespace-nowrap">
                {crumb}
              </span>
              {index < breadcrumbs.length - 1 && (
                <span className="whitespace-nowrap select-none">&gt;</span>
              )}
            </>
          ))}
        </div>
        <div className="flex flex-row items-center gap-2">
          <span className="whitespace-nowrap">
            {wordCount} {wordCount === 1 ? "word" : "words"}
          </span>
          <span className="whitespace-nowrap select-none">|</span>
          <span className="whitespace-nowrap">
            {Math.floor(wordCount / 200)} min read
          </span>
          <span className="whitespace-nowrap select-none">|</span>

          <button
            className="p-1 rounded bg-transparent border-none text-text-muted flex items-center cursor-pointer hover:bg-hover"
            onClick={rebuild}
            title="Rebuild search index"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              className={`size-4 ${isRebuilding && "animate-[spin_1s_linear_infinite_reverse]"}`}
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 16h5v5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Editor;
