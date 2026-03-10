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

interface EditorProps {
  file: File | null;
}

function Editor({ file }: EditorProps) {
  const [markdown, setMarkdown] = useState("");
  const editor = useRef<MDXEditorMethods>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isUnsaved, setIsUnsaved] = useState(false);
  const [lastSaved, setLastSaved] = useState(new Date());

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
          setLastSaved(new Date());
        } catch (error) {
          console.error("Error writing file:", error);
        }
      }, 1500);
    },
    [path],
  );

  return (
    <div className="h-full relative">
      <MDXEditor
        contentEditableClassName="selectableEditor"
        className="h-full"
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
      <div className="absolute top-0 right-2">
        {isUnsaved && (
          <svg
            className="w-4 h-4 m-2"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 4V20M18 6L6 18M20 12H4M18 18L6 6"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <div className="absolute bottom-0 right-2 mr-2">
        <p className="text-sm text-gray-500">
          Last saved: {lastSaved.toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

export default Editor;
