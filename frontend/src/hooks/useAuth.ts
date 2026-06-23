export type UserRole = "admin" | "receptionist" | "trainer";

export interface AuthUser {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    phone?: string;
    isActive: boolean;
}

export const getStoredUser = (): AuthUser | null => {
    try {
        const raw = localStorage.getItem("user");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const getStoredToken = (): string | null =>
    localStorage.getItem("token");

export const clearAuth = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
};

export const useAuth = () => {
    const user = getStoredUser();
    const token = getStoredToken();
    const role = user?.role ?? null;

    const isAdmin        = role === "admin";
    const isReceptionist = role === "receptionist";
    const isTrainer      = role === "trainer";

    const can = (roles: UserRole[]) => role ? roles.includes(role) : false;

    return { user, token, role, isAdmin, isReceptionist, isTrainer, can };
};