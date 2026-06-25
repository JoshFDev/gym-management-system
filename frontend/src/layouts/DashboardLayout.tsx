import { useEffect } from "react";
import { clearAuth, getStoredToken, useAuth } from "../hooks/useAuth";
import type { UserRole } from "../hooks/useAuth";
import {
    NavLink,
    Outlet,
    useNavigate,
} from "react-router-dom";
import { connectSocket, disconnectSocket } from "../services/socket";



interface NavItem {
    to: string;
    icon: string;
    label: string;
    roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
    { to: "/dashboard",    icon: "ti-layout-dashboard", label: "Dashboard",     roles: ["admin", "receptionist"] },
    { to: "/members",      icon: "ti-users",            label: "Miembros",      roles: ["admin", "receptionist", "trainer"] },
    { to: "/plans",        icon: "ti-clipboard-list",   label: "Planes",        roles: ["admin"] },
    { to: "/subscriptions",icon: "ti-id-badge",         label: "Suscripciones", roles: ["admin", "receptionist"] },
    { to: "/payments",     icon: "ti-credit-card",      label: "Pagos",         roles: ["admin", "receptionist"] },
    { to: "/attendance",   icon: "ti-scan",             label: "Asistencia",    roles: ["admin", "receptionist", "trainer"] },
    { to: "/users",        icon: "ti-shield-lock",      label: "Usuarios",      roles: ["admin"] },
    { to: "/audit-log",    icon: "ti-history",          label: "Auditoría",     roles: ["admin"] },
];

const ROLE_LABEL: Record<UserRole, string> = {
    admin:        "Administrador",
    receptionist: "Recepcionista",
    trainer:      "Entrenador",
};

export default function DashboardLayout() {
    const navigate = useNavigate();
    const { user, role } = useAuth();

    useEffect(() => {
        const token = getStoredToken();
        if (token) connectSocket(token);
        return () => disconnectSocket();
    }, []);

    const visibleItems = NAV_ITEMS.filter(
        (item) => role && item.roles.includes(role)
    );

    const handleLogout = () => {
        disconnectSocket();
        clearAuth();
        navigate("/login");
    };

    return (
        <div style={s.wrap}>
            <aside style={s.sidebar}>
                {/* Logo */}
                <div style={s.logo}>
                    <p style={s.logoName}>Gym Manager</p>
                    <p style={s.logoTag}>Panel de administración</p>
                </div>

                {/* Nav filtrado por rol */}
                <nav style={s.nav}>
                    {visibleItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            style={({ isActive }) => ({
                                ...s.navItem,
                                ...(isActive ? s.navItemActive : {}),
                            })}
                        >
                            <i className={`ti ${item.icon}`} style={s.navIcon} aria-hidden />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                {/* Usuario actual */}
                <div style={s.sidebarFooter}>
                    {user && (
                        <div style={s.userInfo}>
                            <div style={s.userAvatar}>
                                {user.firstName[0]}{user.lastName[0]}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={s.userName}>{user.firstName} {user.lastName}</p>
                                <p style={s.userRole}>{role ? ROLE_LABEL[role] : ""}</p>
                            </div>
                        </div>
                    )}
                    <button style={s.logoutBtn} onClick={handleLogout}>
                        <i className="ti ti-logout" style={{ fontSize: 15 }} aria-hidden />
                        Cerrar sesión
                    </button>
                </div>
            </aside>

            <main style={s.main}>
                <Outlet />
            </main>
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    wrap:         { display: "flex", minHeight: "100svh", background: "#F7F7F6" },
    sidebar:      { width: 210, minWidth: 210, background: "#fff", borderRight: "1px solid #E5E4E2", display: "flex", flexDirection: "column" },
    logo:         { padding: "22px 20px 18px", borderBottom: "1px solid #E5E4E2" },
    logoName:     { fontSize: 15, fontWeight: 600, color: "#1a1a1a", letterSpacing: -0.3, margin: 0 },
    logoTag:      { fontSize: 11, color: "#bbb", marginTop: 3, margin: 0 },
    nav:          { padding: "12px 0", flex: 1 },
    navItem:      { display: "flex", alignItems: "center", gap: 9, padding: "8px 20px", fontSize: 13, color: "#888", textDecoration: "none", fontWeight: 400 },
    navItemActive:{ background: "#F7F7F6", color: "#1a1a1a", fontWeight: 500 },
    navIcon:      { fontSize: 15 },
    sidebarFooter:{ padding: "14px 20px", borderTop: "1px solid #E5E4E2", display: "flex", flexDirection: "column", gap: 12 },
    userInfo:     { display: "flex", alignItems: "center", gap: 10 },
    userAvatar:   { width: 30, height: 30, borderRadius: "50%", background: "#F0F0EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#666", flexShrink: 0, textTransform: "uppercase" },
    userName:     { fontSize: 12, fontWeight: 500, color: "#1a1a1a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    userRole:     { fontSize: 11, color: "#bbb", margin: 0 },
    logoutBtn:    { display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: "#bbb", fontSize: 13, cursor: "pointer", padding: 0, fontFamily: "inherit" },
    main:         { flex: 1, minWidth: 0, overflowY: "auto" },
};