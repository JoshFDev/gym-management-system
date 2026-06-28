import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const GOLD = "#D4AF37";

export default function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await api.post("/auth/forgot-password", { email });
            setSent(true);
        } catch {
            setSent(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={s.page}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                * { font-family: 'Inter', sans-serif; }
                @keyframes slideInLeft {
                    0% { opacity: 0; transform: translateX(-40px); }
                    100% { opacity: 1; transform: translateX(0); }
                }
                @keyframes fadeUp {
                    0% { opacity: 0; transform: translateY(12px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeIn {
                    0% { opacity: 0; }
                    100% { opacity: 1; }
                }
                .fp-card { animation: slideInLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
                .fp-fade { animation: fadeIn 0.6s ease 0.15s both; }
                .fp-title { animation: fadeUp 0.4s ease 0.2s both; }
                .fp-sub { animation: fadeUp 0.4s ease 0.28s both; }
                .fp-field { animation: fadeUp 0.4s ease 0.36s both; }
                .fp-btn { animation: fadeUp 0.4s ease 0.44s both; }
                .fp-msg { animation: fadeUp 0.4s ease 0.3s both; }
                .forgot-input {
                    background: rgba(255,255,255,0.06);
                    border: 1px solid rgba(255,255,255,0.12);
                    border-radius: 8px;
                    padding: 12px 14px;
                    font-size: 15px;
                    color: #fff;
                    outline: none;
                    width: 100%;
                    font-family: inherit;
                    box-sizing: border-box;
                    transition: border-color 0.25s, box-shadow 0.25s, background 0.25s;
                }
                .forgot-input:focus {
                    border-color: ${GOLD} !important;
                    box-shadow: 0 0 0 3px rgba(212,175,55,0.1) !important;
                    background: rgba(255,255,255,0.08) !important;
                }
                .forgot-input::placeholder { color: rgba(255,255,255,0.2); }
            `}</style>
            <div className="fp-card" style={s.left}>
                <div style={s.leftBg} />
                <div style={s.leftGrid} />
                <div style={s.leftInner}>
                    <div style={s.iconCircle}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                            <polyline points="22,6 12,13 2,6"/>
                        </svg>
                    </div>

                    <p className="fp-title" style={s.title}>{sent ? "Revisa tu correo" : "¿Olvidaste tu contraseña?"}</p>
                    <p className="fp-sub" style={s.sub}>
                        {sent
                            ? "Si el correo está registrado, recibirás un enlace en los próximos minutos."
                            : "Te enviaremos un enlace para restablecerla."
                        }
                    </p>

                    {!sent ? (
                        <form onSubmit={handleSubmit} style={s.form}>
                            <div className="fp-field" style={s.field}>
                                <label style={s.label}>Correo electrónico</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                                    placeholder="tu@correo.com"
                                    className="forgot-input"
                                    required autoComplete="email"
                                />
                            </div>

                            {error && (
                                <div className="fp-msg" style={s.errorBox}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                    {error}
                                </div>
                            )}

                            <div className="fp-btn">
                                <button type="submit" style={s.btn} disabled={loading}>
                                    {loading ? (
                                        <><span style={s.spinner} />Enviando…</>
                                    ) : (
                                        "Enviar enlace"
                                    )}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <>
                            <div className="fp-msg" style={s.successBox}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                Enlace enviado correctamente.
                            </div>
                            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", margin: "8px 0 0", lineHeight: 1.6, textAlign: "center" }}>
                                ¿No llegó? Revisa tu carpeta de spam o intenta de nuevo.
                            </p>
                            <div className="fp-btn">
                                <button
                                    type="button"
                                    onClick={() => { setSent(false); setEmail(""); }}
                                    style={s.secondaryBtn}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                                    Intentar con otro correo
                                </button>
                            </div>
                        </>
                    )}

                    <button
                        type="button"
                        onClick={() => navigate("/login")}
                        style={s.backLink}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                        </svg>
                        Volver al inicio de sesión
                    </button>
                </div>
            </div>
            <div className="fp-fade" style={s.right}>
                <img src="/Mancuerna.png" alt="" style={s.rightImg} />
                <p style={s.rightText}>ZenithGym v1.0</p>
            </div>
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    page: {
        minHeight: "100svh", display: "flex",
        background: "#fafafa",
    },
    left: {
        width: "58%", display: "flex", alignItems: "center",
        justifyContent: "center", padding: 48,
        position: "relative", overflow: "hidden",
        background: "#070707",
    },
    leftBg: {
        position: "absolute", inset: 0,
        background: `
            radial-gradient(ellipse 65% 40% at 55% 50%, rgba(212,175,55,0.04) 0%, transparent 70%),
            radial-gradient(ellipse 50% 30% at 45% 50%, rgba(212,175,55,0.02) 0%, transparent 60%)
        `,
        pointerEvents: "none",
    },
    leftGrid: {
        position: "absolute", inset: 0,
        backgroundImage: `
            linear-gradient(rgba(255,255,255,0.012) 1px, transparent 0),
            linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 0)
        `,
        backgroundSize: "48px 48px",
        pointerEvents: "none",
    },
    leftInner: {
        width: 340, display: "flex", flexDirection: "column",
        minHeight: 420, position: "relative", zIndex: 1,
        gap: 4,
    },
    iconCircle: {
        width: 80, height: 80, borderRadius: "50%",
        background: "rgba(212,175,55,0.06)",
        border: "1.5px solid rgba(212,175,55,0.25)",
        display: "flex", alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 24px",
    },
    title: {
        fontSize: 22, fontWeight: 700, color: "#fff",
        margin: 0, textAlign: "center" as const,
        letterSpacing: -0.3,
    },
    sub: {
        fontSize: 13, color: "rgba(255,255,255,0.3)",
        margin: "6px 0 20px", textAlign: "center" as const,
        fontWeight: 400,
    },
    form: { display: "flex", flexDirection: "column", gap: 14 },
    field: { display: "flex", flexDirection: "column", gap: 6 },
    label: {
        fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.4)",
    },
    errorBox: {
        display: "flex", alignItems: "center", gap: 8,
        background: "rgba(220,38,38,0.1)",
        border: "1px solid rgba(220,38,38,0.2)",
        borderRadius: 8, padding: "10px 12px",
        fontSize: 12, color: "#ef4444",
    },
    successBox: {
        display: "flex", alignItems: "center", gap: 8,
        background: "rgba(58,125,68,0.1)",
        border: "1px solid rgba(58,125,68,0.2)",
        borderRadius: 8, padding: "12px 14px",
        fontSize: 13, color: "#4ade80",
        marginTop: 8,
    },
    btn: {
        background: GOLD,
        color: "#fff", border: "none", borderRadius: 8,
        padding: "13px 16px", fontSize: 15, fontWeight: 600,
        cursor: "pointer", width: "100%", marginTop: 4,
        fontFamily: "inherit",
        display: "flex", alignItems: "center",
        justifyContent: "center", gap: 8,
    },
    secondaryBtn: {
        background: "rgba(255,255,255,0.06)",
        color: "rgba(255,255,255,0.5)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
        padding: "12px 16px", fontSize: 14, fontWeight: 500,
        cursor: "pointer", width: "100%", marginTop: 12,
        fontFamily: "inherit",
        display: "flex", alignItems: "center",
        justifyContent: "center", gap: 8,
    },
    spinner: {
        display: "inline-block", width: 13, height: 13,
        border: "2px solid rgba(255,255,255,0.3)",
        borderTopColor: "#fff", borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
    },
    backLink: {
        background: "none", border: "none",
        fontSize: 13, color: "rgba(255,255,255,0.3)",
        display: "flex", alignItems: "center",
        justifyContent: "center", gap: 4,
        cursor: "pointer", padding: "12px 0 0",
        textDecoration: "underline",
        width: "100%", marginTop: 8,
        fontFamily: "inherit",
    },
    right: {
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 16, padding: 48,
        background: "#fafafa",
    },
    rightImg: {
        height: 120, opacity: 0.4,
    },
    rightText: {
        fontSize: 10, color: "#ddd", margin: 0,
        letterSpacing: 1,
    },
};
