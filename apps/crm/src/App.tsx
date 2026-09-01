import type { ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/Login";
import { ProspectsListPage } from "./pages/ProspectsList";
import { ProspectDetailPage } from "./pages/ProspectDetail";
import { PipelinePage } from "./pages/Pipeline";
import { DashboardPage } from "./pages/Dashboard";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Header } from "./components/Header";

function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <Header />
      {children}
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
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
  );
}
