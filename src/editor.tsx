import { useState } from "react";
import "@mdxeditor/editor/style.css";
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
    <>
      <MDXEditor
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
    </>
  );
}

export default Editor;
