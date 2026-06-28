import { useNavigate } from "react-router-dom";

export default function NotFoundPage() {
    const navigate = useNavigate();
    return (
        <div style={s.container}>
            <div style={s.card}>
                <i className="ti ti-404" style={{ fontSize: 40, color: "#bbb" }} aria-hidden />
                <h2 style={s.title}>Página no encontrada</h2>
                <p style={s.text}>La ruta a la que intentas acceder no existe.</p>
                <button style={s.btn} onClick={() => navigate("/dashboard")}>
                    Ir al inicio
                </button>
            </div>
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    container: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100svh", background: "#F7F7F6", padding: 20 },
    card: { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 12, padding: "32px 36px", textAlign: "center", maxWidth: 400 },
    title: { fontSize: 18, fontWeight: 600, color: "#1a1a1a", margin: "12px 0 6px" },
    text: { fontSize: 13, color: "#888", margin: "0 0 20px", lineHeight: 1.5 },
    btn: { background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" },
};