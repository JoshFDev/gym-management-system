import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
} from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";

import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";

import DashboardLayout from "../layouts/DashboardLayout";

import MembersPage from "../pages/MembersPage";
import PlansPage from "../pages/PlansPage";
import SubscriptionsPage from "../pages/SubscriptionsPage";
import AttendancePage from "../pages/AttendancePage";
import PaymentsPage from "../pages/PaymentsPage";

export default function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>

                <Route
                    path="/"
                    element={<Navigate to="/login" />}
                />

                <Route
                    path="/login"
                    element={<LoginPage />}
                />

                <Route
                    element={
                        <ProtectedRoute>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route
                        path="/dashboard"
                        element={<DashboardPage />}
                    />

                    <Route
                        path="/members"
                        element={<MembersPage />}
                    />

                    <Route
                        path="/plans"
                        element={<PlansPage />}
                    />

                    <Route
                        path="/subscriptions"
                        element={<SubscriptionsPage />}
                    />

                    <Route
                        path="/attendance"
                        element={<AttendancePage />}
                    />

                    <Route
                        path="/payments"
                        element={<PaymentsPage />}
                    />
                </Route>

            </Routes>
        </BrowserRouter>
    );
}