import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { DMH_STAFF_EMAIL_DOMAIN, validateStaffSignup } from "@dmh/config";
import { supabase } from "../lib/supabase";
import { requestStaffSignup } from "../services/auth";
import type { StaffSignupResult } from "../services/auth";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

/**
 * Création de compte DMH (S41-2) — réservée aux adresses @dmhassocies.com
 * (vérifié aussi côté serveur, Edge Function `staff-signup`). Un e-mail
 * d'invitation est envoyé ; l'accès n'est ouvert qu'au clic sur son lien, où
 * le collègue choisit son mot de passe. Les comptes clients ne se créent pas
 * ici : DMH les crée.
 */
export function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StaffSignupResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationError = validateStaffSignup({ name, email });
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResult(await requestStaffSignup(supabase, { name, email }, window.location.origin));
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
          <CardTitle>Créer un compte DMH</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {result === "invited" ? (
            <p className="text-sm text-muted-foreground">
              Un e-mail d'invitation vient d'être envoyé à <strong className="text-foreground">{email.trim()}</strong>. Clique
              sur son lien pour choisir ton mot de passe et accéder au CRM. Pense à vérifier les courriers indésirables.
            </p>
          ) : result === "already_registered" ? (
            <p className="text-sm text-muted-foreground">
              Un compte existe déjà pour <strong className="text-foreground">{email.trim()}</strong>. Connecte-toi, ou utilise
              « Mot de passe oublié » si tu ne connais pas ton mot de passe.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Réservé à l'équipe DMH : adresse <strong className="text-foreground">@{DMH_STAFF_EMAIL_DOMAIN}</strong>{" "}
                uniquement. Tu recevras un e-mail pour choisir ton mot de passe.
              </p>
              <input
                required
                autoFocus
                autoComplete="name"
                placeholder="Prénom et nom"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                type="email"
                required
                autoComplete="email"
                placeholder={`prenom.nom@${DMH_STAFF_EMAIL_DOMAIN}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={loading}>
                {loading ? "Envoi..." : "Recevoir mon invitation"}
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
