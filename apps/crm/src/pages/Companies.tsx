import { Navigate, useLocation } from "react-router-dom";

/**
 * La page Entreprises a été fusionnée dans l'écran "Prospects" (bascule
 * Contacts/Entreprises, correction Claude Design S34) — cette route est
 * conservée en redirection pour ne pas casser les liens existants
 * (favoris, raccourci du CommandPalette).
 */
export function CompaniesPage() {
  const location = useLocation();
  return <Navigate to={{ pathname: "/", search: "?view=companies" }} state={location.state} replace />;
}
