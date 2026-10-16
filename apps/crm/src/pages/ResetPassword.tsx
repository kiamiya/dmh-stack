import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSession } from "../lib/useSession";
import { changePassword, validateNewPassword } from "../services/auth";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

/**
 * Page d'arrivée du lien « Mot de passe oublié ». Le client Supabase lit le
 * jeton du lien à son initialisation et ouvre une session de récupération :
 * il ne reste qu'à choisir le nouveau mot de passe. Sans session (lien
 * expiré, déjà utilisé, ou page ouverte directement), on propose d'en
 * redemander un.
 */
export function ResetPasswordPage() {
  const { session, loading } = useSession();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationError = validateNewPassword(password, confirmation);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await changePassword(supabase, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Nouveau mot de passe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : !session ? (
            <>
              <p className="text-sm text-muted-foreground">
                Ce lien n'est plus valable (expiré ou déjà utilisé). Demande un nouveau lien pour réinitialiser ton mot de
                passe.
              </p>
              <Link to="/forgot-password" className="block text-center text-sm underline-offset-4 hover:underline">
                Demander un nouveau lien
              </Link>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Compte : <strong className="text-foreground">{session.user.email}</strong>
              </p>
              <input
                type="password"
                required
                autoFocus
                autoComplete="new-password"
                placeholder="Nouveau mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                type="password"
                required
                autoComplete="new-password"
                placeholder="Confirmer le mot de passe"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={submitting}>
                {submitting ? "Enregistrement..." : "Enregistrer et se connecter"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
