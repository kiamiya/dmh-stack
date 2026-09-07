import { useEffect, useState } from "react";

/**
 * État partagé de la palette de commandes (S30) — levé au niveau du
 * layout protégé pour être piloté à la fois par le raccourci Cmd+K/Ctrl+K
 * et par le champ de recherche visible du Header (le mockup en a un,
 * jusqu'ici seul le raccourci existait).
 */
export function useCommandPaletteState() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

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

  return { open, setOpen, query, setQuery };
}
