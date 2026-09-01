const STORAGE_KEY = "dmh-crm-theme";

export type Theme = "light" | "dark" | "system";
export type EffectiveTheme = "light" | "dark";

/** Pure (storage en paramètre) : préférence stockée, `"system"` par défaut si absente/invalide. */
export function getStoredTheme(storage: Pick<Storage, "getItem">): Theme {
  const raw = storage.getItem(STORAGE_KEY);
  return raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
}

export function setStoredTheme(storage: Pick<Storage, "setItem">, theme: Theme): void {
  try {
    storage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage indisponible — la préférence retombe sur "system" à la prochaine visite, non bloquant.
  }
}

/** Pure : résout un choix ("system" y compris) en thème effectif clair/sombre, selon la préférence OS. */
export function resolveEffectiveTheme(theme: Theme, prefersDark: boolean): EffectiveTheme {
  if (theme === "system") return prefersDark ? "dark" : "light";
  return theme;
}

/** Pure : fait défiler les 3 choix dans un ordre stable (clair -> sombre -> système -> clair...). */
export function nextTheme(current: Theme): Theme {
  const order: Theme[] = ["light", "dark", "system"];
  return order[(order.indexOf(current) + 1) % order.length]!;
}

export function themeLabel(theme: Theme): string {
  if (theme === "light") return "Clair";
  if (theme === "dark") return "Sombre";
  return "Système";
}
