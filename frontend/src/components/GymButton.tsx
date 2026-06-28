const GOLD = "#D4AF37";

interface GymButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon?: string;
    variant?: "primary" | "ghost";
}

export default function GymButton({ icon, variant = "primary", children, style, ...props }: GymButtonProps) {
    const base: React.CSSProperties = {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 14px",
        fontSize: 12,
        fontWeight: 500,
        borderRadius: 6,
        border: "none",
        cursor: "pointer",
        fontFamily: "inherit",
        ...(variant === "primary"
            ? { background: GOLD, color: "#fff" }
            : { background: "transparent", color: `${GOLD}CC`, border: `1px solid ${GOLD}40` }
        ),
        ...style,
    };

    return (
        <button style={base} {...props}>
            {icon && <i className={`ti ${icon}`} style={{ fontSize: 13 }} aria-hidden />}
            {children}
        </button>
    );
}