import { Link, useLocation } from "react-router-dom";
import { useSession } from "../lib/useSession";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/cn";
import { Button } from "./ui/button";

const NAV_ITEMS = [{ to: "/", label: "Prospects" }];

/**
 * Header commun aux pages protégées du CRM (staff interne — pas de
 * branding client ici, contrairement à apps/dashboard). `NAV_ITEMS` reste
 * un tableau même avec une seule entrée pour accueillir de futures
 * sections sans réécrire le composant.
 */
export function Header() {
  const { session } = useSession();
  const location = useLocation();

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <span className="text-sm font-semibold text-slate-900">DMH CRM</span>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium",
                  active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          {session?.user.email && (
            <span className="px-2 text-xs text-slate-400">{session.user.email}</span>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Déconnexion
          </Button>
        </nav>
      </div>
    </header>
  );
}
