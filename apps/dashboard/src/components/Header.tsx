import { Link, useLocation } from "react-router-dom";
import { useClient } from "../lib/useClient";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/cn";
import { Button } from "./ui/button";

/** Couleur par défaut alignée sur dmh_clients.brand_primary_color (schéma initial). */
const DEFAULT_BRAND_COLOR = "#1A73E8";

const NAV_ITEMS = [
  { to: "/", label: "Vue d'ensemble" },
  { to: "/pipeline", label: "Pipeline" },
  { to: "/interactions", label: "Interactions" },
  { to: "/deals", label: "Deals" },
];

/**
 * Header commun aux 3 pages, avec le branding du client (logo/nom/couleur
 * — dmh_clients.brand_logo_url/brand_name/brand_primary_color). Pas de
 * token Tailwind dynamique possible à la compilation pour une couleur
 * variable par client : la couleur de marque est appliquée en style
 * inline sur les quelques éléments concernés, le reste de l'UI reste en
 * Tailwind slate standard.
 */
export function Header() {
  const { client } = useClient();
  const location = useLocation();
  const brandColor = client?.brand_primary_color || DEFAULT_BRAND_COLOR;
  const displayName = client?.brand_name ?? client?.name ?? "Dashboard";

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          {client?.brand_logo_url ? (
            <img
              src={client.brand_logo_url}
              alt={displayName}
              className="h-8 w-8 rounded object-contain"
            />
          ) : (
            <div
              className="flex h-8 w-8 items-center justify-center rounded text-xs font-bold text-white"
              style={{ backgroundColor: brandColor }}
            >
              {displayName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="text-sm font-semibold text-slate-900">{displayName}</span>
        </div>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium",
                  active ? "text-white" : "text-slate-600 hover:bg-slate-100",
                )}
                style={active ? { backgroundColor: brandColor } : undefined}
              >
                {item.label}
              </Link>
            );
          })}
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Déconnexion
          </Button>
        </nav>
      </div>
    </header>
  );
}
