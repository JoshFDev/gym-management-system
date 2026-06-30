import ErrorBoundary from "../components/ErrorBoundary";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import DashboardLayout from "../layouts/DashboardLayout";
import MemberLayout from "../layouts/MemberLayout";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import MembersPage from "../pages/MembersPage";
import MemberProfilePage from "../pages/MemberProfilePage";
import PlansPage from "../pages/PlansPage";
import ClassesPage from "../pages/ClassesPage";
import SubscriptionsPage from "../pages/SubscriptionsPage";
import AttendancePage from "../pages/AttendancePage";
import PaymentsPage from "../pages/PaymentsPage";
import StorePage from "../pages/StorePage";
import UsersPage from "../pages/UsersPage";
import ProfilePage from "../pages/ProfilePage";
import UnauthorizedPage from "../pages/UnauthorizedPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import AuditLogPage from "../pages/AuditLogPage";
import NotFoundPage from "../pages/NotFoundPage";
import MemberCatalogPage from "../pages/member/MemberCatalogPage";

export default function AppRouter() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Navigate to="/login" />} />

                    {/* ── Rutas públicas ── */}
                    <Route path="/login"              element={<LoginPage />} />
                    <Route path="/forgot-password"    element={<ForgotPasswordPage />} />
                    <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
                    <Route path="/unauthorized"       element={<UnauthorizedPage />} />

                    {/* ── Catálogo público (sin autenticación) ── */}
                    <Route element={<MemberLayout />}>
                        <Route path="/miembro/catalogo" element={<MemberCatalogPage />} />
                    </Route>

                    {/* ── Rutas protegidas (admin/recep/trainer) ── */}
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
                        <Route path="/members/:id" element={
                            <ProtectedRoute allowedRoles={["admin", "receptionist", "trainer"]}>
                                <MemberProfilePage />
                            </ProtectedRoute>
                        } />

                        <Route path="/plans" element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                                <PlansPage />
                            </ProtectedRoute>
                        } />

                        <Route path="/classes" element={
                            <ProtectedRoute allowedRoles={["admin", "receptionist", "trainer"]}>
                                <ClassesPage />
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

                        <Route path="/store" element={
                            <ProtectedRoute allowedRoles={["admin", "receptionist"]}>
                                <StorePage />
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

                    {/* ── 404 ── */}
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </BrowserRouter>
        </ErrorBoundary>
    );
}
