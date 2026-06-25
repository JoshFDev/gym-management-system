import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { createAttendance, getAttendances } from "../services/attendance.service";
import { getMembers } from "../services/member.service";
import PageHeader from "../components/PageHeader";
import GymButton from "../components/GymButton";
import { useSocketRefresh } from "../hooks/useSocketRefresh";

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

export default function AttendancePage() {
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [memberId, setMemberId] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [toasts, setToasts] = useState<ToastMsg[]>([]);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const scannerContainerId = "qr-scanner-container";

    const activeMembers = members.filter((m) => m.membershipStatus === "active");

    const addToast = useCallback((text: string, type: "success" | "error" = "success") => {
        const id = Date.now();
        setToasts((p) => [...p, { id, text, type }]);
        setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
    }, []);

    const loadAttendances = useCallback(async () => {
        const res = await getAttendances();
        setAttendances(res.data ?? []);
    }, []);

    useSocketRefresh(["attendance_created"], loadAttendances);

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
                        if (cancelled) return;
                        const member = members.find((m) => m.id === decodedText);
                        if (!member) {
                            addToast("QR no válido o miembro no encontrado", "error");
                            return;
                        }
                        if (member.membershipStatus !== "active") {
                            addToast(`${member.firstName} ${member.lastName} no está activo`, "error");
                            return;
                        }
                        try {
                            await createAttendance(member.id);
                            addToast(`Entrada registrada — ${member.firstName} ${member.lastName}`);
                            loadAttendances();
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
    }, [scanning, members, addToast, loadAttendances]);

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
            loadAttendances();
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
                        <p style={s.summaryValue}>{attendances.length}</p>
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
    // Drawer styles
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
    btnPrimary:     { display: "inline-flex", alignItems: "center", gap: 6, background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" },
    btnGhost:       { background: "none", color: "#555", border: "1px solid #E5E4E2", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" },
};
