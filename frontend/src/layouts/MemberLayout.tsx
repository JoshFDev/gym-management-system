import { Outlet } from "react-router-dom";

const GOLD = "#D4AF37";

export default function MemberLayout() {
    return (
        <div style={s.wrapper}>
            <nav style={s.nav}>
                <div style={s.navInner}>
                    <div style={s.brand}>
                        <img src="/logogym.png" alt="ZenithGym" style={{ height: 30 }} />
                    </div>
                </div>
            </nav>
            <main style={s.main}>
                <Outlet />
            </main>
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    wrapper: {
        minHeight: "100vh",
        fontFamily: "Inter, system-ui, sans-serif",
        background: "#FAFAFA",
    },
    nav: {
        background: "#070707",
        borderBottom: `1px solid ${GOLD}33`,
        position: "sticky" as const, top: 0, zIndex: 100,
    },
    navInner: {
        maxWidth: 1100, margin: "0 auto", padding: "0 24px",
        height: 56, display: "flex", alignItems: "center",
    },
    brand: {
        display: "flex", alignItems: "center", gap: 10,
    },
    brandText: {
        fontSize: 16, fontWeight: 600, color: GOLD,
        letterSpacing: 1,
    },
    main: {
        minHeight: "calc(100vh - 56px)",
    },
};
