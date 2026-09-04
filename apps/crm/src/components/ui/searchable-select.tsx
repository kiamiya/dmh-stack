import { useEffect, useRef, useState } from "react";
import { Command } from "cmdk";
import { cn } from "../../lib/cn";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

export interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Remplacement 1:1 d'un `<select>` natif pour les listes qui grandissent
 * avec le volume de données (contacts/entreprises/opportunités/listes) —
 * sur `cmdk`, déjà une dépendance (utilisée jusqu'ici uniquement par
 * `CommandPalette.tsx`), pas de nouvelle lib. Fermeture au clic extérieur,
 * même pattern que `DropdownMenu`.
 */
export function SearchableSelect({ value, onChange, options, placeholder = "Sélectionner…", disabled, className }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded-md border border-border px-3 py-2 text-left text-sm disabled:opacity-60"
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>{selected?.label ?? placeholder}</span>
      </button>
      {open && (
        <Command className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card text-card-foreground shadow-md" shouldFilter>
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="Rechercher…"
            className="w-full border-b border-border bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Command.List className="max-h-60 overflow-y-auto p-1">
            <Command.Empty className="px-3 py-4 text-center text-sm text-muted-foreground">Aucun résultat.</Command.Empty>
            {options.map((opt) => (
              <Command.Item
                key={opt.value}
                value={opt.label}
                onSelect={() => {
                  onChange(opt.value);
                  setOpen(false);
                  setQuery("");
                }}
                className="cursor-pointer rounded-md px-3 py-1.5 text-sm text-foreground data-[selected=true]:bg-secondary"
              >
                {opt.label}
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      )}
    </div>
  );
}
