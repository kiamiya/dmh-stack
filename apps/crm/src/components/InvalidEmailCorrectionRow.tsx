import { useState } from "react";
import { Button } from "./ui/button";
import { isValidEmail } from "../lib/contactForm";

export interface InvalidEmailCorrectionRowProps {
  csvLine: number;
  value: string;
  onCorrect: (value: string) => void;
}

/**
 * Ligne de l'étape récapitulatif d'import (S38-2) : un email mal formé est
 * corrigeable sur place, ou retirable (contact importé sans email). Tant
 * qu'il n'est ni corrigé ni retiré, la ligne n'est pas importée.
 */
export function InvalidEmailCorrectionRow({ csvLine, value, onCorrect }: InvalidEmailCorrectionRowProps) {
  const [draft, setDraft] = useState(value);
  const draftValid = isValidEmail(draft);

  return (
    <li className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-muted-foreground">Ligne {csvLine} : email invalide</span>
      <input
        aria-label={`Corriger l'email de la ligne ${csvLine}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && draftValid) onCorrect(draft.trim());
        }}
        className={`min-w-0 flex-1 rounded-md border px-2 py-1 text-xs ${draftValid ? "border-border" : "border-destructive"}`}
      />
      <Button type="button" size="sm" variant="outline" disabled={!draftValid} onClick={() => onCorrect(draft.trim())}>
        Corriger
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => onCorrect("")}>
        Importer sans email
      </Button>
    </li>
  );
}
