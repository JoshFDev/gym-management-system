import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import GymButton from "../components/GymButton";
import { getDashboardStats } from "../services/dashboard.service";
import { getMembers } from "../services/member.service";
import { getPayments } from "../services/payment.service";
import { getPlans } from "../services/plan.service";
import { getAttendances } from "../services/attendance.service";

interface Stats {
    totalMembers: number;
    totalRevenue: number;
    todayAttendances: number;
    activeSubscriptions: number;
}
interface Member {
    id: string; firstName: string; lastName: string; membershipStatus: string;
}
interface Payment {
    id: string; member: { fullName: string }; amount: number; paidAt: string; status: string;
}
interface Plan {
    id: string; name: string; status: string;
}
interface Attendance {
    id: string; checkInAt: string;
}

const fmtCurrency = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;
const initials = (first: string, last: string) => `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });

const buildWeekBars = (attendances: Attendance[]) => {
    const labels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const today = new Date();
    return Array(7).fill(0).map((_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (6 - i));
        const count = attendances.filter(
            (a) => new Date(a.checkInAt).toDateString() === d.toDateString()
        ).length;
        return { day: labels[d.getDay()], count };
    });
};

const buildRevenueChart = (payments: Payment[]) => {
    const today = new Date();
    return Array(7).fill(0).map((_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (6 - i));
        const total = payments
            .filter((p) => p.status === "paid" && new Date(p.paidAt).toDateString() === d.toDateString())
            .reduce((sum, p) => sum + p.amount, 0);
        return { day: fmtDate(d.toISOString()), total };
    });
};

// Gráfica de barras SVG
function BarChartSVG({ data, color = "#1a1a1a" }: {
    data: { day: string; count: number }[];
    color?: string;
}) {
    const max = Math.max(...data.map((d) => d.count), 1);
    const h = 100;
    return (
        <svg width="100%" viewBox={`0 0 ${data.length * 40} ${h + 24}`} preserveAspectRatio="none" style={{ overflow: "visible" }}>
            {data.map((d, i) => {
                const barH = Math.max((d.count / max) * h, d.count > 0 ? 4 : 2);
                const x = i * 40 + 8;
                const y = h - barH;
                const isMax = d.count === max && d.count > 0;
                return (
                    <g key={i}>
                        <rect
                            x={x} y={y} width={24} height={barH}
                            fill={isMax ? color : "#E5E4E2"}
                            rx={4}
                        />
                        <text
                            x={x + 12} y={h + 16}
                            textAnchor="middle"
                            fontSize={10}
                            fill="#bbb"
                        >
                            {d.day}
                        </text>
                        {d.count > 0 && (
                            <text
                                x={x + 12} y={y - 4}
                                textAnchor="middle"
                                fontSize={9}
                                fill={isMax ? color : "#bbb"}
                            >
                                {d.count}
                            </text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}

// Gráfica de área SVG
function AreaChartSVG({ data }: { data: { day: string; total: number }[] }) {
    const W = 500;
    const H = 100;
    const max = Math.max(...data.map((d) => d.total), 1);
    const pts = data.map((d, i) => ({
        x: (i / (data.length - 1)) * W,
        y: H - (d.total / max) * H,
        ...d,
    }));

    const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaPath = `${linePath} L ${W} ${H} L 0 ${H} Z`;

    return (
        <svg width="100%" viewBox={`0 0 ${W} ${H + 28}`} preserveAspectRatio="none" style={{ overflow: "visible" }}>
            <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#1a1a1a" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#1a1a1a" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#grad)" />
            <path d={linePath} fill="none" stroke="#1a1a1a" strokeWidth="1.5" strokeLinejoin="round" />
            {pts.map((p, i) => (
                <g key={i}>
                    <circle cx={p.x} cy={p.y} r={3} fill="#1a1a1a" />
                    <text
                        x={p.x} y={H + 18}
                        textAnchor="middle"
                        fontSize={10}
                        fill="#bbb"
                    >
                        {p.day}
                    </text>
                    {p.total > 0 && (
                        <text
                            x={p.x} y={p.y - 7}
                            textAnchor="middle"
                            fontSize={9}
                            fill="#888"
                        >
                            {fmtCurrency(p.total)}
                        </text>
                    )}
                </g>
            ))}
        </svg>
    );
}

export default function DashboardPage() {
    const [stats,    setStats]    = useState<Stats | null>(null);
    const [members,  setMembers]  = useState<Member[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [plans,    setPlans]    = useState<Plan[]>([]);
    const [weekBars, setWeekBars] = useState<{ day: string; count: number }[]>([]);
    const [revChart, setRevChart] = useState<{ day: string; total: number }[]>([]);
    const [loading,  setLoading]  = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [statsRes, membersRes, paymentsRes, plansRes, attendanceRes] = await Promise.all([
                    getDashboardStats(),
                    getMembers(),
                    getPayments(),
                    getPlans(),
                    getAttendances(),
                ]);

                setStats(statsRes.data);
                setMembers((membersRes.data ?? []).slice(0, 4));
                setPayments((paymentsRes.data ?? []).slice(0, 3));
                setPlans((plansRes.data ?? []).filter((p: Plan) => p.status === "active").slice(0, 5));
                setWeekBars(buildWeekBars(attendanceRes.data ?? []));
                setRevChart(buildRevenueChart(paymentsRes.data ?? []));
            } catch (err) {
                console.error("Dashboard error:", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return <p style={{ padding: 40, color: "#bbb", fontSize: 13 }}>Cargando...</p>;
    if (!stats)  return <p style={{ padding: 40, color: "#bbb", fontSize: 13 }}>Error al cargar datos.</p>;

    return (
        <div style={s.page}>
            <PageHeader
                title="Dashboard"
                action={<GymButton icon="ti-plus">Nuevo miembro</GymButton>}
            />

            <div style={s.content}>

                {/* Stats */}
                <div style={s.statsGrid}>
                    <StatCard label="Miembros activos"      value={stats.totalMembers}                icon="ti-users"    />
                    <StatCard label="Ingresos del mes"      value={fmtCurrency(stats.totalRevenue)}   icon="ti-coin"     />
                    <StatCard label="Asistencia hoy"        value={stats.todayAttendances}            icon="ti-login"    />
                    <StatCard label="Suscripciones activas" value={stats.activeSubscriptions}         icon="ti-id-badge" />
                </div>

                {/* Gráficas */}
                <div style={s.row2}>
                    <div style={s.card}>
                        <p style={s.cardTitle}>Ingresos últimos 7 días</p>
                        <p style={s.cardSub}>Pagos confirmados por día</p>
                        <div style={{ marginTop: 16 }}>
                            <AreaChartSVG data={revChart} />
                        </div>
                    </div>
                    <div style={s.card}>
                        <p style={s.cardTitle}>Asistencia semanal</p>
                        <p style={s.cardSub}>Entradas registradas por día</p>
                        <div style={{ marginTop: 16 }}>
                            <BarChartSVG data={weekBars} />
                        </div>
                    </div>
                </div>

                {/* Listas */}
                <div style={s.row3}>
                    <div style={s.card}>
                        <p style={s.cardTitle}>Miembros recientes</p>
                        <div style={{ marginTop: 12 }}>
                            {members.length === 0 ? (
                                <p style={s.empty}>Sin miembros.</p>
                            ) : members.map((m) => (
                                <div key={m.id} style={s.listRow}>
                                    <div style={{
                                        ...s.avatar,
                                        background: m.membershipStatus === "inactive" ? "#FFF4F0" : "#F0F0EE",
                                        color:      m.membershipStatus === "inactive" ? "#c0392b" : "#666",
                                    }}>
                                        {initials(m.firstName, m.lastName)}
                                    </div>
                                    <p style={s.listName}>{m.firstName} {m.lastName}</p>
                                    <span style={{
                                        ...s.badge,
                                        background: m.membershipStatus === "active" ? "#F0F7F1" : "#FFF4F0",
                                        color:      m.membershipStatus === "active" ? "#3a7d44" : "#c0392b",
                                    }}>
                                        {m.membershipStatus === "active" ? "Activo" : "Inactivo"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={s.card}>
                        <p style={s.cardTitle}>Pagos recientes</p>
                        <div style={{ marginTop: 12 }}>
                            {payments.length === 0 ? (
                                <p style={s.empty}>Sin pagos.</p>
                            ) : payments.map((p) => (
                                <div key={p.id} style={s.listRow}>
                                    <div style={{ ...s.dot, background: p.status === "paid" ? "#3a7d44" : "#E5E4E2" }} />
                                    <div style={{ flex: 1 }}>
                                        <p style={s.listName}>{p.member.fullName}</p>
                                        <p style={s.listSub}>{fmtDate(p.paidAt)}</p>
                                    </div>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>
                                        ${p.amount}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={s.card}>
                        <p style={s.cardTitle}>Planes activos</p>
                        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                            {plans.length === 0 ? (
                                <p style={s.empty}>Sin planes.</p>
                            ) : plans.map((p) => (
                                <div key={p.id}>
                                    <p style={{ fontSize: 12, color: "#888", margin: "0 0 4px" }}>{p.name}</p>
                                    <div style={s.barBg}>
                                        <div style={{ ...s.barFill, width: "100%" }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
    return (
        <div style={s.statCard}>
            <div style={s.statTop}>
                <p style={s.statLabel}>{label}</p>
                <div style={s.iconWrap}>
                    <i className={`ti ${icon}`} style={{ fontSize: 15, color: "#888" }} aria-hidden />
                </div>
            </div>
            <p style={s.statValue}>{value}</p>
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    page:     { display: "flex", flexDirection: "column", minHeight: "100%" },
    content:  { padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14 },
    statsGrid:{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 },
    statCard: { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, padding: "14px 16px" },
    statTop:  { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
    statLabel:{ fontSize: 11, color: "#bbb", fontWeight: 500, margin: 0 },
    iconWrap: { width: 28, height: 28, borderRadius: 6, background: "#F7F7F6", display: "flex", alignItems: "center", justifyContent: "center" },
    statValue:{ fontSize: 24, fontWeight: 600, color: "#1a1a1a", letterSpacing: -0.5, margin: 0 },
    row2:     { display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 10 },
    row3:     { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
    card:     { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, padding: 16 },
    cardTitle:{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", margin: 0 },
    cardSub:  { fontSize: 11, color: "#bbb", margin: "4px 0 0" },
    listRow:  { display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid #F0F0EE" },
    avatar:   { width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, flexShrink: 0 },
    listName: { fontSize: 13, color: "#1a1a1a", fontWeight: 500, margin: 0, flex: 1 },
    listSub:  { fontSize: 11, color: "#bbb", margin: 0 },
    badge:    { fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 500, whiteSpace: "nowrap" },
    dot:      { width: 7, height: 7, borderRadius: "50%", flexShrink: 0 },
    barBg:    { background: "#F0F0EE", borderRadius: 3, height: 4 },
    barFill:  { background: "#1a1a1a", height: 4, borderRadius: 3 },
    empty:    { fontSize: 12, color: "#bbb", margin: 0 },
};