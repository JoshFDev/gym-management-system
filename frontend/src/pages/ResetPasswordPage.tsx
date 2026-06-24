import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { resetPasswordRequest } from "../services/auth.service";

// ──────────────────────────────────────────────
// Utilidades
// ──────────────────────────────────────────────
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

// ──────────────────────────────────────────────
// Sub‑componente: barra de fuerza
// ──────────────────────────────────────────────
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
                            flex: 1,
                            height: 3,
                            borderRadius: 2,
                            background: password.length > 0 && i <= score
                                ? meta.color
                                : "#E5E4E2",
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

// ──────────────────────────────────────────────
// Sub‑componente: campo de contraseña
// ──────────────────────────────────────────────
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
            <label htmlFor={id} style={s.fieldLabel}>{label}</label>
            <div style={{ position: "relative" }}>
                <input
                    id={id}
                    type={visible ? "text" : "password"}
                    value={value}
                    placeholder={placeholder}
                    onChange={(e) => onChange(e.target.value)}
                    required
                    style={{
                        ...s.input,
                        borderColor: borderColor ?? "#E5E4E2",
                        paddingRight: 34,
                    }}
                />
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
                    style={s.eyeBtn}
                >
                    <i
                        className={`ti ${visible ? "ti-eye-off" : "ti-eye"}`}
                        style={{ fontSize: 15, color: "#bbb" }}
                        aria-hidden
                    />
                </button>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────
// Página principal
// ──────────────────────────────────────────────
export default function ResetPasswordPage() {
    const { token }   = useParams<{ token: string }>();
    const navigate    = useNavigate();

    const [password,  setPassword]  = useState("");
    const [confirm,   setConfirm]   = useState("");
    const [message,   setMessage]   = useState("");
    const [error,     setError]     = useState("");
    const [loading,   setLoading]   = useState(false);

    const passwordsMatch = password.length >= 8 && password === confirm;

    const confirmBorder =
        confirm.length === 0 ? "#E5E4E2"
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

            {/* Header */}
            <div style={s.header}>
                <span style={s.headerTitle}>GymAdmin</span>
                <div style={s.iconWrap}>
                    <i className="ti ti-lock" style={{ fontSize: 14, color: "#888" }} aria-hidden />
                </div>
            </div>

            {/* Content */}
            <div style={s.content}>
                <div style={s.card}>

                    {/* Card icon */}
                    <div style={s.cardIcon}>
                        <i className="ti ti-lock-open" style={{ fontSize: 18, color: "#888" }} aria-hidden />
                    </div>

                    <p style={s.cardTitle}>Restablecer contraseña</p>
                    <p style={s.cardSub}>Ingresa tu nueva contraseña para continuar</p>

                    <form onSubmit={handleSubmit} style={{ marginTop: 4 }}>

                        {/* Campo nueva contraseña + barra de fuerza */}
                        <PasswordInput
                            id="pw-new"
                            label="Nueva contraseña"
                            value={password}
                            placeholder="Mínimo 8 caracteres"
                            onChange={setPassword}
                        />
                        <StrengthBar password={password} />

                        <div style={{ marginTop: 14 }}>
                            <PasswordInput
                                id="pw-confirm"
                                label="Confirmar contraseña"
                                value={confirm}
                                placeholder="Repite la contraseña"
                                onChange={setConfirm}
                                borderColor={confirmBorder}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={!passwordsMatch || loading}
                            style={{
                                ...s.btn,
                                background: !passwordsMatch || loading ? "#E5E4E2" : "#1a1a1a",
                                color:      !passwordsMatch || loading ? "#bbb"    : "#fff",
                                cursor:     !passwordsMatch || loading ? "not-allowed" : "pointer",
                                marginTop: 18,
                            }}
                        >
                            <i
                                className={`ti ${loading ? "ti-loader" : "ti-check"}`}
                                style={{ fontSize: 14 }}
                                aria-hidden
                            />
                            {loading ? "Guardando..." : "Cambiar contraseña"}
                        </button>
                    </form>

                    {/* Mensajes de estado */}
                    {message && (
                        <div style={{ ...s.msg, background: "#F0F7F1", color: "#3a7d44" }}>
                            <i className="ti ti-circle-check" style={{ fontSize: 15, flexShrink: 0 }} aria-hidden />
                            {message}
                        </div>
                    )}
                    {error && (
                        <div style={{ ...s.msg, background: "#FFF4F0", color: "#c0392b" }}>
                            <i className="ti ti-alert-circle" style={{ fontSize: 15, flexShrink: 0 }} aria-hidden />
                            {error}
                        </div>
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

// ──────────────────────────────────────────────
// Estilos — misma paleta que el Dashboard
// ──────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
    page:       { display: "flex", flexDirection: "column", minHeight: "100vh", background: "#FAFAF9" },
    header:     { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", borderBottom: "1px solid #E5E4E2", background: "#fff" },
    headerTitle:{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" },
    iconWrap:   { width: 28, height: 28, borderRadius: 6, background: "#F7F7F6", display: "flex", alignItems: "center", justifyContent: "center" },
    content:    { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 28px" },
    card:       { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, padding: "28px 28px 24px", width: "100%", maxWidth: 380 },
    cardIcon:   { width: 40, height: 40, borderRadius: 8, background: "#F7F7F6", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 },
    cardTitle:  { fontSize: 15, fontWeight: 600, color: "#1a1a1a", margin: 0 },
    cardSub:    { fontSize: 11, color: "#bbb", margin: "4px 0 18px" },
    field:      { display: "flex", flexDirection: "column", gap: 5 },
    fieldLabel: { fontSize: 11, fontWeight: 500, color: "#888" },
    input:      { height: 36, border: "1px solid #E5E4E2", borderRadius: 6, padding: "0 10px", fontSize: 13, color: "#1a1a1a", background: "#fff", outline: "none", width: "100%", transition: "border-color 0.15s" },
    eyeBtn:     { position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 },
    btn:        { width: "100%", height: 36, borderRadius: 6, border: "none", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "background 0.15s" },
    msg:        { fontSize: 12, padding: "10px 12px", borderRadius: 6, marginTop: 14, display: "flex", alignItems: "center", gap: 7 },
    divider:    { border: "none", borderTop: "1px solid #E5E4E2", margin: "18px 0 14px" },
    backLink:   { width: "100%", background: "none", border: "none", fontSize: 12, color: "#888", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer", padding: 0 },
};