import type { ReactNode } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import type { Location } from "react-router-dom";
import { LoginPage } from "./pages/Login";
import { ProspectsListPage } from "./pages/ProspectsList";
import { ProspectDetailPage } from "./pages/ProspectDetail";
import { PipelinePage } from "./pages/Pipeline";
import { DashboardPage } from "./pages/Dashboard";
import { ContactsPage } from "./pages/Contacts";
import { ContactDetailPage } from "./pages/ContactDetail";
import { CompaniesPage } from "./pages/Companies";
import { CompanyDetailPage } from "./pages/CompanyDetail";
import { OpportunitiesPage } from "./pages/Opportunities";
import { TasksPage } from "./pages/Tasks";
import { CustomFieldSettingsPage } from "./pages/CustomFieldSettings";
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
        <Route
          path="/contacts"
          element={
            <ProtectedLayout>
              <ContactsPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/contacts/:id"
          element={
            <ProtectedLayout>
              <ContactDetailPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/companies"
          element={
            <ProtectedLayout>
              <CompaniesPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/companies/:id"
          element={
            <ProtectedLayout>
              <CompanyDetailPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/opportunities"
          element={
            <ProtectedLayout>
              <OpportunitiesPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedLayout>
              <TasksPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/settings/custom-fields"
          element={
            <ProtectedLayout>
              <CustomFieldSettingsPage />
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
