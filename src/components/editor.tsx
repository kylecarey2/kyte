import { useState } from "react";
import "@mdxeditor/editor/style.css";
import "./editor.overrides.css";
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
} from "@mdxeditor/editor";

function Editor() {
  const [markdown, setMarkdown] = useState("# Hello");

  return (
    <div className="h-full">
      <MDXEditor
        contentEditableClassName="selectableEditor"
        className="h-full"
        markdown={markdown}
        onChange={setMarkdown}
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          markdownShortcutPlugin(),
        ]}
      />
    </div>
  );
}

export default Editor;
