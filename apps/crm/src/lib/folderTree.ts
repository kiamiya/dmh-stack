import type { ListFolder } from "@dmh/types";

export interface FolderTreeNode {
  folder: ListFolder;
  children: ListFolder[];
}

/** Pure : construit un arbre à 2 niveaux (dossiers racine + leurs enfants directs) — l'UI ne montre pas plus de profondeur, cohérent avec le mockup. */
export function buildFolderTree(folders: ListFolder[]): FolderTreeNode[] {
  return folders
    .filter((f) => f.parent_id === null)
    .map((folder) => ({
      folder,
      children: folders.filter((f) => f.parent_id === folder.id),
    }));
}

/** Pure : ids de dossiers à inclure quand on sélectionne un dossier dans l'arbre — le dossier lui-même + ses enfants directs (sélectionner un dossier parent montre aussi les listes classées dans ses sous-dossiers, comme le mockup). */
export function listsUnderFolder(folders: Array<{ id: string; parent_id: string | null }>, selectedFolderId: string): string[] {
  const childIds = folders.filter((f) => f.parent_id === selectedFolderId).map((f) => f.id);
  return [selectedFolderId, ...childIds];
}
