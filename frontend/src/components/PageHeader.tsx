const GOLD = "#D4AF37";

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
}

export default function PageHeader({
    title,
    subtitle,
    action,
}: PageHeaderProps) {
    const today = new Date().toLocaleDateString("es-MX", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    return (
        <div style={s.bar}>
            <div>
                <p style={s.title}>{title}</p>
                <p style={s.date}>{today}</p>
                {subtitle && (
                    <p style={s.subtitle}>{subtitle}</p>
                )}
            </div>
            {action}
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    bar: {
        padding: "22px 28px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#070707",
        borderBottom: `1px solid ${GOLD}20`,
    },
    title: {
        fontSize: 15,
        fontWeight: 600,
        color: "#fff",
        letterSpacing: -0.2,
    },
    date: {
        fontSize: 12,
        color: "rgba(255,255,255,0.35)",
        marginTop: 2,
        textTransform: "capitalize",
    },
    subtitle: {
        fontSize: 12,
        color: `${GOLD}99`,
        marginTop: 3,
    },
};