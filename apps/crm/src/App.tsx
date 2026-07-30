import { Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/Login";
import { ProspectsListPage } from "./pages/ProspectsList";
import { ProspectDetailPage } from "./pages/ProspectDetail";
import { ProtectedRoute } from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <ProspectsListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/prospects/:id"
        element={
          <ProtectedRoute>
            <ProspectDetailPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
