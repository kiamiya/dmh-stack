/** Barre + % réutilisable (Confiance/Complétude/Enrichis) — extraite de `ProspectsList.tsx` pour être aussi utilisée sur Segments (correction Claude Design). */
export function CompletenessBar({ percent }: { percent: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1 w-11 rounded bg-muted">
        <div className="h-full rounded bg-accent" style={{ width: `${percent}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{percent}%</span>
    </div>
  );
}
