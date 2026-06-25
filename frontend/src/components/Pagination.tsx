interface PaginationProps {
    page: number;
    totalPages: number;
    total: number;
    limit: number;
    onChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, total, limit, onChange }: PaginationProps) {
    if (totalPages <= 1) return null;

    const from = (page - 1) * limit + 1;
    const to = Math.min(page * limit, total);

    return (
        <div style={s.wrap}>
            <p style={s.info}>{from}–{to} de {total}</p>
            <div style={s.buttons}>
                <button style={s.btn} disabled={page <= 1} onClick={() => onChange(page - 1)}>
                    <i className="ti ti-chevron-left" style={{ fontSize: 12 }} aria-hidden />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                        key={p}
                        style={{ ...s.btn, ...(p === page ? s.active : {}) }}
                        onClick={() => onChange(p)}
                    >
                        {p}
                    </button>
                ))}
                <button style={s.btn} disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
                    <i className="ti ti-chevron-right" style={{ fontSize: 12 }} aria-hidden />
                </button>
            </div>
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    wrap: { display: "flex", alignItems: "center", justifyContent: "center", gap: 16, padding: "12px 0" },
    info: { fontSize: 11, color: "#bbb", margin: 0 },
    buttons: { display: "flex", gap: 4 },
    btn: { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 6, padding: "5px 10px", fontSize: 12, color: "#555", fontFamily: "inherit", cursor: "pointer", minWidth: 30, display: "flex", alignItems: "center", justifyContent: "center" },
    active: { background: "#1a1a1a", color: "#fff", borderColor: "#1a1a1a" },
};
