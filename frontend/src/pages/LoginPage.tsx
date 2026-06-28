import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loginRequest } from "../services/auth.service";
import api from "../api/axios";
import LeftPanel from "../components/LeftPanel";

const GOLD = "#D4AF37";

function playSuccessSound() {
    try {
        const ctx = new AudioContext();
        const t = ctx.currentTime;

        const g = ctx.createGain();
        g.connect(ctx.destination);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.06, t + 0.02);
        g.gain.linearRampToValueAtTime(0.06, t + 0.18);
        g.gain.linearRampToValueAtTime(0, t + 0.35);

        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.setValueAtTime(440, t);
        o.frequency.setValueAtTime(554.37, t + 0.15);
        o.connect(g);
        o.start(t);
        o.stop(t + 0.35);
    } catch { /* audio not supported */ }
}

function playErrorSound() {
    try {
        const ctx = new AudioContext();
        const t = ctx.currentTime;

        const g = ctx.createGain();
        g.connect(ctx.destination);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.04, t + 0.015);
        g.gain.linearRampToValueAtTime(0, t + 0.25);

        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.setValueAtTime(220, t);
        o.frequency.linearRampToValueAtTime(180, t + 0.2);
        o.connect(g);
        o.start(t);
        o.stop(t + 0.25);
    } catch { /* audio not supported */ }
}

export default function LoginPage() {
    const [email,    setEmail]    = useState("");
    const [password, setPassword] = useState("");
    const [error,    setError]    = useState("");
    const [loading,  setLoading]  = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [loginSuccess, setLoginSuccess] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [showForgot, setShowForgot] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotSent, setForgotSent] = useState(false);
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotError, setForgotError] = useState("");
    const [formAnim, setFormAnim] = useState<"idle" | "out">("idle");
    const navigate = useNavigate();

    useEffect(() => {
        if (!loginSuccess || !userRole) return;
        const timer = setTimeout(() => {
            navigate(userRole === "trainer" ? "/members" : "/dashboard");
        }, 1500);
        return () => clearTimeout(timer);
    }, [loginSuccess, userRole, navigate]);

    const switchForm = (toForgot: boolean) => {
        setFormAnim("out");
        setTimeout(() => {
            setShowForgot(toForgot);
            setForgotEmail("");
            setForgotSent(false);
            setForgotError("");
            setFormAnim("idle");
        }, 200);
    };

    const handleForgotSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setForgotLoading(true);
        setForgotError("");
        try {
            await api.post("/auth/forgot-password", { email: forgotEmail });
            setForgotSent(true);
        } catch {
            setForgotSent(true);
        } finally {
            setForgotLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const response = await loginRequest({ email, password });
            const { token, user } = response.data;
            if (!token || !user?.role) { setError("Respuesta del servidor inválida"); return; }
            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(user));
            setUserRole(user.role);
            setLoginSuccess(true);
            playSuccessSound();
        } catch {
            setError("Correo o contraseña incorrectos.");
            playErrorSound();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={s.page}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                * { font-family: 'Inter', sans-serif; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes scaleIn { 0% { opacity: 0; transform: scale(0.85); } 100% { opacity: 1; transform: scale(1); } }
                @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
                @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
                @keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
                .left-panel { animation: fadeIn 0.8s ease both; }
                .right-panel { animation: fadeIn 0.8s ease 0.15s both; }
                .logo-anim { animation: scaleIn 0.6s ease 0.2s both; }
                .desc-anim { animation: slideUp 0.5s ease 0.35s both; }
                .divider-anim { animation: slideUp 0.4s ease 0.5s both; }
                .feat-anim:nth-child(1) { animation: slideUp 0.4s ease 0.55s both; }
                .feat-anim:nth-child(2) { animation: slideUp 0.4s ease 0.65s both; }
                .feat-anim:nth-child(3) { animation: slideUp 0.4s ease 0.75s both; }
                .footer-anim { animation: slideUp 0.4s ease 0.85s both; }
                .avatar-anim { animation: scaleIn 0.5s ease 0.3s both; }
                .title-anim { animation: slideDown 0.4s ease 0.4s both; }
                .sub-anim { animation: slideUp 0.4s ease 0.5s both; }
                .field-anim:nth-child(1) { animation: slideUp 0.4s ease 0.55s both; }
                .field-anim:nth-child(2) { animation: slideUp 0.4s ease 0.65s both; }
                .btn-anim { animation: slideUp 0.4s ease 0.75s both; }
                .copy-anim { animation: fadeIn 0.4s ease 0.9s both; }
                .error-shake { animation: shake 0.4s ease both; }
                .input-focus:focus { border-color: ${GOLD} !important; box-shadow: 0 0 0 4px rgba(212,175,55,0.08) !important; background: #fff !important; }
                .btn-main { transition: all 0.25s ease; position: relative; overflow: hidden; }
                .btn-main:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(212,175,55,0.35); }
                .btn-main:active { transform: translateY(0); box-shadow: 0 2px 8px rgba(212,175,55,0.2); }
                .btn-main::after { content: ''; position: absolute; inset: 0; background: linear-gradient(120deg, transparent, rgba(255,255,255,0.2), transparent); background-size: 200% 100%; }
                .btn-main:hover::after { animation: shimmer 0.8s ease; }
                .float-icon { animation: float 3s ease-in-out infinite; }
                @keyframes overlayFadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes circleScale { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
                @keyframes ringDraw { to { stroke-dashoffset: 0; } }
                @keyframes checkDraw { to { stroke-dashoffset: 0; } }
                @keyframes logoPop { 0% { opacity: 0; transform: scale(0.3); } 60% { opacity: 1; transform: scale(1.1); } 100% { opacity: 1; transform: scale(1); } }
                @keyframes textSlideUp { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
                .form-wrap { transition: opacity 0.2s ease, transform 0.2s ease; }
                .form-wrap.out { opacity: 0; transform: scale(0.97) translateY(-6px); }
                .form-wrap.idle { opacity: 1; transform: scale(1) translateY(0); }
                .success-circle { animation: circleScale 0.5s ease 0.1s both; }
                .success-ring { animation: ringDraw 0.5s ease-in 0.5s forwards; }
                .success-check { animation: checkDraw 0.35s ease-in 0.9s forwards; }
                .success-logo { animation: logoPop 0.5s ease 0.05s both; }
                .success-text { animation: textSlideUp 0.4s ease 0.55s both; }
            `}</style>

            <LeftPanel />

            {/* ── Panel derecho ── */}
            <div className="right-panel" style={s.right}>
                <div style={s.rightInner}>
                    <div style={s.card}>
                        <div style={s.cardAccent} />
                        <div className={`form-wrap ${formAnim}`} style={s.formWrap}>
                            <div className="avatar-anim" style={s.avatar}>
                                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="8" r="4" />
                                    <path d="M20 21a8 8 0 1 0-16 0" />
                                </svg>
                            </div>
                            <div className="title-anim">
                                <p style={s.title}>{showForgot ? "¿Olvidaste tu contraseña?" : "Inicio de sesión"}</p>
                            </div>
                            <div className="sub-anim">
                                <p style={s.sub}>{showForgot ? "Te enviaremos un enlace para restablecerla." : "Ingresa con tus credenciales"}</p>
                            </div>

                            {!showForgot && error && (
                                <div className="error-shake" style={s.errorBox}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                    {error}
                                </div>
                            )}

                            {showForgot ? (
                                <form onSubmit={handleForgotSubmit} style={s.form} key="forgot">
                                    <div className="field-anim" style={s.field}>
                                        <label style={s.label}>Correo electrónico</label>
                                        <div style={s.inputIconWrap}>
                                            <svg style={s.inputIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                                <polyline points="22,6 12,13 2,6"/>
                                            </svg>
                                            <input
                                                type="email"
                                                value={forgotEmail}
                                                onChange={(e) => { setForgotEmail(e.target.value); setForgotError(""); }}
                                                placeholder="tu@correo.com"
                                                className="input-focus"
                                                style={s.input}
                                                required autoComplete="email"
                                            />
                                        </div>
                                    </div>

                                    {forgotError && (
                                        <div className="error-shake" style={s.errorBox}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                            {forgotError}
                                        </div>
                                    )}

                                    {forgotSent ? (
                                        <>
                                            <div style={s.successBox}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3a7d44" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                                Enlace enviado correctamente.
                                            </div>
                                            <p style={{ fontSize: 12, color: "#bbb", margin: "8px 0 0", lineHeight: 1.6, textAlign: "center" }}>
                                                Revisa tu correo y sigue las instrucciones.
                                            </p>
                                        </>
                                    ) : (
                                        <div className="btn-anim">
                                            <button type="submit" className="btn-main" style={s.btn} disabled={forgotLoading}>
                                                {forgotLoading ? (
                                                    <><span style={s.spinner} />Enviando…</>
                                                ) : (
                                                    "Enviar enlace"
                                                )}
                                            </button>
                                        </div>
                                    )}

                                    <button type="button" onClick={() => switchForm(false)} style={s.backLink}>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                                        </svg>
                                        Volver al inicio de sesión
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleSubmit} style={s.form} key="login">
                                    <div className="field-anim" style={s.field}>
                                        <label style={s.label}>Correo electrónico</label>
                                        <div style={s.inputIconWrap}>
                                            <svg style={s.inputIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                                <polyline points="22,6 12,13 2,6"/>
                                            </svg>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                                                placeholder="tu@correo.com"
                                                className="input-focus"
                                                style={s.input}
                                                required autoComplete="email"
                                            />
                                        </div>
                                    </div>
                                    <div className="field-anim" style={s.field}>
                                        <label style={s.label}>Contraseña</label>
                                        <div style={s.inputIconWrap}>
                                            <svg style={s.inputIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                            </svg>
                                            <input
                                                type={showPass ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                                                placeholder="••••••••"
                                                className="input-focus"
                                                style={{ ...s.input, paddingRight: 44 }}
                                                required autoComplete="current-password"
                                            />
                                            <button
                                                type="button"
                                                style={s.eyeBtn}
                                                onClick={() => setShowPass(!showPass)}
                                                tabIndex={-1}
                                                aria-label={showPass ? "Ocultar" : "Mostrar"}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                    {showPass
                                                        ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                                                        : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                                                    }
                                                </svg>
                                            </button>
                                        </div>
                                        <button type="button" onClick={() => switchForm(true)} style={s.forgotLink}>
                                            Olvidé contraseña
                                        </button>
                                    </div>
                                    <div className="btn-anim">
                                        <button type="submit" className="btn-main" style={s.btn} disabled={loading}>
                                            {loading ? (
                                                <><span style={s.spinner} />Ingresando…</>
                                            ) : (
                                                <>
                                                    <span>Iniciar sesión</span>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 5"/>
                                                    </svg>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                    <p className="copy-anim" style={s.copy}>ZenithGym &copy; {new Date().getFullYear()}</p>
                </div>
            </div>

            {/* ── Login success overlay ── */}
            {loginSuccess && (
                <div style={s.successOverlay}>
                    <div style={s.successInner}>
                        <div className="success-circle" style={s.successCircle}>
                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                                <circle cx="24" cy="24" r="22" stroke={GOLD} strokeWidth="2.5" strokeDasharray="138" strokeDashoffset="138" className="success-ring" />
                                <polyline points="14,24 21,31 34,18" stroke={GOLD} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="40" strokeDashoffset="40" className="success-check" />
                            </svg>
                        </div>
                        <img src="/logogym.png" alt="ZenithGym" className="success-logo" style={s.successLogo} />
                        <p className="success-text" style={s.successText}>Bienvenido</p>
                    </div>
                </div>
            )}
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    page: {
        minHeight: "100svh", display: "flex",
        background: "#fafafa",
    },
    /* ── Panel derecho ── */
    right: {
        width: "42%", display: "flex", alignItems: "center",
        justifyContent: "center", padding: "48px 32px",
        background: "#fafafa",
    },
    rightInner: {
        width: "100%", maxWidth: 370,
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 24,
    },
    card: {
        width: "100%",
        background: "#fff",
        borderRadius: 16,
        border: "1px solid #f0f0f0",
        padding: "36px 32px 38px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.03)",
        position: "relative",
    },
    cardAccent: {
        position: "absolute", top: 0, left: 28, right: 28,
        height: 2,
        background: `linear-gradient(90deg, transparent, ${GOLD}40, transparent)`,
        borderRadius: "0 0 2px 2px",
    },
    avatar: {
        width: 92, height: 92, borderRadius: "50%",
        background: `rgba(212,175,55,0.06)`,
        border: `1.5px solid rgba(212,175,55,0.25)`,
        display: "flex", alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 20px",
    },
    title: {
        fontSize: 20, fontWeight: 700, color: "#0a0a0a",
        margin: 0, textAlign: "center" as const,
        letterSpacing: -0.3,
    },
    sub: {
        fontSize: 14, color: "#aaa",
        margin: "6px 0 26px", textAlign: "center" as const,
        fontWeight: 400,
    },

    formWrap: { display: "flex", flexDirection: "column" as const },
    form: { display: "flex", flexDirection: "column", gap: 12 },
    field: { display: "flex", flexDirection: "column", gap: 5 },
    label: {
        fontSize: 13, fontWeight: 500, color: "#888",
    },
    forgotLink: {
        fontSize: 13, color: "#999", textDecoration: "underline",
        marginTop: 4, alignSelf: "center",
        background: "none", border: "none", cursor: "pointer", padding: 0,
        fontFamily: "inherit",
    },
    inputIconWrap: { position: "relative", display: "flex", alignItems: "center" },
    inputIcon: {
        position: "absolute", left: 11, zIndex: 1,
        pointerEvents: "none",
    },
    input: {
        background: "#f7f7f7",
        border: "1px solid #eee",
        borderRadius: 8,
        padding: "12px 14px 12px 38px",
        fontSize: 15,
        color: "#0a0a0a",
        outline: "none",
        width: "100%",
        fontFamily: "inherit",
        boxSizing: "border-box",
        transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
    },
    eyeBtn: {
        position: "absolute", right: 8, top: "50%",
        transform: "translateY(-50%)",
        background: "none", border: "none",
        cursor: "pointer", padding: 4, display: "flex",
        alignItems: "center",
    },
    errorBox: {
        display: "flex", alignItems: "center", gap: 8,
        background: "#fef2f2",
        border: "1px solid #fecaca",
        borderRadius: 8, padding: "9px 12px",
        fontSize: 12, color: "#dc2626", marginBottom: 2,
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
    spinner: {
        display: "inline-block", width: 13, height: 13,
        border: "2px solid rgba(255,255,255,0.3)",
        borderTopColor: "#fff", borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
    },
    copy: {
        fontSize: 10, color: "#ccc", margin: 0,
    },
    successBox: {
        display: "flex", alignItems: "center", gap: 8,
        background: "#F0F7F1",
        borderRadius: 8, padding: "10px 12px",
        fontSize: 12, color: "#3a7d44", marginTop: 4,
    },
    backLink: {
        background: "none", border: "none",
        fontSize: 13, color: "#999",
        display: "flex", alignItems: "center",
        justifyContent: "center", gap: 4,
        cursor: "pointer", padding: "8px 0 0",
        textDecoration: "underline",
        marginTop: 4,
    },

    /* ── Login success overlay ── */
    successOverlay: {
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(7,7,7,0.92)",
        backdropFilter: "blur(8px)",
    },
    successInner: {
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 32,
    },
    successCircle: {
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 96, height: 96, borderRadius: "50%",
        background: "rgba(212,175,55,0.06)",
        border: "1px solid rgba(212,175,55,0.12)",
    },
    successLogo: {
        height: 80, opacity: 0.9,
    },
    successText: {
        margin: 0, fontSize: 24, fontWeight: 700,
        color: "#fff", letterSpacing: -0.5,
    },
};