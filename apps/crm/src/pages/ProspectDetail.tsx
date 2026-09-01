import { Link, useParams } from "react-router-dom";
import { ProspectDetailContent } from "../components/ProspectDetailContent";

/**
 * Page pleine largeur — utilisée pour la navigation directe (lien
 * partagé, rechargement de page, retour arrière navigateur). Depuis
 * l'intérieur de l'app, on ouvre plutôt `ProspectDetailPanel` (panneau
 * latéral superposé, voir App.tsx) pour ne pas perdre le contexte de la
 * liste/Kanban en arrière-plan.
 */
export function ProspectDetailPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <ProspectDetailContent
        id={id}
        headerSlot={
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Retour aux prospects
          </Link>
        }
      />
    </div>
  );
}
