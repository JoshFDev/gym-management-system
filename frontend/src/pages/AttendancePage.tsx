import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip } from "chart.js";
import { createAttendance, getAttendances, getAttendanceReport } from "../services/attendance.service";
import { getMembers } from "../services/member.service";
import PageHeader from "../components/PageHeader";
import GymButton from "../components/GymButton";
import Pagination from "../components/Pagination";
import { useSocketRefresh } from "../hooks/useSocketRefresh";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

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

interface ToastMsg { id: number; text: string; type: "success" | "error" }

const fmtDateTime = (d: string) =>
    new Date(d).toLocaleString("es-MX", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });

const initials = (name: string) =>
    name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

const fmtDay = (d: string) =>
    new Date(d).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });

function AttendanceDrawer({ open, members, submitting, memberId, onMemberChange, onSubmit, onClose }: {
    open: boolean; members: Member[]; submitting: boolean;
    memberId: string; onMemberChange: (id: string) => void;
    onSubmit: (e: React.FormEvent) => void; onClose: () => void;
}) {
    useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);

    return (
        <>
            <div style={{ ...s.overlay, opacity: open ? 1 : 0, pointerEvents: open ? "all" : "none" }} onClick={onClose} aria-hidden />
            <div style={{ ...s.drawer, transform: open ? "translateX(0)" : "translateX(100%)" }} role="dialog" aria-modal aria-label="Registrar entrada">
                <div style={s.drawerHeader}>
                    <div>
                        <p style={s.drawerTitle}>Registrar entrada</p>
                        <p style={s.drawerSub}>Selecciona el miembro que está ingresando</p>
                    </div>
                    <button style={s.btnIcon} onClick={onClose}><i className="ti ti-x" style={{ fontSize: 16 }} aria-hidden /></button>
                </div>
                <form onSubmit={onSubmit} style={s.drawerBody} noValidate>
                    <Field label="Miembro *">
                        <select style={s.input} value={memberId} onChange={(e) => onMemberChange(e.target.value)} required>
                            <option value="">Seleccionar miembro</option>
                            {members.filter((m) => m.membershipStatus === "active").map((m) => (
                                <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                            ))}
                        </select>
                    </Field>
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
                    <div style={s.drawerFooter}>
                        <button type="button" style={s.btnGhost} onClick={onClose} disabled={submitting}>Cancelar</button>
                        <button type="submit" style={{ ...s.btnPrimary, opacity: submitting ? 0.7 : 1 }} disabled={submitting}>
                            {submitting ? <><span style={s.spinner} />Registrando…</>
                                : <><i className="ti ti-check" style={{ fontSize: 13 }} aria-hidden />Confirmar entrada</>}
                        </button>
                    </div>
                </form>
            </div>
        </>
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

function ReportModal({ open, loading, data, labels, period, total, onPeriod, onClose }: {
    open: boolean; loading: boolean; data: number[]; labels: string[]; period: string; total: number;
    onPeriod: (p: string) => void; onClose: () => void;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);

    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [open]);

    useEffect(() => {
        if (!open || !canvasRef.current || loading || data.length === 0) return;
        if (chartRef.current) chartRef.current.destroy();
        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) return;
        chartRef.current = new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels.map(fmtDay),
                datasets: [{
                    label: "Entradas",
                    data,
                    backgroundColor: "#1a1a1a",
                    borderRadius: 4,
                }],
            },
            options: {
                responsive: true,
                plugins: {
                    tooltip: { enabled: true },
                },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                    x: { grid: { display: false } },
                },
            },
            plugins: [{
                id: "bg",
                beforeDraw: (chart) => {
                    const c = chart.canvas.getContext("2d");
                    if (!c) return;
                    c.save();
                    c.fillStyle = "#fff";
                    c.fillRect(0, 0, chart.canvas.width, chart.canvas.height);
                    c.restore();
                },
            }],
        });
        return () => { if (chartRef.current) chartRef.current.destroy(); };
    }, [open, loading, data, labels]);

    const download = () => {
        if (!canvasRef.current || !chartRef.current) return;
        const orig = canvasRef.current;
        const w = orig.width || 800;
        const h = orig.height || 400;
        const pad = 40;
        const headerH = 100;
        const totalW = w + pad * 2;
        const totalH = h + headerH + pad * 2;

        const offscreen = document.createElement("canvas");
        offscreen.width = totalW;
        offscreen.height = totalH;
        const oc = offscreen.getContext("2d");
        if (!oc) return;

        // Background
        oc.fillStyle = "#f5f5f4";
        oc.fillRect(0, 0, totalW, totalH);

        // White card
        oc.fillStyle = "#fff";
        const cardX = 0;
        const cardY = 0;
        const cardW = totalW;
        const cardH = totalH;
        oc.beginPath();
        oc.roundRect(cardX, cardY, cardW, cardH, 12);
        oc.fill();

        // Header
        oc.fillStyle = "#1a1a1a";
        oc.font = "bold 18px sans-serif";
        oc.textAlign = "left";
        oc.fillText("ZenithGym", pad, pad + 28);

        oc.font = "13px sans-serif";
        oc.fillStyle = "#888";
        oc.fillText(`Reporte de asistencia · ${periodLabel}`, pad, pad + 52);

        oc.font = "bold 28px sans-serif";
        oc.fillStyle = "#1a1a1a";
        oc.textAlign = "right";
        oc.fillText(`${total}`, totalW - pad, pad + 32);
        oc.font = "11px sans-serif";
        oc.fillStyle = "#bbb";
        oc.fillText(`entrada${total !== 1 ? "s" : ""}`, totalW - pad, pad + 50);

        // Divider line
        oc.strokeStyle = "#f0f0ee";
        oc.lineWidth = 1;
        oc.beginPath();
        oc.moveTo(pad, pad + 68);
        oc.lineTo(totalW - pad, pad + 68);
        oc.stroke();

        // Draw chart onto offscreen
        oc.drawImage(orig, pad, pad + headerH, w, h);

        const link = document.createElement("a");
        link.download = `ZenithGym_Reporte_${period}.png`;
        link.href = offscreen.toDataURL("image/png");
        link.click();
    };

    if (!open) return null;

    const periodLabel = period === "today" ? "Hoy" : period === "week" ? "Esta semana" : period === "month" ? "Este mes" : "Este año";

    return (
        <>
            <div style={{ ...s.overlay, zIndex: 1100 }} onClick={onClose} aria-hidden />
            <div style={s.reportModal}>
                <div style={s.reportHeader}>
                    <div>
                        <p style={s.reportTitle}>Reporte de asistencia</p>
                        {period && <p style={s.reportSub}>{periodLabel} · {total} entrada{total !== 1 ? "s" : ""}</p>}
                    </div>
                    <button style={s.btnIcon} onClick={onClose}><i className="ti ti-x" style={{ fontSize: 16 }} aria-hidden /></button>
                </div>
                <div style={s.reportPeriods}>
                    <button style={{ ...s.reportPeriodBtn, ...(period === "today" ? s.reportPeriodActive : {}) }} onClick={() => onPeriod("today")}>Hoy</button>
                    <button style={{ ...s.reportPeriodBtn, ...(period === "week" ? s.reportPeriodActive : {}) }} onClick={() => onPeriod("week")}>Semana</button>
                    <button style={{ ...s.reportPeriodBtn, ...(period === "month" ? s.reportPeriodActive : {}) }} onClick={() => onPeriod("month")}>Mes</button>
                    <button style={{ ...s.reportPeriodBtn, ...(period === "year" ? s.reportPeriodActive : {}) }} onClick={() => onPeriod("year")}>Año</button>
                </div>
                <div style={s.reportBody}>
                    {loading ? (
                        <p style={s.empty}>Cargando reporte…</p>
                    ) : !period ? (
                        <p style={s.empty}>Selecciona un período para ver la gráfica.</p>
                    ) : data.length === 0 ? (
                        <p style={s.empty}>Sin datos para este período.</p>
                    ) : (
                        <canvas ref={canvasRef} style={{ width: "100%", maxHeight: 300 }} />
                    )}
                </div>
                {!loading && data.length > 0 && (
                    <div style={s.reportFooter}>
                        <button style={s.btnGhost} onClick={download}>
                            <i className="ti ti-download" style={{ fontSize: 13 }} aria-hidden /> Descargar PNG
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}

export default function AttendancePage() {
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [memberId, setMemberId] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [toasts, setToasts] = useState<ToastMsg[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [filterSearch, setFilterSearch] = useState("");
    const [filterGender, setFilterGender] = useState("");
    const [filterDate, setFilterDate] = useState("");
    const setSearch = (v: string) => { setFilterSearch(v); setPage(1); };
    const setGender = (v: string) => { setFilterGender(v); setPage(1); };
    const setDateFilter = (v: string) => { setFilterDate(v); setPage(1); };
    const clearFilters = () => { setFilterSearch(""); setFilterGender(""); setFilterDate(""); setPage(1); };
    const [reportOpen, setReportOpen] = useState(false);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportData, setReportData] = useState<number[]>([]);
    const [reportLabels, setReportLabels] = useState<string[]>([]);
    const [reportPeriod, setReportPeriod] = useState("");
    const [reportTotal, setReportTotal] = useState(0);
    const limit = 20;
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const cooldownRef = useRef(false);
    const scannerContainerId = "qr-scanner-container";

    const activeMembers = members.filter((m) => m.membershipStatus === "active");

    const addToast = useCallback((text: string, type: "success" | "error" = "success") => {
        const id = Date.now();
        setToasts((p) => [...p, { id, text, type }]);
        setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
    }, []);

    const buildFilters = useCallback(() => {
        const f: Record<string, string> = {};
        if (filterSearch) f.search = filterSearch;
        if (filterGender) f.gender = filterGender;
        if (filterDate === "today") {
            const d = new Date();
            f.dateFrom = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
            f.dateTo = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString();
        } else if (filterDate === "week") {
            const d = new Date();
            const day = d.getDay();
            const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (day === 0 ? 6 : day - 1));
            f.dateFrom = monday.toISOString();
            f.dateTo = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7).toISOString();
        } else if (filterDate === "month") {
            const d = new Date();
            f.dateFrom = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
            f.dateTo = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
        }
        return f;
    }, [filterSearch, filterGender, filterDate]);

    const loadAttendances = useCallback(async (targetPage: number) => {
        const f = buildFilters();
        const res = await getAttendances(targetPage, limit, f);
        setAttendances(res.data ?? []);
        setTotal(res.total ?? 0);
        setTotalPages(res.totalPages ?? 1);
    }, [buildFilters]);

    useSocketRefresh(["attendance_created"], () => loadAttendances(page));

    useEffect(() => {
        const init = async () => {
            try {
                const f = buildFilters();
                const [attRes, membersRes] = await Promise.all([
                    getAttendances(page, limit, f),
                    getMembers(),
                ]);
                setAttendances(attRes.data ?? []);
                setTotal(attRes.total ?? 0);
                setTotalPages(attRes.totalPages ?? 1);
                setMembers(membersRes.data ?? []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [page, buildFilters]);

    // Scanner effect
    useEffect(() => {
        if (!scanning) return;
        const el = document.getElementById(scannerContainerId);
        if (!el) return;
        const scanner = new Html5Qrcode(scannerContainerId);
        scannerRef.current = scanner;
        let cancelled = false;
        (async () => {
            try {
                await scanner.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 240, height: 240 } },
                    async (decodedText) => {
                        if (cancelled || cooldownRef.current) return;
                        const member = members.find((m) => m.id === decodedText);
                        if (!member) {
                            addToast("QR no válido o miembro no encontrado", "error");
                            return;
                        }
                        if (member.membershipStatus !== "active") {
                            addToast(`${member.firstName} ${member.lastName} no está activo`, "error");
                            return;
                        }
                        cooldownRef.current = true;
                        setTimeout(() => { cooldownRef.current = false; }, 5000);
                        try {
                            await createAttendance(member.id);
                            addToast(`Entrada registrada: ${member.firstName} ${member.lastName}`);
                            loadAttendances(page);
                        } catch {
                            addToast("Error al registrar entrada", "error");
                        }
                    },
                    () => { }
                );
            } catch {
                if (!cancelled) {
                    addToast("No se pudo acceder a la cámara", "error");
                    setScanning(false);
                }
            }
        })();
        return () => { cancelled = true; scanner.stop().catch(() => {}); };
    }, [scanning, members, addToast, loadAttendances, page]);

    const clearForm = () => {
        setMemberId(""); setDrawerOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!memberId) return;
        setSubmitting(true);
        try {
            await createAttendance(memberId);
            addToast("Entrada registrada");
            clearForm();
            loadAttendances(page);
        } catch {
            addToast("Error al registrar entrada", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const today = new Date().toDateString();
    const todayCount = attendances.filter(
        (a) => new Date(a.checkInAt).toDateString() === today
    ).length;

    const openReport = async (period: string) => {
        setReportPeriod(period);
        if (!period) return;
        setReportOpen(true);
        setReportLoading(true);
        const now = new Date();
        let from: Date, to: Date;
        if (period === "today") {
            from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            to = new Date(from);
            to.setDate(to.getDate() + 1);
        } else if (period === "week") {
            const day = now.getDay();
            from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (day === 0 ? 6 : day - 1));
            to = new Date(from);
            to.setDate(to.getDate() + 7);
        } else if (period === "month") {
            from = new Date(now.getFullYear(), now.getMonth(), 1);
            to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        } else {
            from = new Date(now.getFullYear(), 0, 1);
            to = new Date(now.getFullYear() + 1, 0, 1);
        }
        try {
            const res = await getAttendanceReport(from.toISOString(), to.toISOString());
            setReportLabels(res.labels ?? []);
            setReportData(res.data ?? []);
            setReportTotal(res.total ?? 0);
        } catch {
            addToast("Error al cargar reporte", "error");
        } finally {
            setReportLoading(false);
        }
    };

    return (
        <div style={s.page}>
            <AttendanceDrawer
                open={drawerOpen}
                members={members}
                submitting={submitting}
                memberId={memberId}
                onMemberChange={setMemberId}
                onSubmit={handleSubmit}
                onClose={clearForm}
            />

            <ReportModal
                open={reportOpen}
                loading={reportLoading}
                data={reportData}
                labels={reportLabels}
                period={reportPeriod}
                total={reportTotal}
                onPeriod={openReport}
                onClose={() => setReportOpen(false)}
            />

            <div style={s.toastStack}>
                {toasts.map((t) => (
                    <div key={t.id} style={{ ...s.toast, background: t.type === "success" ? "#1a1a1a" : "#c0392b" }}
                        onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}>
                        <i className={`ti ${t.type === "success" ? "ti-check" : "ti-alert-circle"}`} style={{ fontSize: 13 }} aria-hidden />
                        {t.text}
                    </div>
                ))}
            </div>

            <PageHeader
                title="Asistencia"
                action={
                    <div style={{ display: "flex", gap: 8 }}>
                        <GymButton icon="ti-report-chart" onClick={() => { setReportPeriod(""); setReportData([]); setReportLabels([]); setReportTotal(0); setReportOpen(true); }}>
                            Reporte
                        </GymButton>
                        <GymButton icon="ti-qrcode" onClick={() => { setDrawerOpen(false); setScanning((p) => !p); }}>
                            {scanning ? "Detener escáner" : "Escanear QR"}
                        </GymButton>
                        <GymButton icon="ti-login" onClick={() => { setScanning(false); setDrawerOpen(true); }}>
                            Registrar entrada
                        </GymButton>
                    </div>
                }
            />

            <div style={s.content}>
                <div style={s.summaryCard}>
                    <div style={s.summaryItem}>
                        <p style={s.summaryLabel}>Entradas hoy</p>
                        <p style={s.summaryValue}>{todayCount}</p>
                    </div>
                    <div style={s.summaryDivider} />
                    <div style={s.summaryItem}>
                        <p style={s.summaryLabel}>Total registros</p>
                        <p style={s.summaryValue}>{total}</p>
                    </div>
                    <div style={s.summaryDivider} />
                    <div style={s.summaryItem}>
                        <p style={s.summaryLabel}>Miembros activos</p>
                        <p style={s.summaryValue}>{activeMembers.length}</p>
                    </div>
                </div>

                {scanning && (
                    <div style={s.card}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <div>
                                <p style={s.formTitle}>Escanear QR</p>
                                <p style={s.formDesc}>Apunta al código QR del miembro para registrar su entrada.</p>
                            </div>
                            <button style={s.btnIcon} onClick={() => setScanning(false)}>
                                <i className="ti ti-x" style={{ fontSize: 16 }} aria-hidden />
                            </button>
                        </div>
                        <div id={scannerContainerId} style={s.scannerContainer} />
                    </div>
                )}

                <div style={s.toolbar}>
                    <div style={s.searchWrap}>
                        <i className="ti ti-search" style={s.searchIcon} aria-hidden />
                        <input style={s.searchInput} placeholder="Buscar miembro…" value={filterSearch}
                            onChange={(e) => setSearch(e.target.value)} />
                        {filterSearch && <button style={s.clearBtn} onClick={() => setSearch("")}><i className="ti ti-x" style={{ fontSize: 12 }} aria-hidden /></button>}
                    </div>
                    <select style={s.filterSelect} value={filterGender} onChange={(e) => setGender(e.target.value)}>
                        <option value="">Todos los géneros</option>
                        <option value="male">Masculino</option>
                        <option value="female">Femenino</option>
                        <option value="other">Otro</option>
                    </select>
                    <select style={s.filterSelect} value={filterDate} onChange={(e) => setDateFilter(e.target.value)}>
                        <option value="">Todas las fechas</option>
                        <option value="today">Hoy</option>
                        <option value="week">Esta semana</option>
                        <option value="month">Este mes</option>
                    </select>
                    {(filterSearch || filterGender || filterDate) && (
                        <button style={s.btnClear} onClick={clearFilters}>
                            <i className="ti ti-filter-off" style={{ fontSize: 12 }} aria-hidden /> Limpiar
                        </button>
                    )}
                </div>

                {loading ? (
                    <p style={s.empty}>Cargando asistencias…</p>
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
                                    <th style={s.th}>Entrada</th>
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
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {!loading && (
                    <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onChange={setPage} />
                )}
            </div>
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
    table:          { width: "100%", borderCollapse: "collapse" },
    thead:          { borderBottom: "1px solid #E5E4E2", background: "#FAFAFA" },
    th:             { padding: "10px 14px", fontSize: 11, fontWeight: 500, color: "#bbb", textAlign: "left", whiteSpace: "nowrap" },
    row:            { borderBottom: "1px solid #F0F0EE" },
    td:             { padding: "11px 14px", fontSize: 13, color: "#1a1a1a" },
    muted:          { color: "#888" },
    badge:          { display: "inline-flex", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500 },
    avatar:         { width: 28, height: 28, borderRadius: "50%", background: "#F0F0EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: "#666", flexShrink: 0 },
    empty:          { fontSize: 13, color: "#bbb", padding: "40px 0", textAlign: "center" },
    toastStack:     { position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" },
    toast:          { display: "flex", alignItems: "center", gap: 8, color: "#fff", fontSize: 12, fontWeight: 500, padding: "9px 14px", borderRadius: 8, animation: "fadeIn 0.2s ease", cursor: "pointer", pointerEvents: "all", boxShadow: "0 2px 12px rgba(0,0,0,0.18)" },
    scannerContainer: { width: "100%", maxWidth: 400, minHeight: 250, margin: "0 auto", borderRadius: 8, overflow: "hidden" },
    spinner:        { display: "inline-block", width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
    overlay:        { position: "fixed", inset: 0, zIndex: 800, background: "rgba(0,0,0,0.35)", transition: "opacity 0.2s ease" },
    drawer:         { position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 900, width: 400, background: "#fff", borderLeft: "1px solid #E5E4E2", display: "flex", flexDirection: "column", transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)", boxShadow: "-4px 0 24px rgba(0,0,0,0.08)" },
    drawerHeader:   { display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "22px 24px 18px", borderBottom: "1px solid #F0F0EE", flexShrink: 0 },
    drawerTitle:    { fontSize: 15, fontWeight: 600, color: "#1a1a1a", margin: 0 },
    drawerSub:      { fontSize: 12, color: "#bbb", margin: "3px 0 0" },
    drawerBody:     { flex: 1, overflowY: "auto", padding: "20px 24px" },
    drawerFooter:   { display: "flex", gap: 8, justifyContent: "flex-end", padding: "14px 24px", borderTop: "1px solid #F0F0EE", flexShrink: 0, marginTop: 16 },
    input:          { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 7, padding: "8px 11px", fontSize: 13, color: "#1a1a1a", outline: "none", width: "100%", fontFamily: "inherit", boxSizing: "border-box" as const },
    timePreview:    { display: "flex", alignItems: "center", gap: 6, marginTop: 10, padding: "8px 12px", background: "#F7F7F6", borderRadius: 6, width: "fit-content" },
    btnIcon:        { background: "none", border: "none", cursor: "pointer", color: "#bbb", padding: 4, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" },
    toolbar:        { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const },
    filterSelect:   { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 8, padding: "7px 10px", fontSize: 12, color: "#555", fontFamily: "inherit", cursor: "pointer", outline: "none" },
    btnClear:       { display: "inline-flex", alignItems: "center", gap: 5, background: "none", color: "#888", border: "1px solid #E5E4E2", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontFamily: "inherit", cursor: "pointer" },
    btnPrimary:     { display: "inline-flex", alignItems: "center", gap: 6, background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" },
    btnGhost:       { background: "none", color: "#555", border: "1px solid #E5E4E2", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" },
    reportPeriods:  { display: "flex", gap: 6, padding: "12px 20px", borderBottom: "1px solid #F0F0EE" },
    reportPeriodBtn: { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontFamily: "inherit", cursor: "pointer", color: "#555" },
    reportPeriodActive: { background: "#1a1a1a", borderColor: "#1a1a1a", color: "#fff" },
    reportModal:    { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 1200, width: 560, maxWidth: "90vw", background: "#fff", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", maxHeight: "80vh" },
    reportHeader:   { display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "18px 20px 14px", borderBottom: "1px solid #F0F0EE", flexShrink: 0 },
    reportTitle:    { fontSize: 15, fontWeight: 600, color: "#1a1a1a", margin: 0 },
    reportSub:      { fontSize: 12, color: "#bbb", margin: "3px 0 0" },
    reportBody:     { flex: 1, overflowY: "auto", padding: "20px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 },
    reportFooter:   { display: "flex", gap: 8, justifyContent: "flex-end", padding: "12px 20px", borderTop: "1px solid #F0F0EE", flexShrink: 0 },
    searchWrap:     { position: "relative", display: "flex", alignItems: "center", flex: "0 0 220px" },
    searchIcon:     { position: "absolute", left: 10, fontSize: 14, color: "#bbb", pointerEvents: "none" },
    searchInput:    { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 8, padding: "7px 28px 7px 32px", fontSize: 12, color: "#1a1a1a", outline: "none", width: "100%", fontFamily: "inherit" },
    clearBtn:       { position: "absolute", right: 8, background: "none", border: "none", cursor: "pointer", color: "#bbb", padding: 2, display: "flex", alignItems: "center" },
};