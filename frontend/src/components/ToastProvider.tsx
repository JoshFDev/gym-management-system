import { useState, useRef, useCallback, type ReactNode } from "react";
import { ToastContext } from "../hooks/useToast";

interface ToastMsg {
    id: number;
    text: string;
    type: "success" | "error";
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastMsg[]>([]);
    const toastId = useRef(0);

    const addToast = useCallback((text: string, type: "success" | "error" = "success") => {
        const id = ++toastId.current;
        setToasts((p) => [...p, { id, text, type }]);
        setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
    }, []);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div style={s.stack}>
                {toasts.map((t) => (
                    <div key={t.id} style={s.toast} onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}>
                        <span style={{ ...s.icon, color: t.type === "success" ? "#3a7d44" : "#c0392b" }}>
                            {t.type === "success" ? "\u2713" : "\u2717"}
                        </span>
                        <span>{t.text}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

const s: Record<string, React.CSSProperties> = {
    stack: { position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 },
    toast: {
        display: "flex", alignItems: "center", gap: 10, background: "#fff", color: "#333", padding: "12px 20px",
        borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", cursor: "pointer", fontSize: 14,
        animation: "fadeIn 0.2s ease", fontFamily: "inherit", minWidth: 250,
    },
    icon: { fontWeight: 700, fontSize: 16 },
};
