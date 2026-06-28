import { useEffect, useState } from "react";
import { getExpenses, createExpense, updateExpense, deleteExpense, CATEGORY_LABELS, CATEGORY_COLORS, type Expense } from "../services/expense.service";
import PageHeader from "../components/PageHeader";
import LoadingSkeleton from "../components/LoadingSkeleton";
import GymButton from "../components/GymButton";
import Pagination from "../components/Pagination";
import ConfirmModal from "../components/ConfirmModal";
import { useSocketRefresh } from "../hooks/useSocketRefresh";
import { useToast } from "../hooks/useToast";

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }));

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
const fmtCurrency = (n: number) => `$${n.toLocaleString("es-MX")}`;

interface FormData {
    amount: string;
    description: string;
    category: string;
    date: string;
}

const emptyForm = (): FormData => ({
    amount: "",
    description: "",
    category: "",
    date: new Date().toISOString().slice(0, 10),
});

export default function ExpensesPage() {
    const { addToast } = useToast();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 20;

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<FormData>(emptyForm());
    const [saving, setSaving] = useState(false);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [categoryFilter, setCategoryFilter] = useState("");

    const load = async (p: number) => {
        setLoading(true);
        try {
            const res = await getExpenses({ page: p, limit, category: categoryFilter || undefined });
            setExpenses(res.data ?? []);
            setTotal(res.total ?? 0);
            setTotalPages(res.totalPages ?? 1);
        } catch { addToast("Error al cargar gastos", "error"); }
        finally { setLoading(false); }
    };

    useSocketRefresh(["expense_created", "expense_updated", "expense_deleted"], () => load(page));

    useEffect(() => { load(page); }, [page, categoryFilter]);

    const openNew = () => { setEditingId(null); setForm(emptyForm()); setDrawerOpen(true); };
    const openEdit = (e: Expense) => {
        setEditingId(e.id);
        setForm({ amount: String(e.amount), description: e.description, category: e.category, date: e.date.slice(0, 10) });
        setDrawerOpen(true);
    };

    const handleChange = (field: keyof FormData, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.amount || !form.description || !form.category) return;
        setSaving(true);
        const prev = expenses;
        const optimisticId = editingId ?? `_opt_${Date.now()}`;
        const optimisticExpense: Expense = {
            id: optimisticId,
            amount: Number(form.amount),
            description: form.description,
            category: form.category,
            date: form.date || new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        if (editingId) {
            setExpenses((current) => current.map((e) => e.id === editingId ? { ...e, ...optimisticExpense } : e));
        } else {
            setExpenses((current) => [...current, optimisticExpense]);
        }
        try {
            const payload = { amount: Number(form.amount), description: form.description, category: form.category, date: form.date || undefined };
            if (editingId) {
                await updateExpense(editingId, payload);
                addToast("Gasto actualizado");
            } else {
                await createExpense(payload);
                addToast("Gasto registrado");
            }
            setDrawerOpen(false);
        } catch {
            setExpenses(prev);
            addToast("Error al guardar el gasto", "error");
        } finally { setSaving(false); }
    };

    const requestDelete = (id: string) => { setDeleteTarget(id); setDeleteOpen(true); };
    const confirmDelete = async () => {
        if (!deleteTarget) return;
        const prev = expenses;
        setExpenses((current) => current.filter((e) => e.id !== deleteTarget));
        setDeleteLoading(true);
        try {
            await deleteExpense(deleteTarget);
            addToast("Gasto eliminado");
        } catch {
            setExpenses(prev);
            addToast("Error al eliminar", "error");
        } finally { setDeleteLoading(false); setDeleteOpen(false); setDeleteTarget(null); }
    };

    return (
        <div style={s.page}>
            <ConfirmModal open={deleteOpen} title="Eliminar gasto" body="¿Eliminar este gasto permanentemente?" confirmLabel="Sí, eliminar" loading={deleteLoading} confirmColor="#c0392b"
                onConfirm={confirmDelete} onCancel={() => { setDeleteOpen(false); setDeleteTarget(null); }} />

            <PageHeader title="Gastos" action={<GymButton icon="ti-plus" onClick={openNew}>Nuevo gasto</GymButton>} />

            <div style={s.content}>
                <div className="toolbar-card" style={s.toolbarCard}>
                <div className="toolbar-wrap" style={s.toolbar}>
                    <div className="filter-group" style={s.filterGroup}>
                        <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} style={s.filterSelect}>
                            <option value="">Todas las categorías</option>
                            {CATEGORY_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        {total > 0 && (
                            <span style={{ fontSize: 12, color: "#888" }}>
                                Total: {fmtCurrency(expenses.reduce((sum, e) => sum + e.amount, 0))}
                            </span>
                        )}
                    </div>
                </div>
                </div>

                {loading ? (
                    <div style={{ padding: "20px 14px" }}><LoadingSkeleton rows={5} /></div>
                ) : expenses.length === 0 ? (
                    <p style={s.empty}>No hay gastos registrados.</p>
                ) : (
                    <div style={{ ...s.card, padding: 0 }} className="table-scroll">
                        <table style={s.table}>
                            <thead><tr style={s.thead}>
                                <th style={s.th}>Fecha</th>
                                <th style={s.th}>Categoría</th>
                                <th style={s.th}>Descripción</th>
                                <th style={s.th}>Monto</th>
                                <th style={s.th}>Acciones</th>
                            </tr></thead>
                            <tbody>{expenses.map((exp) => (
                                <tr key={exp.id} style={s.row}>
                                    <td style={{ ...s.td, ...s.muted, fontSize: 12 }}>{fmtDate(exp.date)}</td>
                                    <td style={s.td}>
                                        <span style={{ ...s.badge, background: `${CATEGORY_COLORS[exp.category] ?? "#888"}15`, color: CATEGORY_COLORS[exp.category] ?? "#888" }}>
                                            {CATEGORY_LABELS[exp.category] ?? exp.category}
                                        </span>
                                    </td>
                                    <td style={s.td}>{exp.description}</td>
                                    <td style={{ ...s.td, fontWeight: 600 }}>{fmtCurrency(exp.amount)}</td>
                                    <td style={s.td}>
                                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                            <button style={s.btnIcon} onClick={() => openEdit(exp)} title="Editar">
                                                <i className="ti ti-pencil" style={{ fontSize: 13 }} aria-hidden />
                                            </button>
                                            <button style={{ ...s.btnIcon, color: "#c0392b" }} onClick={() => requestDelete(exp.id)} title="Eliminar">
                                                <i className="ti ti-trash" style={{ fontSize: 13 }} aria-hidden />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                )}
                {!loading && <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onChange={setPage} />}
            </div>

            {drawerOpen && (
                <div style={s.overlay} onClick={() => setDrawerOpen(false)}>
                    <div style={s.drawer} onClick={(e) => e.stopPropagation()} className="drawer-panel">
                        <div style={s.drawerHeader}>
                            <div>
                                <p style={s.drawerTitle}>{editingId ? "Editar gasto" : "Nuevo gasto"}</p>
                                <p style={s.drawerSub}>Registra un gasto operativo</p>
                            </div>
                            <button style={s.btnIcon} onClick={() => setDrawerOpen(false)}><i className="ti ti-x" style={{ fontSize: 16 }} aria-hidden /></button>
                        </div>
                        <form onSubmit={handleSubmit} style={s.drawerBody}>
                            <div>
                                <label style={s.fieldLabel}>Categoría</label>
                                <select value={form.category} onChange={(e) => handleChange("category", e.target.value)} style={s.input} required>
                                    <option value="">Seleccionar</option>
                                    {CATEGORY_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={s.fieldLabel}>Descripción</label>
                                <input value={form.description} onChange={(e) => handleChange("description", e.target.value)} style={s.input} required />
                            </div>
                            <div>
                                <label style={s.fieldLabel}>Monto</label>
                                <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => handleChange("amount", e.target.value)} style={s.input} required />
                            </div>
                            <div>
                                <label style={s.fieldLabel}>Fecha</label>
                                <input type="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} style={s.input} />
                            </div>
                            <div style={s.drawerFooter}>
                                <button type="button" style={s.btnGhost} onClick={() => setDrawerOpen(false)}>Cancelar</button>
                                <button type="submit" style={s.btnPrimary} disabled={saving}>
                                    {saving ? "Guardando…" : editingId ? "Actualizar" : "Registrar"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <style>{`
    .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    @media (max-width: 768px) {
        .table-scroll table { min-width: 550px; }
        .drawer-panel { width: 100vw !important; border-left: none !important; }
    }
    @media (max-width: 900px) {
        .toolbar-wrap { flex-direction: column !important; align-items: stretch !important; }
        .toolbar-wrap .search-wrap { flex: none !important; width: 100% !important; }
        .export-group { margin-left: 0 !important; width: 100% !important; justify-content: flex-end !important; }
        .filter-group { width: 100% !important; }
    }
    @media (max-width: 600px) {
        .filter-group { flex-direction: column !important; }
        .filter-group > * { width: 100% !important; }
        .export-group { justify-content: stretch !important; }
        .export-group > * { flex: 1 !important; }
    }
`}</style>
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    page: { display: "flex", flexDirection: "column", minHeight: "100%" },
    content: { padding: "16px 28px 28px", display: "flex", flexDirection: "column", gap: 10 },
    card: { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, overflow: "hidden", borderTop: "2px solid #D4AF37" },
    table: { width: "100%", borderCollapse: "collapse" },
    thead: { borderBottom: "1px solid #E5E4E2", background: "#FAFAFA" },
    th: { padding: "10px 14px", fontSize: 11, fontWeight: 500, color: "#bbb", textAlign: "left", whiteSpace: "nowrap" },
    row: { borderBottom: "1px solid #F0F0EE" },
    td: { padding: "11px 14px", fontSize: 13, color: "#1a1a1a", verticalAlign: "middle" },
    muted: { color: "#888" },
    badge: { display: "inline-flex", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500 },
    empty: { fontSize: 13, color: "#bbb", padding: "40px 0", textAlign: "center" },
    filterSelect: { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 7, padding: "9px 13px", fontSize: 13, color: "#1a1a1a", outline: "none", fontFamily: "inherit", maxWidth: 200 },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" },
    drawer: { background: "#fff", borderRadius: 12, width: 420, maxWidth: "90vw", boxShadow: "0 8px 32px rgba(0,0,0,0.14)", display: "flex", flexDirection: "column", maxHeight: "80vh" },
    drawerHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "22px 24px 18px", borderBottom: "1px solid #F0F0EE", flexShrink: 0 },
    drawerTitle: { fontSize: 15, fontWeight: 600, color: "#1a1a1a", margin: 0 },
    drawerSub: { fontSize: 12, color: "#bbb", margin: "3px 0 0" },
    drawerBody: { flex: 1, overflowY: "auto", padding: "20px 24px" },
    drawerFooter: { display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 14, borderTop: "1px solid #F0F0EE" },
    fieldLabel: { fontSize: 11, fontWeight: 500, color: "#555", marginBottom: 4, display: "block" },
    input: { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 7, padding: "8px 11px", fontSize: 13, color: "#1a1a1a", outline: "none", width: "100%", fontFamily: "inherit", boxSizing: "border-box" as const },
    btnPrimary: { display: "inline-flex", alignItems: "center", gap: 6, background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" },
    btnGhost: { background: "none", color: "#555", border: "1px solid #E5E4E2", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" },
    btnIcon: { background: "none", border: "none", cursor: "pointer", color: "#555", padding: 4, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" },
    toolbar: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const },
    toolbarCard: { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, padding: "12px 16px", borderTop: "2px solid #D4AF37" },
    filterGroup: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const },
    exportGroup: { display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" as const },
};