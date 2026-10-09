/** Onglets de la page « Formulaires et rendez-vous » (CR du 09/10/2026). */
export type FormsMeetingsTab = "meetings" | "forms";

/** Pure : onglet demandé par l'URL (`?tab=forms`), « Rendez-vous » par défaut. */
export function parseFormsMeetingsTab(value: string | null): FormsMeetingsTab {
  return value === "forms" ? "forms" : "meetings";
}
