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
      <div className="">
        <MDXEditor
          className=""
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
    </>
  );
}

export default Editor;
