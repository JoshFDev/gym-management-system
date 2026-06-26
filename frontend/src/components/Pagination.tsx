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

    const getPages = () => {
        const pages: (number | "...")[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (page > 3) pages.push("...");
            const start = Math.max(2, page - 1);
            const end = Math.min(totalPages - 1, page + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (page < totalPages - 2) pages.push("...");
            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div style={s.wrap}>
            <p style={s.info}>{from}–{to} de {total}</p>
            <div style={s.buttons}>
                <button style={s.btn} disabled={page <= 1} onClick={() => onChange(page - 1)}>
                    <i className="ti ti-chevron-left" style={{ fontSize: 12 }} aria-hidden />
                </button>
                {getPages().map((p, i) =>
                    p === "..." ? (
                        <span key={`ellipsis-${i}`} style={{ ...s.btn, border: "none", cursor: "default", color: "#bbb" }}>…</span>
                    ) : (
                        <button key={p} style={{ ...s.btn, ...(p === page ? s.active : {}) }} onClick={() => onChange(p)}>
                            {p}
                        </button>
                    )
                )}
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
