interface PageHeaderProps {
    title: string;
    action?: React.ReactNode;
}

export default function PageHeader({ title, action }: PageHeaderProps) {
    const today = new Date().toLocaleDateString("es-MX", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    return (
        <div style={s.bar}>
            <div>
                <p style={s.title}>{title}</p>
                <p style={s.date}>{today}</p>            </div>
            {action}
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    bar: {
        padding: "18px 28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#ffffff",
        borderBottom: "1px solid #E5E4E2",
    },
    title: {
        fontSize: 14,
        fontWeight: 600,
        color: "#1a1a1a",
    },
    date: {
        fontSize: 12,
        color: "#bbbbbb",
        marginTop: 2,
        textTransform: "capitalize",
    },
};