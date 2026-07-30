import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSession } from "../lib/useSession";

/**
 * Vérifie uniquement qu'une session Supabase Auth existe — la vraie
 * sécurité (un client ne voit que ses propres données) vient des policies
 * RLS (voir supabase/migrations/007_add_client_users.sql), pas de ce
 * composant. Un utilisateur connecté mais absent de `client_users` ne
 * verrait simplement aucune donnée, RLS oblige.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();

  if (loading) {
    return <div className="p-8 text-sm text-slate-500">Chargement…</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
