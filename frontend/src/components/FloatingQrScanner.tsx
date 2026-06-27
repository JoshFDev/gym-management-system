import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { createAttendance } from "../services/attendance.service";

const CONTAINER_ID = "floating-qr-scanner";

export default function FloatingQrScanner() {
    const [on, setOn] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const cooldownRef = useRef(false);
    const [toast, setToast] = useState<string | null>(null);

    useEffect(() => {
        if (!on) return;
        const scanner = new Html5Qrcode(CONTAINER_ID);
        scannerRef.current = scanner;
        let cancelled = false;
        (async () => {
            try {
                await scanner.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 200, height: 200 } },
                    async (decodedText) => {
                        if (cancelled || cooldownRef.current) return;
                        cooldownRef.current = true;
                        setTimeout(() => { cooldownRef.current = false; }, 5000);
                        setToast(`Registrando...`);
                        try {
                            const res = await createAttendance(decodedText);
                            setToast(res.action === "check_out" ? "Salida registrada ✓" : "Entrada registrada ✓");
                            setTimeout(() => setToast(null), 2000);
                        } catch {
                            setToast("Error al registrar");
                            setTimeout(() => setToast(null), 2000);
                        }
                    },
                    () => { }
                );
            } catch {
                setToast("Cámara no disponible");
                setTimeout(() => setToast(null), 3000);
                setOn(false);
            }
        })();
        return () => {
            cancelled = true;
            scanner.stop().catch(() => {});
            scannerRef.current = null;
        };
    }, [on]);

    return (
        <>
            {/* Toggle button */}
            <button
                onClick={() => setOn((p) => !p)}
                style={{
                    ...s.toggle,
                    background: on ? "#c0392b" : "#1a1a1a",
                }}
                title={on ? "Apagar escáner" : "Encender escáner"}
            >
                <i className={`ti ${on ? "ti-camera-off" : "ti-camera"}`} style={{ fontSize: 18 }} aria-hidden />
            </button>

            {/* Scanner panel */}
            {on && (
                <div style={s.panel}>
                    <div style={s.panelHeader}>
                        <span style={s.panelTitle}>
                            <span style={s.liveDot} />
                            Escáner QR
                        </span>
                        {toast && <span style={s.toast}>{toast}</span>}
                    </div>
                    <div id={CONTAINER_ID} style={s.viewfinder} />
                </div>
            )}
        </>
    );
}

const s: Record<string, React.CSSProperties> = {
    toggle: {
        position: "fixed", bottom: 24, right: 24, zIndex: 500,
        width: 44, height: 44, borderRadius: "50%",
        border: "none", color: "#fff", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
        transition: "background 0.2s",
    },
    panel: {
        position: "fixed", bottom: 80, right: 24, zIndex: 499,
        width: 260, background: "#fff", borderRadius: 10,
        border: "1px solid #E5E4E2", boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
        overflow: "hidden",
    },
    panelHeader: {
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px", borderBottom: "1px solid #F0F0EE",
        fontSize: 11, fontWeight: 600, color: "#1a1a1a",
    },
    panelTitle: {
        display: "flex", alignItems: "center", gap: 6,
    },
    liveDot: {
        width: 6, height: 6, borderRadius: "50%",
        background: "#3a7d44", display: "inline-block",
    },
    viewfinder: {
        width: "100%", minHeight: 200,
    },
    toast: {
        marginLeft: "auto", fontSize: 10, color: "#3a7d44", fontWeight: 500,
    },
};
