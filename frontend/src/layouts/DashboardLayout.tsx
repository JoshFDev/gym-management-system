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
                } catch { /* AudioContext may not be available */ }
            }
        });
        return () => void unsub();
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
                <div style={s.sidebarHeader}>
                    <button className="sidebar-close" style={s.closeBtn} onClick={() => setSidebarOpen(false)}>
                        <i className="ti ti-x" style={{ fontSize: 16 }} aria-hidden />
                    </button>
                    <div style={s.brandWrap}>
                        <img src="/logogym.png" alt="" style={s.logoImg} />
                        <p style={s.logoTag}>Panel de administración</p>
                    </div>
                    <div style={s.goldLine} />
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
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div style={s.sidebarFooter}>
                    {user && (
                        <div style={s.userCard}>
                            <div style={s.userAvatar}>
                                {user.firstName[0]}{user.lastName[0]}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={s.userName}>{user.firstName} {user.lastName}</p>
                                <p style={s.userRole}>{role ? ROLE_LABEL[role] : ""}</p>
                            </div>
                        </div>
                    )}
                    <div style={s.footerActions}>
                        <button className="logout-btn" style={s.logoutBtn} onClick={() => setLogoutConfirm(true)}>
                            <i className="ti ti-logout" style={{ fontSize: 14 }} aria-hidden />
                            Cerrar sesión
                        </button>
                        <button style={s.helpBtn} onClick={() => setShowAbout(true)}>
                            <i className="ti ti-info-circle" style={{ fontSize: 13 }} aria-hidden />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Semi‑circle hamburger for mobile */}
            <button
                className="hamburger-semi"
                onClick={() => setSidebarOpen(true)}
                aria-label="Abrir menú"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round">
                    <line x1="4" y1="6" x2="20" y2="6" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="18" x2="20" y2="18" />
                </svg>
            </button>

            <main style={s.main}>
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

                .sidebar a {
                    text-decoration: none;
                }
                .sidebar a:hover {
                    color: ${GOLD} !important;
                    background: linear-gradient(90deg, ${GOLD}08 0%, transparent 100%);
                }
                .sidebar button:hover {
                    color: ${GOLD} !important;
                }
                .sidebar button.logout-btn:hover {
                    color: #e74c3c !important;
                }

                .hamburger-semi {
                    display: flex !important;
                    position: fixed;
                    left: 0;
                    top: 16px;
                    width: 28px;
                    height: 56px;
                    background: #070707;
                    border: 1px solid ${GOLD}30;
                    border-left: none;
                    border-radius: 0 28px 28px 0;
                    cursor: pointer;
                    z-index: 800;
                    align-items: center;
                    justify-content: center;
                    padding: 0;
                    transition: opacity 0.2s;
                }
                .hamburger-semi:hover { background: #0f0f0f; }
                @media (min-width: 900px) {
                    .sidebar {
                        position: static !important;
                        transform: none !important;
                        transition: none !important;
                    }
                    .sidebar-backdrop { display: none !important; }
                    .sidebar-close { display: none !important; }
                    .hamburger-semi { display: none !important; }
                }
            `}</style>
        </div>
    );
}

const GOLD = "#D4AF37";

const s: Record<string, React.CSSProperties> = {
    wrap:         { display: "flex", height: "100svh", overflow: "hidden", background: "#F7F7F6" },
    sidebar:      { width: 220, minWidth: 220, height: "100svh", background: "#070707", borderRight: `1px solid ${GOLD}20`, display: "flex", flexDirection: "column", flexShrink: 0 },
    sidebarHeader:{ padding: "28px 24px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, position: "relative" },
    closeBtn:     { position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: 4, display: "flex", alignItems: "center", justifyContent: "center" } as React.CSSProperties,
    brandWrap:    { display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },
    logoImg:      { width: 130, display: "block" },
    logoTag:      { fontSize: 11, color: `${GOLD}`, letterSpacing: 2, fontWeight: 400, margin: 0, textTransform: "uppercase", textAlign: "center" },
    goldLine:     { width: 30, height: 2, background: GOLD, borderRadius: 1, opacity: 0.5 },
    nav:          { padding: "10px 0", flex: 1 },
    navItem:      { display: "flex", alignItems: "center", gap: 10, padding: "9px 20px 9px 22px", fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none", fontWeight: 400, borderLeft: "2px solid transparent", transition: "all 0.2s ease", position: "relative" } as React.CSSProperties,
    navItemActive: { background: `linear-gradient(90deg, ${GOLD}10 0%, transparent 100%)`, color: GOLD, fontWeight: 500, borderLeft: `2px solid ${GOLD}` },
    navIcon:      { fontSize: 15, width: 18, textAlign: "center" },
    sidebarFooter: { padding: "14px 16px", borderTop: `1px solid ${GOLD}15`, display: "flex", flexDirection: "column", gap: 10 },
    userCard:     { display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", borderRadius: 6, background: "rgba(255,255,255,0.03)" },
    userAvatar:   { width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg, ${GOLD}, ${GOLD}CC)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#070707", flexShrink: 0, textTransform: "uppercase", boxShadow: `0 0 0 2px ${GOLD}30` },
    userName:     { fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.75)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    userRole:     { fontSize: 10, color: `${GOLD}99`, margin: 0, letterSpacing: 0.5 },
    footerActions:{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" },
    logoutBtn:    { display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 12, cursor: "pointer", padding: "4px 8px", fontFamily: "inherit", borderRadius: 4, transition: "color 0.15s" },
    helpBtn:      { display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "rgba(255,255,255,0.2)", fontSize: 12, cursor: "pointer", padding: "4px 8px", fontFamily: "inherit", borderRadius: 4, transition: "color 0.15s" },
    main:         { flex: 1, minWidth: 0, overflowY: "auto", display: "flex", flexDirection: "column" },
    overlay:      { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
    confirmBox:   { background: "#1a1a1a", borderRadius: 10, padding: "22px 24px", minWidth: 280, boxShadow: "0 6px 24px rgba(0,0,0,0.3)", border: `1px solid ${GOLD}25` },
    confirmTitle: { fontSize: 15, fontWeight: 600, color: "#fff", margin: 0 },
    confirmText:  { fontSize: 13, color: "rgba(255,255,255,0.5)", margin: "8px 0 0" },
    cancelBtn:    { padding: "7px 16px", borderRadius: 6, border: `1px solid ${GOLD}30`, background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" },
    confirmBtn:   { padding: "7px 16px", borderRadius: 6, border: "none", background: "#c0392b", color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 },
};
