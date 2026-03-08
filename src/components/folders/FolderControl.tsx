import { useEffect, useState } from "react";
import ConfirmDelete from "./ConfirmDelete";
import DeleteFolder from "./DeleteFolder";
import NewFolder from "./NewFolder";
import { invoke } from "@tauri-apps/api/core";

type DisplayMode = "new-folder" | "delete-folder" | "confirm-delete";

interface FolderControlProps {
  close: () => void;
}

function FolderControl({ close }: FolderControlProps) {
  const [mode, setMode] = useState<DisplayMode>("new-folder");
  const [loading, setLoading] = useState(false);

  const [folders, setFolders] = useState<string[]>([]);
  const [pendingDeletion, setPendingDeletion] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result: string[] = await invoke("list_dirs");
        setFolders(result);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const view = {
    "new-folder": <NewFolder close={close} folders={folders} />,
    "delete-folder": (
      <DeleteFolder
        folders={folders}
        onFolderSelected={(folderName: string) => {
          setPendingDeletion(folderName);
          setMode("confirm-delete");
        }}
      />
    ),
    "confirm-delete": (
      <ConfirmDelete
        cancel={() => {
          setMode("delete-folder");
          setPendingDeletion(null);
        }}
        close={close}
        onFolderDeleted={() => setPendingDeletion(null)}
        folderName={pendingDeletion!}
      />
    ),
  } satisfies Record<DisplayMode, JSX.Element>;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mode === "confirm-delete") return;

    // Toggle view
    if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "Tab") {
      e.preventDefault();
      setMode((prev) => {
        if (prev === "new-folder") return "delete-folder";
        if (prev === "delete-folder") return "new-folder";
        return prev;
      });
    }
  };

  return mode === "confirm-delete" ? (
    view["confirm-delete"]
  ) : (
    <div className="text-white" onKeyDown={handleKeyDown}>
      <div className="flex flex-row justify-between items-center border-b-2 border-slate-600 pb-2 mb-2">
        <h2 className="m-0 p-0">Folder Control</h2>
        <div className="flex flex-row justify-end items-center gap-2 h-fit">
          <button
            className={`${mode === "new-folder" ? "bg-slate-500 text-white border-primary hover:bg-slate-600" : "bg-transparent text-white border-slate-500 hover:bg-black/20"}  font-cascadia p-2 border-2 cursor-pointer`}
            onClick={() => setMode("new-folder")}
          >
            New Folder
          </button>
          <button
            className={`${mode === "delete-folder" ? "bg-slate-500 text-white border-primary hover:bg-slate-600" : "bg-transparent text-white border-slate-500 hover:bg-black/20"}  font-cascadia p-2 border-2 cursor-pointer`}
            onClick={() => setMode("delete-folder")}
          >
            Delete Folder
          </button>
        </div>
      </div>
      {loading ? <p>Loading folders...</p> : view[mode]}
    </div>
  );
}

export default FolderControl;
