import { describe, expect, it } from "vitest";
import {
  addFieldsBlock,
  BUILTIN_BLOCKS,
  defaultCompanyLayout,
  fieldKeysInCustomBlocks,
  moveBlockToColumn,
  moveBlockWithinColumn,
  normalizeCompanyLayout,
  removeFieldsBlock,
  toggleBlockVisibility,
} from "./companyLayout";

const ids = (layout: ReturnType<typeof defaultCompanyLayout>, column: "left" | "center" | "right") =>
  layout.columns[column].map((b) => b.id);

describe("defaultCompanyLayout", () => {
  it("reprend l'affichage par défaut de S38-8 et contient chaque bloc standard une fois", () => {
    const layout = defaultCompanyLayout();
    expect(ids(layout, "center")).toEqual(["timeline"]);
    expect(ids(layout, "left")[0]).toBe("summary");
    const all = [...ids(layout, "left"), ...ids(layout, "center"), ...ids(layout, "right")];
    expect(all.sort()).toEqual(Object.keys(BUILTIN_BLOCKS).sort());
  });
});

describe("normalizeCompanyLayout", () => {
  it("retombe sur le défaut pour une valeur absente, corrompue ou d'une autre version", () => {
    expect(normalizeCompanyLayout(null)).toEqual(defaultCompanyLayout());
    expect(normalizeCompanyLayout("n'importe quoi")).toEqual(defaultCompanyLayout());
    expect(normalizeCompanyLayout({ version: 2, columns: {} })).toEqual(defaultCompanyLayout());
  });

  it("garde l'ordre enregistré, ignore l'inconnu et les doublons, réinsère un bloc standard manquant", () => {
    const layout = normalizeCompanyLayout({
      version: 1,
      columns: {
        left: [{ type: "builtin", key: "contacts", visible: true }, { type: "builtin", key: "inconnu" }],
        center: [
          { type: "builtin", key: "timeline", visible: false },
          { type: "fields", id: "b1", title: " Incidents substances toxiques ", fieldKeys: ["incidents", "incidents", 3] },
          { type: "builtin", key: "contacts" },
        ],
        right: [],
      },
    });
    expect(ids(layout, "left")[0]).toBe("contacts");
    expect(layout.columns.center[0]).toEqual({ id: "timeline", type: "builtin", key: "timeline", visible: false });
    expect(layout.columns.center[1]).toEqual({
      id: "b1",
      type: "fields",
      title: "Incidents substances toxiques",
      fieldKeys: ["incidents"],
      visible: true,
    });
    expect(ids(layout, "right")).toContain("deals");
    const all = [...ids(layout, "left"), ...ids(layout, "center"), ...ids(layout, "right")].filter((id) => id !== "b1");
    expect(all.sort()).toEqual(Object.keys(BUILTIN_BLOCKS).sort());
  });
});

describe("opérations", () => {
  it("monte/descend dans une colonne, sans sortir des bornes", () => {
    const layout = defaultCompanyLayout();
    expect(ids(moveBlockWithinColumn(layout, "info", -1), "left").slice(0, 2)).toEqual(["info", "summary"]);
    expect(moveBlockWithinColumn(layout, "summary", -1)).toBe(layout);
  });

  it("déplace un bloc vers une autre colonne", () => {
    const moved = moveBlockToColumn(defaultCompanyLayout(), "contacts", "left");
    expect(ids(moved, "left").at(-1)).toBe("contacts");
    expect(ids(moved, "right")).not.toContain("contacts");
  });

  it("masque un bloc sans le retirer", () => {
    const hidden = toggleBlockVisibility(defaultCompanyLayout(), "pappers");
    expect(hidden.columns.left.find((b) => b.id === "pappers")?.visible).toBe(false);
  });

  it("ajoute puis supprime un bloc personnalisé ; un bloc standard ne se supprime pas", () => {
    const withBlock = addFieldsBlock(defaultCompanyLayout(), {
      id: "b1",
      title: "Dernière commande de boulons",
      fieldKeys: ["date_commande", "montant_commande"],
      column: "right",
    });
    expect(ids(withBlock, "right").at(-1)).toBe("b1");
    expect(fieldKeysInCustomBlocks(withBlock)).toEqual(new Set(["date_commande", "montant_commande"]));
    expect(ids(removeFieldsBlock(withBlock, "b1"), "right")).not.toContain("b1");
    expect(removeFieldsBlock(withBlock, "contacts")).toBe(withBlock);
  });

  it("un bloc personnalisé masqué ne retire pas ses champs des cartes génériques", () => {
    const withBlock = addFieldsBlock(defaultCompanyLayout(), { id: "b1", title: "X", fieldKeys: ["a"], column: "left" });
    expect(fieldKeysInCustomBlocks(toggleBlockVisibility(withBlock, "b1")).size).toBe(0);
  });
});
