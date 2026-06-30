const GOLD = "#D4AF37";

export default function LeftPanel() {
    return (
        <div style={s.left}>
            <div style={s.leftBg} />
            <div style={s.leftGrid} />
            <div style={s.goldLines}>
                <div style={s.gl1} />
                <div style={s.gl2} />
                <div style={s.gl3} />
                <div style={s.gl4} />
                <div style={s.gl5} />
                <svg style={s.glCurve} viewBox="0 0 300 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0,30 Q75,0 150,30 T300,30" stroke={`${GOLD}20`} strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                </svg>
            </div>
            <div style={s.leftInner}>
                <div className="logo-anim" style={s.logoWrap}>
                    <img src="/logogym.png" alt="ZenithGym" style={{ height: 240 }} />
                </div>
                <div className="desc-anim">
                    <p style={s.desc}>
                        Administración de gimnasio en un solo lugar.
                    </p>
                </div>
                <div className="divider-anim" style={s.divider} />
                <div style={s.features}>
                    {["Gestión de miembros", "Pagos y suscripciones", "Control de asistencia"].map((f) => (
                        <div key={f} className="feat-anim" style={s.feature}>
                            <span style={s.featDot} />
                            <span>{f}</span>
                        </div>
                    ))}
                </div>
                <div className="footer-anim" style={s.footer}>
                    <span style={s.footerDot} />
                    <span style={s.footerText}>ZenithGym v1.0</span>
                </div>
            </div>
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    left: {
        width: "58%", display: "flex", alignItems: "center",
        justifyContent: "center", padding: 48,
        position: "relative", overflow: "hidden",
        background: "#070707",
    },
    leftBg: {
        position: "absolute", inset: 0,
        background: `
            radial-gradient(ellipse 65% 40% at 45% 50%, rgba(212,175,55,0.04) 0%, transparent 70%),
            radial-gradient(ellipse 50% 30% at 55% 50%, rgba(212,175,55,0.02) 0%, transparent 60%)
        `,
        pointerEvents: "none",
    },
    leftGrid: {
        position: "absolute", inset: 0,
        backgroundImage: `
            linear-gradient(rgba(255,255,255,0.012) 1px, transparent 0),
            linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 0)
        `,
        backgroundSize: "48px 48px",
        pointerEvents: "none",
    },
    goldLines: {
        position: "absolute", inset: 0,
        pointerEvents: "none", userSelect: "none",
        overflow: "hidden",
    },
    gl1: {
        position: "absolute", top: "14%", left: "8%",
        width: "50%", height: 1,
        background: `linear-gradient(90deg, transparent, ${GOLD}55 20%, ${GOLD}40 60%, transparent)`,
        transform: "rotate(-2deg)",
    },
    gl2: {
        position: "absolute", top: "17%", left: "8%",
        width: "32%", height: 1,
        background: `linear-gradient(90deg, transparent, ${GOLD}25 30%, transparent)`,
        transform: "rotate(-2deg)",
    },
    gl3: {
        position: "absolute", top: "65%", right: "5%",
        width: "55%", height: 1,
        background: `linear-gradient(270deg, transparent, ${GOLD}45 25%, ${GOLD}30 70%, transparent)`,
        transform: "rotate(1deg)",
    },
    gl4: {
        position: "absolute", top: "68%", right: "5%",
        width: "35%", height: 1,
        background: `linear-gradient(270deg, transparent, ${GOLD}20 30%, transparent)`,
        transform: "rotate(1deg)",
    },
    gl5: {
        position: "absolute", bottom: "22%", left: "12%",
        width: "40%", height: 1,
        background: `linear-gradient(90deg, transparent, ${GOLD}35 20%, transparent)`,
        transform: "rotate(4deg)",
    },
    glCurve: {
        position: "absolute", bottom: "10%", left: "0",
        width: "100%", height: 60,
        pointerEvents: "none",
    },
    leftInner: {
        width: 320, display: "flex", flexDirection: "column",
        minHeight: 420, position: "relative", zIndex: 1,
    },
    logoWrap: {
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 8,
    },
    desc: {
        fontSize: 14, color: "rgba(255,255,255,0.3)",
        lineHeight: 1.8, margin: 0,
        textAlign: "center" as const,
    },
    divider: {
        width: 32, height: 2, background: GOLD,
        borderRadius: 1, margin: "28px auto",
        opacity: 0.5,
    },
    features: {
        display: "flex", flexDirection: "column", gap: 14,
        alignItems: "center",
    },
    feature: {
        display: "flex", alignItems: "center", gap: 10,
        fontSize: 14, color: "rgba(255,255,255,0.4)",
        fontWeight: 400,
    },
    featDot: {
        width: 3, height: 3, borderRadius: "50%",
        background: GOLD, opacity: 0.4, flexShrink: 0,
    },
    footer: {
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        marginTop: "auto",
    },
    footerDot: {
        width: 3, height: 3, borderRadius: "50%",
        background: GOLD, opacity: 0.5,
    },
    footerText: {
        fontSize: 9, color: "rgba(255,255,255,0.08)",
        letterSpacing: 1,
    },
};
