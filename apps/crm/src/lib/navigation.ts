import type { Location } from "react-router-dom";

/**
 * State à passer à un `<Link>`/`navigate()` vers une fiche prospect pour
 * qu'elle s'ouvre en panneau latéral par-dessus la page actuelle plutôt
 * qu'en navigation plein écran — voir App.tsx (pattern background-location
 * de React Router) et ProspectDetailPanel.tsx.
 */
export function openProspectLinkState(currentLocation: Location) {
  return { backgroundLocation: currentLocation };
}
