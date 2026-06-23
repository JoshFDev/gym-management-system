import { useState } from "react";
import { registerRequest } from "../services/auth.service";
import PageHeader from "../components/PageHeader";
import GymButton from "../components/GymButton";
import type { UserRole } from "../hooks/useAuth";

const ROLE_LABEL: Record<UserRole, string> = {
    admin:        "Administrador",
    receptionist: "Recepcionista",
    trainer:      "Entrenador",
};

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
    admin:        ["Dashboard", "Miembros", "Planes", "Suscripciones", "Pagos", "Asistencia", "Usuarios"],
    receptionist: ["Dashboard", "Miembros", "Suscripciones", "Pagos", "Asistencia"],
    trainer:      ["Miembros", "Asistencia"],
};

const ROLE_ICON: Record<UserRole, string> = {
    admin:        "ti-shield-lock",
    receptionist: "ti-headset",
    trainer:      "ti-barbell",
};

export default function UsersPage() {
    const [showForm,  setShowForm]  = useState(false);
    const [loading,   setLoading]   = useState(false);
    const [success,   setSuccess]   = useState("");
    const [error,     setError]     = useState("");

    const [firstName, setFirstName] = useState("");
    const [lastName,  setLastName]  = useState("");
    const [email,     setEmail]     = useState("");
    const [password,  setPassword]  = useState("");
    const [role,      setRole]      = useState<UserRole>("receptionist");
    const [phone,     setPhone]     = useState("");

    const clearForm = () => {
        setFirstName(""); setLastName(""); setEmail("");
        setPassword(""); setRole("receptionist"); setPhone("");
        setError("");
        setShowForm(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError(""); setSuccess("");
        try {
            await registerRequest({ firstName, lastName, email, password, role, phone });
            setSuccess(`Usuario "${firstName} ${lastName}" creado correctamente.`);
            clearForm();
        } catch {
            setError("No se pudo crear el usuario. Verifica los datos.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={s.page}>
            <PageHeader
                title="Usuarios"
                action={
                    <GymButton icon="ti-plus" onClick={() => { clearForm(); setShowForm(true); }}>
                        Nuevo usuario
                    </GymButton>
                }
            />

            <div style={s.content}>

                {success && (
                    <div style={s.successBox}>
                        <i className="ti ti-circle-check" style={{ fontSize: 14 }} aria-hidden />
                        {success}
                    </div>
                )}

                {showForm && (
                    <div style={s.card}>
                        <p style={s.formTitle}>Nuevo usuario del sistema</p>
                        <form onSubmit={handleSubmit}>
                            <div style={s.formGrid}>
                                <Field label="Nombre *">
                                    <input style={s.input} placeholder="Carlos" value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)} required />
                                </Field>
                                <Field label="Apellido *">
                                    <input style={s.input} placeholder="Reyes" value={lastName}
                                        onChange={(e) => setLastName(e.target.value)} required />
                                </Field>
                                <Field label="Correo *">
                                    <input style={s.input} type="email" placeholder="correo@ejemplo.com"
                                        value={email} onChange={(e) => setEmail(e.target.value)} required />
                                </Field>
                                <Field label="Contraseña *">
                                    <input style={s.input} type="password" placeholder="Mínimo 8 caracteres"
                                        value={password} onChange={(e) => setPassword(e.target.value)} required />
                                </Field>
                                <Field label="Teléfono">
                                    <input style={s.input} placeholder="55 1234 5678"
                                        value={phone} onChange={(e) => setPhone(e.target.value)} />
                                </Field>
                                <Field label="Rol *">
                                    <select style={s.input} value={role}
                                        onChange={(e) => setRole(e.target.value as UserRole)}>
                                        <option value="admin">Administrador</option>
                                        <option value="receptionist">Recepcionista</option>
                                        <option value="trainer">Entrenador</option>
                                    </select>
                                </Field>
                            </div>

                            {/* Permisos del rol seleccionado */}
                            <div style={s.permBox}>
                                <p style={s.permTitle}>
                                    <i className={`ti ${ROLE_ICON[role]}`} style={{ fontSize: 13 }} aria-hidden />
                                    {ROLE_LABEL[role]} — acceso a:
                                </p>
                                <div style={s.permList}>
                                    {ROLE_PERMISSIONS[role].map((p) => (
                                        <span key={p} style={s.permTag}>{p}</span>
                                    ))}
                                </div>
                            </div>

                            {error && (
                                <div style={s.errorBox}>
                                    <i className="ti ti-alert-circle" style={{ fontSize: 13 }} aria-hidden />
                                    {error}
                                </div>
                            )}

                            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                                <GymButton type="submit" disabled={loading}>
                                    {loading ? "Creando..." : "Crear usuario"}
                                </GymButton>
                                <GymButton type="button" variant="ghost" onClick={clearForm}>
                                    Cancelar
                                </GymButton>
                            </div>
                        </form>
                    </div>
                )}

                {/* Tarjetas de roles — visibles cuando no hay form */}
                {!showForm && (
                    <div style={s.rolesGrid}>
                        {(Object.keys(ROLE_PERMISSIONS) as UserRole[]).map((r) => (
                            <div key={r} style={s.roleCard}>
                                <div style={s.roleHeader}>
                                    <div style={s.roleIconWrap}>
                                        <i className={`ti ${ROLE_ICON[r]}`} style={{ fontSize: 15, color: "#888" }} aria-hidden />
                                    </div>
                                    <p style={s.roleTitle}>{ROLE_LABEL[r]}</p>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
                                    {ROLE_PERMISSIONS[r].map((p) => (
                                        <div key={p} style={s.permRow}>
                                            <i className="ti ti-check" style={{ fontSize: 12, color: "#3a7d44" }} aria-hidden />
                                            <span style={{ fontSize: 12, color: "#888" }}>{p}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: "#888" }}>{label}</label>
            {children}
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    page:        { display: "flex", flexDirection: "column", minHeight: "100%" },
    content:     { padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14 },
    card:        { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, padding: 20 },
    formTitle:   { fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 16 },
    formGrid:    { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 },
    input:       { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 6, padding: "8px 12px", fontSize: 13, color: "#1a1a1a", outline: "none", width: "100%", fontFamily: "inherit" },
    permBox:     { marginTop: 16, padding: "12px 14px", background: "#F7F7F6", borderRadius: 6 },
    permTitle:   { fontSize: 12, fontWeight: 500, color: "#1a1a1a", margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6 },
    permList:    { display: "flex", flexWrap: "wrap", gap: 6 },
    permTag:     { fontSize: 11, padding: "2px 8px", background: "#fff", border: "1px solid #E5E4E2", borderRadius: 20, color: "#888" },
    rolesGrid:   { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 },
    roleCard:    { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, padding: 16 },
    roleHeader:  { display: "flex", alignItems: "center", gap: 10 },
    roleIconWrap:{ width: 32, height: 32, borderRadius: 8, background: "#F7F7F6", display: "flex", alignItems: "center", justifyContent: "center" },
    roleTitle:   { fontSize: 13, fontWeight: 600, color: "#1a1a1a", margin: 0 },
    permRow:     { display: "flex", alignItems: "center", gap: 8 },
    successBox:  { display: "flex", alignItems: "center", gap: 8, background: "#F0F7F1", border: "1px solid #bbf7d0", borderRadius: 6, padding: "10px 12px", fontSize: 13, color: "#3a7d44" },
    errorBox:    { display: "flex", alignItems: "center", gap: 8, background: "#FFF4F0", border: "1px solid #fecaca", borderRadius: 6, padding: "10px 12px", fontSize: 13, color: "#c0392b", marginTop: 12 },
};