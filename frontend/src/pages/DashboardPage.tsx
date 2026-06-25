import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Chart, registerables } from "chart.js";
import PageHeader from "../components/PageHeader";
import GymButton from "../components/GymButton";
import { getDashboardStats } from "../services/dashboard.service";
import { getMembers } from "../services/member.service";
import { getPayments } from "../services/payment.service";
//import { getPlans } from "../services/plan.service";
import { getAttendances } from "../services/attendance.service";

Chart.register(...registerables);

interface Stats {
    totalMembers: number;
    totalRevenue: number;
    todayAttendances: number;
    activeSubscriptions: number;
    expiringThisMonth?: number;
    pendingPayments?: number;
    revenueGoal?: number;
    memberGrowth?: number;
    revenueGrowth?: number;
    attendanceDelta?: number;
}
interface Member {
    id: string; firstName: string; lastName: string;
    membershipStatus: string; planName?: string;
}
interface Payment {
    id: string; member: { fullName: string }; amount: number; paidAt: string; status: string;
}

interface Attendance {
    id: string; checkInAt: string;
}

const fmtCurrency = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;

const initials = (first: string, last: string) =>
    `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const buildWeekData = (
    attendances: Attendance[],
    payments: Payment[]
): { day: string; count: number; revenue: number }[] => {
    const today = new Date();
    return Array(7).fill(0).map((_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (6 - i));
        const count = attendances.filter(
            (a) => new Date(a.checkInAt).toDateString() === d.toDateString()
        ).length;
        const revenue = payments
            .filter((p) => p.status === "paid" && new Date(p.paidAt).toDateString() === d.toDateString())
            .reduce((sum, p) => sum + p.amount, 0);
        return { day: DAYS[d.getDay()], count, revenue };
    });
};

// ── Mini-gráfica con Chart.js ──────────────────────────────────────
function MiniChart({
    id, type, labels, data, color = "#1a1a1a",
}: {
    id: string; type: "bar" | "line";
    labels: string[]; data: number[]; color?: string;
}) {
    useEffect(() => {
        const ctx = document.getElementById(id) as HTMLCanvasElement | null;
        if (!ctx) return;
        const maxIdx = data.indexOf(Math.max(...data));
        const chart = new Chart(ctx, {
            type,
            data: {
                labels,
                datasets: [{
                    data,
                    ...(type === "bar"
                        ? {
                            backgroundColor: data.map((_, i) => i === maxIdx ? color : "#E5E4E2"),
                            borderRadius: 3,
                            borderSkipped: false,
                        }
                        : {
                            borderColor: color,
                            borderWidth: 1.5,
                            pointBackgroundColor: color,
                            pointRadius: 2.5,
                            fill: true,
                            backgroundColor: "rgba(26,26,26,0.04)",
                            tension: 0.3,
                        }),
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (c) => {
                                const value = Number(c.parsed.y);

                                return type === "line"
                                    ? `$${value.toLocaleString()}`
                                    : `${value} entradas`;
                            },
                        },
                    },
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 9 }, color: "#bbb" } },
                    y: { display: false, grid: { display: false } },
                },
            },
        });
        return () => chart.destroy();
    }, [id, type, labels, data, color]);

    return (
        <div style={{ position: "relative", height: 80, marginTop: 10 }}>
            <canvas id={id} role="img" aria-label={`Gráfica de ${id}`} />
        </div>
    );
}

// ── Tarjeta de stat ────────────────────────────────────────────────
function StatCard({
    label, value, icon, trend, trendUp,
}: {
    label: string; value: string | number; icon: string;
    trend?: string; trendUp?: boolean;
}) {
    return (
        <div style={s.statCard}>
            <div style={s.statTop}>
                <p style={s.statLabel}>{label}</p>
                <div style={s.iconWrap}>
                    <i className={`ti ${icon}`} style={{ fontSize: 13, color: "#888" }} aria-hidden />
                </div>
            </div>
            <p style={s.statValue}>{value}</p>
            {trend && (
                <p style={{ fontSize: 10, color: trendUp === false ? "#c0392b" : "#3a7d44", marginTop: 3, display: "flex", alignItems: "center", gap: 3 }}>
                    <i className={`ti ${trendUp === false ? "ti-trending-down" : "ti-trending-up"}`} style={{ fontSize: 11 }} aria-hidden />
                    {trend}
                </p>
            )}
        </div>
    );
}

// ── Alerta ────────────────────────────────────────────────────────
function AlertRow({ color, text, badge, badgeColor, badgeBg }: {
    color: string; text: string;
    badge: string; badgeColor: string; badgeBg: string;
}) {
    return (
        <div style={s.alertRow}>
            <div style={{ ...s.alertDot, background: color }} />
            <p style={s.alertText}>{text}</p>
            <span style={{ ...s.badge, background: badgeBg, color: badgeColor }}>{badge}</span>
        </div>
    );
}

// ── Página ────────────────────────────────────────────────────────
export default function DashboardPage() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<Stats | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [weekData, setWeekData] = useState<{ day: string; count: number; revenue: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [
                    statsRes,
                    membersRes,
                    paymentsRes,
                    attendanceRes,
                ] = await Promise.all([
                    getDashboardStats(),
                    getMembers(),
                    getPayments(),
                    getAttendances(),
                ]);
                setStats(statsRes.data);
                setMembers((membersRes.data ?? []).slice(0, 4));
                setPayments((paymentsRes.data ?? []).slice(0, 3));
                setWeekData(buildWeekData(attendanceRes.data ?? [], paymentsRes.data ?? []));
            } catch (err) {
                console.error("Dashboard error:", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return <p style={{ padding: 40, color: "#bbb", fontSize: 13 }}>Cargando...</p>;
    if (!stats) return <p style={{ padding: 40, color: "#bbb", fontSize: 13 }}>Error al cargar datos.</p>;

    const days = weekData.map((d) => d.day);
    const counts = weekData.map((d) => d.count);
    const revenues = weekData.map((d) => d.revenue);

    const expiringCount = stats.expiringThisMonth ?? 0;
    const pendingCount = stats.pendingPayments ?? 0;
    const revenueGoal = stats.revenueGoal ?? 0;
    const goalPct = revenueGoal > 0 ? Math.round((stats.totalRevenue / revenueGoal) * 100) : null;

    return (
        <div style={s.page}>
            <PageHeader
                title="Dashboard"
                subtitle="Panel de administración · ZenithGym"
                action={<GymButton icon="ti-plus" onClick={() => navigate("/members")}>Nuevo miembro</GymButton>}
            />

            <div style={s.content}>

                {/* ── Stats ── */}
                <div style={s.statsGrid}>
                    <StatCard
                        label="Miembros activos"
                        value={stats.totalMembers}
                        icon="ti-users"
                        trend={stats.memberGrowth != null ? `+${stats.memberGrowth} este mes` : undefined}
                        trendUp
                    />
                    <StatCard
                        label="Ingresos del mes"
                        value={fmtCurrency(stats.totalRevenue)}
                        icon="ti-coin"
                        trend={stats.revenueGrowth != null ? `+${stats.revenueGrowth}% vs mes ant.` : undefined}
                        trendUp
                    />
                    <StatCard
                        label="Asistencia hoy"
                        value={stats.todayAttendances}
                        icon="ti-login"
                        trend={stats.attendanceDelta != null
                            ? `${stats.attendanceDelta > 0 ? "+" : ""}${stats.attendanceDelta} vs ayer`
                            : undefined}
                        trendUp={stats.attendanceDelta != null ? stats.attendanceDelta >= 0 : undefined}
                    />
                    <StatCard
                        label="Suscripciones activas"
                        value={stats.activeSubscriptions}
                        icon="ti-id-badge"
                        trend={expiringCount > 0 ? `${expiringCount} vencen este mes` : undefined}
                        trendUp={false}
                    />
                </div>

                {/* ── Gráficas ── */}
                <div style={s.row2}>
                    <div style={s.card}>
                        <p style={s.cardTitle}>Ingresos últimos 7 días</p>
                        <p style={s.cardSub}>Pagos confirmados por día</p>
                        <MiniChart id="rev-chart" type="line" labels={days} data={revenues} />
                    </div>
                    <div style={s.card}>
                        <p style={s.cardTitle}>Asistencia semanal</p>
                        <p style={s.cardSub}>Entradas registradas por día</p>
                        <MiniChart id="att-chart" type="bar" labels={days} data={counts} />
                    </div>
                </div>

                {/* ── Listas ── */}
                <div style={s.row3}>

                    {/* Alertas */}
                    <div style={s.card}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <div>
                                <p style={s.cardTitle}>Alertas del sistema</p>
                                <p style={s.cardSub}>Requieren atención</p>
                            </div>
                            {(expiringCount + pendingCount) > 0 && (
                                <span style={{ ...s.badge, background: "#FFF4F0", color: "#c0392b" }}>
                                    {expiringCount + pendingCount} pendientes
                                </span>
                            )}
                        </div>

                        {expiringCount > 0 && (
                            <AlertRow
                                color="#c0392b"
                                text={`${expiringCount} suscripciones vencen pronto`}
                                badge="Urgente"
                                badgeColor="#c0392b" badgeBg="#FFF4F0"
                            />
                        )}
                        {pendingCount > 0 && (
                            <AlertRow
                                color="#e67e22"
                                text={`${pendingCount} pagos pendientes de confirmar`}
                                badge="Revisar"
                                badgeColor="#854F0B" badgeBg="#FEF9F0"
                            />
                        )}
                        {goalPct !== null && (
                            <AlertRow
                                color="#3a7d44"
                                text={`Meta mensual al ${goalPct}% — ${fmtCurrency(stats.totalRevenue)} de ${fmtCurrency(revenueGoal)}`}
                                badge="En curso"
                                badgeColor="#3a7d44" badgeBg="#F0F7F1"
                            />
                        )}
                        {expiringCount === 0 && pendingCount === 0 && goalPct === null && (
                            <p style={s.empty}>Sin alertas activas.</p>
                        )}
                    </div>

                    {/* Miembros recientes */}
                    <div style={s.card}>
                        <p style={s.cardTitle}>Miembros recientes</p>
                        <div style={{ marginTop: 10 }}>
                            {members.length === 0 ? (
                                <p style={s.empty}>Sin miembros.</p>
                            ) : members.map((m) => (
                                <div key={m.id} style={s.listRow}>
                                    <div style={{
                                        ...s.avatar,
                                        background: m.membershipStatus === "inactive" ? "#FFF4F0" : "#F0F0EE",
                                        color: m.membershipStatus === "inactive" ? "#c0392b" : "#666",
                                    }}>
                                        {initials(m.firstName, m.lastName)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={s.listName}>{m.firstName} {m.lastName}</p>
                                        {m.planName && <p style={s.listSub}>{m.planName}</p>}
                                    </div>
                                    <span style={{
                                        ...s.badge,
                                        background: m.membershipStatus === "active" ? "#F0F7F1" : "#FFF4F0",
                                        color: m.membershipStatus === "active" ? "#3a7d44" : "#c0392b",
                                    }}>
                                        {m.membershipStatus === "active" ? "Activo" : "Inactivo"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pagos recientes */}
                    <div style={s.card}>
                        <p style={s.cardTitle}>Pagos recientes</p>
                        <div style={{ marginTop: 10 }}>
                            {payments.length === 0 ? (
                                <p style={s.empty}>Sin pagos.</p>
                            ) : payments.map((p) => (
                                <div key={p.id} style={s.listRow}>
                                    <div style={{ ...s.dot, background: p.status === "paid" ? "#3a7d44" : "#E5E4E2" }} />
                                    <div style={{ flex: 1 }}>
                                        <p style={s.listName}>{p.member.fullName}</p>
                                        <p style={s.listSub}>{fmtDate(p.paidAt)}</p>
                                    </div>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>
                                        ${p.amount}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    page: { display: "flex", flexDirection: "column", minHeight: "100%" },
    content: { padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 },
    statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 },
    statCard: { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, padding: "12px 14px" },
    statTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
    statLabel: { fontSize: 10, color: "#bbb", fontWeight: 500, margin: 0 },
    iconWrap: { width: 26, height: 26, borderRadius: 5, background: "#F7F7F6", display: "flex", alignItems: "center", justifyContent: "center" },
    statValue: { fontSize: 22, fontWeight: 600, color: "#1a1a1a", letterSpacing: -0.5, margin: 0 },
    row2: { display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 8 },
    row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 },
    card: { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, padding: "13px 14px" },
    cardTitle: { fontSize: 12, fontWeight: 600, color: "#1a1a1a", margin: 0 },
    cardSub: { fontSize: 10, color: "#bbb", margin: "3px 0 0" },
    alertRow: { display: "flex", alignItems: "flex-start", gap: 9, padding: "7px 0", borderBottom: "1px solid #F5F5F4" },
    alertDot: { width: 6, height: 6, borderRadius: "50%", flexShrink: 0, marginTop: 4 },
    alertText: { fontSize: 11, color: "#555", lineHeight: 1.5, flex: 1, margin: 0 },
    listRow: { display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #F5F5F4" },
    avatar: { width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600, flexShrink: 0 },
    listName: { fontSize: 11, color: "#1a1a1a", fontWeight: 500, margin: 0 },
    listSub: { fontSize: 10, color: "#bbb", margin: 0 },
    badge: { fontSize: 10, padding: "2px 7px", borderRadius: 20, fontWeight: 500, whiteSpace: "nowrap" },
    dot: { width: 6, height: 6, borderRadius: "50%", flexShrink: 0 },
    empty: { fontSize: 11, color: "#bbb", margin: 0 },
};