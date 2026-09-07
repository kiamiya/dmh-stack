import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CircleDot, Moon, Search, Sun } from "lucide-react";
import { useSession } from "../lib/useSession";
import { supabase } from "../lib/supabase";
import { DropdownMenu, DropdownMenuItem } from "./ui/dropdown-menu";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { AddCompanyDialog } from "./AddCompanyDialog";
import { Button } from "./ui/button";
import { useTheme } from "../hooks/useTheme";
import { themeLabel } from "../lib/theme";
import { useTasks } from "../hooks/useTasks";
import { computeTasksDueToday } from "../lib/taskStats";
import { useViewMode } from "../lib/viewMode";
import type { ViewMode } from "../lib/viewMode";
import { getInitials } from "../lib/avatar";

const THEME_ICON = { light: Sun, dark: Moon, system: CircleDot } as const;

const VIEW_MODE_OPTIONS: Array<{ value: ViewMode; label: string }> = [
  { value: "sales", label: "Force de vente" },
  { value: "client_portal", label: "Portail client" },
];

export interface HeaderProps {
  /** Ouvre la palette de commandes (Cmd+K) avec cette requête — appelé à chaque frappe dans le champ de recherche visible (S30, le mockup en a un dans le bandeau du haut, jusqu'ici seul le raccourci clavier existait). */
  onSearchInput: (query: string) => void;
}

/**
 * Barre fine au-dessus du contenu — recherche + compte/notifications.
 * La navigation de page est passée dans `Sidebar.tsx` en S28 (disposition
 * façon HubSpot/Brevo : nav à gauche, compte/notifications en haut).
 */
export function Header({ onSearchInput }: HeaderProps) {
  const { session } = useSession();
  const navigate = useNavigate();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const { theme, cycleTheme } = useTheme();
  const { tasks } = useTasks();
  const dueToday = computeTasksDueToday(tasks);
  const ThemeIcon = THEME_ICON[theme];
  const { viewMode, setViewMode } = useViewMode();

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  function handleSearchChange(value: string) {
    setSearchValue(value);
    onSearchInput(value);
  }

  return (
    <header className="border-b border-border bg-card">
      <div className="flex items-center gap-3 px-6 py-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
          <input
            type="text"
            value={searchValue}
            onFocus={() => onSearchInput(searchValue)}
            onChange={(e) => handleSearchChange(e.target.value)}
            onBlur={() => setSearchValue("")}
            placeholder="Rechercher un contact, une société, un SIREN…"
            className="w-full rounded-md border border-border bg-secondary/40 py-1.5 pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-accent"
          />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
        <div className="flex shrink-0 overflow-hidden rounded-md border border-border">
          {VIEW_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setViewMode(opt.value)}
              className={
                opt.value === viewMode
                  ? "whitespace-nowrap bg-accent px-3 py-1.5 font-heading text-xs text-accent-foreground"
                  : "whitespace-nowrap px-3 py-1.5 font-heading text-xs text-muted-foreground hover:bg-secondary"
              }
            >
              {opt.label}
            </button>
          ))}
        </div>

        <Button size="sm" blueprint onClick={() => setAddCompanyOpen(true)} className="shrink-0 whitespace-nowrap">
          + Nouvel enrichissement
        </Button>

        <DropdownMenu
          align="end"
          trigger={
            <button
              type="button"
              title="Tâches du jour"
              aria-label="Tâches du jour"
              className="relative rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-secondary"
            >
              <Bell className="h-4 w-4" strokeWidth={1.5} />
              {dueToday.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-medium leading-none text-white">
                  {dueToday.length}
                </span>
              )}
            </button>
          }
        >
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Tâches du jour</div>
          {dueToday.length === 0 && (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">Rien de prévu aujourd'hui.</div>
          )}
          {dueToday.map((t) => (
            <div key={t.id} className="truncate px-2 py-1.5 text-sm text-foreground">
              {t.title}
            </div>
          ))}
          <DropdownMenuItem onClick={() => navigate("/tasks")}>Voir toutes les tâches →</DropdownMenuItem>
        </DropdownMenu>

        <button
          type="button"
          onClick={cycleTheme}
          title={`Thème : ${themeLabel(theme)} (cliquer pour changer)`}
          aria-label={`Thème : ${themeLabel(theme)}`}
          className="rounded-md px-2 py-1.5 text-muted-foreground hover:bg-secondary"
        >
          <ThemeIcon className="h-4 w-4" strokeWidth={1.5} />
        </button>
        {session?.user.email && (
          <DropdownMenu
            align="end"
            trigger={
              <button
                type="button"
                title={session.user.email}
                aria-label={session.user.email}
                className="flex h-[34px] w-[34px] shrink-0 items-center justify-center bg-accent/20 font-heading text-[13px] text-foreground hover:bg-accent/30"
              >
                {getInitials(session.user.email)}
              </button>
            }
          >
            <DropdownMenuItem onClick={() => setChangePasswordOpen(true)}>
              Changer le mot de passe
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>Déconnexion</DropdownMenuItem>
          </DropdownMenu>
        )}
        </div>
      </div>
      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
      <AddCompanyDialog
        open={addCompanyOpen}
        onOpenChange={setAddCompanyOpen}
        onCreated={(company) => navigate(`/companies/${company.id}`)}
      />
    </header>
  );
}
