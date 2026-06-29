import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getSubscriptions, createSubscription, renewSubscription, cancelSubscription, deleteSubscription } from "../services/subscription.service";
import { getMembers } from "../services/member.service";
import { getPlans } from "../services/plan.service";
import PageHeader from "../components/PageHeader";
import LoadingSkeleton from "../components/LoadingSkeleton";
import GymButton from "../components/GymButton";
import Pagination from "../components/Pagination";
import ConfirmModal from "../components/ConfirmModal";
import { useSocketRefresh } from "../hooks/useSocketRefresh";
import { useToast } from "../hooks/useToast";

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
interface Plan { id: string; name: string; price: number; durationDays: number; status: string }

interface FormErrors { memberId?: string; planId?: string; }

const statusLabel: Record<string, string> = {
    active: "Activo", expired: "Vencido", pending: "Pendiente", cancelled: "Cancelada",
};

const fmtDate = (d: Date | string) =>
    new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

const daysLeft = (endDate: Date | string) => {
    const diff = new Date(endDate).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

function Field({ label, required, error, touched, children }: {
    label: string; required?: boolean; error?: string; touched?: boolean; children: React.ReactNode;
}) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={s.fieldLabel}>{label}{required && <span style={{ color: "#c0392b", marginLeft: 2 }}>*</span>}</label>
            {children}
            {touched && error && <span style={s.fieldError}>{error}</span>}
        </div>
    );
}

interface DrawerProps {
    open: boolean; saving: boolean;
    values: { memberId: string; planId: string }; errors: FormErrors; touched: Record<string, boolean>;
    members: Member[]; plans: Plan[];
    onChange: (field: string, val: string) => void; onBlur: (field: string) => void;
    onSubmit: (e: React.FormEvent) => void; onClose: () => void;
}

function SubscriptionDrawer({ open, saving, values, errors, touched, members, plans, onChange, onBlur, onSubmit, onClose }: DrawerProps) {
    useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);
    const firstRef = useRef<HTMLSelectElement>(null);
    useEffect(() => { if (open) setTimeout(() => firstRef.current?.focus(), 300); }, [open]);

    return (
        <>
            <div style={{ ...s.overlay, opacity: open ? 1 : 0, pointerEvents: open ? "all" : "none", zIndex: 800 }} onClick={onClose} aria-hidden />
            <div style={{ ...s.drawer, transform: open ? "translateX(0)" : "translateX(100%)" }} className="drawer-panel" role="dialog" aria-modal aria-label="Nueva suscripción">
                <div style={s.drawerHeader}>
                    <div>
                        <p style={s.drawerTitle}>Nueva suscripción</p>
                        <p style={s.drawerSub}>Selecciona el miembro y el plan</p>
                    </div>
                    <button style={s.btnIcon} onClick={onClose}><i className="ti ti-x" style={{ fontSize: 16 }} aria-hidden /></button>
                </div>
                <form onSubmit={onSubmit} style={s.drawerBody} noValidate>
                    <Field label="Miembro" required error={errors.memberId} touched={touched.memberId}>
                        <select ref={firstRef} style={{ ...s.input, ...(touched.memberId && errors.memberId ? s.inputError : {}) }}
                            value={values.memberId} onChange={(e) => onChange("memberId", e.target.value)} onBlur={() => onBlur("memberId")}>
                            <option value="">Seleccionar miembro</option>
                            {members.map((m) => (
                                <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Plan" required error={errors.planId} touched={touched.planId}>
                        <select style={{ ...s.input, ...(touched.planId && errors.planId ? s.inputError : {}) }}
                            value={values.planId} onChange={(e) => onChange("planId", e.target.value)} onBlur={() => onBlur("planId")}>
                            <option value="">Seleccionar plan</option>
                            {plans.map((p) => (
                                <option key={p.id} value={p.id}>{p.name} — ${p.price} / {p.durationDays} días</option>
                            ))}
                        </select>
                    </Field>
                    <div style={s.drawerFooter}>
                        <button type="button" style={s.btnGhost} onClick={onClose} disabled={saving}>Cancelar</button>
                        <button type="submit" style={{ ...s.btnPrimary, opacity: saving ? 0.7 : 1 }} disabled={saving}>
                            {saving ? <><span style={s.spinner} />Guardando…</>
                                : <><i className="ti ti-check" style={{ fontSize: 13 }} aria-hidden />Crear suscripción</>}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

const validate = (values: { memberId: string; planId: string }): FormErrors => {
    const e: FormErrors = {};
    if (!values.memberId) e.memberId = "Selecciona un miembro";
    if (!values.planId) e.planId = "Selecciona un plan";
    return e;
};

const daysLabel = (days: number, status: string) => {
    if (status === "expired") return "Vencida";
    if (days <= 0) return "Hoy";
    return `${days} días`;
};

function exportExcel(subscriptions: Subscription[]) {
    const rows = subscriptions.map((sub) => ({
        Miembro: sub.member?.fullName ?? "—", Email: sub.member?.email ?? "", Teléfono: sub.member?.phone ?? "",
        Plan: sub.plan?.name ?? "—", Precio: sub.plan?.price ?? 0,
        Inicio: new Date(sub.startDate).toLocaleDateString("es-MX"),
        Vencimiento: new Date(sub.endDate).toLocaleDateString("es-MX"),
        "Días restantes": daysLeft(sub.endDate),
        Estado: statusLabel[sub.status] ?? sub.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 28 }, { wch: 28 }, { wch: 16 }, { wch: 20 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Suscripciones");
    XLSX.writeFile(wb, `ZenithGym_Suscripciones_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function exportPDF(subscriptions: Subscription[]) {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(26, 26, 26);
    doc.text("ZenithGym · Lista de suscripciones", 14, 16);
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(136, 136, 136);
    doc.text(`Generado el ${new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })} · ${subscriptions.length} suscripción${subscriptions.length !== 1 ? "es" : ""}`, 14, 22);
    autoTable(doc, {
        startY: 28, head: [["Miembro", "Email", "Plan", "Precio", "Inicio", "Vencimiento", "Días rest.", "Estado"]],
        body: subscriptions.map((sub) => [
            sub.member?.fullName ?? "—", sub.member?.email ?? "—", sub.plan?.name ?? "—", `$${sub.plan?.price ?? 0}`,
            new Date(sub.startDate).toLocaleDateString("es-MX"),
            new Date(sub.endDate).toLocaleDateString("es-MX"),
            daysLabel(daysLeft(sub.endDate), sub.status),
            statusLabel[sub.status] ?? sub.status,
        ]),
        styles: { font: "helvetica", fontSize: 9, cellPadding: 3, textColor: [26, 26, 26] },
        headStyles: { fillColor: [250, 250, 250], textColor: [136, 136, 136], fontStyle: "normal", lineWidth: 0.1, lineColor: [229, 228, 226] },
        alternateRowStyles: { fillColor: [252, 252, 251] }, tableLineColor: [229, 228, 226], tableLineWidth: 0.1,
    });
    doc.save(`ZenithGym_Suscripciones_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export default function SubscriptionsPage() {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formValues, setFormValues] = useState({ memberId: "", planId: "" });
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmTarget, setConfirmTarget] = useState<string | null>(null);
    const [confirmLoading, setConfirmLoading] = useState(false);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 20;

    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [planFilter, setPlanFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelTarget, setCancelTarget] = useState<string | null>(null);
    const [cancelLoading, setCancelLoading] = useState(false);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const { addToast } = useToast();

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(timer);
    }, [search]);

    const load = async (targetPage: number) => {
        const extra: { search?: string; planId?: string; status?: string } = {};
        if (debouncedSearch.trim()) extra.search = debouncedSearch.trim();
        if (planFilter) extra.planId = planFilter;
        if (statusFilter) extra.status = statusFilter;
        const res = await getSubscriptions(targetPage, limit, extra);
        setSubscriptions(res.data ?? []);
        setTotal(res.total ?? 0);
        setTotalPages(res.totalPages ?? 1);
    };

    useSocketRefresh(["subscription_created", "subscription_renewed", "subscription_cancelled"], () => load(page));

    useEffect(() => {
        const init = async () => {
            try {
                const extra: { search?: string; planId?: string; status?: string } = {};
                if (debouncedSearch.trim()) extra.search = debouncedSearch.trim();
                if (planFilter) extra.planId = planFilter;
                if (statusFilter) extra.status = statusFilter;
                const [subsRes, membersRes, plansRes] = await Promise.all([
                    getSubscriptions(page, limit, extra), getMembers(), getPlans(),
                ]);
                setSubscriptions(subsRes.data ?? []);
                setTotal(subsRes.total ?? 0);
                setTotalPages(subsRes.totalPages ?? 1);
                setMembers(membersRes.data ?? []);
                setPlans((plansRes.data ?? []).filter((p: Plan) => p.status === "active"));
            } catch { setError(true); } finally { setLoading(false); }
        };
        init();
    }, [page, debouncedSearch, planFilter, statusFilter, addToast]);

    const openNew = () => { setFormValues({ memberId: "", planId: "" }); setErrors({}); setTouched({}); setDrawerOpen(true); };

    const handleFieldChange = (field: string, val: string) => {
        setFormValues((p) => { const next = { ...p, [field]: val }; setErrors(validate(next as { memberId: string; planId: string })); return next; }) as unknown as void;
    };
    const handleBlur = (field: string) => { setTouched((p) => ({ ...p, [field]: true })); setErrors(validate(formValues)); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const allTouched = { memberId: true, planId: true };
        setTouched(allTouched);
        const validation = validate(formValues);
        setErrors(validation);
        if (Object.keys(validation).length > 0) return;
        setSaving(true);
        try {
            await createSubscription({ memberId: formValues.memberId, planId: formValues.planId });
            addToast("Suscripción creada correctamente");
            setDrawerOpen(false); await load(page);
        } catch { addToast("Error al crear suscripción.", "error"); } finally { setSaving(false); }
    };

    const requestRenew = (id: string) => { setConfirmTarget(id); setConfirmOpen(true); };
    const confirmRenew = async () => {
        if (!confirmTarget) return;
        setConfirmLoading(true);
        try {
            await renewSubscription(confirmTarget);
            addToast("Suscripción renovada");
            await load(page);
        } catch { addToast("Error al renovar.", "error"); } finally { setConfirmLoading(false); setConfirmOpen(false); setConfirmTarget(null); }
    };

    const requestCancel = (id: string) => { setCancelTarget(id); setCancelOpen(true); };
    const confirmCancel = async () => {
        if (!cancelTarget) return;
        const prev = subscriptions;
        setSubscriptions((current) => current.map((s) => s.id === cancelTarget ? { ...s, status: "cancelled" } : s));
        setCancelLoading(true);
        try {
            await cancelSubscription(cancelTarget);
            addToast("Suscripción cancelada");
        } catch {
            setSubscriptions(prev);
            addToast("Error al cancelar.", "error");
        } finally { setCancelLoading(false); setCancelOpen(false); setCancelTarget(null); }
    };

    const requestDelete = (id: string) => { setDeleteTarget(id); setDeleteOpen(true); };
    const confirmDelete = async () => {
        if (!deleteTarget) return;
        const prev = subscriptions;
        setSubscriptions((current) => current.filter((s) => s.id !== deleteTarget));
        setDeleteLoading(true);
        try {
            await deleteSubscription(deleteTarget);
            addToast("Suscripción eliminada");
        } catch {
            setSubscriptions(prev);
            addToast("Error al eliminar.", "error");
        } finally { setDeleteLoading(false); setDeleteOpen(false); setDeleteTarget(null); }
    };

    return (
        <div className="subs-page" style={s.page}>

            <ConfirmModal open={confirmOpen} title="Renovar suscripción"
                body="¿Renovar esta suscripción? Se extenderá la fecha de vencimiento según los días del plan."
                confirmLabel="Sí, renovar" loading={confirmLoading}
                onConfirm={confirmRenew} onCancel={() => { setConfirmOpen(false); setConfirmTarget(null); }} />
            <ConfirmModal open={cancelOpen} title="Cancelar suscripción"
                body="¿Cancelar esta suscripción? Esta acción no se puede deshacer."
                confirmLabel="Sí, cancelar" loading={cancelLoading} confirmColor="#c0392b"
                onConfirm={confirmCancel} onCancel={() => { setCancelOpen(false); setCancelTarget(null); }} />
            <ConfirmModal open={deleteOpen} title="Eliminar suscripción"
                body="¿Eliminar esta suscripción permanentemente? Esta acción no se puede deshacer."
                confirmLabel="Sí, eliminar" loading={deleteLoading} confirmColor="#c0392b"
                onConfirm={confirmDelete} onCancel={() => { setDeleteOpen(false); setDeleteTarget(null); }} />
            <SubscriptionDrawer open={drawerOpen} saving={saving} values={formValues} errors={errors} touched={touched}
                members={members} plans={plans} onChange={handleFieldChange} onBlur={handleBlur}
                onSubmit={handleSubmit} onClose={() => setDrawerOpen(false)} />
            <PageHeader title="Suscripciones" action={<GymButton icon="ti-plus" onClick={openNew}>Nueva suscripción</GymButton>} />
            <div className="subs-content" style={s.content}>
                <div className="toolbar-card" style={s.toolbarCard}>
                <div className="toolbar-wrap" style={s.toolbar}>
                    <div style={s.searchWrap}>
                        <i className="ti ti-search" style={s.searchIcon} aria-hidden />
                        <input style={s.searchInput} placeholder="Buscar miembro…" value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                        {search && <button style={s.clearBtn} onClick={() => { setSearch(""); setPage(1); }}><i className="ti ti-x" style={{ fontSize: 12 }} aria-hidden /></button>}
                    </div>
                    <div className="filter-group" style={s.filterGroup}>
                        <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }} style={s.filterSelect}>
                            <option value="">Todos los planes</option>
                            {plans.filter((p: Plan) => p.status === "active").map((p: Plan) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={s.filterSelect}>
                            <option value="">Todos los estados</option>
                            <option value="active">Activa</option>
                            <option value="expired">Vencida</option>
                            <option value="cancelled">Cancelada</option>
                        </select>
                    </div>
                    {!loading && subscriptions.length > 0 && (
                        <div className="export-group" style={s.exportGroup}>
                            <button style={s.exportBtn} onClick={() => exportExcel(subscriptions)}><i className="ti ti-file-spreadsheet" style={{ fontSize: 13 }} aria-hidden />Excel</button>
                            <button style={s.exportBtn} onClick={() => exportPDF(subscriptions)}><i className="ti ti-file-text" style={{ fontSize: 13 }} aria-hidden />PDF</button>
                        </div>
                    )}
                </div>
                </div>
                {error ? (
                    <div style={{ textAlign: "center", padding: 40 }}>
                        <p style={{ fontSize: 13, color: "#c0392b", marginBottom: 12 }}>Error al cargar datos.</p>
                        <button onClick={() => { setError(false); setLoading(true); load(page).catch(() => setError(true)).finally(() => setLoading(false)); }}
                            style={{ background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                            Reintentar
                        </button>
                    </div>
                ) : loading ? (
                    <div style={{ padding: "20px 14px" }}><LoadingSkeleton rows={5} /></div>
                ) : subscriptions.length === 0 ? (
                    <p style={s.empty}>No hay suscripciones registradas.</p>
                ) : (
                    <div style={{ ...s.card, padding: 0 }} className="table-scroll">
                        <table style={s.table}>
                            <thead><tr style={s.thead}>
                                <th style={{ ...s.th, paddingLeft: 16 }}>Miembro</th><th style={s.th}>Plan</th><th style={s.th}>Precio</th>
                                <th style={s.th}>Inicio</th><th style={s.th}>Vencimiento</th>
                                <th style={s.th}>Días rest.</th><th style={s.th}>Estado</th><th style={s.th}>Acciones</th>
                            </tr></thead>
                            <tbody>{subscriptions.map((sub) => {
                                const days = daysLeft(sub.endDate);
                                const stat = sub.status;
                                const isActive = stat === "active";
                                const isCancelled = stat === "cancelled";
                                const isExpired = stat === "expired";
                                const daysColor = isExpired ? "#c0392b" : days <= 5 ? "#c0392b" : days <= 15 ? "#b7791f" : "#3a7d44";
                                return (
                                    <tr key={sub.id} style={s.row} className="sub-row">
                                        <td style={{ ...s.td, paddingLeft: 16 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <div style={{ ...s.avatar, background: isActive ? "#F0F7F1" : isExpired ? "#FFF4F0" : "#F0F0EE", color: isActive ? "#3a7d44" : isExpired ? "#c0392b" : "#999" }}>
                                                    {sub.member?.fullName?.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase() ?? "—"}
                                                </div>
                                                <div>
                                                    <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#1a1a1a" }}>{sub.member?.fullName ?? "—"}</p>
                                                    {sub.member?.email && <p style={{ margin: 0, fontSize: 11, color: "#bbb" }}>{sub.member.email}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ ...s.td, fontWeight: 500 }}>{sub.plan?.name ?? "—"}</td>
                                        <td style={{ ...s.td, ...s.muted }}>${sub.plan?.price ?? 0}</td>
                                        <td style={{ ...s.td, ...s.muted }}>{fmtDate(sub.startDate)}</td>
                                        <td style={{ ...s.td, ...s.muted }}>{fmtDate(sub.endDate)}</td>
                                        <td style={s.td}>
                                            <span style={{ fontSize: 12, fontWeight: 500, color: daysColor }}>
                                                {isExpired ? "Vencida" : days <= 0 ? "Hoy" : `${days} días`}
                                            </span>
                                        </td>
                                        <td style={s.td}>
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500,
                                                background: isActive ? "#F0F7F1" : isExpired ? "#FFF4F0" : stat === "cancelled" ? "#F5F5F4" : "#FFFBF0",
                                                color: isActive ? "#3a7d44" : isExpired ? "#c0392b" : stat === "cancelled" ? "#999" : "#b7791f" }}>
                                                <span style={{ width: 6, height: 6, borderRadius: "50%",
                                                    background: isActive ? "#3a7d44" : isExpired ? "#c0392b" : stat === "cancelled" ? "#ccc" : "#b7791f" }} />
                                                {statusLabel[stat] ?? stat}
                                            </span>
                                        </td>
                                        <td style={s.td}>
                                            <div className="actions-group" style={{ display: "flex", gap: 4 }}>
                                                {isCancelled ? (
                                                    <button className="btn-icon-action" style={{ ...s.btnIconAction, color: "#c0392b" }}
                                                        onClick={() => requestDelete(sub.id)} title="Eliminar">
                                                        <i className="ti ti-trash" style={{ fontSize: 14 }} aria-hidden />
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button className="btn-icon-action" style={{ ...s.btnIconAction, opacity: isActive ? 0.4 : 1 }}
                                                            onClick={() => requestRenew(sub.id)} disabled={isActive} title="Renovar">
                                                            <i className="ti ti-refresh" style={{ fontSize: 14 }} aria-hidden />
                                                        </button>
                                                        <button className="btn-icon-action" style={{ ...s.btnIconAction, color: "#c0392b" }}
                                                            onClick={() => requestCancel(sub.id)} title="Cancelar">
                                                            <i className="ti ti-x" style={{ fontSize: 14 }} aria-hidden />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}</tbody>
                        </table>
                    </div>
                )}
                {!loading && (
                    <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onChange={setPage} />
                )}
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
            <style>{`
    .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .table-scroll table { min-width: 700px; }
    .sub-row { transition: background 0.1s ease; }
    .sub-row:hover { background: #FAFAFA; }
    .sub-row:last-child td { border-bottom: none !important; }
    .actions-group { opacity: 0.4; transition: opacity 0.15s; }
    .sub-row:hover .actions-group { opacity: 1; }
    .btn-icon-action:hover { background: #F0F0EE !important; border-color: #E5E4E2 !important; color: #1a1a1a !important; }
    @media (max-width: 768px) {
        .drawer-panel { width: 100vw !important; border-left: none !important; }
    }
    @media (max-width: 900px) {
        .subs-page > div:first-child { padding: 14px 20px 12px !important; }
        .toolbar-wrap { flex-direction: column !important; align-items: stretch !important; gap: 6px !important; }
        .toolbar-wrap .search-wrap { flex: none !important; width: 100% !important; }
        .export-group { margin-left: 0 !important; width: 100% !important; justify-content: flex-end !important; }
        .filter-group { width: 100% !important; }
        .toolbar-card { padding: 8px 10px !important; }
        .subs-content { padding: 6px 14px 20px !important; gap: 6px !important; }
    }
    @media (max-width: 600px) {
        .subs-page > div:first-child { padding: 10px 14px 8px !important; }
        .filter-group { flex-direction: column !important; }
        .filter-group > * { width: 100% !important; }
        .export-group { justify-content: stretch !important; }
        .export-group > * { flex: 1 !important; }
        .toolbar-card { padding: 6px 8px !important; }
        .subs-content { padding: 4px 10px 16px !important; gap: 4px !important; }
    }
    @media (max-width: 480px) {
        .subs-page > div:first-child { padding: 8px 10px 6px !important; }
        .subs-content { padding: 4px 8px 12px !important; gap: 4px !important; }
    }
`}</style>
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    page: { display: "flex", flexDirection: "column", minHeight: "100%", position: "relative" },
    content: { padding: "16px 28px 28px", display: "flex", flexDirection: "column", gap: 10 },
    toastStack: { position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" },
    toast: { display: "flex", alignItems: "center", gap: 8, color: "#fff", fontSize: 12, fontWeight: 500, padding: "9px 14px", borderRadius: 8, animation: "fadeIn 0.2s ease", cursor: "pointer", pointerEvents: "all", boxShadow: "0 2px 12px rgba(0,0,0,0.18)" },
    overlay: { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity 0.2s ease" },
    modal: { background: "#fff", borderRadius: 12, padding: "24px", width: 360, boxShadow: "0 8px 32px rgba(0,0,0,0.14)", outline: "none" },
    modalTitle: { fontSize: 14, fontWeight: 600, color: "#1a1a1a", margin: "0 0 8px" },
    modalBody: { fontSize: 13, color: "#666", margin: 0, lineHeight: 1.5 },
    drawer: { position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 900, width: 420, background: "#fff", borderLeft: "1px solid #E5E4E2", display: "flex", flexDirection: "column", transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)", boxShadow: "-4px 0 24px rgba(0,0,0,0.08)" },
    drawerHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "22px 24px 18px", borderBottom: "1px solid #F0F0EE", flexShrink: 0 },
    drawerTitle: { fontSize: 15, fontWeight: 600, color: "#1a1a1a", margin: 0 },
    drawerSub: { fontSize: 12, color: "#bbb", margin: "3px 0 0" },
    drawerBody: { flex: 1, overflowY: "auto", padding: "20px 24px" },
    drawerFooter: { display: "flex", gap: 8, justifyContent: "flex-end", padding: "14px 24px", borderTop: "1px solid #F0F0EE", flexShrink: 0 },
    fieldLabel: { fontSize: 11, fontWeight: 500, color: "#555" },
    fieldError: { fontSize: 10, color: "#c0392b", marginTop: 1 },
    input: { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 7, padding: "8px 11px", fontSize: 13, color: "#1a1a1a", outline: "none", width: "100%", fontFamily: "inherit", boxSizing: "border-box" as const, transition: "border-color 0.15s" },
    inputError: { borderColor: "#fecaca" },
    btnPrimary: { display: "inline-flex", alignItems: "center", gap: 6, background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" },
    btnGhost: { background: "none", color: "#555", border: "1px solid #E5E4E2", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" },
    btnConfirm: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", minWidth: 110 },
    btnIcon: { background: "none", border: "none", cursor: "pointer", color: "#bbb", padding: 4, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" },
    btnIconAction: { background: "none", border: "1px solid transparent", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", width: 32, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "background 0.12s, border-color 0.12s, color 0.12s" },
    btnAction: { display: "inline-flex", alignItems: "center", gap: 6, background: "none", color: "#555", border: "1px solid #E5E4E2", borderRadius: 6, padding: "8px 13px", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", transition: "background 0.12s, border-color 0.12s, color 0.12s" },
    exportBtn: { display: "inline-flex", alignItems: "center", gap: 6, background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 7, padding: "9px 14px", fontSize: 13, fontWeight: 500, color: "#555", fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap" as const },
    spinner: { display: "inline-block", width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
    card: { background: "#fff", border: "1px solid #E5E4E2", borderTop: "2px solid #D4AF37", borderRadius: 8, overflow: "hidden" },
    table: { width: "100%", borderCollapse: "collapse" },
    thead: { borderBottom: "1px solid #E5E4E2", background: "#FAFAFA" },
    th: { padding: "12px 14px", fontSize: 11, fontWeight: 500, color: "#bbb", textAlign: "left", whiteSpace: "nowrap" },
    row: { borderBottom: "1px solid #F0F0EE" },
    td: { padding: "12px 14px", fontSize: 13, color: "#1a1a1a", verticalAlign: "middle" },
    muted: { color: "#888", fontSize: 12 },
    avatar: { width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, flexShrink: 0 },
    empty: { fontSize: 13, color: "#bbb", padding: "40px 0", textAlign: "center" },
    toolbar: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const },
    toolbarCard: { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, padding: "12px 14px", borderTop: "2px solid #D4AF37" },
    filterGroup: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const },
    exportGroup: { display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" as const },
    searchWrap: { position: "relative", flex: "1 1 160px", maxWidth: 700 } as React.CSSProperties,
    searchIcon: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "#bbb", pointerEvents: "none" as const },
    searchInput: { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 7, padding: "7px 26px 7px 30px", fontSize: 13, color: "#1a1a1a", outline: "none", width: "100%", fontFamily: "inherit", boxSizing: "border-box" as const, transition: "border-color 0.15s" },
    clearBtn: { position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#bbb", padding: 4, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" },
    filterSelect: { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 7, padding: "7px 24px 7px 10px", fontSize: 13, color: "#1a1a1a", outline: "none", fontFamily: "inherit", cursor: "pointer", appearance: "none" as const, backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23bbb'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", minWidth: 130 },
};
