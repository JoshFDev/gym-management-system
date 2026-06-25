import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

// Llama a POST /auth/forgot-password con { email }
// Tu backend genera el token y envía el correo con el link de reset
const forgotPasswordRequest = async (email: string) => {
    const response = await api.post("/auth/forgot-password", { email });
    return response.data;
};

export default function ForgotPasswordPage() {
    const navigate  = useNavigate();
    const [email,   setEmail]   = useState("");
    const [sent,    setSent]    = useState(false);
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await forgotPasswordRequest(email);
            setSent(true);
        } catch {
            // Siempre mostramos "enviado" para no revelar si el email existe
            setSent(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={s.page}>
            {/* Header mínimo igual al de ResetPasswordPage */}
            <div style={s.header}>
                <span style={s.headerTitle}>Gym Manager</span>
                <div style={s.iconWrap}>
                    <i className="ti ti-lock" style={{ fontSize: 14, color: "#888" }} aria-hidden />
                </div>
            </div>

            <div style={s.content}>
                <div style={s.card}>
                    <div style={s.cardIcon}>
                        <i className="ti ti-mail" style={{ fontSize: 18, color: "#888" }} aria-hidden />
                    </div>

                    {!sent ? (
                        <>
                            <p style={s.cardTitle}>¿Olvidaste tu contraseña?</p>
                            <p style={s.cardSub}>
                                Escribe tu correo y te enviaremos un enlace para restablecerla.
                            </p>

                            {error && (
                                <div style={s.errorBox}>
                                    <i className="ti ti-alert-circle" style={{ fontSize: 14, flexShrink: 0 }} aria-hidden />
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} style={{ marginTop: 18 }}>
                                <div style={s.field}>
                                    <label htmlFor="email" style={s.fieldLabel}>Correo electrónico</label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="correo@ejemplo.com"
                                        required
                                        autoComplete="email"
                                        style={s.input}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{
                                        ...s.btn,
                                        marginTop: 14,
                                        background: loading ? "#E5E4E2" : "#1a1a1a",
                                        color:      loading ? "#bbb"    : "#fff",
                                        cursor:     loading ? "not-allowed" : "pointer",
                                    }}
                                >
                                    <i className={`ti ${loading ? "ti-loader" : "ti-send"}`} style={{ fontSize: 14 }} aria-hidden />
                                    {loading ? "Enviando..." : "Enviar enlace"}
                                </button>
                            </form>
                        </>
                    ) : (
                        /* ── Estado: correo enviado ── */
                        <>
                            <p style={s.cardTitle}>Revisa tu correo</p>
                            <p style={s.cardSub}>
                                Si <strong style={{ color: "#1a1a1a", fontWeight: 500 }}>{email}</strong> está
                                registrado, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
                            </p>

                            <div style={s.successBox}>
                                <i className="ti ti-circle-check" style={{ fontSize: 15, flexShrink: 0 }} aria-hidden />
                                Enlace enviado correctamente.
                            </div>

                            <p style={{ fontSize: 11, color: "#bbb", marginTop: 14, lineHeight: 1.6 }}>
                                ¿No llegó? Revisa tu carpeta de spam o intenta de nuevo en unos minutos.
                            </p>

                            <button
                                type="button"
                                onClick={() => { setSent(false); setEmail(""); }}
                                style={{ ...s.btn, marginTop: 16, background: "#F7F7F6", color: "#1a1a1a", border: "1px solid #E5E4E2", cursor: "pointer" }}
                            >
                                <i className="ti ti-refresh" style={{ fontSize: 14 }} aria-hidden />
                                Intentar con otro correo
                            </button>
                        </>
                    )}

                    <hr style={s.divider} />

                    <button
                        type="button"
                        onClick={() => navigate("/login")}
                        style={s.backLink}
                    >
                        <i className="ti ti-arrow-left" style={{ fontSize: 13 }} aria-hidden />
                        Volver al inicio de sesión
                    </button>
                </div>
            </div>
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    page:       { display: "flex", flexDirection: "column", minHeight: "100vh", background: "#FAFAF9" },
    header:     { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", borderBottom: "1px solid #E5E4E2", background: "#fff" },
    headerTitle:{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" },
    iconWrap:   { width: 28, height: 28, borderRadius: 6, background: "#F7F7F6", display: "flex", alignItems: "center", justifyContent: "center" },
    content:    { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 28px" },
    card:       { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, padding: "28px 28px 24px", width: "100%", maxWidth: 380 },
    cardIcon:   { width: 40, height: 40, borderRadius: 8, background: "#F7F7F6", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 },
    cardTitle:  { fontSize: 15, fontWeight: 600, color: "#1a1a1a", margin: 0 },
    cardSub:    { fontSize: 12, color: "#888", margin: "6px 0 0", lineHeight: 1.6 },
    field:      { display: "flex", flexDirection: "column", gap: 5 },
    fieldLabel: { fontSize: 11, fontWeight: 500, color: "#888" },
    input:      { height: 36, border: "1px solid #E5E4E2", borderRadius: 6, padding: "0 10px", fontSize: 13, color: "#1a1a1a", background: "#fff", outline: "none", width: "100%", boxSizing: "border-box" },
    btn:        { width: "100%", height: 36, borderRadius: 6, border: "none", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "background 0.15s" },
    errorBox:   { display: "flex", alignItems: "center", gap: 8, background: "#FFF4F0", border: "1px solid #fecaca", borderRadius: 6, padding: "10px 12px", fontSize: 12, color: "#c0392b", marginTop: 14 },
    successBox: { display: "flex", alignItems: "center", gap: 8, background: "#F0F7F1", borderRadius: 6, padding: "10px 12px", fontSize: 12, color: "#3a7d44", marginTop: 14 },
    divider:    { border: "none", borderTop: "1px solid #E5E4E2", margin: "18px 0 14px" },
    backLink:   { width: "100%", background: "none", border: "none", fontSize: 12, color: "#888", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer", padding: 0 },
};