import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../lib/cn";

interface NavLink {
  to: string;
  label: string;
}

interface NavGroup {
  label: string;
  items: NavLink[];
}

type NavEntry = NavLink | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "items" in entry;
}

/**
 * Groupes repris de l'architecture de nav du mockup "Relais" (Pilotage/
 * Prospection/Marketing/Données & réglages) — notre CRM a des objets que
 * le mockup n'a pas (Entreprises/Opportunités/Tâches en plus des
 * Contacts/Pipeline) : tous rejoignent "Prospection", le groupe le plus
 * proche en esprit. Ajustable si Loïc préfère un autre découpage.
 */
const NAV_ENTRIES: NavEntry[] = [
  {
    label: "Pilotage",
    items: [{ to: "/dashboard", label: "Dashboard" }],
  },
  {
    label: "Prospection",
    items: [
      { to: "/", label: "Prospects" },
      { to: "/pipeline", label: "Pipeline" },
      { to: "/contacts", label: "Contacts" },
      { to: "/companies", label: "Entreprises" },
      { to: "/opportunities", label: "Opportunités" },
      { to: "/tasks", label: "Tâches" },
    ],
  },
  {
    label: "Marketing",
    items: [{ to: "/automations", label: "Automatisations" }],
  },
  {
    label: "Données & réglages",
    items: [
      { to: "/settings/calendar", label: "Mon calendrier" },
      { to: "/settings/custom-fields", label: "Réglages" },
    ],
  },
];

function findActiveGroup(pathname: string): NavGroup | undefined {
  return NAV_ENTRIES.find((e): e is NavGroup => isGroup(e) && e.items.some((i) => i.to === pathname));
}

function NavItem({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        "block rounded-md px-3 py-1.5 font-heading text-[15px] tracking-wide",
        active ? "bg-white/15 text-sidebar-foreground" : "text-sidebar-foreground/70 hover:bg-white/10",
      )}
    >
      {label}
    </Link>
  );
}

/**
 * Navigation latérale gauche (S28, restylée S29 façon "Relais") — panneau
 * "encre" toujours foncé, indépendamment du thème clair/sombre (comme le
 * mockup). Un groupe s'ouvre automatiquement si une de ses routes est
 * active (utile après un lien direct/retour navigateur), sans jamais se
 * refermer tout seul ensuite — l'utilisateur garde la main.
 */
export function Sidebar() {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    const active = findActiveGroup(location.pathname);
    if (active) initial.add(active.label);
    return initial;
  });

  useEffect(() => {
    const active = findActiveGroup(location.pathname);
    if (!active) return;
    setOpenGroups((prev) => (prev.has(active.label) ? prev : new Set(prev).add(active.label)));
  }, [location.pathname]);

  function toggleGroup(label: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground">
      <div className="flex items-baseline gap-2 border-b border-white/15 px-5 py-5">
        <span className="font-heading text-lg font-bold uppercase tracking-wide">DMH CRM</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-2.5">
        {NAV_ENTRIES.map((entry) => {
          if (!isGroup(entry)) return null;
          const open = openGroups.has(entry.label);
          return (
            <div key={entry.label} className="mb-3.5">
              <button
                type="button"
                onClick={() => toggleGroup(entry.label)}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground/45 hover:bg-white/10"
              >
                {entry.label}
                <span className={cn("transition-transform", open && "rotate-90")}>›</span>
              </button>
              {open && (
                <div className="mt-0.5 space-y-0.5">
                  {entry.items.map((item) => (
                    <NavItem key={item.to} to={item.to} label={item.label} active={location.pathname === item.to} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
