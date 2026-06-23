import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import DashboardLayout from "../layouts/DashboardLayout";
import LoginPage        from "../pages/LoginPage";
import DashboardPage    from "../pages/DashboardPage";
import MembersPage      from "../pages/MembersPage";
import PlansPage        from "../pages/PlansPage";
import SubscriptionsPage from "../pages/SubscriptionsPage";
import AttendancePage   from "../pages/AttendancePage";
import PaymentsPage     from "../pages/PaymentsPage";
import UsersPage from "../pages/UsersPage";
import UnauthorizedPage from "../pages/UnauthorizedPage";



export default function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/login" />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />

                <Route element={
                    <ProtectedRoute>
                        <DashboardLayout />
                    </ProtectedRoute>
                }>
                    {/* Admin + Receptionist + Trainer */}
                    <Route path="/dashboard" element={
                        <ProtectedRoute allowedRoles={["admin", "receptionist"]}>
                            <DashboardPage />
                        </ProtectedRoute>
                    } />

                    {/* Admin + Receptionist + Trainer */}
                    <Route path="/members" element={
                        <ProtectedRoute allowedRoles={["admin", "receptionist", "trainer"]}>
                            <MembersPage />
                        </ProtectedRoute>
                    } />

                    {/* Solo Admin */}
                    <Route path="/plans" element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                            <PlansPage />
                        </ProtectedRoute>
                    } />

                    {/* Admin + Receptionist */}
                    <Route path="/subscriptions" element={
                        <ProtectedRoute allowedRoles={["admin", "receptionist"]}>
                            <SubscriptionsPage />
                        </ProtectedRoute>
                    } />

                    {/* Admin + Receptionist */}
                    <Route path="/payments" element={
                        <ProtectedRoute allowedRoles={["admin", "receptionist"]}>
                            <PaymentsPage />
                        </ProtectedRoute>
                    } />

                    {/* Todos */}
                    <Route path="/attendance" element={
                        <ProtectedRoute allowedRoles={["admin", "receptionist", "trainer"]}>
                            <AttendancePage />
                        </ProtectedRoute>
                    } />

                    {/* Solo Admin */}
                    <Route path="/users" element={
                        <ProtectedRoute allowedRoles={["admin"]}>
                            <UsersPage />
                        </ProtectedRoute>
                    } />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}