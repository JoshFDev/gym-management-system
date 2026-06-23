import { useEffect, useState } from "react";
import { createMember, getMembers, updateMember } from "../services/member.service";
import PageHeader from "../components/PageHeader";
import GymButton from "../components/GymButton";

interface Member {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
    birthDate?: string;
    gender?: string;
    address?: string;
    emergencyContact?: string;
    membershipStatus: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

const statusStyle = (status: string): React.CSSProperties => ({
    active: { background: "#F0F7F1", color: "#3a7d44" },
    inactive: { background: "#F0F0EE", color: "#888" },
}[status] ?? { background: "#F0F0EE", color: "#888" });

const statusLabel: Record<string, string> = { active: "Activo", inactive: "Inactivo" };
const genderLabel: Record<string, string> = { male: "Masculino", female: "Femenino", other: "Otro" };

const initials = (first: string, last: string) =>
    `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();

export default function MembersPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Campos del formulario — todos los del DTO
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [gender, setGender] = useState("");
    const [birthDate, setBirthDate] = useState("");
    const [address, setAddress] = useState("");
    const [emergencyContact, setEmergencyContact] = useState("");
    const [notes, setNotes] = useState("");

    const loadMembers = async () => {
        const res = await getMembers();
        setMembers(res.data ?? []);
    };

    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const res = await getMembers();
                setMembers(res.data ?? []);
            } finally {
                setLoading(false);
            }
        };

        fetchMembers();
    }, []);

    const clearForm = () => {
        setFirstName(""); setLastName(""); setEmail(""); setPhone("");
        setGender(""); setBirthDate(""); setAddress("");
        setEmergencyContact(""); setNotes("");
        setEditingId(null); setShowForm(false);
    };

    const handleEdit = (m: Member) => {
        setEditingId(m.id);
        setFirstName(m.firstName);
        setLastName(m.lastName);
        setEmail(m.email ?? "");
        setPhone(m.phone);
        setGender(m.gender ?? "");
        setBirthDate(m.birthDate ? m.birthDate.slice(0, 10) : "");
        setAddress(m.address ?? "");
        setEmergencyContact(m.emergencyContact ?? "");
        setNotes(m.notes ?? "");
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const data = {
            firstName, lastName, email, phone, gender,
            ...(birthDate && { birthDate }),
            ...(address && { address }),
            ...(emergencyContact && { emergencyContact }),
            ...(notes && { notes }),
        };
        if (editingId) {
            await updateMember(editingId, data);
        } else {
            await createMember(data);
        }
        clearForm();
        loadMembers();
    };

    const handleToggleStatus = async (m: Member) => {
        const newStatus = m.membershipStatus === "active" ? "inactive" : "active";
        if (!window.confirm(`¿${newStatus === "active" ? "Activar" : "Desactivar"} este miembro?`)) return;
        await updateMember(m.id, { membershipStatus: newStatus });
        loadMembers();
    };

    return (
        <div style={s.page}>
            <PageHeader
                title="Miembros"
                action={
                    <GymButton icon="ti-plus" onClick={() => { clearForm(); setShowForm(true); }}>
                        Nuevo miembro
                    </GymButton>
                }
            />

            <div style={s.content}>

                {/* Formulario */}
                {showForm && (
                    <div style={s.card}>
                        <p style={s.formTitle}>{editingId ? "Editar miembro" : "Nuevo miembro"}</p>
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
                                <Field label="Teléfono *">
                                    <input style={s.input} placeholder="55 1234 5678" value={phone}
                                        onChange={(e) => setPhone(e.target.value)} required />
                                </Field>
                                <Field label="Correo electrónico">
                                    <input style={s.input} type="email" placeholder="correo@ejemplo.com"
                                        value={email} onChange={(e) => setEmail(e.target.value)} />
                                </Field>
                                <Field label="Género">
                                    <select style={s.input} value={gender} onChange={(e) => setGender(e.target.value)}>
                                        <option value="">Seleccionar</option>
                                        <option value="male">Masculino</option>
                                        <option value="female">Femenino</option>
                                        <option value="other">Otro</option>
                                    </select>
                                </Field>
                                <Field label="Fecha de nacimiento">
                                    <input style={s.input} type="date" value={birthDate}
                                        onChange={(e) => setBirthDate(e.target.value)} />
                                </Field>
                                <Field label="Dirección">
                                    <input style={s.input} placeholder="Calle, colonia..." value={address}
                                        onChange={(e) => setAddress(e.target.value)} />
                                </Field>
                                <Field label="Contacto de emergencia">
                                    <input style={s.input} placeholder="Nombre y teléfono" value={emergencyContact}
                                        onChange={(e) => setEmergencyContact(e.target.value)} />
                                </Field>
                                <Field label="Notas">
                                    <input style={s.input} placeholder="Notas adicionales" value={notes}
                                        onChange={(e) => setNotes(e.target.value)} />
                                </Field>
                            </div>
                            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                                <GymButton type="submit">
                                    {editingId ? "Guardar cambios" : "Crear miembro"}
                                </GymButton>
                                <GymButton type="button" variant="ghost" onClick={clearForm}>
                                    Cancelar
                                </GymButton>
                            </div>
                        </form>
                    </div>
                )}

                {/* Tabla */}
                {loading ? (
                    <p style={s.empty}>Cargando miembros...</p>
                ) : members.length === 0 ? (
                    <p style={s.empty}>No hay miembros registrados.</p>
                ) : (
                    <div style={{ ...s.card, padding: 0 }}>
                        <table style={s.table}>
                            <thead>
                                <tr style={s.thead}>
                                    <th style={s.th}>Miembro</th>
                                    <th style={s.th}>Correo</th>
                                    <th style={s.th}>Teléfono</th>
                                    <th style={s.th}>Género</th>
                                    <th style={s.th}>Estado</th>
                                    <th style={s.th}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {members.map((m) => (
                                    <tr key={m.id} style={s.row}>
                                        <td style={s.td}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <div style={s.avatar}>{initials(m.firstName, m.lastName)}</div>
                                                <div>
                                                    <p style={{ margin: 0, fontWeight: 500, fontSize: 13, color: "#1a1a1a" }}>
                                                        {m.firstName} {m.lastName}
                                                    </p>
                                                    {m.notes && (
                                                        <p style={{ margin: 0, fontSize: 11, color: "#bbb" }}>{m.notes}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ ...s.td, ...s.muted }}>{m.email ?? "—"}</td>
                                        <td style={{ ...s.td, ...s.muted }}>{m.phone}</td>
                                        <td style={{ ...s.td, ...s.muted }}>{genderLabel[m.gender ?? ""] ?? "—"}</td>
                                        <td style={s.td}>
                                            <span style={{ ...s.badge, ...statusStyle(m.membershipStatus) }}>
                                                {statusLabel[m.membershipStatus] ?? m.membershipStatus}
                                            </span>
                                        </td>
                                        <td style={s.td}>
                                            <div style={{ display: "flex", gap: 6 }}>
                                                <GymButton variant="ghost" onClick={() => handleEdit(m)}>
                                                    Editar
                                                </GymButton>
                                                <button
                                                    style={{
                                                        ...s.btnToggle,
                                                        color: m.membershipStatus === "active" ? "#c0392b" : "#3a7d44",
                                                        borderColor: m.membershipStatus === "active" ? "#fecaca" : "#bbf7d0",
                                                    }}
                                                    onClick={() => handleToggleStatus(m)}
                                                >
                                                    {m.membershipStatus === "active" ? "Desactivar" : "Activar"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
    page: { display: "flex", flexDirection: "column", minHeight: "100%" },
    content: { padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14 },
    card: { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, padding: 20, overflow: "hidden" },
    formTitle: { fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 16 },
    formGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 },
    input: { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 6, padding: "8px 12px", fontSize: 13, color: "#1a1a1a", outline: "none", width: "100%", fontFamily: "inherit" },
    table: { width: "100%", borderCollapse: "collapse" },
    thead: { borderBottom: "1px solid #E5E4E2", background: "#FAFAFA" },
    th: { padding: "10px 14px", fontSize: 11, fontWeight: 500, color: "#bbb", textAlign: "left", whiteSpace: "nowrap" },
    row: { borderBottom: "1px solid #F0F0EE" },
    td: { padding: "11px 14px", fontSize: 13, color: "#1a1a1a" },
    muted: { color: "#888" },
    badge: { display: "inline-flex", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500 },
    avatar: { width: 28, height: 28, borderRadius: "50%", background: "#F0F0EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: "#666", flexShrink: 0 },
    btnToggle: { background: "none", border: "1px solid #E5E4E2", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontFamily: "inherit", cursor: "pointer" },
    empty: { fontSize: 13, color: "#bbb", padding: "40px 0", textAlign: "center" },
};