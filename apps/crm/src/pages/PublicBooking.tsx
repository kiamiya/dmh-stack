import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { calendarOAuthConfig } from "../lib/supabase";
import { groupSlotsByDay } from "../lib/groupSlotsByDay";
import type { Slot } from "../lib/groupSlotsByDay";
import { Button } from "../components/ui/button";

type Status = "loading" | "ready" | "error" | "submitting" | "booked";

/**
 * Page publique NON authentifiée — un prospect y arrive via un lien
 * partagé par un membre staff (`/settings/calendar`), sans compte
 * Supabase. Parle directement aux Edge Functions calendar-freebusy/
 * calendar-book-meeting en HTTP brut (pas le client Supabase, qui
 * exigerait une session).
 */
export function PublicBookingPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get("client");
  const contactId = searchParams.get("contact");
  const companyId = searchParams.get("company");
  const dealId = searchParams.get("deal");

  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [staffName, setStaffName] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`${calendarOAuthConfig.functionsBaseUrl}/calendar-freebusy?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erreur inconnue");
        setStaffName(data.staffName);
        setSlots(data.slots);
        setStatus("ready");
      })
      .catch((err) => {
        setError(err.message);
        setStatus("error");
      });
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedSlot || !token || !clientId) return;

    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch(`${calendarOAuthConfig.functionsBaseUrl}/calendar-book-meeting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          clientId,
          slotStart: selectedSlot.start,
          slotEnd: selectedSlot.end,
          guestName,
          guestEmail,
          contactId,
          companyId,
          dealId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur inconnue");
      setStatus("booked");
    } catch (err) {
      setError((err as Error).message);
      setStatus("ready");
    }
  }

  if (!clientId) {
    return <div className="mx-auto max-w-md p-8 text-sm text-destructive">Lien invalide : client manquant.</div>;
  }

  if (status === "loading") {
    return <div className="mx-auto max-w-md p-8 text-sm text-muted-foreground">Chargement des disponibilités…</div>;
  }

  if (status === "error") {
    return <div className="mx-auto max-w-md p-8 text-sm text-destructive">{error}</div>;
  }

  if (status === "booked") {
    return (
      <div className="mx-auto max-w-md space-y-2 p-8 text-center">
        <h1 className="text-lg font-semibold text-foreground">Rendez-vous confirmé ✅</h1>
        <p className="text-sm text-muted-foreground">
          Un événement a été ajouté au calendrier de {staffName} et une invitation t'a été envoyée par email.
        </p>
      </div>
    );
  }

  const dayGroups = groupSlotsByDay(slots);

  return (
    <div className="mx-auto max-w-lg space-y-4 p-6">
      <h1 className="text-lg font-semibold text-foreground">Prendre rendez-vous avec {staffName}</h1>

      {!selectedSlot && (
        <div className="space-y-4">
          {dayGroups.length === 0 && <p className="text-sm text-muted-foreground">Aucun créneau disponible actuellement.</p>}
          {dayGroups.map((group) => (
            <div key={group.dateLabel}>
              <div className="mb-1.5 text-sm font-medium capitalize text-foreground">{group.dateLabel}</div>
              <div className="flex flex-wrap gap-2">
                {group.slots.map((slot) => (
                  <button
                    key={slot.start}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className="rounded-md border border-border px-3 py-1.5 text-sm hover:border-accent hover:text-accent"
                  >
                    {new Date(slot.start).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedSlot && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-border p-4">
          <p className="text-sm text-foreground">
            Créneau choisi :{" "}
            <strong>
              {new Date(selectedSlot.start).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" })}
            </strong>{" "}
            <button type="button" onClick={() => setSelectedSlot(null)} className="text-accent hover:underline">
              (changer)
            </button>
          </p>
          <input
            required
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Ton nom"
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          />
          <input
            required
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            placeholder="Ton email"
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={status === "submitting"}>
            {status === "submitting" ? "…" : "Confirmer le rendez-vous"}
          </Button>
        </form>
      )}
    </div>
  );
}
