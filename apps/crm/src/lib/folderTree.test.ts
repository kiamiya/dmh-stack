import { describe, expect, it } from "vitest";
import { buildFolderTree, listsUnderFolder } from "./folderTree";

const NOW = "2026-01-01";

function folder(id: string, name: string, parentId: string | null) {
  return { id, client_id: "c1", parent_id: parentId, name, created_by: null, created_at: NOW };
}

describe("buildFolderTree", () => {
  it("regroupe les dossiers racine avec leurs enfants directs", () => {
    const folders = [
      folder("root1", "Comptes clients", null),
      folder("child1", "ACIER LOIRE", "root1"),
      folder("child2", "GROUPE VALFER", "root1"),
      folder("root2", "Réactivation", null),
    ];
    const tree = buildFolderTree(folders);
    expect(tree).toHaveLength(2);
    expect(tree.find((n) => n.folder.id === "root1")?.children.map((c) => c.id)).toEqual(["child1", "child2"]);
    expect(tree.find((n) => n.folder.id === "root2")?.children).toEqual([]);
  });

  it("retourne un tableau vide sans dossier", () => {
    expect(buildFolderTree([])).toEqual([]);
  });

  it("ignore les enfants d'un dossier qui n'est pas racine (pas plus de 2 niveaux)", () => {
    const folders = [folder("root1", "A", null), folder("child1", "B", "root1"), folder("grandchild1", "C", "child1")];
    const tree = buildFolderTree(folders);
    expect(tree).toHaveLength(1);
    expect(tree[0].children.map((c) => c.id)).toEqual(["child1"]);
  });
});

describe("listsUnderFolder", () => {
  const folders = [
    { id: "root1", parent_id: null },
    { id: "child1", parent_id: "root1" },
    { id: "child2", parent_id: "root1" },
    { id: "root2", parent_id: null },
  ];

  it("inclut le dossier sélectionné et ses enfants directs", () => {
    expect(listsUnderFolder(folders, "root1").sort()).toEqual(["child1", "child2", "root1"].sort());
  });

  it("n'inclut que le dossier lui-même s'il n'a pas d'enfant", () => {
    expect(listsUnderFolder(folders, "root2")).toEqual(["root2"]);
  });

  it("n'inclut que lui-même pour un sous-dossier sélectionné (pas de remontée au parent)", () => {
    expect(listsUnderFolder(folders, "child1")).toEqual(["child1"]);
  });
});
