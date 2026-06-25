import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import DashboardLayout from "../layouts/DashboardLayout";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import MembersPage from "../pages/MembersPage";
import PlansPage from "../pages/PlansPage";
import SubscriptionsPage from "../pages/SubscriptionsPage";
import AttendancePage from "../pages/AttendancePage";
import PaymentsPage from "../pages/PaymentsPage";
import UsersPage from "../pages/UsersPage";
import ProfilePage from "../pages/ProfilePage";
import UnauthorizedPage from "../pages/UnauthorizedPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import AuditLogPage from "../pages/AuditLogPage";

export default function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/login" />} />

                {/* ── Rutas públicas ── */}
                <Route path="/login"              element={<LoginPage />} />
                <Route path="/forgot-password"    element={<ForgotPasswordPage />} />
                <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
                <Route path="/unauthorized"       element={<UnauthorizedPage />} />

                {/* ── Rutas protegidas ── */}
                <Route element={
                    <ProtectedRoute>
                        <DashboardLayout />
                    </ProtectedRoute>
                }>
                    <Route path="/dashboard" element={
                        <ProtectedRoute allowedRoles={["admin", "receptionist"]}>
                            <DashboardPage />
                        </ProtectedRoute>
                    } />

                    <Route path="/members" element={
                        <ProtectedRoute allowedRoles={["admin", "receptionist", "trainer"]}>
                            <MembersPage />
                        </ProtectedRoute>
                    } />

                    <Route path="/plans" element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                            <PlansPage />
                        </ProtectedRoute>
                    } />

                    <Route path="/subscriptions" element={
                        <ProtectedRoute allowedRoles={["admin", "receptionist"]}>
                            <SubscriptionsPage />
                        </ProtectedRoute>
                    } />

                    <Route path="/payments" element={
                        <ProtectedRoute allowedRoles={["admin", "receptionist"]}>
                            <PaymentsPage />
                        </ProtectedRoute>
                    } />

                    <Route path="/attendance" element={
                        <ProtectedRoute allowedRoles={["admin", "receptionist", "trainer"]}>
                            <AttendancePage />
                        </ProtectedRoute>
                    } />

                    <Route path="/users" element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                            <UsersPage />
                        </ProtectedRoute>
                    } />

                    <Route path="/audit-log" element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                            <AuditLogPage />
                        </ProtectedRoute>
                    } />

                    {/* ── Perfil: accesible por todos los roles ── */}
                    <Route path="/profile" element={
                        <ProtectedRoute allowedRoles={["admin", "receptionist", "trainer"]}>
                            <ProfilePage />
                        </ProtectedRoute>
                    } />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}