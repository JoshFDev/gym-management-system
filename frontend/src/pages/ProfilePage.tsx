import { useState } from "react";
import PageHeader from "../components/PageHeader";
import { getStoredUser } from "../hooks/useAuth";
import api from "../api/axios";

// PUT /auth/change-password  →  { currentPassword, newPassword }
const changePasswordRequest = async (currentPassword: string, newPassword: string) => {
    const response = await api.put("/auth/change-password", { currentPassword, newPassword });
    return response.data;
};

// ──────────────────────────────────────────────
// Utilidades de fuerza de contraseña
// ──────────────────────────────────────────────
const getStrength = (pw: string): number => {
    let score = 0;
    if (pw.length >= 8)          score++;
    if (/[A-Z]/.test(pw))        score++;
    if (/[0-9]/.test(pw))        score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
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
                    <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: password.length > 0 && i <= score ? meta.color : "#E5E4E2",
                        transition: "background 0.2s",
                    }} />
                ))}
            </div>
            {password.length > 0 && (
                <p style={{ fontSize: 10, color: meta.color, marginTop: 4 }}>{meta.label}</p>
            )}
        </>
    );
}

function PasswordField({
    id, label, value, placeholder, onChange, borderColor,
}: {
    id: string; label: string; value: string;
    placeholder?: string; onChange: (v: string) => void;
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
                    placeholder={placeholder ?? "••••••••"}
                    onChange={(e) => onChange(e.target.value)}
                    style={{ ...s.input, borderColor: borderColor ?? "#E5E4E2", paddingRight: 34 }}
                />
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? "Ocultar" : "Mostrar"}
                    style={s.eyeBtn}
                >
                    <i className={`ti ${visible ? "ti-eye-off" : "ti-eye"}`} style={{ fontSize: 15, color: "#bbb" }} aria-hidden />
                </button>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────
// Página principal
// ──────────────────────────────────────────────
const ROLE_LABEL: Record<string, string> = {
    admin:        "Administrador",
    receptionist: "Recepcionista",
    trainer:      "Entrenador",
};
const ROLE_ICON: Record<string, string> = {
    admin:        "ti-shield-lock",
    receptionist: "ti-headset",
    trainer:      "ti-barbell",
};

const initials = (first: string, last: string) =>
    `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();

export default function ProfilePage() {
    const user = getStoredUser();

    const [current, setCurrent] = useState("");
    const [newPw,   setNewPw]   = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState("");
    const [error,   setError]   = useState("");

    const strength      = getStrength(newPw);
    const passwordsOk   = newPw.length >= 8 && newPw === confirm && strength >= 2;
    const confirmBorder = confirm.length === 0 ? "#E5E4E2" : newPw === confirm ? "#3a7d44" : "#c0392b";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordsOk) return;
        setLoading(true);
        setError("");
        setSuccess("");
        try {
            await changePasswordRequest(current, newPw);
            setSuccess("Contraseña actualizada correctamente.");
            setCurrent(""); setNewPw(""); setConfirm("");
        } catch {
            setError("La contraseña actual no es correcta.");
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div style={s.page}>
            <PageHeader title="Mi perfil" />

            <div style={s.content}>
                {/* ── Tarjeta de información ── */}
                <div style={s.card}>
                    <p style={s.sectionTitle}>Información de cuenta</p>
                    <div style={s.profileRow}>
                        <div style={s.avatar}>
                            {initials(user.firstName, user.lastName)}
                        </div>
                        <div>
                            <p style={s.name}>{user.firstName} {user.lastName}</p>
                            <p style={s.email}>{user.email}</p>
                        </div>
                        <div style={s.roleBadge}>
                            <i className={`ti ${ROLE_ICON[user.role] ?? "ti-user"}`} style={{ fontSize: 12 }} aria-hidden />
                            {ROLE_LABEL[user.role] ?? user.role}
                        </div>
                    </div>
                </div>

                {/* ── Tarjeta de cambio de contraseña ── */}
                <div style={s.card}>
                    <p style={s.sectionTitle}>Cambiar contraseña</p>
                    <p style={s.sectionSub}>
                        Por seguridad, usa una contraseña de al menos 8 caracteres con mayúsculas y números.
                    </p>

                    <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
                        <div style={s.formGrid}>
                            <PasswordField
                                id="current-pw"
                                label="Contraseña actual *"
                                value={current}
                                onChange={setCurrent}
                            />

                            <div />  {/* espacio vacío en la grid para alinear */}

                            <div>
                                <PasswordField
                                    id="new-pw"
                                    label="Nueva contraseña *"
                                    value={newPw}
                                    placeholder="Mínimo 8 caracteres"
                                    onChange={setNewPw}
                                />
                                <StrengthBar password={newPw} />
                            </div>

                            <PasswordField
                                id="confirm-pw"
                                label="Confirmar nueva contraseña *"
                                value={confirm}
                                placeholder="Repite la contraseña"
                                onChange={setConfirm}
                                borderColor={confirmBorder}
                            />
                        </div>

                        {success && (
                            <div style={{ ...s.alertBox, background: "#F0F7F1", color: "#3a7d44" }}>
                                <i className="ti ti-circle-check" style={{ fontSize: 14, flexShrink: 0 }} aria-hidden />
                                {success}
                            </div>
                        )}
                        {error && (
                            <div style={{ ...s.alertBox, background: "#FFF4F0", color: "#c0392b" }}>
                                <i className="ti ti-alert-circle" style={{ fontSize: 14, flexShrink: 0 }} aria-hidden />
                                {error}
                            </div>
                        )}

                        <div style={{ marginTop: 20 }}>
                            <button
                                type="submit"
                                disabled={!passwordsOk || !current || loading}
                                style={{
                                    ...s.btn,
                                    background: !passwordsOk || !current || loading ? "#E5E4E2" : "#1a1a1a",
                                    color:      !passwordsOk || !current || loading ? "#bbb"    : "#fff",
                                    cursor:     !passwordsOk || !current || loading ? "not-allowed" : "pointer",
                                }}
                            >
                                <i className={`ti ${loading ? "ti-loader" : "ti-check"}`} style={{ fontSize: 14 }} aria-hidden />
                                {loading ? "Guardando..." : "Actualizar contraseña"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    page:        { display: "flex", flexDirection: "column", minHeight: "100%" },
    content:     { padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14 },
    card:        { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, padding: "20px 22px" },
    sectionTitle:{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", margin: 0 },
    sectionSub:  { fontSize: 11, color: "#bbb", margin: "4px 0 0" },
    profileRow:  { display: "flex", alignItems: "center", gap: 14, marginTop: 16 },
    avatar:      { width: 40, height: 40, borderRadius: "50%", background: "#F0F0EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: "#666", flexShrink: 0 },
    name:        { fontSize: 14, fontWeight: 600, color: "#1a1a1a", margin: 0 },
    email:       { fontSize: 12, color: "#888", margin: "2px 0 0" },
    roleBadge:   { marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 500, color: "#888", background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 20, padding: "4px 10px" },
    formGrid:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
    field:       { display: "flex", flexDirection: "column", gap: 5 },
    fieldLabel:  { fontSize: 11, fontWeight: 500, color: "#888" },
    input:       { height: 36, border: "1px solid #E5E4E2", borderRadius: 6, padding: "0 10px", fontSize: 13, color: "#1a1a1a", background: "#fff", outline: "none", width: "100%", boxSizing: "border-box", transition: "border-color 0.15s" },
    eyeBtn:      { position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 },
    alertBox:    { display: "flex", alignItems: "center", gap: 8, borderRadius: 6, padding: "10px 12px", fontSize: 12, marginTop: 14 },
    btn:         { height: 36, borderRadius: 6, border: "none", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6, padding: "0 18px", transition: "background 0.15s" },
};