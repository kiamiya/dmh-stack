import type { ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/Login";
import { OverviewPage } from "./pages/Overview";
import { PipelinePage } from "./pages/Pipeline";
import { InteractionsPage } from "./pages/Interactions";
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
            <OverviewPage />
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
        path="/interactions"
        element={
          <ProtectedLayout>
            <InteractionsPage />
          </ProtectedLayout>
        }
      />
    </Routes>
  );
}
