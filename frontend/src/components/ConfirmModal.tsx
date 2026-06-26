import { useEffect, useRef } from "react";

interface ConfirmModalProps {
    open: boolean;
    title: string;
    body: string | React.ReactNode;
    confirmLabel?: string;
    confirmColor?: string;
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmModal({
    open, title, body, confirmLabel = "Confirmar", confirmColor, loading, onConfirm, onCancel,
}: ConfirmModalProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onCancel]);

    useEffect(() => {
        if (!open) return;
        const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onCancel(); };
        window.addEventListener("mousedown", handleClick);
        return () => window.removeEventListener("mousedown", handleClick);
    }, [open, onCancel]);

    if (!open) return null;

    return (
        <div style={s.overlay}>
            <div ref={ref} style={s.modal}>
                <h3 style={s.title}>{title}</h3>
                <div style={s.body}>{body}</div>
                <div style={s.actions}>
                    <button style={s.cancelBtn} onClick={onCancel} disabled={loading}>Cancelar</button>
                    <button
                        style={{ ...s.confirmBtn, ...(confirmColor ? { background: confirmColor, borderColor: confirmColor } : {}) }}
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? "Procesando…" : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    overlay: {
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex",
        alignItems: "center", justifyContent: "center", zIndex: 10000,
    },
    modal: { background: "#fff", borderRadius: 12, padding: 28, minWidth: 360, maxWidth: 440, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" },
    title: { margin: "0 0 8px", fontSize: 18, color: "#1a1a1a" },
    body: { fontSize: 14, color: "#555", marginBottom: 24, lineHeight: 1.5 },
    actions: { display: "flex", gap: 10, justifyContent: "flex-end" },
    cancelBtn: {
        background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, padding: "8px 20px",
        fontSize: 14, fontFamily: "inherit", cursor: "pointer", color: "#555",
    },
    confirmBtn: {
        background: "#1a1a1a", border: "1px solid #1a1a1a", borderRadius: 8, padding: "8px 20px",
        fontSize: 14, fontFamily: "inherit", cursor: "pointer", color: "#fff",
    },
};
