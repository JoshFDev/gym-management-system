import { useEffect, useState } from "react";
import { clearAuth, getStoredToken, useAuth } from "../hooks/useAuth";
import type { UserRole } from "../hooks/useAuth";
import {
    NavLink,
    Outlet,
    useNavigate,
} from "react-router-dom";
import { connectSocket, disconnectSocket, onNotification } from "../services/socket";
import FloatingQrScanner from "../components/FloatingQrScanner";



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
    { to: "/classes",      icon: "ti-calendar",         label: "Clases",        roles: ["admin", "receptionist", "trainer"] },
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
    const [logoutConfirm, setLogoutConfirm] = useState(false);
    const [showAbout, setShowAbout] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const token = getStoredToken();
        if (token) connectSocket(token);
        return () => disconnectSocket();
    }, []);

    useEffect(() => {
        const unsub = onNotification((data) => {
            if (data.type === "attendance_created") {
                try {
                    const ctx = new AudioContext();
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.frequency.value = 880;
                    gain.gain.setValueAtTime(0.12, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.15);
                } catch { }
            }
        });
        return unsub;
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
            {/* Overlay for mobile sidebar */}
            <div className="sidebar-backdrop" style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 899,
                opacity: sidebarOpen ? 1 : 0, pointerEvents: sidebarOpen ? "all" : "none",
                transition: "opacity 0.2s ease",
            } as React.CSSProperties} onClick={() => setSidebarOpen(false)} aria-hidden />

            <aside className="sidebar" style={s.sidebar} data-open={sidebarOpen}>
                <div style={{ ...s.logo, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                        <p style={s.logoName}>Gym Manager</p>
                        <p style={s.logoTag}>Panel de administración</p>
                    </div>
                    <button className="sidebar-close" style={{ background: "none", border: "none", cursor: "pointer", color: "#bbb", padding: 4, display: "flex", alignItems: "center", justifyContent: "center" } as React.CSSProperties}
                        onClick={() => setSidebarOpen(false)}>
                        <i className="ti ti-x" style={{ fontSize: 16 }} aria-hidden />
                    </button>
                </div>

                <nav style={s.nav}>
                    {visibleItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setSidebarOpen(false)}
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
                    <button style={s.logoutBtn} onClick={() => setLogoutConfirm(true)}>
                        <i className="ti ti-logout" style={{ fontSize: 15 }} aria-hidden />
                        Cerrar sesión
                    </button>
                    <button style={s.helpBtn} onClick={() => setShowAbout(true)}>
                        <i className="ti ti-info-circle" style={{ fontSize: 15 }} aria-hidden />
                        Acerca de
                    </button>
                </div>
            </aside>

            <main style={s.main}>
                <div className="top-bar" style={{ display: "flex", alignItems: "center", height: 48, flexShrink: 0, justifyContent: "flex-start" } as React.CSSProperties}>
                    <button className="hamburger-btn" style={{ background: "none", border: "none", cursor: "pointer", color: "#888", padding: "6px 12px", display: "flex", alignItems: "center", justifyContent: "center" } as React.CSSProperties}
                        onClick={() => setSidebarOpen(true)}>
                        <i className="ti ti-menu-2" style={{ fontSize: 20 }} aria-hidden />
                    </button>
                </div>
                <Outlet />
                {role && (role === "admin" || role === "receptionist") && <FloatingQrScanner />}
            </main>

            {logoutConfirm && (
                <div style={s.overlay} onClick={() => setLogoutConfirm(false)}>
                    <div style={s.confirmBox} onClick={(e) => e.stopPropagation()}>
                        <p style={s.confirmTitle}>Cerrar sesión</p>
                        <p style={s.confirmText}>¿Estás seguro de que deseas salir?</p>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                            <button style={s.cancelBtn} onClick={() => setLogoutConfirm(false)}>Cancelar</button>
                            <button style={s.confirmBtn} onClick={handleLogout}>Salir</button>
                        </div>
                    </div>
                </div>
            )}

            {showAbout && (
                <div style={s.overlay} onClick={() => setShowAbout(false)}>
                    <div style={s.confirmBox} onClick={(e) => e.stopPropagation()}>
                        <p style={s.confirmTitle}>Acerca de</p>
                        <p style={s.confirmText}>
                            <strong>Gym Manager</strong> — Sistema de administración para gimnasios.<br /><br />
                            Versión 1.0.0<br />
                            Desarrollado con React + TypeScript + Express + MongoDB.
                        </p>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                            <button style={s.confirmBtn} onClick={() => setShowAbout(false)}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .sidebar {
                    position: fixed !important;
                    left: 0; top: 0; bottom: 0;
                    transform: translateX(-100%);
                    z-index: 900;
                    transition: transform 0.25s cubic-bezier(0.4,0,0.2,1);
                }
                .sidebar[data-open="true"] {
                    transform: translateX(0);
                }
                .sidebar-close { display: flex !important; }
                .hamburger-btn { display: flex !important; }
                .top-bar { display: flex !important; }
                @media (min-width: 900px) {
                    .sidebar {
                        position: static !important;
                        transform: none !important;
                        transition: none !important;
                    }
                    .sidebar-backdrop { display: none !important; }
                    .sidebar-close { display: none !important; }
                    .hamburger-btn { display: none !important; }
                    .top-bar { display: none !important; }
                }
            `}</style>
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    wrap:         { display: "flex", height: "100svh", overflow: "hidden", background: "#F7F7F6" },
    sidebar:      { width: 210, minWidth: 210, height: "100svh", background: "#fff", borderRight: "1px solid #E5E4E2", display: "flex", flexDirection: "column", flexShrink: 0 },
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
    helpBtn:      { display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: "#bbb", fontSize: 12, cursor: "pointer", padding: 0, fontFamily: "inherit", opacity: 0.7 },
    main:         { flex: 1, minWidth: 0, overflowY: "auto", display: "flex", flexDirection: "column" },
    overlay:      { position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
    confirmBox:   { background: "#fff", borderRadius: 10, padding: "22px 24px", minWidth: 280, boxShadow: "0 6px 24px rgba(0,0,0,0.12)" },
    confirmTitle: { fontSize: 15, fontWeight: 600, color: "#1a1a1a", margin: 0 },
    confirmText:  { fontSize: 13, color: "#555", margin: "8px 0 0" },
    cancelBtn:    { padding: "7px 16px", borderRadius: 6, border: "1px solid #E5E4E2", background: "#fff", color: "#555", fontSize: 12, cursor: "pointer", fontFamily: "inherit" },
    confirmBtn:   { padding: "7px 16px", borderRadius: 6, border: "none", background: "#c0392b", color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 },
};
