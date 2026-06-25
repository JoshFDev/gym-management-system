import { useEffect, useState } from "react";
import { createAttendance, getAttendances } from "../services/attendance.service";
import { getMembers } from "../services/member.service";
import PageHeader from "../components/PageHeader";
import GymButton from "../components/GymButton";

interface Attendance {
    id: string;
    member: { id: string; fullName: string; email?: string; phone?: string };
    checkInAt: string;
    status: string;
    createdAt: string;
    updatedAt: string;
}

interface Member {
    id: string;
    firstName: string;
    lastName: string;
    membershipStatus: string;
}

const statusStyle = (status: string): React.CSSProperties => ({
    present: { background: "#F0F7F1", color: "#3a7d44" },
    absent:  { background: "#FFF4F0", color: "#c0392b" },
    late:    { background: "#FFFBF0", color: "#b7791f" },
}[status] ?? { background: "#F0F0EE", color: "#888" });

const statusLabel: Record<string, string> = {
    present: "Presente", absent: "Ausente", late: "Tarde",
};

const fmtDateTime = (d: string) =>
    new Date(d).toLocaleString("es-MX", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });

const initials = (name: string) =>
    name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export default function AttendancePage() {
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const [members,     setMembers]     = useState<Member[]>([]);
    const [loading,     setLoading]     = useState(true);
    const [showForm,    setShowForm]    = useState(false);
    const [memberId,    setMemberId]    = useState("");
    const [submitting,  setSubmitting]  = useState(false);

    // Solo miembros activos pueden hacer check-in
    const activeMembers = members.filter((m) => m.membershipStatus === "active");

    const loadAttendances = async () => {
        const res = await getAttendances();
        setAttendances(res.data ?? []);
    };

    useEffect(() => {
        const init = async () => {
            try {
                const [attRes, membersRes] = await Promise.all([
                    getAttendances(),
                    getMembers(),
                ]);
                setAttendances(attRes.data ?? []);
                setMembers(membersRes.data ?? []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const clearForm = () => {
        setMemberId(""); setShowForm(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await createAttendance(memberId);
            clearForm();
            loadAttendances();
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    // Asistencias de hoy para el resumen
    const today = new Date().toDateString();
    const todayCount = attendances.filter(
        (a) => new Date(a.checkInAt).toDateString() === today
    ).length;

    return (
        <div style={s.page}>
            <PageHeader
                title="Asistencia"
                action={
                    <GymButton icon="ti-login" onClick={() => { clearForm(); setShowForm(true); }}>
                        Registrar entrada
                    </GymButton>
                }
            />

            <div style={s.content}>

                {/* Resumen del día */}
                <div style={s.summaryCard}>
                    <div style={s.summaryItem}>
                        <p style={s.summaryLabel}>Entradas hoy</p>
                        <p style={s.summaryValue}>{todayCount}</p>
                    </div>
                    <div style={s.summaryDivider} />
                    <div style={s.summaryItem}>
                        <p style={s.summaryLabel}>Total registros</p>
                        <p style={s.summaryValue}>{attendances.length}</p>
                    </div>
                    <div style={s.summaryDivider} />
                    <div style={s.summaryItem}>
                        <p style={s.summaryLabel}>Miembros activos</p>
                        <p style={s.summaryValue}>{activeMembers.length}</p>
                    </div>
                </div>

                {/* Formulario de check-in */}
                {showForm && (
                    <div style={s.card}>
                        <p style={s.formTitle}>Registrar entrada</p>
                        <p style={s.formDesc}>
                            Selecciona el miembro que está ingresando al gimnasio.
                            La hora se registra automáticamente.
                        </p>
                        <form onSubmit={handleSubmit}>
                            <div style={{ maxWidth: 360 }}>
                                <Field label="Miembro *">
                                    <select
                                        style={s.input}
                                        value={memberId}
                                        onChange={(e) => setMemberId(e.target.value)}
                                        required
                                    >
                                        <option value="">Seleccionar miembro</option>
                                        {activeMembers.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.firstName} {m.lastName}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                            </div>

                            {/* Preview de hora actual */}
                            <div style={s.timePreview}>
                                <i className="ti ti-clock" style={{ fontSize: 13, color: "#bbb" }} aria-hidden />
                                <span style={{ fontSize: 12, color: "#888" }}>
                                    Se registrará:{" "}
                                    <strong style={{ color: "#1a1a1a" }}>
                                        {new Date().toLocaleString("es-MX", {
                                            day: "2-digit", month: "short", year: "numeric",
                                            hour: "2-digit", minute: "2-digit",
                                        })}
                                    </strong>
                                </span>
                            </div>

                            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                                <GymButton type="submit" disabled={submitting}>
                                    {submitting ? "Registrando..." : "Confirmar entrada"}
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
                    <p style={s.empty}>Cargando asistencias...</p>
                ) : attendances.length === 0 ? (
                    <p style={s.empty}>No hay registros de asistencia.</p>
                ) : (
                    <div style={{ ...s.card, padding: 0 }}>
                        <table style={s.table}>
                            <thead>
                                <tr style={s.thead}>
                                    <th style={s.th}>Miembro</th>
                                    <th style={s.th}>Correo</th>
                                    <th style={s.th}>Teléfono</th>
                                    <th style={s.th}>Check-in</th>
                                    <th style={s.th}>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attendances.map((a) => (
                                    <tr key={a.id} style={s.row}>
                                        <td style={s.td}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <div style={s.avatar}>{initials(a.member.fullName)}</div>
                                                <span style={{ fontWeight: 500 }}>{a.member.fullName}</span>
                                            </div>
                                        </td>
                                        <td style={{ ...s.td, ...s.muted }}>{a.member.email ?? "—"}</td>
                                        <td style={{ ...s.td, ...s.muted }}>{a.member.phone ?? "—"}</td>
                                        <td style={{ ...s.td, ...s.muted }}>{fmtDateTime(a.checkInAt)}</td>
                                        <td style={s.td}>
                                            <span style={{ ...s.badge, ...statusStyle(a.status) }}>
                                                {statusLabel[a.status] ?? a.status}
                                            </span>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: "#888" }}>{label}</label>
            {children}
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    page:           { display: "flex", flexDirection: "column", minHeight: "100%" },
    content:        { padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14 },
    summaryCard:    { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, padding: "16px 24px", display: "flex", alignItems: "center", gap: 24 },
    summaryItem:    { display: "flex", flexDirection: "column", gap: 4 },
    summaryLabel:   { fontSize: 11, color: "#bbb", fontWeight: 500, margin: 0 },
    summaryValue:   { fontSize: 22, fontWeight: 600, color: "#1a1a1a", letterSpacing: -0.5, margin: 0 },
    summaryDivider: { width: 1, height: 36, background: "#E5E4E2" },
    card:           { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, padding: 20, overflow: "hidden" },
    formTitle:      { fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 4 },
    formDesc:       { fontSize: 12, color: "#888", marginBottom: 16 },
    input:          { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 6, padding: "8px 12px", fontSize: 13, color: "#1a1a1a", outline: "none", width: "100%", fontFamily: "inherit" },
    timePreview:    { display: "flex", alignItems: "center", gap: 6, marginTop: 10, padding: "8px 12px", background: "#F7F7F6", borderRadius: 6, width: "fit-content" },
    table:          { width: "100%", borderCollapse: "collapse" },
    thead:          { borderBottom: "1px solid #E5E4E2", background: "#FAFAFA" },
    th:             { padding: "10px 14px", fontSize: 11, fontWeight: 500, color: "#bbb", textAlign: "left", whiteSpace: "nowrap" },
    row:            { borderBottom: "1px solid #F0F0EE" },
    td:             { padding: "11px 14px", fontSize: 13, color: "#1a1a1a" },
    muted:          { color: "#888" },
    badge:          { display: "inline-flex", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500 },
    avatar:         { width: 28, height: 28, borderRadius: "50%", background: "#F0F0EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: "#666", flexShrink: 0 },
    empty:          { fontSize: 13, color: "#bbb", padding: "40px 0", textAlign: "center" },
};