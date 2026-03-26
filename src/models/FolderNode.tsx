// Matches rust struct
export interface FolderNode {
  path: string;
  name: string;
  children: FolderNode[] | null;
}
