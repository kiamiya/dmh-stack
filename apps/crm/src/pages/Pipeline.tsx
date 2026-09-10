import { Navigate, useLocation } from "react-router-dom";

/**
 * La vue Kanban a été fusionnée dans l'onglet "Prospects" (bascule Liste/
 * Kanban, S33) — cette route est conservée en redirection pour ne pas
 * casser les liens existants (favoris, raccourci du CommandPalette).
 */
export function PipelinePage() {
  const location = useLocation();
  return <Navigate to={{ pathname: "/", search: "?view=kanban" }} state={location.state} replace />;
}
