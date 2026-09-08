import { Outlet, Route, Routes, useLocation } from "react-router-dom";
import type { Location } from "react-router-dom";
import { LoginPage } from "./pages/Login";
import { ProspectsListPage } from "./pages/ProspectsList";
import { ProspectDetailPage } from "./pages/ProspectDetail";
import { PipelinePage } from "./pages/Pipeline";
import { DashboardPage } from "./pages/Dashboard";
import { ReportingPage } from "./pages/Reporting";
import { ContactsPage } from "./pages/Contacts";
import { ContactDetailPage } from "./pages/ContactDetail";
import { CompaniesPage } from "./pages/Companies";
import { CompanyDetailPage } from "./pages/CompanyDetail";
import { OpportunitiesPage } from "./pages/Opportunities";
import { OpportunityDetailPage } from "./pages/OpportunityDetail";
import { TasksPage } from "./pages/Tasks";
import { CustomFieldSettingsPage } from "./pages/CustomFieldSettings";
import { AutomationsPage } from "./pages/Automations";
import { CalendarSettingsPage } from "./pages/CalendarSettings";
import { IntegrationsPage } from "./pages/Integrations";
import { EnrichmentMappingPage } from "./pages/EnrichmentMapping";
import { CampaignsPage } from "./pages/Campaigns";
import { ListsPage } from "./pages/Lists";
import { HelpPage } from "./pages/Help";
import { PublicBookingPage } from "./pages/PublicBooking";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { CommandPalette } from "./components/CommandPalette";
import { ProspectDetailPanel } from "./components/ProspectDetailPanel";
import { useCommandPaletteState } from "./hooks/useCommandPaletteState";
import { ViewModeProvider, useViewMode } from "./lib/viewMode";

/**
 * Disposition façon HubSpot/Brevo depuis S28 : nav en barre latérale gauche
 * (Sidebar), compte/notifications dans une barre fine au-dessus du contenu
 * (Header). Rendue comme layout de route parent (`<Outlet/>`, S30) plutôt
 * qu'enveloppant chaque page individuellement : Sidebar/Header ne remontent
 * plus à chaque navigation (Header refaisait déjà `useTasks()` à chaque
 * clic) — nécessaire avant d'ajouter des comptes réels dans la Sidebar.
 */
function ProtectedLayoutContent() {
  const palette = useCommandPaletteState();
  const { viewMode } = useViewMode();

  function openSearch(query: string) {
    palette.setQuery(query);
    palette.setOpen(true);
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header onSearchInput={openSearch} />
        <CommandPalette
          open={palette.open}
          onOpenChange={palette.setOpen}
          query={palette.query}
          onQueryChange={palette.setQuery}
        />
        <main className="flex-1 overflow-y-auto">
          {viewMode === "client_portal" && (
            <div className="flex items-center gap-3 border-b border-accent/30 bg-accent/10 px-6 py-2.5 text-sm">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>
                <strong className="font-heading">Portail client.</strong> Vue en lecture seule : coordonnées
                brutes masquées, activité de la force de vente visible en temps réel.
              </span>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/**
 * Layout protégé (S28, `<Outlet/>` S30) — enveloppe le contenu dans
 * `ViewModeProvider` (S32 : bascule "Force de vente / Portail client" du
 * mockup "Relais", un vrai mode masqué dans le CRM plutôt qu'un lien vers
 * `apps/dashboard`) pour que n'importe quelle page en dessous puisse lire
 * le mode courant sans prop-drilling.
 */
function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <ViewModeProvider>
        <ProtectedLayoutContent />
      </ViewModeProvider>
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
        <Route path="/book/:token" element={<PublicBookingPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<ProspectsListPage />} />
          <Route path="/prospects/:id" element={<ProspectDetailPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/reporting" element={<ReportingPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/contacts/:id" element={<ContactDetailPage />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/companies/:id" element={<CompanyDetailPage />} />
          <Route path="/opportunities" element={<OpportunitiesPage />} />
          <Route path="/opportunities/:id" element={<OpportunityDetailPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/lists" element={<ListsPage />} />
          <Route path="/settings/custom-fields" element={<CustomFieldSettingsPage />} />
          <Route path="/automations" element={<AutomationsPage />} />
          <Route path="/settings/calendar" element={<CalendarSettingsPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/enrichment-mapping" element={<EnrichmentMappingPage />} />
          <Route path="/settings/help" element={<HelpPage />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
        </Route>
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
