import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useProspects } from "../hooks/useProspects";
import { filterPaletteProspects } from "../lib/commandPalette";
import { ALL_PROSPECT_STATUSES, getStatusLabel } from "../lib/status";
import { updateProspectStatus } from "../services/prospects";
import { useToast } from "./ui/toast";
import type { ProspectListRow } from "../services/prospects";

const ITEM_CLASS =
  "flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm text-foreground data-[selected=true]:bg-secondary";

/**
 * Palette de commandes (cmd+K / ctrl+K) : recherche instantanée de
 * prospects (même logique que le filtre du tableau) + navigation rapide.
 * Sélectionner un prospect ouvre une seconde page listant des actions
 * rapides pour lui (changer de statut, voir la fiche).
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeProspect, setActiveProspect] = useState<ProspectListRow | null>(null);
  const { prospects, reload } = useProspects();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function close() {
    setOpen(false);
    setQuery("");
    setActiveProspect(null);
  }

  function goTo(path: string) {
    navigate(path);
    close();
  }

  async function handleStatusChange(status: (typeof ALL_PROSPECT_STATUSES)[number]) {
    if (!activeProspect) return;
    try {
      await updateProspectStatus(supabase, activeProspect.id, status);
      toast(`Statut mis à jour : ${getStatusLabel(status)}`, "success");
      reload();
    } catch (err) {
      toast(`Échec : ${(err as Error).message}`, "destructive");
    }
    close();
  }

  const matches = filterPaletteProspects(prospects, query);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : close())}
      label="Palette de commandes"
      overlayClassName="fixed inset-0 z-50 bg-foreground/40"
      contentClassName="fixed left-1/2 top-24 z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-lg"
      shouldFilter={false}
    >
      {!activeProspect && (
        <>
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Rechercher un prospect, une page…"
            className="w-full border-b border-border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
              Aucun résultat.
            </Command.Empty>
            <Command.Group heading="Navigation" className="mb-1 px-2 text-xs font-medium text-muted-foreground">
              <Command.Item className={ITEM_CLASS} onSelect={() => goTo("/")}>Prospects</Command.Item>
              <Command.Item className={ITEM_CLASS} onSelect={() => goTo("/pipeline")}>Pipeline</Command.Item>
              <Command.Item className={ITEM_CLASS} onSelect={() => goTo("/dashboard")}>Dashboard</Command.Item>
            </Command.Group>
            {matches.length > 0 && (
              <Command.Group heading="Prospects" className="mt-2 px-2 text-xs font-medium text-muted-foreground">
                {matches.map((p) => (
                  <Command.Item key={p.id} className={ITEM_CLASS} onSelect={() => setActiveProspect(p)}>
                    <span className="truncate">{p.companies?.name ?? "—"}</span>
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                      {p.contacts ? `${p.contacts.first_name} ${p.contacts.last_name}` : ""}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </>
      )}

      {activeProspect && (
        <>
          <div className="flex items-center justify-between border-b border-border px-4 py-3 text-sm">
            <span className="font-medium text-foreground">{activeProspect.companies?.name}</span>
            <button
              type="button"
              onClick={() => setActiveProspect(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ← retour
            </button>
          </div>
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Group heading="Actions" className="mb-1 px-2 text-xs font-medium text-muted-foreground">
              <Command.Item className={ITEM_CLASS} onSelect={() => goTo(`/prospects/${activeProspect.id}`)}>
                Voir la fiche
              </Command.Item>
            </Command.Group>
            <Command.Group heading="Changer le statut" className="mt-2 px-2 text-xs font-medium text-muted-foreground">
              {ALL_PROSPECT_STATUSES.map((status) => (
                <Command.Item key={status} className={ITEM_CLASS} onSelect={() => handleStatusChange(status)}>
                  {getStatusLabel(status)}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </>
      )}
    </Command.Dialog>
  );
}
