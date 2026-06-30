import { useEffect, useRef, useState, useCallback } from "react";
import { createPlan, getPlans, updatePlan } from "../services/plan.service";
import PageHeader from "../components/PageHeader";
import LoadingSkeleton from "../components/LoadingSkeleton";
import GymButton from "../components/GymButton";
import { useSocketRefresh } from "../hooks/useSocketRefresh";
import { useToast } from "../hooks/useToast";
import { useDebounce } from "../hooks/useDebounce";
import { useUnsavedChanges } from "../hooks/useUnsavedChanges";
import ConfirmModal from "../components/ConfirmModal";

interface Plan {
    id: string;
    name: string;
    description?: string;
    price: number;
    durationDays: number;
    status: string;
}

interface FormErrors { name?: string; price?: string; durationDays?: string; }

const statusLabel: Record<string, string> = {
    active: "Activo", inactive: "Inactivo",
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
    open: boolean; editingId: string | null; saving: boolean;
    values: Record<string, string>; errors: FormErrors; touched: Record<string, boolean>;
    onChange: (field: string, val: string) => void; onBlur: (field: string) => void;
    onSubmit: (e: React.FormEvent) => void; onClose: () => void;
}

function PlanDrawer({ open, editingId, saving, values, errors, touched, onChange, onBlur, onSubmit, onClose }: DrawerProps) {
    useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);
    const firstRef = useRef<HTMLInputElement>(null);
    useEffect(() => { if (open) setTimeout(() => firstRef.current?.focus(), 300); }, [open]);

    return (
        <>
            <div style={{ ...s.overlay, opacity: open ? 1 : 0, pointerEvents: open ? "all" : "none", zIndex: 800 }} onClick={onClose} aria-hidden />
            <div style={{ ...s.drawer, transform: open ? "translateX(0)" : "translateX(100%)" }} className="drawer-panel" role="dialog" aria-modal aria-label={editingId ? "Editar plan" : "Nuevo plan"}>
                <div style={s.drawerHeader}>
                    <div>
                        <p style={s.drawerTitle}>{editingId ? "Editar plan" : "Nuevo plan"}</p>
                        <p style={s.drawerSub}>{editingId ? "Modifica los datos del plan" : "Completa los datos para registrar el plan"}</p>
                    </div>
                    <button style={s.btnIcon} onClick={onClose}><i className="ti ti-x" style={{ fontSize: 16 }} aria-hidden /></button>
                </div>
                <form onSubmit={onSubmit} style={s.drawerBody} noValidate>
                    <Field label="Nombre del plan" required error={errors.name} touched={touched.name}>
                        <input ref={firstRef} style={{ ...s.input, ...(touched.name && errors.name ? s.inputError : {}) }}
                            placeholder="Premium Mensual" value={values.name}
                            onChange={(e) => onChange("name", e.target.value)} onBlur={() => onBlur("name")} />
                    </Field>
                    <Field label="Precio ($)" required error={errors.price} touched={touched.price}>
                        <input style={{ ...s.input, ...(touched.price && errors.price ? s.inputError : {}) }}
                            type="number" placeholder="450" value={values.price}
                            onChange={(e) => onChange("price", e.target.value)} onBlur={() => onBlur("price")} min={0} />
                    </Field>
                    <Field label="Duración (días)" required error={errors.durationDays} touched={touched.durationDays}>
                        <input style={{ ...s.input, ...(touched.durationDays && errors.durationDays ? s.inputError : {}) }}
                            type="number" placeholder="30" value={values.durationDays}
                            onChange={(e) => onChange("durationDays", e.target.value)} onBlur={() => onBlur("durationDays")} min={1} />
                    </Field>
                    <Field label="Descripción">
                        <input style={s.input} placeholder="Descripción opcional del plan" value={values.description}
                            onChange={(e) => onChange("description", e.target.value)} />
                    </Field>
                    <div style={s.drawerFooter}>
                        <button type="button" style={s.btnGhost} onClick={onClose} disabled={saving}>Cancelar</button>
                        <button type="submit" style={{ ...s.btnPrimary, opacity: saving ? 0.7 : 1 }} disabled={saving}>
                            {saving ? <><span style={s.spinner} />Guardando…</>
                                : <><i className="ti ti-check" style={{ fontSize: 13 }} aria-hidden />{editingId ? "Guardar cambios" : "Crear plan"}</>}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

const validate = (values: Record<string, string>): FormErrors => {
    const e: FormErrors = {};
    if (!values.name.trim()) e.name = "Obligatorio";
    else if (values.name.trim().length < 2) e.name = "Mínimo 2 caracteres";
    if (!values.price.trim()) e.price = "Obligatorio";
    else if (isNaN(Number(values.price)) || Number(values.price) <= 0) e.price = "Debe ser un número mayor a 0";
    if (!values.durationDays.trim()) e.durationDays = "Obligatorio";
    else if (isNaN(Number(values.durationDays)) || Number(values.durationDays) <= 0) e.durationDays = "Debe ser un número mayor a 0";
    return e;
};

const emptyForm = { name: "", description: "", price: "", durationDays: "" };

export default function PlansPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [formValues, setFormValues] = useState({ ...emptyForm });
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmTarget, setConfirmTarget] = useState<Plan | null>(null);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search);
    const { addToast } = useToast();
    useUnsavedChanges(drawerOpen);

    const loadPlans = useCallback(async () => {
        try {
            const res = await getPlans(debouncedSearch);
            setPlans(res.data ?? []);
        } catch { setError(true); }
    }, [debouncedSearch]);

    useSocketRefresh(["plan_created", "plan_updated", "plan_deactivated"], loadPlans);

    useEffect(() => {
        (async () => { try { await loadPlans(); } catch { setError(true); } finally { setLoading(false); } })();
    }, [loadPlans]);

    const openNew = () => { setEditingId(null); setFormValues({ ...emptyForm }); setErrors({}); setTouched({}); setDrawerOpen(true); };

    const openEdit = (p: Plan) => {
        setEditingId(p.id);
        setFormValues({ name: p.name, description: p.description ?? "", price: String(p.price), durationDays: String(p.durationDays) });
        setErrors({}); setTouched({}); setDrawerOpen(true);
    };

    const handleFieldChange = (field: string, val: string) => {
        setFormValues((p) => { const next = { ...p, [field]: val }; setErrors(validate(next)); return next; });
    };
    const handleBlur = (field: string) => { setTouched((p) => ({ ...p, [field]: true })); setErrors(validate(formValues)); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const allTouched = Object.keys(formValues).reduce((acc, k) => ({ ...acc, [k]: true }), {});
        setTouched(allTouched);
        const validation = validate(formValues);
        setErrors(validation);
        if (Object.keys(validation).length > 0) return;
        setSaving(true);
        try {
            const data = { name: formValues.name, description: formValues.description || undefined, price: Number(formValues.price), durationDays: Number(formValues.durationDays) };
            if (editingId) { await updatePlan(editingId, data); addToast("Plan actualizado"); }
            else { await createPlan(data); addToast("Plan creado correctamente"); }
            setDrawerOpen(false); await loadPlans();
        } catch { addToast("Error al guardar.", "error"); } finally { setSaving(false); }
    };

    const requestToggle = (plan: Plan) => { setConfirmTarget(plan); setConfirmOpen(true); };
    const confirmToggle = async () => {
        if (!confirmTarget) return;
        const newStatus = confirmTarget.status === "active" ? "inactive" : "active";
        const prev = plans;
        setPlans((current) => current.map((p) => p.id === confirmTarget.id ? { ...p, status: newStatus } : p));
        setConfirmLoading(true);
        try {
            await updatePlan(confirmTarget.id, { status: newStatus });
            addToast(newStatus === "active" ? "Plan activado" : "Plan desactivado");
        } catch {
            setPlans(prev);
            addToast("No se pudo cambiar el estado.", "error");
        } finally {
            setConfirmLoading(false); setConfirmOpen(false); setConfirmTarget(null);
        }
    };
    const isDeactivating = confirmTarget?.status === "active";

    return (
        <div className="plans-page" style={s.page}>
            <ConfirmModal open={confirmOpen} title={isDeactivating ? "Desactivar plan" : "Activar plan"}
                body={isDeactivating ? `El plan "${confirmTarget?.name}" dejará de estar disponible para nuevas suscripciones.` : `El plan "${confirmTarget?.name}" volverá a estar disponible.`}
                confirmLabel={isDeactivating ? "Sí, desactivar" : "Sí, activar"} confirmColor={isDeactivating ? "#c0392b" : "#3a7d44"}
                loading={confirmLoading} onConfirm={confirmToggle} onCancel={() => { setConfirmOpen(false); setConfirmTarget(null); }} />
            <PlanDrawer open={drawerOpen} editingId={editingId} saving={saving} values={formValues} errors={errors} touched={touched}
                onChange={handleFieldChange} onBlur={handleBlur} onSubmit={handleSubmit} onClose={() => setDrawerOpen(false)} />
            <PageHeader title="Planes" action={<GymButton icon="ti-plus" onClick={openNew}>Nuevo plan</GymButton>} />
            <div className="plans-content" style={s.content}>
                <div className="toolbar-card" style={s.toolbarCard}>
                <div className="toolbar-wrap" style={s.toolbar}>
                    <div style={s.searchWrap}>
                        <i className="ti ti-search" style={s.searchIcon} aria-hidden />
                        <input style={s.searchInput} placeholder="Buscar plan…" value={search} onChange={(e) => setSearch(e.target.value)} />
                        {search && <button style={s.clearBtn} onClick={() => setSearch("")}><i className="ti ti-x" style={{ fontSize: 12 }} aria-hidden /></button>}
                    </div>
                </div>
                </div>
                {error ? (
                    <div style={{ textAlign: "center", padding: 40 }}>
                        <p style={{ fontSize: 13, color: "#c0392b", marginBottom: 12 }}>Error al cargar datos.</p>
                        <button onClick={() => { setError(false); setLoading(true); loadPlans().finally(() => setLoading(false)); }}
                            style={{ background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                            Reintentar
                        </button>
                    </div>
                ) : loading ? (
                    <div style={{ padding: "20px 14px" }}><LoadingSkeleton rows={5} /></div>
                ) : plans.length === 0 ? (
                    <p style={s.empty}>No hay planes registrados.</p>
                ) : (
                    <div style={{ ...s.card, padding: 0 }} className="table-scroll">
                        <table style={s.table}>
                            <thead><tr style={s.thead}>
                                <th style={{ ...s.th, paddingLeft: 16 }}>Nombre</th><th style={s.th}>Descripción</th><th style={s.th}>Precio</th>
                                <th style={s.th}>Duración</th><th style={s.th}>Estado</th><th style={s.th}>Acciones</th>
                            </tr></thead>
                            <tbody>{plans.map((p) => {
                                const isActive = p.status === "active";
                                return (
                                <tr key={p.id} style={s.row} className="plan-row">
                                    <td style={{ ...s.td, paddingLeft: 16, fontWeight: 500 }}>{p.name}</td>
                                    <td style={{ ...s.td, ...s.muted }}>{p.description ?? "—"}</td>
                                    <td style={s.td}>${p.price}</td>
                                    <td style={{ ...s.td, ...s.muted }}>{p.durationDays} días</td>
                                    <td style={s.td}>
                                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500, background: isActive ? "#F0F7F1" : "#F5F5F4", color: isActive ? "#3a7d44" : "#999" }}>
                                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: isActive ? "#3a7d44" : "#ccc" }} />
                                            {statusLabel[p.status] ?? p.status}
                                        </span>
                                    </td>
                                    <td style={s.td}>
                                        <div className="actions-group" style={{ display: "flex", gap: 4 }}>
                                            <button className="btn-icon-action" style={s.btnIconAction} onClick={() => openEdit(p)} title="Editar">
                                                <i className="ti ti-edit" style={{ fontSize: 14 }} aria-hidden />
                                            </button>
                                            <button className="btn-icon-action" style={{ ...s.btnIconAction, color: isActive ? "#c0392b" : "#3a7d44" }}
                                                onClick={() => requestToggle(p)}
                                                title={isActive ? "Desactivar" : "Activar"}>
                                                <i className={`ti ${isActive ? "ti-toggle-left" : "ti-toggle-right"}`} style={{ fontSize: 14 }} aria-hidden />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}</tbody>
                        </table>
                    </div>
                )}
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
            <style>{`
    .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .plan-row { cursor: default; transition: background 0.1s ease; }
    .plan-row:hover { background: #FAFAFA; }
    .plan-row:last-child td { border-bottom: none !important; }
    .actions-group { opacity: 0.4; transition: opacity 0.15s; }
    .plan-row:hover .actions-group { opacity: 1; }
    .btn-icon-action:hover { background: #F0F0EE !important; border-color: #E5E4E2 !important; color: #1a1a1a !important; }
    @media (max-width: 768px) {
        .table-scroll table { min-width: 550px; }
        .drawer-panel { width: 100vw !important; border-left: none !important; }
    }
    @media (max-width: 900px) {
        .plans-page > div:first-child { padding: 14px 20px 12px !important; }
        .toolbar-wrap { flex-direction: column !important; align-items: stretch !important; gap: 6px !important; }
        .toolbar-wrap .search-wrap { flex: none !important; width: 100% !important; }
        .toolbar-card { padding: 5px 8px !important; }
        .plans-content { padding: 6px 14px 20px !important; gap: 6px !important; }
    }
    @media (max-width: 600px) {
        .plans-page > div:first-child { padding: 10px 14px 8px !important; }
        .toolbar-card { padding: 4px 6px !important; }
        .plans-content { padding: 4px 10px 16px !important; gap: 4px !important; }
    }
    @media (max-width: 480px) {
        .plans-page > div:first-child { padding: 8px 10px 6px !important; }
        .plans-content { padding: 4px 8px 12px !important; gap: 4px !important; }
    }
`}</style>
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    page: { display: "flex", flexDirection: "column", minHeight: "100%", position: "relative" },
    content: { padding: "8px 24px 24px", display: "flex", flexDirection: "column", gap: 8 },
    overlay: { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity 0.2s ease" },
    drawer: { position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 900, width: 420, background: "#fff", borderLeft: "1px solid #E5E4E2", display: "flex", flexDirection: "column", transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)", boxShadow: "-4px 0 24px rgba(0,0,0,0.08)" },
    drawerHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "22px 24px 18px", borderBottom: "1px solid #F0F0EE", flexShrink: 0 },
    drawerTitle: { fontSize: 15, fontWeight: 600, color: "#1a1a1a", margin: 0 },
    drawerSub: { fontSize: 12, color: "#bbb", margin: "3px 0 0" },
    drawerBody: { flex: 1, overflowY: "auto", padding: "20px 24px" },
    drawerFooter: { display: "flex", gap: 8, justifyContent: "flex-end", padding: "14px 24px", borderTop: "1px solid #F0F0EE", flexShrink: 0 },
    fieldLabel: { fontSize: 11, fontWeight: 500, color: "#555" },
    fieldError: { fontSize: 10, color: "#c0392b", marginTop: 1 },
    input: { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 7, padding: "8px 11px", fontSize: 13, color: "#1a1a1a", outline: "none", width: "100%", fontFamily: "inherit", boxSizing: "border-box" as const, transition: "border-color 0.15s" },
    inputError: { border: "1px solid #fecaca" },
    btnPrimary: { display: "inline-flex", alignItems: "center", gap: 6, background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" },
    btnGhost: { background: "none", color: "#555", border: "1px solid #E5E4E2", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" },
    btnIcon: { background: "none", border: "none", cursor: "pointer", color: "#bbb", padding: 4, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" },
    btnAction: { display: "inline-flex", alignItems: "center", gap: 6, background: "none", color: "#555", border: "1px solid #E5E4E2", borderRadius: 6, padding: "8px 13px", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", transition: "background 0.12s, border-color 0.12s, color 0.12s" },
    btnIconAction: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, background: "none", color: "#888", border: "1px solid transparent", borderRadius: 6, cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit" },
    spinner: { display: "inline-block", width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
    card: { background: "#fff", border: "1px solid #E5E4E2", borderTop: "2px solid #D4AF37", borderRadius: 8, overflow: "hidden" },
    table: { width: "100%", borderCollapse: "collapse" },
    thead: { borderBottom: "1px solid #E5E4E2", background: "#FAFAFA" },
    th: { padding: "10px 12px", fontSize: 11, fontWeight: 500, color: "#bbb", textAlign: "left", whiteSpace: "nowrap" },
    row: { borderBottom: "1px solid #F0F0EE" },
    td: { padding: "10px 12px", fontSize: 13, color: "#1a1a1a", verticalAlign: "middle" },
    muted: { color: "#888", fontSize: 12 },
    empty: { fontSize: 13, color: "#bbb", padding: "40px 0", textAlign: "center" },
    searchWrap: { position: "relative", display: "flex", alignItems: "center", width: "100%" },
    searchIcon: { position: "absolute", left: 10, fontSize: 13, color: "#bbb", pointerEvents: "none" },
    searchInput: { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 8, padding: "6px 26px 6px 30px", fontSize: 13, color: "#1a1a1a", outline: "none", width: "100%", maxWidth: 825, fontFamily: "inherit" },
    clearBtn: { background: "none", border: "none", position: "absolute", right: 6, cursor: "pointer", color: "#bbb", display: "flex", alignItems: "center", padding: 2, borderRadius: 4 },
    toolbar: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" as const },
    toolbarCard: { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, padding: "6px 14px", borderTop: "2px solid #D4AF37" },
};
