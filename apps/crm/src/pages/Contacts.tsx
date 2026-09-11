import { Navigate, useLocation } from "react-router-dom";

/**
 * La page Contacts a été fusionnée dans l'écran "Prospects" (bascule
 * Contacts/Entreprises, correction Claude Design S34) — cette route est
 * conservée en redirection pour ne pas casser les liens existants
 * (favoris, raccourci du CommandPalette).
 */
export function ContactsPage() {
  const location = useLocation();
  return <Navigate to={{ pathname: "/", search: "?view=contacts" }} state={location.state} replace />;
}
