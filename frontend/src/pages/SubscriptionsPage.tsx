import { useEffect, useState } from "react";
import { getSubscriptions, createSubscription, renewSubscription } from "../services/subscription.service";
import { getMembers } from "../services/member.service";
import { getPlans } from "../services/plan.service";
import PageHeader from "../components/PageHeader";
import GymButton from "../components/GymButton";

interface Subscription {
    id: string;
    member: { id: string; fullName: string; email?: string; phone?: string };
    plan: { id: string; name: string; price: number; durationDays: number };
    startDate: Date;
    endDate: Date;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

interface Member { id: string; firstName: string; lastName: string; membershipStatus: string }
interface Plan   { id: string; name: string; price: number; durationDays: number; status: string }

const statusStyle = (status: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
        active:  { background: "#F0F7F1", color: "#3a7d44" },
        expired: { background: "#FFF4F0", color: "#c0392b" },
        pending: { background: "#FFFBF0", color: "#b7791f" },
    };
    return map[status] ?? { background: "#F0F0EE", color: "#888" };
};

const statusLabel: Record<string, string> = {
    active: "Activo", expired: "Vencido", pending: "Pendiente",
};

const fmtDate = (d: Date | string) =>
    new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

const daysLeft = (endDate: Date | string) => {
    const diff = new Date(endDate).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export default function SubscriptionsPage() {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [members,       setMembers]       = useState<Member[]>([]);
    const [plans,         setPlans]         = useState<Plan[]>([]);
    const [loading,       setLoading]       = useState(true);
    const [showForm,      setShowForm]      = useState(false);
    const [memberId,      setMemberId]      = useState("");
    const [planId,        setPlanId]        = useState("");
    const [submitting,    setSubmitting]    = useState(false);

    const load = async () => {
        const res = await getSubscriptions();
        setSubscriptions(res.data ?? []);
    };

    useEffect(() => {
        const init = async () => {
            try {
                const [subsRes, membersRes, plansRes] = await Promise.all([
                    getSubscriptions(),
                    getMembers(),
                    getPlans(),
                ]);
                setSubscriptions(subsRes.data ?? []);
                setMembers(membersRes.data ?? []);
                setPlans((plansRes.data ?? []).filter((p: Plan) => p.status === "active"));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const clearForm = () => {
        setMemberId(""); setPlanId(""); setShowForm(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await createSubscription({ memberId, planId });
            clearForm();
            load();
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleRenew = async (id: string) => {
        if (!window.confirm("¿Renovar esta suscripción?")) return;
        try {
            await renewSubscription(id);
            load();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div style={s.page}>
            <PageHeader
                title="Suscripciones"
                action={
                    <GymButton icon="ti-plus" onClick={() => { clearForm(); setShowForm(true); }}>
                        Nueva suscripción
                    </GymButton>
                }
            />

            <div style={s.content}>

                {/* Formulario */}
                {showForm && (
                    <div style={s.card}>
                        <p style={s.formTitle}>Nueva suscripción</p>
                        <form onSubmit={handleSubmit}>
                            <div style={s.formGrid}>
                                <Field label="Miembro">
                                    <select
                                        style={s.input}
                                        value={memberId}
                                        onChange={(e) => setMemberId(e.target.value)}
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
                                <Field label="Plan">
                                    <select
                                        style={s.input}
                                        value={planId}
                                        onChange={(e) => setPlanId(e.target.value)}
                                        required
                                    >
                                        <option value="">Seleccionar plan</option>
                                        {plans.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} — ${p.price} / {p.durationDays} días
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                            </div>
                            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                                <GymButton type="submit" disabled={submitting}>
                                    {submitting ? "Guardando..." : "Crear suscripción"}
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
                    <p style={s.empty}>Cargando suscripciones...</p>
                ) : subscriptions.length === 0 ? (
                    <p style={s.empty}>No hay suscripciones registradas.</p>
                ) : (
                    <div style={s.card}>
                        <table style={s.table}>
                            <thead>
                                <tr style={s.thead}>
                                    <th style={s.th}>Miembro</th>
                                    <th style={s.th}>Plan</th>
                                    <th style={s.th}>Precio</th>
                                    <th style={s.th}>Inicio</th>
                                    <th style={s.th}>Vencimiento</th>
                                    <th style={s.th}>Días restantes</th>
                                    <th style={s.th}>Estado</th>
                                    <th style={s.th}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subscriptions.map((sub) => {
                                    const days = daysLeft(sub.endDate);
                                    return (
                                        <tr key={sub.id} style={s.row}>
                                            <td style={s.td}>
                                                <p style={{ fontWeight: 500, margin: 0, fontSize: 13, color: "#1a1a1a" }}>
                                                    {sub.member.fullName}
                                                </p>
                                                <p style={{ fontSize: 11, color: "#bbb", margin: 0 }}>
                                                    {sub.member.email ?? sub.member.phone ?? ""}
                                                </p>
                                            </td>
                                            <td style={{ ...s.td, fontWeight: 500 }}>{sub.plan.name}</td>
                                            <td style={{ ...s.td, ...s.muted }}>${sub.plan.price}</td>
                                            <td style={{ ...s.td, ...s.muted }}>{fmtDate(sub.startDate)}</td>
                                            <td style={{ ...s.td, ...s.muted }}>{fmtDate(sub.endDate)}</td>
                                            <td style={s.td}>
                                                <span style={{
                                                    fontSize: 12,
                                                    fontWeight: 500,
                                                    color: days <= 5 ? "#c0392b" : days <= 15 ? "#b7791f" : "#3a7d44",
                                                }}>
                                                    {sub.status === "expired"
                                                        ? "Vencida"
                                                        : days <= 0
                                                        ? "Hoy"
                                                        : `${days} días`}
                                                </span>
                                            </td>
                                            <td style={s.td}>
                                                <span style={{ ...s.badge, ...statusStyle(sub.status) }}>
                                                    {statusLabel[sub.status] ?? sub.status}
                                                </span>
                                            </td>
                                            <td style={s.td}>
                                                <GymButton
                                                    variant="ghost"
                                                    onClick={() => handleRenew(sub.id)}
                                                    disabled={sub.status === "active"}
                                                    style={{
                                                        opacity: sub.status === "active" ? 0.4 : 1,
                                                        cursor:  sub.status === "active" ? "not-allowed" : "pointer",
                                                    }}
                                                >
                                                    Renovar
                                                </GymButton>
                                            </td>
                                        </tr>
                                    );
                                })}
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
    formGrid:  { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
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