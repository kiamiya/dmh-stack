import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSession } from "../lib/useSession";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/cn";
import { DropdownMenu, DropdownMenuItem } from "./ui/dropdown-menu";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { useTheme } from "../hooks/useTheme";
import { themeLabel } from "../lib/theme";

const THEME_ICON = { light: "☀", dark: "☾", system: "◐" } as const;

const NAV_ITEMS = [
  { to: "/", label: "Prospects" },
  { to: "/pipeline", label: "Pipeline" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/contacts", label: "Contacts" },
  { to: "/companies", label: "Entreprises" },
  { to: "/opportunities", label: "Opportunités" },
  { to: "/tasks", label: "Tâches" },
  { to: "/automations", label: "Automatisations" },
  { to: "/settings/calendar", label: "Mon calendrier" },
  { to: "/settings/custom-fields", label: "Réglages" },
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
  const { theme, cycleTheme } = useTheme();

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
          <button
            type="button"
            onClick={cycleTheme}
            title={`Thème : ${themeLabel(theme)} (cliquer pour changer)`}
            aria-label={`Thème : ${themeLabel(theme)}`}
            className="rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-secondary"
          >
            {THEME_ICON[theme]}
          </button>
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
