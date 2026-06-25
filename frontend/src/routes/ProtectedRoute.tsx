import { Navigate } from "react-router-dom";
import { getStoredToken, getStoredUser } from "../hooks/useAuth";
import type { UserRole } from "../hooks/useAuth";

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const token = getStoredToken();
    const user  = getStoredUser();

    if (!token || !user) return <Navigate to="/login" />;

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/unauthorized" />;
    }

    return <>{children}</>;
}