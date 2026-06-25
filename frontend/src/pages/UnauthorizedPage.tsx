import { useNavigate } from "react-router-dom";

export default function UnauthorizedPage() {
    const navigate = useNavigate();

    return (
        <div style={s.page}>
            <div style={s.box}>
                <p style={s.code}>403</p>
                <p style={s.title}>Sin permisos</p>
                <p style={s.desc}>No tienes acceso a esta sección.</p>
                <button style={s.btn} onClick={() => navigate(-1)}>
                    Regresar
                </button>
            </div>
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    page:  { minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F7F7F6" },
    box:   { textAlign: "center" },
    code:  { fontSize: 64, fontWeight: 600, color: "#E5E4E2", margin: 0, letterSpacing: -2 },
    title: { fontSize: 16, fontWeight: 600, color: "#1a1a1a", margin: "8px 0 4px" },
    desc:  { fontSize: 13, color: "#bbb", margin: "0 0 24px" },
    btn:   { background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
};