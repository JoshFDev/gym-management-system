import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginRequest } from "../services/auth.service";

export default function LoginPage() {
    const [email,    setEmail]    = useState("");
    const [password, setPassword] = useState("");
    const [error,    setError]    = useState("");
    const [loading,  setLoading]  = useState(false);
    const [showPass, setShowPass] = useState(false);
    const navigate = useNavigate();

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
            navigate(user.role === "trainer" ? "/members" : "/dashboard");
        } catch {
            setError("Correo o contraseña incorrectos.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={s.page}>
            {/* ── Panel izquierdo oscuro ── */}
            <div style={s.left}>
                <div style={s.leftInner}>
                    <p style={s.brand}>Gym Manager</p>
                    <p style={s.tagline}>Administra tu gimnasio de forma simple y eficiente.</p>
                    <div style={s.roleList}>
                        {[
                            { icon: "ti-shield-lock", label: "Administrador",  desc: "Acceso completo" },
                            { icon: "ti-headset",     label: "Recepcionista",  desc: "Miembros, pagos y asistencia" },
                            { icon: "ti-barbell",     label: "Entrenador",     desc: "Miembros y asistencia" },
                        ].map((r) => (
                            <div key={r.label} style={s.roleItem}>
                                <i className={`ti ${r.icon}`} style={{ fontSize: 16, color: "#444", flexShrink: 0 }} aria-hidden />
                                <div>
                                    <p style={s.roleLabel}>{r.label}</p>
                                    <p style={s.roleDesc}>{r.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Panel derecho ── */}
            <div style={s.right}>
                <div style={s.card}>
                    <div style={s.logo}>
                        <p style={s.logoName}>Bienvenido</p>
                        <p style={s.logoTag}>Ingresa tus credenciales para continuar</p>
                    </div>

                    {error && (
                        <div style={s.errorBox}>
                            <i className="ti ti-alert-circle" style={{ fontSize: 14 }} aria-hidden />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={s.form}>
                        <div style={s.field}>
                            <label style={s.label}>Correo electrónico</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                                placeholder="correo@ejemplo.com"
                                style={{ ...s.input, ...(error ? s.inputError : {}) }}
                                required autoComplete="email"
                            />
                        </div>

                        <div style={s.field}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <label style={s.label}>Contraseña</label>
                                {/* ── Enlace "Olvidé mi contraseña" ── */}
                                <Link to="/forgot-password" style={s.forgotLink}>
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>
                            <div style={s.inputWrap}>
                                <input
                                    type={showPass ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                                    placeholder="••••••••"
                                    style={{ ...s.input, ...s.inputPad, ...(error ? s.inputError : {}) }}
                                    required autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    style={s.eyeBtn}
                                    onClick={() => setShowPass(!showPass)}
                                    tabIndex={-1}
                                    aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                                >
                                    <i className={`ti ${showPass ? "ti-eye-off" : "ti-eye"}`} style={{ fontSize: 15, color: "#bbb" }} aria-hidden />
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}
                            disabled={loading}
                        >
                            {loading ? "Ingresando..." : "Iniciar sesión"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    page:        { minHeight: "100svh", display: "flex", background: "#F7F7F6" },
    left:        { width: "45%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", padding: 48 },
    leftInner:   { maxWidth: 300 },
    brand:       { fontSize: 22, fontWeight: 600, color: "#fff", letterSpacing: -0.5, marginBottom: 10 },
    tagline:     { fontSize: 14, color: "#555", lineHeight: 1.6, marginBottom: 36 },
    roleList:    { display: "flex", flexDirection: "column", gap: 16 },
    roleItem:    { display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", background: "#222", borderRadius: 8 },
    roleLabel:   { fontSize: 13, fontWeight: 500, color: "#fff", margin: 0 },
    roleDesc:    { fontSize: 11, color: "#555", margin: "3px 0 0" },
    right:       { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 },
    card:        { width: "100%", maxWidth: 360 },
    logo:        { marginBottom: 28 },
    logoName:    { fontSize: 20, fontWeight: 600, color: "#1a1a1a", letterSpacing: -0.3, margin: 0 },
    logoTag:     { fontSize: 13, color: "#bbb", marginTop: 6, margin: 0 },
    form:        { display: "flex", flexDirection: "column", gap: 16 },
    field:       { display: "flex", flexDirection: "column", gap: 6 },
    label:       { fontSize: 11, fontWeight: 500, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 },
    forgotLink:  { fontSize: 11, color: "#888", textDecoration: "none", marginBottom: 1 },
    inputWrap:   { position: "relative" },
    input:       { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 6, padding: "10px 12px", fontSize: 13, color: "#1a1a1a", outline: "none", width: "100%", fontFamily: "inherit", boxSizing: "border-box" },
    inputPad:    { paddingRight: 40 },
    inputError:  { borderColor: "#fca5a5" },
    eyeBtn:      { position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center" },
    errorBox:    { display: "flex", alignItems: "center", gap: 8, background: "#FFF4F0", border: "1px solid #fecaca", borderRadius: 6, padding: "10px 12px", fontSize: 13, color: "#c0392b", marginBottom: 16 },
    btn:         { background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 6, padding: "11px", fontSize: 13, fontWeight: 500, cursor: "pointer", width: "100%", marginTop: 4, fontFamily: "inherit" },
};