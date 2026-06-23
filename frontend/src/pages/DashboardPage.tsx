import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import GymButton from "../components/GymButton";
import { getDashboardStats } from "../services/dashboard.service";
import { getPayments } from "../services/payment.service";

// Tipado de los datos que esperas de tu backend
interface DashboardStats {
    activeMembers: number;
    monthlyRevenue: number;
    todayAttendance: number;
    expiringCount: number;
}

interface RecentMember {
    id: number;
    name: string;
    plan: string;
    expiresAt: string;
    status: "active" | "expiring";
}

interface RecentPayment {
    id: string;
    memberName: string;
    amount: number;
    timeAgo: string;
    confirmed: boolean;
}
interface PaymentApiResponse {
    id: string;
    member: {
        fullName: string;
    };
    amount: number;
    paidAt: string;
    status: string;
}
const MOCK_MEMBERS: RecentMember[] = [
    { id: 1, name: "Carlos Reyes", plan: "Premium", expiresAt: "15 jul", status: "active" },
    { id: 2, name: "María López", plan: "Básico", expiresAt: "30 jun", status: "active" },
    { id: 3, name: "Jorge García", plan: "Anual", expiresAt: "24 jun", status: "expiring" },
    { id: 4, name: "Ana Pérez", plan: "Premium", expiresAt: "10 jul", status: "active" },
];

const MOCK_PLANS = [
    { name: "Premium Mensual", count: 124, pct: 87 },
    { name: "Plan Anual", count: 89, pct: 62 },
    { name: "Básico", count: 71, pct: 50 },
    { name: "Estudiante", count: 32, pct: 22 },
];

const MOCK_WEEK = [
    { day: "L", val: 55, future: false },
    { day: "M", val: 72, future: false },
    { day: "X", val: 48, future: false },
    { day: "J", val: 80, future: false },
    { day: "V", val: 63, future: false },
    { day: "S", val: 40, future: true },
    { day: "D", val: 28, future: true },
];

const MOCK_ALERTS = [
    { id: 1, text: "17 suscripciones vencen este mes", color: "#c0392b" },
    { id: 2, text: "3 pagos pendientes de confirmar", color: "#e67e22" },
    { id: 3, text: "Sistema actualizado correctamente", color: "#E5E4E2" },
];

// Helpers de formato
const fmtCurrency = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;

const initials = (name: string) =>
    name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export default function DashboardPage() {
    const [stats, setStats] =
        useState<DashboardStats | null>(null);
    const [recentPayments, setRecentPayments] =
        useState<RecentPayment[]>([]);

    useEffect(() => {
        const loadStats = async () => {
            const response =
                await getDashboardStats();

            setStats({
                activeMembers: response.data.totalMembers,
                monthlyRevenue: response.data.totalRevenue,
                todayAttendance: response.data.todayAttendances,
                expiringCount: response.data.activeSubscriptions,
            });

            const paymentsResponse =
                await getPayments();

            setRecentPayments(
                paymentsResponse.data
                    .slice(0, 3)
                    .map((payment: PaymentApiResponse) => ({
                        id: payment.id,
                        memberName: payment.member.fullName,
                        amount: payment.amount,
                        timeAgo: new Date(
                            payment.paidAt
                        ).toLocaleDateString(),
                        confirmed:
                            payment.status === "paid",
                    }))
            );

        };

        loadStats();
    }, []);
    const maxBar = Math.max(...MOCK_WEEK.map((d) => d.val));

    if (!stats) {
        return <p>Loading...</p>;
    }

    return (
        <div style={s.page}>
            <PageHeader
                title="Dashboard"
                action={<GymButton icon="ti-plus">Nuevo miembro</GymButton>}
            />

            <div style={s.content}>
                {/* Estadísticas */}
                <div style={s.statsGrid}>
                    <StatCard label="Miembros activos" value={stats.activeMembers} delta="+12 este mes" up />
                    <StatCard label="Ingresos del mes" value={fmtCurrency(stats.monthlyRevenue)} delta="+8.4%" up />
                    <StatCard label="Asistencia hoy" value={stats.todayAttendance} delta="−5 vs ayer" up={false} />
                    <StatCard label="Vencen este mes" value={stats.expiringCount} delta="Requiere revisión" up={false} />
                </div>

                {/* Miembros + Planes */}
                <div style={s.row2}>
                    <div style={s.card}>
                        <div style={s.cardHeader}>
                            <span style={s.cardTitle}>Miembros recientes</span>
                            <span style={s.cardLink}>Ver todos</span>
                        </div>
                        {MOCK_MEMBERS.map((m) => (
                            <div key={m.id} style={s.memberRow}>
                                <div style={{
                                    ...s.avatar,
                                    background: m.status === "expiring" ? "#FFF4F0" : "#F0F0EE",
                                    color: m.status === "expiring" ? "#c0392b" : "#666",
                                }}>
                                    {initials(m.name)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={s.memberName}>{m.name}</p>
                                    <p style={s.memberPlan}>{m.plan} · vence {m.expiresAt}</p>
                                </div>
                                <span style={{
                                    ...s.badge,
                                    background: m.status === "active" ? "#F0F7F1" : "#FFF4F0",
                                    color: m.status === "active" ? "#3a7d44" : "#c0392b",
                                }}>
                                    {m.status === "active" ? "Activo" : "Vence pronto"}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div style={s.card}>
                        <div style={s.cardHeader}>
                            <span style={s.cardTitle}>Planes activos</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {MOCK_PLANS.map((p) => (
                                <div key={p.name}>
                                    <div style={s.barLabel}>
                                        <span style={{ color: "#888", fontSize: 12 }}>{p.name}</span>
                                        <span style={{ color: "#1a1a1a", fontSize: 12, fontWeight: 500 }}>{p.count}</span>
                                    </div>
                                    <div style={s.barBg}>
                                        <div style={{ ...s.barFill, width: `${p.pct}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Asistencia + Pagos + Alertas */}
                <div style={s.row3}>
                    <div style={s.card}>
                        <div style={s.cardHeader}>
                            <span style={s.cardTitle}>Asistencia semanal</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 70 }}>
                            {MOCK_WEEK.map((d) => (
                                <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                    <div style={{
                                        background: d.future ? "#E5E4E2" : "#1a1a1a",
                                        width: "100%",
                                        borderRadius: "3px 3px 0 0",
                                        height: Math.round((d.val / maxBar) * 56),
                                    }} />
                                    <span style={{ fontSize: 10, color: "#bbb" }}>{d.day}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={s.card}>
                        <div style={s.cardHeader}>
                            <span style={s.cardTitle}>Pagos recientes</span>
                        </div>
                        {recentPayments.map((p) => (
                            <div key={p.id} style={s.alertRow}>
                                <div style={{ ...s.dot, background: p.confirmed ? "#3a7d44" : "#E5E4E2" }} />
                                <div>
                                    <p style={{ fontSize: 13, color: "#1a1a1a", fontWeight: 500 }}>{p.memberName}</p>
                                    <p style={{ fontSize: 11, color: "#bbb" }}>${p.amount} · {p.timeAgo}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={s.card}>
                        <div style={s.cardHeader}>
                            <span style={s.cardTitle}>Alertas</span>
                        </div>
                        {MOCK_ALERTS.map((a) => (
                            <div key={a.id} style={s.alertRow}>
                                <div style={{ ...s.dot, background: a.color }} />
                                <p style={{ fontSize: 13, color: a.color === "#E5E4E2" ? "#888" : "#1a1a1a" }}>{a.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Sub-componente StatCard
function StatCard({ label, value, delta, up }: {
    label: string; value: string | number; delta?: string; up?: boolean;
}) {
    return (
        <div style={s.statCard}>
            <p style={s.statLabel}>{label}</p>
            <p style={s.statValue}>{value}</p>
            {delta && (
                <p style={{ ...s.statDelta, color: up ? "#3a7d44" : "#c0392b" }}>{delta}</p>
            )}
        </div>
    );
}

// Estilos
const s: Record<string, React.CSSProperties> = {
    page: { display: "flex", flexDirection: "column", minHeight: "100%" },
    content: { padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14 },
    statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 },
    statCard: { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, padding: "14px 16px" },
    statLabel: { fontSize: 11, color: "#bbb", fontWeight: 500, marginBottom: 8 },
    statValue: { fontSize: 22, fontWeight: 600, color: "#1a1a1a", letterSpacing: -0.5 },
    statDelta: { fontSize: 11, marginTop: 4 },
    row2: { display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 10 },
    row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
    card: { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, padding: 16 },
    cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
    cardTitle: { fontSize: 12, fontWeight: 600, color: "#1a1a1a" },
    cardLink: { fontSize: 11, color: "#bbb", cursor: "pointer" },
    memberRow: { display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid #F0F0EE" },
    avatar: { width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, flexShrink: 0 },
    memberName: { fontSize: 13, color: "#1a1a1a", fontWeight: 500, margin: 0 },
    memberPlan: { fontSize: 11, color: "#bbb", margin: 0 },
    badge: { fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 500, whiteSpace: "nowrap" },
    barLabel: { display: "flex", justifyContent: "space-between", marginBottom: 4 },
    barBg: { background: "#F0F0EE", borderRadius: 3, height: 4 },
    barFill: { background: "#1a1a1a", height: 4, borderRadius: 3 },
    alertRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F0F0EE" },
    dot: { width: 6, height: 6, borderRadius: "50%", flexShrink: 0 },
};