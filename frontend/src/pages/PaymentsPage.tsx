import { useEffect, useState } from "react";
import { createPayment, getPayments } from "../services/payment.service";
import { getMembers } from "../services/member.service";
import { getSubscriptions } from "../services/subscription.service";
import PageHeader from "../components/PageHeader";
import GymButton from "../components/GymButton";

// Tipos exactos del DTO
interface Payment {
    id: string;
    member: { id: string; fullName: string; email?: string; phone?: string };
    subscription: { id: string; startDate: string; endDate: string; status: string };
    amount: number;
    method: string;
    status: string;
    paidAt: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

interface Member {
    id: string;
    firstName: string;
    lastName: string;
    membershipStatus: string;
}

interface Subscription {
    id: string;
    member: { id: string; fullName: string };
    plan: { id: string; name: string; price: number };
    status: string;
    endDate: string;
}

// Helpers
const statusStyle = (status: string): React.CSSProperties => ({
    paid:    { background: "#F0F7F1", color: "#3a7d44" },
    pending: { background: "#FFF4F0", color: "#c0392b" },
}[status] ?? { background: "#F0F0EE", color: "#888" });

const statusLabel: Record<string, string> = {
    paid: "Pagado", pending: "Pendiente",
};

const methodLabel: Record<string, string> = {
    cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia",
};

const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("es-MX", {
        day: "2-digit", month: "short", year: "numeric",
    });

const fmtDateTime = (d: string) =>
    new Date(d).toLocaleString("es-MX", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });

export default function PaymentsPage() {
    const [payments,      setPayments]      = useState<Payment[]>([]);
    const [members,       setMembers]       = useState<Member[]>([]);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading,       setLoading]       = useState(true);
    const [showForm,      setShowForm]      = useState(false);
    const [submitting,    setSubmitting]    = useState(false);

    // Campos del formulario — exactamente lo que pide createPayment
    const [memberId,      setMemberId]      = useState("");
    const [subscriptionId,setSubscriptionId]= useState("");
    const [amount,        setAmount]        = useState("");
    const [method,        setMethod]        = useState("");
    const [notes,         setNotes]         = useState("");

    // Suscripciones filtradas por miembro seleccionado
    const memberSubscriptions = subscriptions.filter(
        (sub) => sub.member.id === memberId && sub.status === "active"
    );

    const loadPayments = async () => {
        const res = await getPayments();
        setPayments(res.data ?? []);
    };

    useEffect(() => {
        const init = async () => {
            try {
                const [paymentsRes, membersRes, subsRes] = await Promise.all([
                    getPayments(),
                    getMembers(),
                    getSubscriptions(),
                ]);
                setPayments(paymentsRes.data ?? []);
                setMembers(membersRes.data ?? []);
                setSubscriptions(subsRes.data ?? []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const clearForm = () => {
        setMemberId(""); setSubscriptionId(""); setAmount("");
        setMethod(""); setNotes(""); setShowForm(false);
    };

    // Al cambiar miembro, resetear suscripción
    const handleMemberChange = (id: string) => {
        setMemberId(id);
        setSubscriptionId("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await createPayment({
                memberId,
                subscriptionId,
                amount: Number(amount),
                method,
                ...(notes && { notes }),
            });
            clearForm();
            loadPayments();
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={s.page}>
            <PageHeader
                title="Pagos"
                action={
                    <GymButton icon="ti-plus" onClick={() => { clearForm(); setShowForm(true); }}>
                        Registrar pago
                    </GymButton>
                }
            />

            <div style={s.content}>

                {/* Formulario */}
                {showForm && (
                    <div style={s.card}>
                        <p style={s.formTitle}>Registrar pago</p>
                        <form onSubmit={handleSubmit}>
                            <div style={s.formGrid}>
                                <Field label="Miembro *">
                                    <select
                                        style={s.input}
                                        value={memberId}
                                        onChange={(e) => handleMemberChange(e.target.value)}
                                        required
                                    >
                                        <option value="">Seleccionar miembro</option>
                                        {members.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.firstName} {m.lastName}
                                            </option>
                                        ))}
                                    </select>
                                </Field>

                                <Field label="Suscripción *">
                                    <select
                                        style={s.input}
                                        value={subscriptionId}
                                        onChange={(e) => setSubscriptionId(e.target.value)}
                                        required
                                        disabled={!memberId}
                                    >
                                        <option value="">
                                            {!memberId
                                                ? "Primero selecciona un miembro"
                                                : memberSubscriptions.length === 0
                                                ? "Sin suscripciones activas"
                                                : "Seleccionar suscripción"}
                                        </option>
                                        {memberSubscriptions.map((sub) => (
                                            <option key={sub.id} value={sub.id}>
                                                {sub.plan.name} — vence {fmtDate(sub.endDate)}
                                            </option>
                                        ))}
                                    </select>
                                </Field>

                                <Field label="Monto ($) *">
                                    <input
                                        style={s.input}
                                        type="number"
                                        placeholder="450"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        min={0}
                                        required
                                    />
                                </Field>

                                <Field label="Método de pago *">
                                    <select
                                        style={s.input}
                                        value={method}
                                        onChange={(e) => setMethod(e.target.value)}
                                        required
                                    >
                                        <option value="">Seleccionar método</option>
                                        <option value="cash">Efectivo</option>
                                        <option value="card">Tarjeta</option>
                                        <option value="transfer">Transferencia</option>
                                    </select>
                                </Field>

                                <Field label="Notas">
                                    <input
                                        style={s.input}
                                        placeholder="Notas opcionales"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />
                                </Field>
                            </div>

                            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                                <GymButton type="submit" disabled={submitting}>
                                    {submitting ? "Guardando..." : "Registrar pago"}
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
                    <p style={s.empty}>Cargando pagos...</p>
                ) : payments.length === 0 ? (
                    <p style={s.empty}>No hay pagos registrados.</p>
                ) : (
                    <div style={{ ...s.card, padding: 0 }}>
                        <table style={s.table}>
                            <thead>
                                <tr style={s.thead}>
                                    <th style={s.th}>Miembro</th>
                                    <th style={s.th}>Monto</th>
                                    <th style={s.th}>Método</th>
                                    <th style={s.th}>Estado</th>
                                    <th style={s.th}>Fecha de pago</th>
                                    <th style={s.th}>Fin suscripción</th>
                                    <th style={s.th}>Notas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((p) => (
                                    <tr key={p.id} style={s.row}>
                                        <td style={s.td}>
                                            <p style={{ margin: 0, fontWeight: 500, fontSize: 13, color: "#1a1a1a" }}>
                                                {p.member.fullName}
                                            </p>
                                            {p.member.email && (
                                                <p style={{ margin: 0, fontSize: 11, color: "#bbb" }}>
                                                    {p.member.email}
                                                </p>
                                            )}
                                        </td>
                                        <td style={{ ...s.td, fontWeight: 500 }}>${p.amount}</td>
                                        <td style={{ ...s.td, ...s.muted }}>
                                            {methodLabel[p.method] ?? p.method}
                                        </td>
                                        <td style={s.td}>
                                            <span style={{ ...s.badge, ...statusStyle(p.status) }}>
                                                {statusLabel[p.status] ?? p.status}
                                            </span>
                                        </td>
                                        <td style={{ ...s.td, ...s.muted }}>{fmtDateTime(p.paidAt)}</td>
                                        <td style={{ ...s.td, ...s.muted }}>{fmtDate(p.subscription.endDate)}</td>
                                        <td style={{ ...s.td, ...s.muted }}>{p.notes ?? "—"}</td>
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
    page:      { display: "flex", flexDirection: "column", minHeight: "100%" },
    content:   { padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14 },
    card:      { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, padding: 20, overflow: "hidden" },
    formTitle: { fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 16 },
    formGrid:  { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 },
    input:     { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 6, padding: "8px 12px", fontSize: 13, color: "#1a1a1a", outline: "none", width: "100%", fontFamily: "inherit" },
    table:     { width: "100%", borderCollapse: "collapse" },
    thead:     { borderBottom: "1px solid #E5E4E2", background: "#FAFAFA" },
    th:        { padding: "10px 14px", fontSize: 11, fontWeight: 500, color: "#bbb", textAlign: "left", whiteSpace: "nowrap" },
    row:       { borderBottom: "1px solid #F0F0EE" },
    td:        { padding: "11px 14px", fontSize: 13, color: "#1a1a1a" },
    muted:     { color: "#888" },
    badge:     { display: "inline-flex", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500 },
    empty:     { fontSize: 13, color: "#bbb", padding: "40px 0", textAlign: "center" },
};