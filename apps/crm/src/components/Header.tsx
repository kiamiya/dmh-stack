import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSession } from "../lib/useSession";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/cn";
import { DropdownMenu, DropdownMenuItem } from "./ui/dropdown-menu";
import { ChangePasswordDialog } from "./ChangePasswordDialog";

const NAV_ITEMS = [
  { to: "/", label: "Prospects" },
  { to: "/pipeline", label: "Pipeline" },
];

/**
 * Header commun aux pages protégées du CRM (staff interne — pas de
 * branding client ici, contrairement à apps/dashboard). `NAV_ITEMS` reste
 * un tableau même avec une seule entrée pour accueillir de futures
 * sections sans réécrire le composant.
 */
export function Header() {
  const { session } = useSession();
  const location = useLocation();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <span className="text-sm font-semibold text-foreground">DMH CRM</span>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          {session?.user.email && (
            <DropdownMenu
              align="end"
              trigger={
                <button className="cursor-pointer rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-secondary">
                  {session.user.email}
                </button>
              }
            >
              <DropdownMenuItem onClick={() => setChangePasswordOpen(true)}>
                Changer le mot de passe
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>Déconnexion</DropdownMenuItem>
            </DropdownMenu>
          )}
        </nav>
      </div>
      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </header>
  );
}
