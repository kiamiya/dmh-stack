import type { ReactNode } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import type { Location } from "react-router-dom";
import { LoginPage } from "./pages/Login";
import { ProspectsListPage } from "./pages/ProspectsList";
import { ProspectDetailPage } from "./pages/ProspectDetail";
import { PipelinePage } from "./pages/Pipeline";
import { DashboardPage } from "./pages/Dashboard";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Header } from "./components/Header";
import { CommandPalette } from "./components/CommandPalette";
import { ProspectDetailPanel } from "./components/ProspectDetailPanel";

function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <Header />
      <CommandPalette />
      {children}
    </ProtectedRoute>
  );
}

/**
 * `location.state.backgroundLocation` (posé par les liens internes vers
 * une fiche prospect, voir `openProspectLinkState` dans lib/navigation.ts)
 * fait rendre les routes normales sur l'URL d'ARRIÈRE-PLAN (la liste/le
 * Kanban restent affichés) pendant qu'une seconde passe de `<Routes>`
 * superpose `/prospects/:id` en panneau latéral par-dessus — pattern
 * standard React Router pour les "routes modales". Un lien direct/
 * rechargement de page (pas de state, `backgroundLocation` absent) retombe
 * simplement sur la page pleine largeur, sans rien de spécial à gérer.
 */
export default function App() {
  const location = useLocation();
  const backgroundLocation = (location.state as { backgroundLocation?: Location } | null)?.backgroundLocation;

  return (
    <>
      <Routes location={backgroundLocation ?? location}>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedLayout>
              <ProspectsListPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/prospects/:id"
          element={
            <ProtectedLayout>
              <ProspectDetailPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/pipeline"
          element={
            <ProtectedLayout>
              <PipelinePage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedLayout>
              <DashboardPage />
            </ProtectedLayout>
          }
        />
      </Routes>
      {backgroundLocation && (
        <Routes>
          <Route
            path="/prospects/:id"
            element={
              <ProtectedRoute>
                <ProspectDetailPanel />
              </ProtectedRoute>
            }
          />
        </Routes>
      )}
    </>
  );
}
