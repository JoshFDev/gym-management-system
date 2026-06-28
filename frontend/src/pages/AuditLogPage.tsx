import { useEffect, useState } from "react";
import { getAuditLogs } from "../services/audit-log.service";
import PageHeader from "../components/PageHeader";
import LoadingSkeleton from "../components/LoadingSkeleton";

interface AuditLog {
    id: string;
    action: "CREATE" | "UPDATE" | "DELETE";
    entity: string;
    entityId: string;
    user: { id: string; name: string; email: string } | null;
    userRole: string;
    changes?: Record<string, string | null | undefined>;
    createdAt: string;
}

const ENTITY_LABEL: Record<string, string> = {
    Member: "Miembro",
    Subscription: "Suscripción",
    Plan: "Plan",
    Payment: "Pago",
    Attendance: "Asistencia",
    User: "Usuario",
    ClassSchedule: "Clase",
};

const ACTION_LABEL: Record<string, string> = {
    CREATE: "Creó",
    UPDATE: "Actualizó",
    DELETE: "Eliminó",
};

const ACTION_COLOR: Record<string, string> = {
    CREATE: "#22a67e",
    UPDATE: "#e68a2e",
    DELETE: "#e53e3e",
};

const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

export default function AuditLogPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [entityFilter, setEntityFilter] = useState("");

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await getAuditLogs(entityFilter || undefined);
                setLogs(res.data ?? []);
            } catch {
                setLogs([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [entityFilter]);

    const uniqueEntities = [...new Set(logs.map((l) => l.entity))];

    return (
        <div style={s.page}>
            <PageHeader title="Auditoría" />
            <div style={s.content}>
                <div className="toolbar-card" style={s.toolbarCard}>
                <div className="toolbar-wrap" style={s.toolbar}>
                    <div className="filter-group" style={s.filterGroup}>
                        <select
                            value={entityFilter}
                            onChange={(e) => setEntityFilter(e.target.value)}
                            style={{ ...s.filterSelect }}
                        >
                            <option value="">Todas las entidades</option>
                            {uniqueEntities.map((e) => (
                                <option key={e} value={e}>
                                    {ENTITY_LABEL[e] ?? e}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                </div>
                {loading ? (
                    <div style={{ padding: "20px 14px" }}><LoadingSkeleton rows={5} /></div>
                ) : logs.length === 0 ? (
                    <p style={s.empty}>No hay registros de auditoría.</p>
                ) : (
                    <div style={{ ...s.card, padding: 0 }} className="table-scroll">
                        <table style={s.table}>
                            <thead>
                                <tr style={s.thead}>
                                    <th style={s.th}>Acción</th>
                                    <th style={s.th}>Entidad</th>
                                    <th style={s.th}>Usuario</th>
                                    <th style={s.th}>Rol</th>
                                    <th style={s.th}>Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log.id} style={s.row}>
                                        <td style={s.td}>
                                            <span
                                                style={{
                                                    ...s.badge,
                                                    background: `${ACTION_COLOR[log.action]}15`,
                                                    color: ACTION_COLOR[log.action],
                                                }}
                                            >
                                                {ACTION_LABEL[log.action] ?? log.action}
                                            </span>
                                        </td>
                                        <td style={s.td}>
                                            {ENTITY_LABEL[log.entity] ?? log.entity}
                                        </td>
                                        <td style={s.td}>
                                            {log.user ? (
                                                <div>
                                                    <span style={{ fontWeight: 500 }}>{log.user.name}</span>
                                                    <br />
                                                    <span style={s.muted}>{log.user.email}</span>
                                                </div>
                                            ) : (
                                                <span style={s.muted}>—</span>
                                            )}
                                        </td>
                                        <td style={s.td}>{log.userRole}</td>
                                        <td style={{ ...s.td, ...s.muted, fontSize: 12 }}>
                                            {fmtDate(log.createdAt)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <style>{`
    .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    @media (max-width: 768px) {
        .table-scroll table { min-width: 600px; }
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
    page:    { display: "flex", flexDirection: "column", minHeight: "100%" },
    content: { padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14 },
    card:    { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, overflow: "hidden", borderTop: "2px solid #D4AF37" },
    table:   { width: "100%", borderCollapse: "collapse" },
    thead:   { borderBottom: "1px solid #E5E4E2", background: "#FAFAFA" },
    th:      { padding: "10px 14px", fontSize: 11, fontWeight: 500, color: "#bbb", textAlign: "left", whiteSpace: "nowrap" },
    row:     { borderBottom: "1px solid #F0F0EE" },
    td:      { padding: "11px 14px", fontSize: 13, color: "#1a1a1a", verticalAlign: "middle" },
    muted:   { color: "#888" },
    badge:   { display: "inline-flex", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500 },
    empty:   { fontSize: 13, color: "#bbb", padding: "40px 0", textAlign: "center" },
    filterSelect: {
        background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 7, padding: "9px 13px",
        fontSize: 13, color: "#1a1a1a", outline: "none", fontFamily: "inherit", maxWidth: 220,
    },
    toolbar: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const },
    toolbarCard: { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, padding: "12px 16px", borderTop: "2px solid #D4AF37" },
    filterGroup: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const },
    exportGroup: { display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" as const },
};