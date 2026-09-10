import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { supabase } from "../lib/supabase";
import { createDeal } from "../services/deals";
import { AddContactDialog } from "./AddContactDialog";
import { AddCompanyDialog } from "./AddCompanyDialog";
import { AddDealDialog } from "./AddDealDialog";

export interface CreateEntityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Appelé après création d'un contact (le prospect associé est déjà créé, voir AddContactDialog). */
  onContactCreated?: () => void;
}

type EntityChoice = "contact" | "company" | "opportunity" | null;

/**
 * Panneau de sélection ouvert par "+ Nouveau" (Header) — remplace l'ancien
 * bouton "+ Nouvel enrichissement" qui n'ouvrait en réalité que la création
 * d'entreprise (source de confusion relevée en revue, CR du 08/09/2026).
 * Ouvre ensuite le dialogue de création existant correspondant, sans le
 * dupliquer.
 */
export function CreateEntityDialog({ open, onOpenChange, onContactCreated }: CreateEntityDialogProps) {
  const navigate = useNavigate();
  const [choice, setChoice] = useState<EntityChoice>(null);

  function closeAll() {
    setChoice(null);
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open && choice === null} onOpenChange={(next) => !next && closeAll()}>
        <DialogHeader>
          <DialogTitle>Que veux-tu créer ?</DialogTitle>
        </DialogHeader>
        <DialogContent className="grid grid-cols-3 gap-2">
          <Button variant="outline" className="h-20 flex-col" onClick={() => setChoice("contact")}>
            Contact
          </Button>
          <Button variant="outline" className="h-20 flex-col" onClick={() => setChoice("company")}>
            Entreprise
          </Button>
          <Button variant="outline" className="h-20 flex-col" onClick={() => setChoice("opportunity")}>
            Opportunité
          </Button>
        </DialogContent>
      </Dialog>

      <AddContactDialog
        open={choice === "contact"}
        onOpenChange={(next) => !next && closeAll()}
        onCreated={() => {
          onContactCreated?.();
          closeAll();
        }}
      />
      <AddCompanyDialog
        open={choice === "company"}
        onOpenChange={(next) => !next && closeAll()}
        onCreated={(company) => {
          closeAll();
          navigate(`/companies/${company.id}`);
        }}
      />
      <AddDealDialog
        open={choice === "opportunity"}
        onOpenChange={(next) => !next && closeAll()}
        onCreated={async (input) => {
          const deal = await createDeal(supabase, input);
          closeAll();
          navigate(`/opportunities/${deal.id}`);
        }}
      />
    </>
  );
}
