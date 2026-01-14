import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { LoginPage } from "../../features/auth/pages/LoginPage";
import { DashboardPage } from "../../features/dashboard/pages/DashboardPage";
import { UsersListPage } from "../../features/admin/pages/UsersListPage";
import { UserEditPage } from "../../features/admin/pages/UserEditPage";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allow={["USER"]}>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allow={["ADMIN"]}>
            <UsersListPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/users/:id"
        element={
          <ProtectedRoute allow={["ADMIN"]}>
            <UserEditPage />
          </ProtectedRoute>
        }
      />

      {/* default */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
