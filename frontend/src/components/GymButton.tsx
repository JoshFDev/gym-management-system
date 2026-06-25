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
            ? { background: "#1a1a1a", color: "#fff" }
            : { background: "transparent", color: "#888", border: "1px solid #E5E4E2" }
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