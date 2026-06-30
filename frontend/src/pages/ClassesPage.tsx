import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { getClasses, createClass, updateClass, deactivateClass, reactivateClass, deleteClass, type ClassSchedule } from "../services/classSchedule.service";
import { getUsers } from "../services/user.service";
import type { UserResponse } from "../services/user.service";
import PageHeader from "../components/PageHeader";
import LoadingSkeleton from "../components/LoadingSkeleton";
import GymButton from "../components/GymButton";
import { useSocketRefresh } from "../hooks/useSocketRefresh";
import { useToast } from "../hooks/useToast";
import ConfirmModal from "../components/ConfirmModal";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function DayRangeBar({ start, end }: { start: number; end: number }) {
    const labels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    return (
        <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", gap: 2 }}>
                {DAYS.map((_, i) => (
                    <div key={i} style={{
                        flex: 1, height: 4, borderRadius: 2,
                        background: i >= start && i <= end ? "#3b82f6" : "#E5E4E2",
                    }} />
                ))}
            </div>
            <div style={{ display: "flex", gap: 2, marginTop: 3 }}>
                {labels.map((l, i) => (
                    <span key={i} style={{
                        flex: 1, textAlign: "center" as const, fontSize: 8,
                        color: i >= start && i <= end ? "#3b82f6" : "#ccc",
                        fontWeight: i >= start && i <= end ? 600 : 400,
                    }}>{l}</span>
                ))}
            </div>
        </div>
    );
}

const emptyForm = { name: "", description: "", trainer: "", dayOfWeekStart: 1, dayOfWeekEnd: 5, startTime: "08:00", endTime: "09:00", capacity: 10, color: "#3b82f6" };

export default function ClassesPage() {
    const [classes, setClasses] = useState<ClassSchedule[]>([]);
    const [trainers, setTrainers] = useState<UserResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [saving, setSaving] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmTarget, setConfirmTarget] = useState<ClassSchedule | null>(null);
    const [confirmMode, setConfirmMode] = useState<"deactivate" | "delete" | "reactivate">("deactivate");
    const [confirmLoading, setConfirmLoading] = useState(false);
    const firstRef = useRef<HTMLInputElement>(null);

    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [filterTrainer, setFilterTrainer] = useState<string>("");
    const [filterDay, setFilterDay] = useState<number | null>(null);
    const [search, setSearch] = useState("");

    const { addToast } = useToast();

    const fetchData = useCallback(async () => {
        const [classRes, userRes] = await Promise.all([getClasses(), getUsers("trainer")]);
        return { classes: classRes.data as ClassSchedule[], trainers: userRes.data as UserResponse[] };
    }, []);

    const load = useCallback(async () => {
        try {
            const data = await fetchData();
            setClasses(data.classes);
            setTrainers(data.trainers);
        } catch { setError(true); }
        finally { setLoading(false); }
    }, [fetchData, addToast]);

    useSocketRefresh(["class_created", "class_updated", "class_deactivated"], load);

    useEffect(() => {
        let active = true;
        fetchData().then(data => {
            if (!active) return;
            setClasses(data.classes);
            setTrainers(data.trainers);
        }).catch(() => { if (active) setError(true); })
        .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [fetchData, addToast]);

    const filtered = useMemo(() => {
        return classes.filter((c) => {
            if (filterStatus === "active" && c.status !== "active") return false;
            if (filterStatus === "inactive" && c.status !== "inactive") return false;
            if (filterTrainer && c.trainer !== filterTrainer) return false;
            if (filterDay !== null && (c.dayOfWeekStart > filterDay || c.dayOfWeekEnd < filterDay)) return false;
            if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        });
    }, [classes, filterStatus, filterTrainer, filterDay, search]);

    const openNew = () => {
        setEditingId(null); setForm(emptyForm); setErrors({}); setTouched({}); setDrawerOpen(true);
    };

    const openEdit = (c: ClassSchedule) => {
        setEditingId(c.id);
        setForm({ name: c.name, description: c.description ?? "", trainer: c.trainer, dayOfWeekStart: c.dayOfWeekStart, dayOfWeekEnd: c.dayOfWeekEnd, startTime: c.startTime, endTime: c.endTime, capacity: c.capacity, color: c.color ?? "#3b82f6" });
        setErrors({}); setTouched({}); setDrawerOpen(true);
    };

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!form.name.trim()) errs.name = "Requerido";
        if (!form.trainer.trim()) errs.trainer = "Requerido";
        if (form.capacity < 0) errs.capacity = "No negativo";
        if (form.dayOfWeekEnd < form.dayOfWeekStart) errs.dayOfWeekEnd = "Debe ser mayor o igual al inicio";
        if (form.startTime >= form.endTime) errs.endTime = "Debe ser mayor a la hora de inicio";
        // Check schedule conflict with other classes
        const conflict = classes.find((c) => {
            if (c.id === editingId) return false;
            if (c.trainer !== form.trainer) return false;
            if (c.dayOfWeekStart > form.dayOfWeekEnd || c.dayOfWeekEnd < form.dayOfWeekStart) return false;
            if (c.startTime >= form.endTime || c.endTime <= form.startTime) return false;
            return true;
        });
        if (conflict) errs.trainer = `El entrenador ya tiene "${conflict.name}" en ese horario`;
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            if (editingId) {
                await updateClass(editingId, form);
                addToast("Clase actualizada");
            } else {
                await createClass(form);
                addToast("Clase creada");
            }
            setDrawerOpen(false); load();
        } catch (e) {
            const err = e as { response?: { data?: { message?: string } } };
            addToast(err?.response?.data?.message || "Error al guardar", "error");
        }
        finally { setSaving(false); }
    };

    const requestDeactivate = (c: ClassSchedule) => {
        setConfirmTarget(c); setConfirmMode("deactivate"); setConfirmOpen(true);
    };

    const requestReactivate = (c: ClassSchedule) => {
        setConfirmTarget(c); setConfirmMode("reactivate"); setConfirmOpen(true);
    };

    const requestDelete = (c: ClassSchedule) => {
        setConfirmTarget(c); setConfirmMode("delete"); setConfirmOpen(true);
    };

    const handleConfirm = async () => {
        if (!confirmTarget) return;
        setConfirmLoading(true);
        const prev = classes;
        if (confirmMode === "deactivate") {
            setClasses((current) => current.map((c) => c.id === confirmTarget.id ? { ...c, status: "inactive" } : c));
            try {
                await deactivateClass(confirmTarget.id);
                addToast(`Clase "${confirmTarget.name}" desactivada`);
            } catch {
                setClasses(prev);
                addToast("Error al desactivar", "error");
            }
        } else if (confirmMode === "reactivate") {
            setClasses((current) => current.map((c) => c.id === confirmTarget.id ? { ...c, status: "active" } : c));
            try {
                await reactivateClass(confirmTarget.id);
                addToast(`Clase "${confirmTarget.name}" reactivada`);
            } catch {
                setClasses(prev);
                addToast("Error al reactivar", "error");
            }
        } else {
            setClasses((current) => current.filter((c) => c.id !== confirmTarget.id));
            try {
                await deleteClass(confirmTarget.id);
                addToast(`Clase "${confirmTarget.name}" eliminada`);
            } catch {
                setClasses(prev);
                addToast("Error al eliminar", "error");
            }
        }
        setConfirmOpen(false); setConfirmTarget(null);
        setConfirmLoading(false);
    };

    useEffect(() => { if (drawerOpen) setTimeout(() => firstRef.current?.focus(), 200); }, [drawerOpen]);

    const setField = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const val = field === "dayOfWeekStart" || field === "dayOfWeekEnd" || field === "capacity" ? Number(e.target.value) : e.target.value;
        setForm((p) => ({ ...p, [field]: val }));
        setTouched((p) => ({ ...p, [field]: true }));
    };

    return (
        <div className="classes-page" style={s.page}>
            <PageHeader title="Clases" subtitle="Horarios y gestión de clases" action={<GymButton icon="ti-plus" onClick={openNew}>Nueva clase</GymButton>} />

            <div className="classes-content" style={s.content}>

            <div className="toolbar-card" style={s.toolbarCard}>
            <div className="toolbar-wrap" style={s.toolbar}>
                <div className="search-wrap" style={s.searchWrap}>
                    <i className="ti ti-search" style={s.searchIcon} aria-hidden />
                    <input style={s.searchInput} placeholder="Buscar clase…" value={search}
                        onChange={(e) => setSearch(e.target.value)} />
                    {search && <button style={s.clearBtn} onClick={() => setSearch("")}><i className="ti ti-x" style={{ fontSize: 12 }} aria-hidden /></button>}
                </div>
                <div className="filter-group" style={s.filterGroup}>
                    <select style={s.filterSelect} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="all">Todas</option>
                        <option value="active">Activas</option>
                        <option value="inactive">Inactivas</option>
                    </select>
                    <select style={s.filterSelect} value={filterTrainer} onChange={(e) => setFilterTrainer(e.target.value)}>
                        <option value="">Todos los entrenadores</option>
                        {trainers.map((t) => (
                            <option key={t.id} value={`${t.firstName} ${t.lastName}`}>{t.firstName} {t.lastName}</option>
                        ))}
                    </select>
                </div>
            </div>
            {/* Day filter pills */}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", padding: "4px 0 0" }}>
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((lbl, i) => (
                    <button key={i} onClick={() => setFilterDay(filterDay === i ? null : i)}
                        style={{
                            ...s.dayPill,
                            background: filterDay === i ? "#1a1a1a" : "#F7F7F6",
                            color: filterDay === i ? "#fff" : "#888",
                        }}>
                        {lbl}
                    </button>
                ))}
                {filterDay !== null && (
                    <button onClick={() => setFilterDay(null)} style={{ ...s.dayPill, background: "none", color: "#c0392b", border: "none" }}>
                        <i className="ti ti-x" style={{ fontSize: 12 }} aria-hidden />
                    </button>
                )}
            </div>
            </div>

                {error ? (
                    <div style={{ textAlign: "center", padding: 40 }}>
                        <p style={{ fontSize: 13, color: "#c0392b", marginBottom: 12 }}>Error al cargar datos.</p>
                        <button onClick={() => { setError(false); setLoading(true); load().finally(() => setLoading(false)); }}
                            style={{ background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                            Reintentar
                        </button>
                    </div>
                ) : loading ? (
                    <div style={{ padding: "20px 14px" }}><LoadingSkeleton rows={5} /></div>
                ) : filtered.length === 0 ? (
                    <p style={s.empty}>No hay clases con los filtros actuales.</p>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {filtered.map((c) => {
                            const inactive = c.status !== "active";
                            return (
                                <div key={c.id} className="class-card" style={{
                                    ...s.card,
                                    borderLeft: `4px solid ${inactive ? "#ccc" : c.color ?? "#3b82f6"}`,
                                }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <p style={s.className}>{c.name}</p>
                                                <span style={{
                                                    display: "inline-flex", alignItems: "center", gap: 4,
                                                    padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 500,
                                                    background: inactive ? "#F5F5F4" : "#F0F7F1",
                                                    color: inactive ? "#999" : "#3a7d44",
                                                }}>
                                                    <span style={{
                                                        width: 5, height: 5, borderRadius: "50%",
                                                        background: inactive ? "#ccc" : "#3a7d44",
                                                    }} />
                                                    {inactive ? "Inactiva" : `${c.capacity} cupo`}
                                                </span>
                                            </div>
                                            <p style={s.classInfo}>{c.startTime} - {c.endTime} · {c.trainer}</p>
                                        </div>
                                        <div className="actions-group" style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                                            {inactive ? (
                                                <>
                                                    <button className="btn-icon-action" title="Reactivar" style={{ ...s.btnIconAction, color: "#3a7d44" }}
                                                        onClick={() => requestReactivate(c)}>
                                                        <i className="ti ti-refresh" style={{ fontSize: 14 }} aria-hidden />
                                                    </button>
                                                    <button className="btn-icon-action" title="Eliminar" style={{ ...s.btnIconAction, color: "#c0392b" }}
                                                        onClick={() => requestDelete(c)}>
                                                        <i className="ti ti-trash" style={{ fontSize: 14 }} aria-hidden />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button className="btn-icon-action" title="Editar" style={s.btnIconAction}
                                                        onClick={() => openEdit(c)}>
                                                        <i className="ti ti-pencil" style={{ fontSize: 14 }} aria-hidden />
                                                    </button>
                                                    <button className="btn-icon-action" title="Desactivar" style={{ ...s.btnIconAction, color: "#c0392b" }}
                                                        onClick={() => requestDeactivate(c)}>
                                                        <i className="ti ti-circle-off" style={{ fontSize: 14 }} aria-hidden />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <DayRangeBar start={c.dayOfWeekStart} end={c.dayOfWeekEnd} />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {drawerOpen && <div style={s.overlay} onClick={() => setDrawerOpen(false)}>
                <div style={s.drawer} onClick={(e) => e.stopPropagation()}>
                    <div style={s.drawerHeader}>
                        <p style={s.drawerTitle}>{editingId ? "Editar clase" : "Nueva clase"}</p>
                        <button style={s.closeBtn} onClick={() => setDrawerOpen(false)}><i className="ti ti-x" /></button>
                    </div>
                    <div style={s.drawerBody}>
                        <label style={s.label}>Nombre</label>
                        <input ref={firstRef} style={{ ...s.input, borderColor: touched.name && errors.name ? "#c0392b" : "#E5E4E2" }} value={form.name} onChange={setField("name")} />
                        {touched.name && errors.name && <p style={s.fieldError}>{errors.name}</p>}

                        <label style={s.label}>Descripción</label>
                        <textarea style={s.input} rows={2} value={form.description} onChange={setField("description")} />

                        <label style={s.label}>Entrenador</label>
                        <select style={{ ...s.input, borderColor: touched.trainer && errors.trainer ? "#c0392b" : "#E5E4E2" }} value={form.trainer} onChange={setField("trainer")}>
                            <option value="">Seleccionar entrenador</option>
                            {trainers.map((t) => (
                                <option key={t.id} value={`${t.firstName} ${t.lastName}`}>{t.firstName} {t.lastName}</option>
                            ))}
                        </select>
                        {touched.trainer && errors.trainer && <p style={s.fieldError}>{errors.trainer}</p>}

                        <label style={s.label}>Rango de días</label>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <div>
                                <label style={{ ...s.label, fontSize: 10, color: "#bbb" }}>Desde</label>
                                <select style={s.input} value={form.dayOfWeekStart} onChange={setField("dayOfWeekStart")}>
                                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ ...s.label, fontSize: 10, color: "#bbb" }}>Hasta</label>
                                <select style={{ ...s.input, borderColor: touched.dayOfWeekEnd && errors.dayOfWeekEnd ? "#c0392b" : "#E5E4E2" }} value={form.dayOfWeekEnd} onChange={setField("dayOfWeekEnd")}>
                                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                                </select>
                                {touched.dayOfWeekEnd && errors.dayOfWeekEnd && <p style={s.fieldError}>{errors.dayOfWeekEnd}</p>}
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <div>
                                <label style={s.label}>Hora inicio</label>
                                <input type="time" style={s.input} value={form.startTime} onChange={setField("startTime")} />
                            </div>
                            <div>
                                <label style={s.label}>Hora fin</label>
                                <input type="time" style={s.input} value={form.endTime} onChange={setField("endTime")} />
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <div>
                                <label style={s.label}>Capacidad</label>
                                <input type="number" min={0} style={s.input} value={form.capacity} onChange={setField("capacity")} />
                            </div>
                            <div>
                                <label style={s.label}>Color</label>
                                <input type="color" style={{ ...s.input, height: 36, padding: 4 }} value={form.color} onChange={setField("color")} />
                            </div>
                        </div>
                    </div>
                    <div style={s.drawerFooter}>
                        <button style={s.cancelBtn} onClick={() => setDrawerOpen(false)}>Cancelar</button>
                        <button style={s.saveBtn} onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
                    </div>
                </div>
            </div>}

            <ConfirmModal
                open={confirmOpen}
                title={confirmMode === "deactivate" ? "Desactivar clase" : confirmMode === "reactivate" ? "Reactivar clase" : "Eliminar clase"}
                body={confirmMode === "deactivate"
                    ? `¿Desactivar "${confirmTarget?.name}"?`
                    : confirmMode === "reactivate"
                    ? `¿Reactivar "${confirmTarget?.name}"?`
                    : `¿Eliminar permanentemente "${confirmTarget?.name}"? Esta acción no se puede deshacer.`}
                confirmLabel={confirmMode === "deactivate" ? "Desactivar" : confirmMode === "reactivate" ? "Reactivar" : "Eliminar"}
                confirmColor={confirmMode === "delete" ? "#c0392b" : confirmMode === "reactivate" ? "#3a7d44" : undefined}
                loading={confirmLoading}
                onConfirm={handleConfirm}
                onCancel={() => { setConfirmOpen(false); setConfirmTarget(null); }}
            />

            <style>{`
                .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
                .class-card { transition: background 0.1s ease; }
                .class-card:hover { background: #FAFAFA; }
                .actions-group { opacity: 0.4; transition: opacity 0.15s; }
                .class-card:hover .actions-group { opacity: 1; }
                .btn-icon-action:hover { background: #F0F0EE !important; border-color: #E5E4E2 !important; color: #1a1a1a !important; }
                @media (max-width: 768px) {
                    .table-scroll table { min-width: 550px; }
                    .drawer-panel { width: 100vw !important; border-left: none !important; }
                }
                @media (max-width: 900px) {
                    .classes-page > div:first-child { padding: 14px 20px 12px !important; }
                    .toolbar-wrap { flex-direction: column !important; align-items: stretch !important; gap: 6px !important; }
                    .toolbar-wrap .search-wrap { flex: none !important; width: 100% !important; }
                    .filter-group { width: 100% !important; }
                    .toolbar-card { padding: 8px 10px !important; }
                    .classes-content { padding: 6px 14px 20px !important; gap: 6px !important; }
                }
                @media (max-width: 600px) {
                    .classes-page > div:first-child { padding: 10px 14px 8px !important; }
                    .filter-group { flex-direction: column !important; }
                    .filter-group > * { width: 100% !important; }
                    .toolbar-card { padding: 6px 8px !important; }
                    .classes-content { padding: 4px 10px 16px !important; gap: 4px !important; }
                }
                @media (max-width: 480px) {
                    .classes-page > div:first-child { padding: 8px 10px 6px !important; }
                    .classes-content { padding: 4px 6px 12px !important; gap: 4px !important; }
                }
            `}</style>

        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    page: { display: "flex", flexDirection: "column", minHeight: "100%" },
    content: { padding: "16px 28px 28px", display: "flex", flexDirection: "column", gap: 10 },
    empty: { fontSize: 13, color: "#bbb", padding: 40, textAlign: "center" as const },
    card: { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 6, padding: "10px 14px", borderTop: "2px solid #D4AF37" },
    className: { fontSize: 13, fontWeight: 600, color: "#1a1a1a", margin: 0 },
    classInfo: { fontSize: 11, color: "#888", margin: "2px 0 0" },
    btnIconAction: { background: "none", border: "1px solid transparent", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", width: 32, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "background 0.12s, border-color 0.12s, color 0.12s" },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
    drawer: { background: "#fff", borderRadius: 10, width: 400, maxWidth: "90vw", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 8px 30px rgba(0,0,0,0.12)" },
    drawerHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", borderBottom: "1px solid #E5E4E2" },
    drawerTitle: { fontSize: 15, fontWeight: 600, color: "#1a1a1a", margin: 0 },
    closeBtn: { background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 18, padding: 0 },
    drawerBody: { padding: "16px 20px", overflowY: "auto" },
    label: { fontSize: 11, fontWeight: 500, color: "#555", margin: 0 },
    input: { width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #E5E4E2", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", outline: "none" },
    fieldError: { fontSize: 10, color: "#c0392b", margin: "2px 0 0" },
    drawerFooter: { display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 20px", borderTop: "1px solid #E5E4E2" },
    cancelBtn: { padding: "7px 16px", borderRadius: 6, border: "1px solid #E5E4E2", background: "#fff", color: "#555", fontSize: 12, cursor: "pointer", fontFamily: "inherit" },
    saveBtn: { padding: "7px 16px", borderRadius: 6, border: "none", background: "#1a1a1a", color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 },
    toolbar: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const },
    toolbarCard: { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, padding: "12px 16px", borderTop: "2px solid #D4AF37" },
    filterGroup: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const },
    searchWrap: { position: "relative", flex: "1 1 160px", maxWidth: 500 } as React.CSSProperties,
    searchIcon: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "#bbb", pointerEvents: "none" as const },
    searchInput: { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 7, padding: "7px 26px 7px 30px", fontSize: 13, color: "#1a1a1a", outline: "none", width: "100%", fontFamily: "inherit", boxSizing: "border-box" as const, transition: "border-color 0.15s" },
    clearBtn: { position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#bbb", padding: 4, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" },
    filterSelect: { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 7, padding: "7px 24px 7px 10px", fontSize: 13, color: "#1a1a1a", outline: "none", fontFamily: "inherit", cursor: "pointer", appearance: "none" as const, backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23bbb'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", minWidth: 130 },
    dayPill: { padding: "5px 12px", borderRadius: 20, border: "1px solid #E5E4E2", fontSize: 11, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", transition: "background 0.12s, color 0.12s" },
};
