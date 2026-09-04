import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../lib/useSession";
import { supabase } from "../lib/supabase";
import { DropdownMenu, DropdownMenuItem } from "./ui/dropdown-menu";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { useTheme } from "../hooks/useTheme";
import { themeLabel } from "../lib/theme";
import { useTasks } from "../hooks/useTasks";
import { computeTasksDueToday } from "../lib/taskStats";

const THEME_ICON = { light: "☀", dark: "☾", system: "◐" } as const;

/**
 * Barre fine au-dessus du contenu — compte/notifications uniquement.
 * La navigation de page est passée dans `Sidebar.tsx` en S28 (disposition
 * façon HubSpot/Brevo : nav à gauche, compte/notifications en haut).
 */
export function Header() {
  const { session } = useSession();
  const navigate = useNavigate();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const { theme, cycleTheme } = useTheme();
  const { tasks } = useTasks();
  const dueToday = computeTasksDueToday(tasks);

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <header className="border-b border-border bg-card">
      <div className="flex items-center justify-end gap-1 px-6 py-3">
        <DropdownMenu
          align="end"
          trigger={
            <button
              type="button"
              title="Tâches du jour"
              aria-label="Tâches du jour"
              className="relative rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-secondary"
            >
              🔔
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
      </div>
      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </header>
  );
}
