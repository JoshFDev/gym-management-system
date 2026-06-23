import { useEffect, useState } from "react";
import {
    createPlan, getPlans, updatePlan,
} from "../services/plan.service";
import PageHeader from "../components/PageHeader";
import GymButton from "../components/GymButton";

interface Plan {
    id: string;
    name: string;
    description?: string;
    price: number;
    durationDays: number;
    status: string;
}

const statusStyle = (status: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
        active: { background: "#F0F7F1", color: "#3a7d44" },
        inactive: { background: "#F0F0EE", color: "#888" },
    };
    return map[status] ?? { background: "#F0F0EE", color: "#888" };
};

const statusLabel: Record<string, string> = {
    active: "Activo", inactive: "Inactivo",
};

export default function PlansPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [durationDays, setDurationDays] = useState("");

    const loadPlans = async () => {
        const res = await getPlans();
        setPlans(res.data);
    };

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const res = await getPlans();
                setPlans(res.data);
            } finally {
                setLoading(false);
            }
        };

        fetchPlans();
    }, []);
    const clearForm = () => {
        setName(""); setDescription(""); setPrice("");
        setDurationDays(""); setEditingId(null); setShowForm(false);
    };

    const handleEdit = (p: Plan) => {
        setEditingId(p.id);
        setName(p.name); setDescription(p.description ?? "");
        setPrice(String(p.price)); setDurationDays(String(p.durationDays));
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const data = { name, description, price: Number(price), durationDays: Number(durationDays) };
        if (editingId) {
            await updatePlan(editingId, data);
        } else {
            await createPlan(data);
        }
        clearForm();
        loadPlans();
    };
    const handleToggleStatus = async (
        plan: Plan
    ) => {
        const newStatus =
            plan.status === "active"
                ? "inactive"
                : "active";

        const confirmChange = window.confirm(
            `¿Seguro que quieres ${newStatus === "active"
                ? "activar"
                : "desactivar"
            } este plan?`
        );

        if (!confirmChange) {
            return;
        }

        await updatePlan(plan.id, {
            status: newStatus,
        });

        loadPlans();
    };

    return (
        <div style={s.page}>
            <PageHeader
                title="Planes"
                action={
                    <GymButton icon="ti-plus" onClick={() => { clearForm(); setShowForm(true); }}>
                        Nuevo plan
                    </GymButton>
                }
            />

            <div style={s.content}>

                {/* Formulario */}
                {showForm && (
                    <div style={s.card}>
                        <p style={s.formTitle}>{editingId ? "Editar plan" : "Nuevo plan"}</p>
                        <form onSubmit={handleSubmit}>
                            <div style={s.formGrid}>
                                <Field label="Nombre del plan">
                                    <input style={s.input} placeholder="Premium Mensual" value={name}
                                        onChange={(e) => setName(e.target.value)} required />
                                </Field>
                                <Field label="Precio ($)">
                                    <input style={s.input} type="number" placeholder="450" value={price}
                                        onChange={(e) => setPrice(e.target.value)} required min={0} />
                                </Field>
                                <Field label="Duración (días)">
                                    <input style={s.input} type="number" placeholder="30" value={durationDays}
                                        onChange={(e) => setDurationDays(e.target.value)} required min={1} />
                                </Field>
                                <Field label="Descripción" style={{ gridColumn: "1 / -1" }}>
                                    <input style={s.input} placeholder="Descripción opcional" value={description}
                                        onChange={(e) => setDescription(e.target.value)} />
                                </Field>
                            </div>
                            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                                <GymButton type="submit">
                                    {editingId ? "Guardar cambios" : "Crear plan"}
                                </GymButton>
                                <GymButton type="button" variant="ghost" onClick={clearForm}>
                                    Cancelar
                                </GymButton>
                            </div>
                        </form>
                    </div>
                )}

                {/* Tabla */}
                {loading ? (
                    <p style={s.empty}>Cargando planes...</p>
                ) : plans.length === 0 ? (
                    <p style={s.empty}>No hay planes registrados.</p>
                ) : (
                    <div style={s.card}>
                        <table style={s.table}>
                            <thead>
                                <tr style={s.thead}>
                                    <th style={s.th}>Nombre</th>
                                    <th style={s.th}>Descripción</th>
                                    <th style={s.th}>Precio</th>
                                    <th style={s.th}>Duración</th>
                                    <th style={s.th}>Estado</th>
                                    <th style={s.th}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {plans.map((p) => (
                                    <tr key={p.id} style={s.row}>
                                        <td style={{ ...s.td, fontWeight: 500 }}>{p.name}</td>
                                        <td style={{ ...s.td, ...s.muted }}>{p.description ?? "—"}</td>
                                        <td style={s.td}>${p.price}</td>
                                        <td style={{ ...s.td, ...s.muted }}>{p.durationDays} días</td>
                                        <td style={s.td}>
                                            <span style={{ ...s.badge, ...statusStyle(p.status) }}>
                                                {statusLabel[p.status] ?? p.status}
                                            </span>
                                        </td>
                                        <td style={s.td}>
                                            <div style={{ display: "flex", gap: 6 }}>
                                                <GymButton variant="ghost" onClick={() => handleEdit(p)}>
                                                    Editar
                                                </GymButton>
                                                <button
                                                    style={{
                                                        ...s.btnDeactivate,
                                                        color:
                                                            p.status === "active"
                                                                ? "#c0392b"
                                                                : "#3a7d44",
                                                    }}
                                                    onClick={() => handleToggleStatus(p)}
                                                >
                                                    {p.status === "active"
                                                        ? "Desactivar"
                                                        : "Activar"}
                                                </button>
                                            </div>
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

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: "#888" }}>{label}</label>
            {children}
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    page: { display: "flex", flexDirection: "column", minHeight: "100%" },
    content: { padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14 },
    card: { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, padding: 20, overflow: "hidden" },
    formTitle: { fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 16 },
    formGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 },
    input: { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 6, padding: "8px 12px", fontSize: 13, color: "#1a1a1a", outline: "none", width: "100%", fontFamily: "inherit" },
    table: { width: "100%", borderCollapse: "collapse" },
    thead: { borderBottom: "1px solid #E5E4E2", background: "#FAFAFA" },
    th: { padding: "10px 14px", fontSize: 11, fontWeight: 500, color: "#bbb", textAlign: "left", whiteSpace: "nowrap" },
    row: { borderBottom: "1px solid #F0F0EE" },
    td: { padding: "11px 14px", fontSize: 13, color: "#1a1a1a" },
    muted: { color: "#888" },
    badge: { display: "inline-flex", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500 },
    btnDeactivate: { background: "none", border: "1px solid #E5E4E2", borderRadius: 6, padding: "6px 12px", fontSize: 12, color: "#c0392b", fontFamily: "inherit" },
    empty: { fontSize: 13, color: "#bbb", padding: "40px 0", textAlign: "center" },
};