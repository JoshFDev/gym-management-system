import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { resetPasswordRequest } from "../services/auth.service";

const GOLD = "#D4AF37";

const getStrength = (pw: string): number => {
    let score = 0;
    if (pw.length >= 8)           score++;
    if (/[A-Z]/.test(pw))         score++;
    if (/[0-9]/.test(pw))         score++;
    if (/[^A-Za-z0-9]/.test(pw))  score++;
    return score;
};

const strengthMeta: Record<number, { label: string; color: string }> = {
    0: { label: "",            color: "#E5E4E2" },
    1: { label: "Muy débil",  color: "#c0392b" },
    2: { label: "Regular",    color: "#e67e22" },
    3: { label: "Fuerte",     color: "#3a7d44" },
    4: { label: "Muy fuerte", color: "#1a1a1a" },
};

function StrengthBar({ password }: { password: string }) {
    const score = password.length > 0 ? getStrength(password) : 0;
    const meta  = strengthMeta[score];

    return (
        <>
            <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        style={{
                            flex: 1, height: 3, borderRadius: 2,
                            background: password.length > 0 && i <= score
                                ? meta.color : "rgba(255,255,255,0.1)",
                            transition: "background 0.2s",
                        }}
                    />
                ))}
            </div>
            {password.length > 0 && (
                <p style={{ fontSize: 10, color: meta.color, marginTop: 4 }}>
                    {meta.label}
                </p>
            )}
        </>
    );
}

function PasswordInput({
    id, label, value, placeholder, onChange, borderColor,
}: {
    id: string; label: string; value: string;
    placeholder: string; onChange: (v: string) => void;
    borderColor?: string;
}) {
    const [visible, setVisible] = useState(false);

    return (
        <div style={s.field}>
            <label htmlFor={id} style={s.label}>{label}</label>
            <div style={s.inputWrap}>
                <input
                    id={id}
                    type={visible ? "text" : "password"}
                    value={value}
                    placeholder={placeholder}
                    onChange={(e) => onChange(e.target.value)}
                    required
                    className="reset-input"
                    style={{
                        borderColor: borderColor ?? "rgba(255,255,255,0.12)",
                        paddingRight: 44,
                    }}
                />
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? "Ocultar" : "Mostrar"}
                    style={s.eyeBtn}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        {visible
                            ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                            : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                        }
                    </svg>
                </button>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const passwordsMatch = password.length >= 8 && password === confirm;

    const confirmBorder =
        confirm.length === 0 ? "rgba(255,255,255,0.12)"
        : passwordsMatch     ? "#3a7d44"
        :                      "#c0392b";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordsMatch) return;
        setLoading(true);
        setError("");
        setMessage("");
        try {
            await resetPasswordRequest(token as string, password);
            setMessage("Contraseña actualizada correctamente.");
            setTimeout(() => navigate("/login"), 1500);
        } catch {
            setError("El enlace expiró o no es válido.");
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
                .rs-card { animation: slideInLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
                .rs-fade { animation: fadeIn 0.6s ease 0.15s both; }
                .rs-title { animation: fadeUp 0.4s ease 0.2s both; }
                .rs-sub { animation: fadeUp 0.4s ease 0.28s both; }
                .rs-f1 { animation: fadeUp 0.4s ease 0.36s both; }
                .rs-f2 { animation: fadeUp 0.4s ease 0.44s both; }
                .rs-btn { animation: fadeUp 0.4s ease 0.52s both; }
                .rs-msg { animation: fadeUp 0.4s ease 0.3s both; }
                .reset-input {
                    background: rgba(255,255,255,0.06);
                    border: 1px solid rgba(255,255,255,0.12);
                    border-radius: 8px;
                    padding: 12px 14px 12px 16px;
                    font-size: 15px;
                    color: #fff;
                    outline: none;
                    width: 100%;
                    font-family: inherit;
                    box-sizing: border-box;
                    transition: border-color 0.25s, box-shadow 0.25s, background 0.25s;
                }
                .reset-input:focus {
                    border-color: ${GOLD} !important;
                    box-shadow: 0 0 0 3px rgba(212,175,55,0.1) !important;
                    background: rgba(255,255,255,0.08) !important;
                }
                .reset-input::placeholder { color: rgba(255,255,255,0.2); }
            `}</style>
            <div className="rs-card" style={s.left}>
                <div style={s.leftBg} />
                <div style={s.leftGrid} />
                <div style={s.leftInner}>
                    <div style={s.iconCircle}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            <circle cx="12" cy="16" r="1.5" fill={GOLD} stroke="none"/>
                        </svg>
                    </div>

                    <p className="rs-title" style={s.title}>Restablecer contraseña</p>
                    <p className="rs-sub" style={s.sub}>Ingresa tu nueva contraseña para continuar</p>

                    {message ? (
                        <div className="rs-msg" style={s.successBox}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                            {message}
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} style={s.form}>
                            <div className="rs-f1">
                                <PasswordInput
                                    id="pw-new"
                                    label="Nueva contraseña"
                                    value={password}
                                    placeholder="Mínimo 8 caracteres"
                                    onChange={setPassword}
                                />
                                <StrengthBar password={password} />
                            </div>

                            <div className="rs-f2">
                                <PasswordInput
                                    id="pw-confirm"
                                    label="Confirmar contraseña"
                                    value={confirm}
                                    placeholder="Repite la contraseña"
                                    onChange={setConfirm}
                                    borderColor={confirmBorder}
                                />
                            </div>

                            {error && (
                                <div className="rs-msg" style={s.errorBox}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                    {error}
                                </div>
                            )}

                            <div className="rs-btn">
                                <button
                                    type="submit"
                                    disabled={!passwordsMatch || loading}
                                    style={{
                                        ...s.btn,
                                        background: !passwordsMatch || loading ? "rgba(255,255,255,0.08)" : GOLD,
                                        color: !passwordsMatch || loading ? "rgba(255,255,255,0.3)" : "#fff",
                                        cursor: !passwordsMatch || loading ? "not-allowed" : "pointer",
                                    }}
                                >
                                    {loading ? (
                                        <><span style={s.spinner} />Guardando…</>
                                    ) : (
                                        "Cambiar contraseña"
                                    )}
                                </button>
                            </div>
                        </form>
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
            <div className="rs-fade" style={s.right}>
                <img src="/logogym.png" alt="ZenithGym" style={s.rightLogo} />
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
    inputWrap: { position: "relative", display: "flex", alignItems: "center" },
    eyeBtn: {
        position: "absolute", right: 8, top: "50%",
        transform: "translateY(-50%)",
        background: "none", border: "none",
        cursor: "pointer", padding: 4, display: "flex",
        alignItems: "center",
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
        border: "none", borderRadius: 8,
        padding: "13px 16px", fontSize: 15, fontWeight: 600,
        width: "100%", marginTop: 4,
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
    rightLogo: {
        height: 100, opacity: 0.5,
    },
    rightText: {
        fontSize: 10, color: "#ddd", margin: 0,
        letterSpacing: 1,
    },
};
