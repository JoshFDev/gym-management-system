import { NavLink, Outlet, useNavigate } from "react-router-dom";

const navGroups = [
  {
    label: "General",
    items: [
      { to: "/dashboard", icon: "ti-layout-dashboard", label: "Dashboard" },
      { to: "/members", icon: "ti-users", label: "Miembros" },
      { to: "/plans", icon: "ti-clipboard-list", label: "Planes" },
    ],
  },
  {
    label: "Operación",
    items: [
      { to: "/subscriptions", icon: "ti-id-badge", label: "Suscripciones" },
      { to: "/attendance", icon: "ti-scan", label: "Asistencia" },
      { to: "/payments", icon: "ti-credit-card", label: "Pagos" },
    ],
  },
];

export default function DashboardLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
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

        {/* Nav */}
        <nav style={s.nav}>
          {navGroups.map((group) => (
            <div key={group.label}>
              <p style={s.sectionLabel}>{group.label}</p>
              {group.items.map((item) => (
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
                  {/* active dot */}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={s.sidebarFooter}>
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
  wrap: {
    display: "flex",
    minHeight: "100svh",
    background: "#F7F7F6",
  },
  sidebar: {
    width: 210,
    minWidth: 210,
    background: "#ffffff",
    borderRight: "1px solid #E5E4E2",
    display: "flex",
    flexDirection: "column",
  },
  logo: {
    padding: "22px 20px 18px",
    borderBottom: "1px solid #E5E4E2",
  },
  logoName: {
    fontSize: 15,
    fontWeight: 600,
    color: "#1a1a1a",
    letterSpacing: -0.3,
  },
  logoTag: {
    fontSize: 11,
    color: "#bbbbbb",
    marginTop: 3,
  },
  nav: {
    padding: "8px 0",
    flex: 1,
  },
  sectionLabel: {
    fontSize: 10,
    color: "#bbbbbb",
    fontWeight: 500,
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    padding: "14px 20px 6px",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    padding: "8px 20px",
    fontSize: 13,
    color: "#888888",
    textDecoration: "none",
    fontWeight: 400,
  },
  navItemActive: {
    background: "#F7F7F6",
    color: "#1a1a1a",
    fontWeight: 500,
  },
  navIcon: {
    fontSize: 15,
  },
  sidebarFooter: {
    padding: "14px 20px",
    borderTop: "1px solid #E5E4E2",
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "none",
    border: "none",
    color: "#bbbbbb",
    fontSize: 13,
    cursor: "pointer",
    padding: 0,
  },
  main: {
    flex: 1,
    minWidth: 0,
    overflowY: "auto",
  },
};