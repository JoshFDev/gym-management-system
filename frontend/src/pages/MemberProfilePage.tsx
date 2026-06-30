import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { getMemberById, sendQRCodeEmail } from "../services/member.service";
import { getAttendances } from "../services/attendance.service";
import { getPayments } from "../services/payment.service";
import PageHeader from "../components/PageHeader";
import GymButton from "../components/GymButton";
import { useToast } from "../hooks/useToast";

interface Member {
    id: string; firstName: string; lastName: string; email?: string; phone: string;
    birthDate?: string; gender?: string; address?: string; emergencyContact?: string;
    membershipStatus: string; notes?: string; createdAt: string; updatedAt: string;
}

interface Attendance {
    id: string; member: { id: string; fullName: string }; checkInAt: string; status: string;
}

interface Payment {
    id: string; member: { fullName: string }; amount: number; paidAt: string; status: string; method: string;
}

const statusLabel: Record<string, string> = { active: "Activo", inactive: "Inactivo" };
const genderLabel: Record<string, string> = { male: "Masculino", female: "Femenino", other: "Otro" };
const statusStyle: Record<string, React.CSSProperties> = {
    active: { background: "#F0F7F1", color: "#3a7d44" },
    inactive: { background: "#F0F0EE", color: "#888" },
};

const fmtDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtCurrency = (n: number) => `$${n.toLocaleString("es-MX")}`;

const initials = (f: string, l: string) => `${f?.[0] ?? ""}${l?.[0] ?? ""}`.toUpperCase();

const attStatusLabel: Record<string, string> = { checked_in: "Dentro", checked_out: "Completado" };
const attStatusStyle: Record<string, React.CSSProperties> = {
    checked_in: { background: "#F0F7F1", color: "#3a7d44" },
    checked_out: { background: "#F0F0EE", color: "#888" },
};

const downloadQR = (name: string) => {
    const svg = document.getElementById("profile-qr") as SVGElement | null;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const blob = new Blob([serializer.serializeToString(svg)], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QR_${name.replace(/\s+/g, "_")}.svg`;
    a.click();
    URL.revokeObjectURL(url);
};

export default function MemberProfilePage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [member, setMember] = useState<Member | null>(null);
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [attPage, setAttPage] = useState(1);
    const attLimit = 10;

    useEffect(() => {
        if (!id) return;
        const load = async () => {
            try {
                const [memberRes, attRes, payRes] = await Promise.all([
                    getMemberById(id),
                    getAttendances(1, 100, { memberId: id }),
                    getPayments(1, 100, { memberId: id }),
                ]);
                setMember(memberRes.data);
                setAttendances(attRes.data ?? []);
                setPayments(payRes.data ?? []);
            } catch {
                navigate("/members");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, navigate]);

    if (loading) return <p style={{ padding: 40, color: "#bbb", fontSize: 13 }}>Cargando...</p>;
    if (!member) return <p style={{ padding: 40, color: "#bbb", fontSize: 13 }}>Miembro no encontrado.</p>;

    const lastAttendance = attendances.length > 0 ? attendances[0] : null;

    return (
        <div style={s.page}>
            <PageHeader
                title={`${member.firstName} ${member.lastName}`}
                subtitle="Perfil del miembro"
                action={<GymButton variant="ghost" onClick={() => navigate("/members")} icon="ti-arrow-left">Volver</GymButton>}
            />

            <div style={s.content}>
                {/* Header card */}
                <div style={s.headerCard}>
                    <div style={s.avatarBig}>
                        {initials(member.firstName, member.lastName)}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                            <p style={s.name}>{member.firstName} {member.lastName}</p>
                            <span style={{ ...s.badge, ...statusStyle[member.membershipStatus] }}>
                                {statusLabel[member.membershipStatus] ?? member.membershipStatus}
                            </span>
                        </div>
                        <p style={s.meta}>{member.email ?? "Sin correo"} · {member.phone}</p>
                        {lastAttendance && (
                            <p style={s.meta}>
                                Última visita: {fmtDate(lastAttendance.checkInAt)}
                                <span style={{ ...s.badgeSm, ...(attStatusStyle[lastAttendance.status] ?? { background: "#FFF4F0", color: "#c0392b" }) }}>
                                    {attStatusLabel[lastAttendance.status] ?? lastAttendance.status}
                                </span>
                            </p>
                        )}
                    </div>
                </div>

                <div style={s.grid}>
                    {/* Personal info */}
                    <div style={s.card}>
                        <p style={s.cardTitle}>Datos personales</p>
                        <div style={s.infoGroup}>
                            <InfoRow label="Nombre" value={`${member.firstName} ${member.lastName}`} />
                            <InfoRow label="Género" value={genderLabel[member.gender ?? ""]} />
                            <InfoRow label="Fecha de nacimiento" value={fmtDate(member.birthDate)} />
                            <InfoRow label="Teléfono" value={member.phone} />
                            <InfoRow label="Correo" value={member.email} />
                            <InfoRow label="Dirección" value={member.address} />
                            <InfoRow label="Contacto emergencia" value={member.emergencyContact} />
                        </div>
                        {member.notes && (
                            <>
                                <p style={{ ...s.cardTitle, marginTop: 16 }}>Notas</p>
                                <p style={s.notes}>{member.notes}</p>
                            </>
                        )}
                    </div>

                    {/* QR Code */}
                    <div style={s.card}>
                        <p style={s.cardTitle}>Código QR</p>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0" }}>
                            <QRCodeSVG id="profile-qr" value={member.id} size={160} level="M" />
                            <p style={s.qrHint}>Escanea para registrar entrada</p>
                            <button style={s.downloadBtn} onClick={() => downloadQR(`${member.firstName}_${member.lastName}`)}>
                                <i className="ti ti-download" style={{ fontSize: 13 }} aria-hidden />
                                Descargar QR
                            </button>
                            {member.email && (
                                <button style={{ ...s.downloadBtn, marginTop: 8 }} onClick={async () => {
                                    try {
                                        await sendQRCodeEmail(member.id);
                                        addToast("QR enviado al correo del miembro");
                                    } catch { addToast("No se pudo enviar el QR", "error"); }
                                }}>
                                    <i className="ti ti-mail" style={{ fontSize: 13 }} aria-hidden />
                                    Enviar QR por correo
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Attendance history */}
                <div style={s.card}>
                    <p style={s.cardTitle}>Historial de asistencias ({attendances.length})</p>
                    {attendances.length === 0 ? (
                        <p style={s.empty}>Sin asistencias registradas.</p>
                    ) : (
                        <div>
                            <div style={{ overflowX: "auto" }}>
                                <table style={s.table}>
                                    <thead><tr style={s.thead}>
                                        <th style={s.th}>Fecha</th><th style={s.th}>Hora</th><th style={s.th}>Estado</th>
                                    </tr></thead>
                                    <tbody>
                                        {attendances.slice((attPage - 1) * attLimit, attPage * attLimit).map((a) => {
                                            const d = new Date(a.checkInAt);
                                            return (
                                                <tr key={a.id} style={s.row}>
                                                    <td style={s.td}>{d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}</td>
                                                    <td style={{ ...s.td, ...s.muted }}>{d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</td>
                                                    <td style={s.td}>
                                <span style={{ ...s.badgeSm, ...(attStatusStyle[a.status] ?? { background: "#FFF4F0", color: "#c0392b" }) }}>
                                    {attStatusLabel[a.status] ?? a.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {attendances.length > attLimit && (
                                <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 10 }}>
                                    <button
                                        disabled={attPage <= 1}
                                        onClick={() => setAttPage((p) => p - 1)}
                                        style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4, border: "none", background: "#F7F7F6", color: "#666", cursor: attPage <= 1 ? "default" : "pointer", opacity: attPage <= 1 ? 0.3 : 1 }}
                                    >
                                        Anterior
                                    </button>
                                    {Array.from({ length: Math.ceil(attendances.length / attLimit) }, (_, i) => i + 1).map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setAttPage(p)}
                                            style={{ fontSize: 11, padding: "4px 8px", borderRadius: 4, border: "none", background: p === attPage ? "#1a1a1a" : "#F7F7F6", color: p === attPage ? "#fff" : "#666", cursor: "pointer" }}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                    <button
                                        disabled={attPage >= Math.ceil(attendances.length / attLimit)}
                                        onClick={() => setAttPage((p) => p + 1)}
                                        style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4, border: "none", background: "#F7F7F6", color: "#666", cursor: attPage >= Math.ceil(attendances.length / attLimit) ? "default" : "pointer", opacity: attPage >= Math.ceil(attendances.length / attLimit) ? 0.3 : 1 }}
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Payment history */}
                <div style={s.card}>
                    <p style={s.cardTitle}>Historial de pagos ({payments.length})</p>
                    {payments.length === 0 ? (
                        <p style={s.empty}>Sin pagos registrados.</p>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table style={s.table}>
                                <thead><tr style={s.thead}>
                                    <th style={s.th}>Fecha</th><th style={s.th}>Monto</th><th style={s.th}>Método</th><th style={s.th}>Estado</th>
                                </tr></thead>
                                <tbody>
                                    {payments.slice(0, 50).map((p) => (
                                        <tr key={p.id} style={s.row}>
                                            <td style={s.td}>{fmtDate(p.paidAt)}</td>
                                            <td style={s.td}>{fmtCurrency(p.amount)}</td>
                                            <td style={{ ...s.td, ...s.muted }}>{p.method}</td>
                                            <td style={s.td}>
                                                <span style={{ ...s.badgeSm, background: p.status === "paid" ? "#F0F7F1" : "#FFF4F0", color: p.status === "paid" ? "#3a7d44" : "#c0392b" }}>
                                                    {p.status === "paid" ? "Pagado" : p.status}
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
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
    if (!value) return null;
    return <div style={s.infoRow}><span style={s.infoLabel}>{label}</span><span style={s.infoValue}>{value}</span></div>;
}

const s: Record<string, React.CSSProperties> = {
    page: { display: "flex", flexDirection: "column", minHeight: "100%" },
    content: { padding: "16px 28px 28px", display: "flex", flexDirection: "column", gap: 14 },
    headerCard: { display: "flex", alignItems: "center", gap: 20, background: "#fff", border: "1px solid #E5E4E2", borderRadius: 10, padding: "20px 24px" },
    avatarBig: { width: 52, height: 52, borderRadius: "50%", background: "#1a1a1a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 600, flexShrink: 0 },
    name: { fontSize: 18, fontWeight: 600, color: "#1a1a1a", margin: 0 },
    meta: { fontSize: 12, color: "#888", margin: "2px 0", display: "flex", alignItems: "center", gap: 8 },
    badge: { display: "inline-flex", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500 },
    badgeSm: { display: "inline-flex", padding: "1px 7px", borderRadius: 20, fontSize: 10, fontWeight: 500 },
    grid: { display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 },
    card: { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, padding: 18, overflow: "hidden" },
    cardTitle: { fontSize: 12, fontWeight: 600, color: "#1a1a1a", margin: "0 0 10px" },
    infoGroup: { background: "#FAFAFA", border: "1px solid #F0F0EE", borderRadius: 7, overflow: "hidden" },
    infoRow: { display: "flex", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid #F5F5F4", gap: 16 },
    infoLabel: { fontSize: 11, color: "#bbb", fontWeight: 500, flexShrink: 0 },
    infoValue: { fontSize: 12, color: "#1a1a1a", textAlign: "right", wordBreak: "break-word" },
    notes: { margin: 0, fontSize: 13, color: "#555", lineHeight: 1.6, padding: "9px 12px", background: "#FAFAFA", border: "1px solid #F0F0EE", borderRadius: 7 },
    qrHint: { fontSize: 11, color: "#bbb", margin: "10px 0 12px" },
    downloadBtn: { display: "inline-flex", alignItems: "center", gap: 6, background: "none", color: "#555", border: "1px solid #E5E4E2", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" },
    empty: { fontSize: 12, color: "#bbb", padding: "24px 0", textAlign: "center", margin: 0 },
    table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
    thead: { borderBottom: "1px solid #E5E4E2", background: "#FAFAFA" },
    th: { padding: "8px 12px", fontSize: 10, fontWeight: 500, color: "#bbb", textAlign: "left", whiteSpace: "nowrap" },
    row: { borderBottom: "1px solid #F0F0EE" },
    td: { padding: "8px 12px", color: "#1a1a1a", whiteSpace: "nowrap" },
    muted: { color: "#888" },
};
