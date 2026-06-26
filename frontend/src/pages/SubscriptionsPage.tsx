import { useEffect, useRef, useState, useCallback } from "react";
import { getSubscriptions, createSubscription, renewSubscription } from "../services/subscription.service";
import { getMembers } from "../services/member.service";
import { getPlans } from "../services/plan.service";
import PageHeader from "../components/PageHeader";
import GymButton from "../components/GymButton";
import Pagination from "../components/Pagination";
import { useSocketRefresh } from "../hooks/useSocketRefresh";

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

const statusStyle = (status: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
        active: { background: "#F0F7F1", color: "#3a7d44" },
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

interface ToastMsg { id: number; text: string; type: "success" | "error" }

function Toast({ toasts, onRemove }: { toasts: ToastMsg[]; onRemove: (id: number) => void }) {
    return (
        <div style={s.toastStack}>
            {toasts.map((t) => (
                <div key={t.id} style={{ ...s.toast, background: t.type === "success" ? "#1a1a1a" : "#c0392b" }}
                    onClick={() => onRemove(t.id)}>
                    <i className={`ti ${t.type === "success" ? "ti-check" : "ti-alert-circle"}`} style={{ fontSize: 13 }} aria-hidden />
                    {t.text}
                </div>
            ))}
        </div>
    );
}

function ConfirmModal({ open, title, body, confirmLabel, loading, onConfirm, onCancel }: {
    open: boolean; title: string; body: string;
    confirmLabel: string; loading: boolean;
    onConfirm: () => void; onCancel: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => { if (open) ref.current?.focus(); }, [open]);
    if (!open) return null;
    return (
        <div style={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }} role="dialog" aria-modal>
            <div ref={ref} tabIndex={-1} style={s.modal} onKeyDown={(e) => e.key === "Escape" && onCancel()}>
                <p style={s.modalTitle}>{title}</p>
                <p style={s.modalBody}>{body}</p>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
                    <button style={s.btnGhost} onClick={onCancel} disabled={loading}>Cancelar</button>
                    <button style={{ ...s.btnConfirm, opacity: loading ? 0.7 : 1 }}
                        onClick={onConfirm} disabled={loading}>
                        {loading ? <span style={s.spinner} /> : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

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
            <div style={{ ...s.drawer, transform: open ? "translateX(0)" : "translateX(100%)" }} role="dialog" aria-modal aria-label="Nueva suscripción">
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

export default function SubscriptionsPage() {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formValues, setFormValues] = useState({ memberId: "", planId: "" });
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmTarget, setConfirmTarget] = useState<string | null>(null);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [toasts, setToasts] = useState<ToastMsg[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 20;
    const toastId = useRef(0);

    const addToast = useCallback((text: string, type: "success" | "error" = "success") => {
        const id = ++toastId.current;
        setToasts((p) => [...p, { id, text, type }]);
        setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
    }, []);

    const load = async (targetPage: number) => {
        const res = await getSubscriptions(targetPage, limit);
        setSubscriptions(res.data ?? []);
        setTotal(res.total ?? 0);
        setTotalPages(res.totalPages ?? 1);
    };

    useSocketRefresh(["subscription_created", "subscription_renewed"], () => load(page));

    useEffect(() => {
        const init = async () => {
            try {
                const [subsRes, membersRes, plansRes] = await Promise.all([
                    getSubscriptions(page, limit), getMembers(), getPlans(),
                ]);
                setSubscriptions(subsRes.data ?? []);
                setTotal(subsRes.total ?? 0);
                setTotalPages(subsRes.totalPages ?? 1);
                setMembers(membersRes.data ?? []);
                setPlans((plansRes.data ?? []).filter((p: Plan) => p.status === "active"));
            } catch { addToast("Error al cargar datos", "error"); } finally { setLoading(false); }
        };
        init();
    }, [page]);

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

    return (
        <div style={s.page}>
            <Toast toasts={toasts} onRemove={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
            <ConfirmModal open={confirmOpen} title="Renovar suscripción"
                body="¿Renovar esta suscripción? Se extenderá la fecha de vencimiento según los días del plan."
                confirmLabel="Sí, renovar" loading={confirmLoading}
                onConfirm={confirmRenew} onCancel={() => { setConfirmOpen(false); setConfirmTarget(null); }} />
            <SubscriptionDrawer open={drawerOpen} saving={saving} values={formValues} errors={errors} touched={touched}
                members={members} plans={plans} onChange={handleFieldChange} onBlur={handleBlur}
                onSubmit={handleSubmit} onClose={() => setDrawerOpen(false)} />
            <PageHeader title="Suscripciones" action={<GymButton icon="ti-plus" onClick={openNew}>Nueva suscripción</GymButton>} />
            <div style={s.content}>
                {loading ? (
                    <p style={s.empty}>Cargando suscripciones…</p>
                ) : subscriptions.length === 0 ? (
                    <p style={s.empty}>No hay suscripciones registradas.</p>
                ) : (
                    <div style={{ ...s.card, padding: 0 }}>
                        <table style={s.table}>
                            <thead><tr style={s.thead}>
                                <th style={s.th}>Miembro</th><th style={s.th}>Plan</th><th style={s.th}>Precio</th>
                                <th style={s.th}>Inicio</th><th style={s.th}>Vencimiento</th>
                                <th style={s.th}>Días restantes</th><th style={s.th}>Estado</th><th style={s.th}>Acciones</th>
                            </tr></thead>
                            <tbody>{subscriptions.map((sub) => {
                                const days = daysLeft(sub.endDate);
                                return (
                                    <tr key={sub.id} style={s.row}>
                                        <td style={s.td}>
                                            <p style={{ fontWeight: 500, margin: 0, fontSize: 13, color: "#1a1a1a" }}>{sub.member.fullName}</p>
                                            <p style={{ fontSize: 11, color: "#bbb", margin: 0 }}>{sub.member.email ?? sub.member.phone ?? ""}</p>
                                        </td>
                                        <td style={{ ...s.td, fontWeight: 500 }}>{sub.plan.name}</td>
                                        <td style={{ ...s.td, ...s.muted }}>${sub.plan.price}</td>
                                        <td style={{ ...s.td, ...s.muted }}>{fmtDate(sub.startDate)}</td>
                                        <td style={{ ...s.td, ...s.muted }}>{fmtDate(sub.endDate)}</td>
                                        <td style={s.td}>
                                            <span style={{ fontSize: 12, fontWeight: 500, color: days <= 5 ? "#c0392b" : days <= 15 ? "#b7791f" : "#3a7d44" }}>
                                                {sub.status === "expired" ? "Vencida" : days <= 0 ? "Hoy" : `${days} días`}
                                            </span>
                                        </td>
                                        <td style={s.td}><span style={{ ...s.badge, ...statusStyle(sub.status) }}>{statusLabel[sub.status] ?? sub.status}</span></td>
                                        <td style={s.td}>
                                            <button style={{ ...s.btnAction, opacity: sub.status === "active" ? 0.4 : 1, cursor: sub.status === "active" ? "not-allowed" : "pointer" }}
                                                onClick={() => requestRenew(sub.id)} disabled={sub.status === "active"}>
                                                <i className="ti ti-refresh" style={{ fontSize: 13 }} aria-hidden />Renovar
                                            </button>
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
    drawerBody: { flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 },
    drawerFooter: { display: "flex", gap: 8, justifyContent: "flex-end", padding: "14px 24px", borderTop: "1px solid #F0F0EE", flexShrink: 0 },
    fieldLabel: { fontSize: 11, fontWeight: 500, color: "#555" },
    fieldError: { fontSize: 10, color: "#c0392b", marginTop: 1 },
    input: { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 7, padding: "8px 11px", fontSize: 13, color: "#1a1a1a", outline: "none", width: "100%", fontFamily: "inherit", boxSizing: "border-box" as const, transition: "border-color 0.15s" },
    inputError: { borderColor: "#fecaca" },
    btnPrimary: { display: "inline-flex", alignItems: "center", gap: 6, background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" },
    btnGhost: { background: "none", color: "#555", border: "1px solid #E5E4E2", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" },
    btnConfirm: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", minWidth: 110 },
    btnIcon: { background: "none", border: "none", cursor: "pointer", color: "#bbb", padding: 4, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" },
    btnAction: { display: "inline-flex", alignItems: "center", gap: 5, background: "none", color: "#555", border: "1px solid #E5E4E2", borderRadius: 6, padding: "6px 11px", fontSize: 12, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", transition: "background 0.12s, border-color 0.12s, color 0.12s" },
    spinner: { display: "inline-block", width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
    card: { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, overflow: "hidden" },
    table: { width: "100%", borderCollapse: "collapse" },
    thead: { borderBottom: "1px solid #E5E4E2", background: "#FAFAFA" },
    th: { padding: "10px 14px", fontSize: 11, fontWeight: 500, color: "#bbb", textAlign: "left", whiteSpace: "nowrap" },
    row: { borderBottom: "1px solid #F0F0EE" },
    td: { padding: "11px 14px", fontSize: 13, color: "#1a1a1a" },
    muted: { color: "#888", fontSize: 12 },
    badge: { display: "inline-flex", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500 },
    empty: { fontSize: 13, color: "#bbb", padding: "40px 0", textAlign: "center" },
};
