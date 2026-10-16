import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { isPlausibleEmail, requestPasswordReset } from "../services/auth";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

/**
 * « Mot de passe oublié » : envoie le lien de réinitialisation Supabase. Le
 * message affiché est le même qu'un compte existe ou non pour cette adresse
 * (on ne révèle pas qui a un compte).
 */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isPlausibleEmail(email)) {
      setError("Adresse e-mail invalide.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await requestPasswordReset(supabase, email, window.location.origin);
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Mot de passe oublié</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sent ? (
            <p className="text-sm text-muted-foreground">
              Si un compte existe pour <strong className="text-foreground">{email.trim()}</strong>, un e-mail vient d'être
              envoyé avec un lien pour choisir un nouveau mot de passe. Pense à vérifier les courriers indésirables.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Indique l'adresse e-mail de ton compte : tu recevras un lien pour choisir un nouveau mot de passe.
              </p>
              <input
                type="email"
                required
                autoFocus
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={loading}>
                {loading ? "Envoi..." : "Envoyer le lien"}
              </Button>
            </form>
          )}
          <Link to="/login" className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
            Retour à la connexion
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
