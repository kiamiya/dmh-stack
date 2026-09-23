/**
 * S38-9 (CR du 17/09) — composition de la fiche entreprise, propre à chaque
 * client DMH : un affichage par défaut (S38-8), puis blocs masquables,
 * réordonnables, déplaçables entre colonnes, et blocs personnalisés
 * regroupant des champs du client (ex. "Incidents substances toxiques" pour
 * l'un, "Dernière commande de boulons" pour un autre). Stockée en JSON
 * (`company_layouts.layout`, migration 047) — tout est validé ici, une
 * valeur corrompue ou ancienne retombe proprement sur le défaut.
 */
export type LayoutColumn = "left" | "center" | "right";

export const BUILTIN_BLOCKS = {
  summary: "En bref & actions rapides",
  info: "Informations",
  pappers: "Données Pappers",
  prospecting_fields: "Fiche de prospection",
  custom_fields: "Champs personnalisés",
  timeline: "Historique",
  contacts: "Contacts",
  deals: "Opportunités",
  group: "Groupe",
  tasks: "Tâches",
  assigned_list: "Liste de contacts assignée",
  meetings: "Rendez-vous",
} as const;

export type BuiltinBlockKey = keyof typeof BUILTIN_BLOCKS;

export type LayoutBlock =
  | { id: string; type: "builtin"; key: BuiltinBlockKey; visible: boolean }
  | { id: string; type: "fields"; title: string; fieldKeys: string[]; visible: boolean };

export interface CompanyLayout {
  version: 1;
  columns: Record<LayoutColumn, LayoutBlock[]>;
}

export const LAYOUT_COLUMNS: LayoutColumn[] = ["left", "center", "right"];
export const LAYOUT_COLUMN_LABEL: Record<LayoutColumn, string> = {
  left: "Colonne gauche",
  center: "Colonne centrale",
  right: "Colonne droite",
};

const DEFAULT_PLACEMENT: Record<LayoutColumn, BuiltinBlockKey[]> = {
  left: ["summary", "info", "pappers", "prospecting_fields", "custom_fields"],
  center: ["timeline"],
  right: ["contacts", "deals", "group", "tasks", "assigned_list", "meetings"],
};

const builtin = (key: BuiltinBlockKey): LayoutBlock => ({ id: key, type: "builtin", key, visible: true });

export function defaultCompanyLayout(): CompanyLayout {
  return {
    version: 1,
    columns: {
      left: DEFAULT_PLACEMENT.left.map(builtin),
      center: DEFAULT_PLACEMENT.center.map(builtin),
      right: DEFAULT_PLACEMENT.right.map(builtin),
    },
  };
}

function isBuiltinKey(value: unknown): value is BuiltinBlockKey {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(BUILTIN_BLOCKS, value);
}

function defaultColumnOf(key: BuiltinBlockKey): LayoutColumn {
  return LAYOUT_COLUMNS.find((c) => DEFAULT_PLACEMENT[c].includes(key)) ?? "left";
}

/**
 * Pure : valide une composition lue en base. Blocs inconnus ou mal formés
 * ignorés, doublons retirés, et tout bloc standard absent (ex. ajouté au code
 * après l'enregistrement de la composition) réinséré visible dans sa colonne
 * par défaut — une fiche ne perd jamais un bloc par accident.
 */
export function normalizeCompanyLayout(raw: unknown): CompanyLayout {
  if (!raw || typeof raw !== "object" || (raw as { version?: unknown }).version !== 1) return defaultCompanyLayout();
  const rawColumns = (raw as { columns?: unknown }).columns;
  if (!rawColumns || typeof rawColumns !== "object") return defaultCompanyLayout();

  const seenIds = new Set<string>();
  const seenBuiltins = new Set<BuiltinBlockKey>();
  const columns = { left: [], center: [], right: [] } as Record<LayoutColumn, LayoutBlock[]>;

  for (const column of LAYOUT_COLUMNS) {
    const blocks = (rawColumns as Record<string, unknown>)[column];
    if (!Array.isArray(blocks)) continue;
    for (const b of blocks) {
      if (!b || typeof b !== "object") continue;
      const block = b as Record<string, unknown>;
      const visible = block.visible !== false;
      if (block.type === "builtin" && isBuiltinKey(block.key)) {
        if (seenBuiltins.has(block.key)) continue;
        seenBuiltins.add(block.key);
        seenIds.add(block.key);
        columns[column].push({ id: block.key, type: "builtin", key: block.key, visible });
      } else if (block.type === "fields" && typeof block.id === "string" && typeof block.title === "string") {
        if (seenIds.has(block.id) || !block.title.trim()) continue;
        seenIds.add(block.id);
        const fieldKeys = Array.isArray(block.fieldKeys)
          ? [...new Set(block.fieldKeys.filter((k): k is string => typeof k === "string"))]
          : [];
        columns[column].push({ id: block.id, type: "fields", title: block.title.trim(), fieldKeys, visible });
      }
    }
  }

  for (const key of Object.keys(BUILTIN_BLOCKS) as BuiltinBlockKey[]) {
    if (!seenBuiltins.has(key)) columns[defaultColumnOf(key)].push(builtin(key));
  }
  return { version: 1, columns };
}

function locate(layout: CompanyLayout, blockId: string): { column: LayoutColumn; index: number } | null {
  for (const column of LAYOUT_COLUMNS) {
    const index = layout.columns[column].findIndex((b) => b.id === blockId);
    if (index !== -1) return { column, index };
  }
  return null;
}

function cloneColumns(layout: CompanyLayout): Record<LayoutColumn, LayoutBlock[]> {
  return { left: [...layout.columns.left], center: [...layout.columns.center], right: [...layout.columns.right] };
}

/** Pure : monte/descend un bloc dans sa colonne. */
export function moveBlockWithinColumn(layout: CompanyLayout, blockId: string, delta: -1 | 1): CompanyLayout {
  const at = locate(layout, blockId);
  if (!at) return layout;
  const target = at.index + delta;
  const list = layout.columns[at.column];
  if (target < 0 || target >= list.length) return layout;
  const columns = cloneColumns(layout);
  const next = [...list];
  [next[at.index], next[target]] = [next[target], next[at.index]];
  columns[at.column] = next;
  return { ...layout, columns };
}

/** Pure : déplace un bloc en fin d'une autre colonne. */
export function moveBlockToColumn(layout: CompanyLayout, blockId: string, column: LayoutColumn): CompanyLayout {
  const at = locate(layout, blockId);
  if (!at || at.column === column) return layout;
  const columns = cloneColumns(layout);
  const [block] = columns[at.column].splice(at.index, 1);
  columns[column] = [...columns[column], block];
  return { ...layout, columns };
}

/** Pure : affiche/masque un bloc. */
export function toggleBlockVisibility(layout: CompanyLayout, blockId: string): CompanyLayout {
  const at = locate(layout, blockId);
  if (!at) return layout;
  const columns = cloneColumns(layout);
  columns[at.column] = columns[at.column].map((b) => (b.id === blockId ? { ...b, visible: !b.visible } : b));
  return { ...layout, columns };
}

/** Pure : ajoute un bloc personnalisé (titre + champs du client) en fin de colonne. `id` fourni par l'appelant (stable, testable). */
export function addFieldsBlock(
  layout: CompanyLayout,
  input: { id: string; title: string; fieldKeys: string[]; column: LayoutColumn },
): CompanyLayout {
  if (!input.title.trim() || locate(layout, input.id)) return layout;
  const columns = cloneColumns(layout);
  columns[input.column] = [
    ...columns[input.column],
    { id: input.id, type: "fields", title: input.title.trim(), fieldKeys: [...new Set(input.fieldKeys)], visible: true },
  ];
  return { ...layout, columns };
}

/** Pure : supprime un bloc personnalisé (les blocs standards se masquent, ils ne se suppriment pas). */
export function removeFieldsBlock(layout: CompanyLayout, blockId: string): CompanyLayout {
  const at = locate(layout, blockId);
  if (!at || layout.columns[at.column][at.index].type !== "fields") return layout;
  const columns = cloneColumns(layout);
  columns[at.column] = columns[at.column].filter((b) => b.id !== blockId);
  return { ...layout, columns };
}

/** Pure : clés de champs déjà affichées dans un bloc personnalisé visible — à exclure des cartes génériques pour ne pas les afficher deux fois. */
export function fieldKeysInCustomBlocks(layout: CompanyLayout): Set<string> {
  const keys = new Set<string>();
  for (const column of LAYOUT_COLUMNS) {
    for (const b of layout.columns[column]) {
      if (b.type === "fields" && b.visible) b.fieldKeys.forEach((k) => keys.add(k));
    }
  }
  return keys;
}

export function blockLabel(block: LayoutBlock): string {
  return block.type === "builtin" ? BUILTIN_BLOCKS[block.key] : block.title;
}
