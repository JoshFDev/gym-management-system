import { useEffect, useState } from "react";
import { getAuditLogs } from "../services/audit-log.service";
import PageHeader from "../components/PageHeader";

interface AuditLog {
    id: string;
    action: "CREATE" | "UPDATE" | "DELETE";
    entity: string;
    entityId: string;
    user: { id: string; name: string; email: string } | null;
    userRole: string;
    changes?: Record<string, any>;
    createdAt: string;
}

const ACTION_LABEL: Record<string, string> = {
    CREATE: "Creó",
    UPDATE: "Actualizó",
    DELETE: "Desactivó",
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

    const loadLogs = async () => {
        try {
            const res = await getAuditLogs();
            setLogs(res.data ?? []);
        } catch {
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLogs();
    }, []);

    return (
        <div style={s.page}>
            <PageHeader title="Auditoría" />
            <div style={s.content}>
                {loading ? (
                    <p style={s.empty}>Cargando registros...</p>
                ) : logs.length === 0 ? (
                    <p style={s.empty}>No hay registros de auditoría.</p>
                ) : (
                    <div style={{ ...s.card, padding: 0 }}>
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
                                        <td style={s.td}>{log.entity}</td>
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
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    page:    { display: "flex", flexDirection: "column", minHeight: "100%" },
    content: { padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14 },
    card:    { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, overflow: "hidden" },
    table:   { width: "100%", borderCollapse: "collapse" },
    thead:   { borderBottom: "1px solid #E5E4E2", background: "#FAFAFA" },
    th:      { padding: "10px 14px", fontSize: 11, fontWeight: 500, color: "#bbb", textAlign: "left", whiteSpace: "nowrap" },
    row:     { borderBottom: "1px solid #F0F0EE" },
    td:      { padding: "11px 14px", fontSize: 13, color: "#1a1a1a", verticalAlign: "middle" },
    muted:   { color: "#888" },
    badge:   { display: "inline-flex", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500 },
    empty:   { fontSize: 13, color: "#bbb", padding: "40px 0", textAlign: "center" },
};
