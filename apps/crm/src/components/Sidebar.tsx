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

const NAV_ENTRIES: NavEntry[] = [
  { to: "/dashboard", label: "Dashboard" },
  {
    label: "Prospection",
    items: [
      { to: "/", label: "Prospects" },
      { to: "/pipeline", label: "Pipeline" },
    ],
  },
  {
    label: "CRM",
    items: [
      { to: "/contacts", label: "Contacts" },
      { to: "/companies", label: "Entreprises" },
      { to: "/opportunities", label: "Opportunités" },
      { to: "/tasks", label: "Tâches" },
    ],
  },
  { to: "/automations", label: "Automatisations" },
  { to: "/settings/calendar", label: "Mon calendrier" },
  { to: "/settings/custom-fields", label: "Réglages" },
];

function findActiveGroup(pathname: string): NavGroup | undefined {
  return NAV_ENTRIES.find((e): e is NavGroup => isGroup(e) && e.items.some((i) => i.to === pathname));
}

function NavItem({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        "block rounded-md px-3 py-1.5 text-sm font-medium",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary",
      )}
    >
      {label}
    </Link>
  );
}

/**
 * Navigation latérale gauche façon HubSpot/Brevo (S28) — remplace
 * l'ancienne barre horizontale à plat. Un groupe s'ouvre automatiquement
 * si une de ses routes est active (utile après un lien direct/retour
 * navigateur), sans jamais se refermer tout seul ensuite — l'utilisateur
 * garde la main.
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
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <span className="text-sm font-semibold text-foreground">DMH CRM</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {NAV_ENTRIES.map((entry) => {
          if (!isGroup(entry)) {
            return <NavItem key={entry.to} to={entry.to} label={entry.label} active={location.pathname === entry.to} />;
          }
          const open = openGroups.has(entry.label);
          return (
            <div key={entry.label}>
              <button
                type="button"
                onClick={() => toggleGroup(entry.label)}
                className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-secondary"
              >
                {entry.label}
                <span className={cn("transition-transform", open && "rotate-90")}>›</span>
              </button>
              {open && (
                <div className="ml-2 space-y-1 border-l border-border pl-2">
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
