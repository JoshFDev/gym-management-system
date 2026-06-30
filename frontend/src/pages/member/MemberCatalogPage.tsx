import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { getMemberCatalog, getMemberCategories, type CatalogProduct } from "../../services/memberPortal.service";
import { useSocketRefresh } from "../../hooks/useSocketRefresh";

const GOLD = "#D4AF37";

function formatPrice(n: number) {
    return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function MemberCatalogPage() {
    const [products, setProducts] = useState<CatalogProduct[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [catFilter, setCatFilter] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [detail, setDetail] = useState<CatalogProduct | null>(null);
    const [detailImg, setDetailImg] = useState(0);
    const searchRef = useRef<HTMLInputElement>(null);

    const load = useCallback(async () => {
        try {
            const [prods, cats] = await Promise.all([
                getMemberCatalog(),
                getMemberCategories(),
            ]);
            setProducts(prods);
            setCategories(cats);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    useSocketRefresh(
        ["product_created", "product_updated", "product_deactivated", "product_reactivated"],
        load
    );

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearch(searchInput);
    };

    const filtered = useMemo(() => {
        return products.filter((p) => {
            if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
            if (catFilter && p.category !== catFilter) return false;
            return true;
        });
    }, [products, search, catFilter]);

    useEffect(() => {
        if (search && searchRef.current) {
            searchRef.current.focus();
        }
    }, []);

    const saleActive = (p: CatalogProduct) => {
        if (!p.salePrice) return false;
        if (p.saleEndDate && new Date(p.saleEndDate) < new Date()) return false;
        return true;
    };

    const openDetail = (p: CatalogProduct) => {
        setDetail(p);
        setDetailImg(0);
    };

    const allImages = (p: CatalogProduct) => {
        const imgs: string[] = [];
        if (p.images?.length) imgs.push(...p.images);
        if (p.image) imgs.push(p.image);
        return imgs;
    };

    return (
        <div style={s.page}>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes scaleIn { from { opacity: 0; transform: scale(0.93); } to { opacity: 1; transform: scale(1); } }
                @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
                .card { animation: fadeUp 0.35s ease both; }
                .card:hover { border-color: ${GOLD}55; box-shadow: 0 6px 24px rgba(0,0,0,0.06); }
                .card:hover .card-img img { transform: scale(1.07); }
                .card-img img { transition: transform 0.4s ease; }
                .search-inp::placeholder { color: #bbb; }
                .thumb-btn { transition: all 0.15s; }
                .thumb-btn:hover { border-color: ${GOLD}; }
                .thumb-btn.active { border-color: ${GOLD}; box-shadow: 0 0 0 1.5px ${GOLD}; }
                @media (max-width: 1024px) { .grid-prod { grid-template-columns: repeat(3, 1fr); gap: 14px; } }
                @media (max-width: 720px) {
                    .grid-prod { grid-template-columns: repeat(2, 1fr); gap: 10px; }
                    .inner-pad { padding-left: 16px; padding-right: 16px; }
                    .filter-pad { padding: 10px 16px; }
                }
                @media (max-width: 420px) {
                    .card-img-h { height: 150px; }
                }
            `}</style>

            {/* Header */}
            <div style={s.header}>
                <div className="inner-pad" style={s.headerInner}>
                    <div style={s.headerTop}>
                        <h1 style={s.headerTitle}>Catálogo</h1>
                        <p style={s.headerSub}>
                            {products.length} producto{products.length !== 1 ? "s" : ""} disponibles
                        </p>
                    </div>
                    <form onSubmit={handleSearch} style={s.searchForm}>
                        <svg style={s.searchIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        </svg>
                        <input
                            ref={searchRef}
                            type="text"
                            className="search-inp"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Buscar en el catálogo…"
                            style={s.searchInput}
                        />
                        {searchInput && (
                            <button type="button" style={s.clearBtn} onClick={() => { setSearchInput(""); setSearch(""); }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        )}
                        {searchInput && (
                            <button type="submit" style={s.searchGo}>Ir</button>
                        )}
                    </form>
                </div>
                <div style={s.headerLine} />
            </div>

            {/* Categories */}
            <div style={s.catBar}>
                <div className="inner-pad" style={s.catInner}>
                    <button
                        onClick={() => setCatFilter("")}
                        style={{ ...s.catBtn, ...(catFilter === "" ? s.catBtnActive : {}) }}
                    >Todos</button>
                    {categories.map((c) => (
                        <button
                            key={c}
                            onClick={() => setCatFilter(c)}
                            style={{ ...s.catBtn, ...(catFilter === c ? s.catBtnActive : {}) }}
                        >{c}</button>
                    ))}
                    {(search || catFilter) && (
                        <button style={s.clearAll} onClick={() => { setSearch(""); setSearchInput(""); setCatFilter(""); }}>
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            {/* Active filters info */}
            {(search || catFilter) && (
                <div className="inner-pad" style={s.activeFilters}>
                    {search && <span style={s.filterTag}><strong>Búsqueda:</strong> "{search}"</span>}
                    {catFilter && <span style={s.filterTag}><strong>Categoría:</strong> {catFilter}</span>}
                    <span style={s.resultCount}>{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
                </div>
            )}

            {/* Products */}
            <div className="inner-pad" style={s.content}>
                {loading ? (
                    <div style={s.center}><div style={s.spinner} /></div>
                ) : error ? (
                    <div style={s.center}>
                        <div style={s.emptyBox}>
                            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="1.5" strokeLinecap="round">
                                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <p style={{ margin: "8px 0 12px", color: "#c0392b", fontSize: 13 }}>Error al cargar el catálogo.</p>
                            <button onClick={() => { setError(false); setLoading(true); load(); }}
                                style={{ background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 6, padding: "7px 16px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                                Reintentar
                            </button>
                        </div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={s.center}>
                        <div style={s.emptyBox}>
                            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="1.5" strokeLinecap="round">
                                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                            </svg>
                            <p style={{ margin: "8px 0 0", color: "#aaa", fontSize: 13 }}>
                                {search || catFilter ? "No encontramos productos con esos filtros." : "No hay productos en el catálogo."}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid-prod" style={s.grid}>
                        {filtered.map((p, i) => (
                            <div
                                key={p.id}
                                className="card"
                                style={{ ...s.card, animationDelay: `${Math.min(i * 20, 300)}ms` }}
                                onClick={() => openDetail(p)}
                            >
                                <div className="card-img" style={{ ...s.imgWrap, height: s.imgWrap.height }}>
                                    <div className="card-img-h">
                                        {p.images && p.images[0] ? (
                                            <img src={p.images[0]} alt={p.name} style={s.imgStyle} />
                                        ) : p.image ? (
                                            <img src={p.image} alt={p.name} style={s.imgStyle} />
                                        ) : (
                                            <div style={s.imgPlaceholder}>
                                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d5d4d2" strokeWidth="1.5">
                                                    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m3 16 5-5 3 3 4-4 6 6" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    {saleActive(p) && <span style={s.saleBadge}>Oferta</span>}
                                </div>
                                <div style={s.cardBody}>
                                    <span style={s.catLabel}>{p.category}</span>
                                    <h3 style={s.nameLabel}>{p.name}</h3>
                                    <div style={s.priceRow}>
                                        {saleActive(p) ? (
                                            <>
                                                <span style={s.salePrice}>${formatPrice(p.salePrice!)}</span>
                                                <span style={s.origPrice}>${formatPrice(p.price)}</span>
                                            </>
                                        ) : (
                                            <span style={s.priceLabel}>${formatPrice(p.price)}</span>
                                        )}
                                    </div>
                                    {p.stock <= 3 && p.stock > 0 && (
                                        <span style={s.stockWarn}>Últimos {p.stock}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Detail modal */}
            {detail && (
                <div style={s.overlay} onClick={() => setDetail(null)}>
                    <div style={s.modal} onClick={(e) => e.stopPropagation()}>
                        <button style={s.closeBtn} onClick={() => setDetail(null)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                        <div style={s.modalInner}>
                            <div style={s.modalLeft}>
                                <div style={s.modalImgWrap}>
                                    {allImages(detail).length > 0 ? (
                                        <img
                                            key={detailImg}
                                            src={allImages(detail)[detailImg]}
                                            alt={detail.name}
                                            style={s.modalImg}
                                        />
                                    ) : (
                                        <div style={{ ...s.modalImg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
                                                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m3 16 5-5 3 3 4-4 6 6" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                {allImages(detail).length > 1 && (
                                    <div style={s.thumbRow}>
                                        {allImages(detail).map((img, idx) => (
                                            <button
                                                key={idx}
                                                className={`thumb-btn ${idx === detailImg ? "active" : ""}`}
                                                style={s.thumbBtn}
                                                onClick={() => setDetailImg(idx)}
                                            >
                                                <img src={img} alt="" style={s.thumbImg} />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div style={s.modalRight}>
                                <span style={s.modalCat}>{detail.category}</span>
                                <h2 style={s.modalTitle}>{detail.name}</h2>
                                {detail.description && <p style={s.modalDesc}>{detail.description}</p>}
                                <div style={s.modalPriceRow}>
                                    {saleActive(detail) ? (
                                        <>
                                            <span style={s.salePrice}>${formatPrice(detail.salePrice!)}</span>
                                            <span style={s.origPrice}>${formatPrice(detail.price)}</span>
                                        </>
                                    ) : (
                                        <span style={{ ...s.priceLabel, fontSize: 22 }}>${formatPrice(detail.price)}</span>
                                    )}
                                </div>
                                <p style={s.modalStock}>
                                    <strong>{detail.stock}</strong> unidad{detail.stock !== 1 ? "es" : ""} en stock
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    page: {
        minHeight: "100%",
        fontFamily: "Inter, system-ui, sans-serif",
        background: "#F8F8F7",
    },
    header: {
        background: "#fff",
        borderBottom: "1px solid #ECEBE9",
    },
    headerInner: {
        maxWidth: 1100, margin: "0 auto",
        padding: "28px 24px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 20,
        flexWrap: "wrap" as const,
    },
    headerTop: {},
    headerTitle: {
        fontSize: 24, fontWeight: 700, color: "#070707",
        margin: 0, letterSpacing: -0.5,
    },
    headerSub: {
        fontSize: 13, color: "#bbb",
        margin: "2px 0 0",
    },
    headerLine: {
        height: 2,
        background: `linear-gradient(90deg, ${GOLD} 0%, ${GOLD}22 100%)`,
        width: "100%",
    },
    searchForm: {
        position: "relative" as const,
        display: "flex", alignItems: "center",
        width: "100%", maxWidth: 320,
        background: "#F3F3F2",
        borderRadius: 8,
        overflow: "hidden",
    },
    searchIcon: {
        position: "absolute" as const, left: 11, top: "50%",
        transform: "translateY(-50%)",
        pointerEvents: "none", flexShrink: 0,
    },
    searchInput: {
        flex: 1, border: "none",
        padding: "8px 34px 8px 34px",
        fontSize: 13, color: "#1a1a1a",
        outline: "none", fontFamily: "inherit",
        background: "transparent",
    },
    clearBtn: {
        position: "absolute" as const, right: 34,
        background: "none", border: "none",
        cursor: "pointer", padding: 4, display: "flex",
    },
    searchGo: {
        position: "absolute" as const, right: 3, top: "50%",
        transform: "translateY(-50%)",
        background: "none", border: "none",
        color: GOLD, fontSize: 12, fontWeight: 600,
        cursor: "pointer", fontFamily: "inherit",
        padding: "4px 8px",
    },
    catBar: {
        background: "#fff",
        borderBottom: "1px solid #ECEBE9",
        position: "sticky" as const,
        top: 56, zIndex: 50,
    },
    catInner: {
        maxWidth: 1100, margin: "0 auto",
        padding: "10px 24px",
        display: "flex", gap: 6,
        overflowX: "auto" as const,
        whiteSpace: "nowrap" as const,
        scrollbarWidth: "none" as const,
    },
    catBtn: {
        padding: "5px 14px", borderRadius: 6,
        fontSize: 12, fontWeight: 500,
        cursor: "pointer", fontFamily: "inherit",
        background: "#F3F3F2",
        border: "none", color: "#555",
        flexShrink: 0,
    },
    catBtnActive: {
        background: "#070707",
        color: "#fff",
    },
    clearAll: {
        padding: "5px 10px", borderRadius: 6,
        fontSize: 11, fontWeight: 500,
        cursor: "pointer", fontFamily: "inherit",
        background: "none", border: "none",
        color: "#bbb", marginLeft: "auto",
        flexShrink: 0,
    },
    activeFilters: {
        maxWidth: 1100, margin: "0 auto",
        padding: "8px 24px",
        display: "flex", gap: 12,
        alignItems: "center",
        fontSize: 12,
    },
    filterTag: {
        color: "#888",
    },
    resultCount: {
        color: "#bbb",
        marginLeft: "auto",
    },
    content: {
        maxWidth: 1100, margin: "0 auto",
        padding: "24px 24px 64px",
    },
    center: {
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 80,
    },
    emptyBox: {
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 4,
        padding: "40px 0",
    },
    spinner: {
        width: 24, height: 24,
        border: "2px solid #E5E4E2",
        borderTopColor: GOLD, borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 16,
    },
    card: {
        background: "#fff", borderRadius: 10,
        border: "1px solid #E5E4E2",
        overflow: "hidden", cursor: "pointer",
        transition: "box-shadow 0.25s, border-color 0.25s",
    },
    imgWrap: {
        position: "relative" as const,
        width: "100%", height: 200,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "#F8F8F7", overflow: "hidden",
    },
    imgStyle: {
        width: "100%", height: "100%",
        objectFit: "contain" as const,
        padding: 12, boxSizing: "border-box" as const,
    },
    imgPlaceholder: {
        display: "flex", alignItems: "center", justifyContent: "center",
        width: "100%", height: "100%",
    },
    saleBadge: {
        position: "absolute" as const,
        top: 10, left: 10,
        background: "#c0392b",
        color: "#fff", fontSize: 9,
        fontWeight: 700, padding: "3px 8px",
        borderRadius: 4, letterSpacing: 0.4,
    },
    cardBody: {
        padding: "10px 12px 14px",
        display: "flex", flexDirection: "column", gap: 3,
    },
    catLabel: {
        fontSize: 9, color: "#bbb",
        textTransform: "uppercase" as const,
        letterSpacing: 0.7,
    },
    nameLabel: {
        fontSize: 13, fontWeight: 500, color: "#1a1a1a",
        margin: 0, lineHeight: 1.3,
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical" as const,
        overflow: "hidden",
    },
    priceRow: {
        display: "flex", alignItems: "baseline" as const,
        gap: 5, marginTop: 3,
    },
    priceLabel: {
        fontSize: 19, fontWeight: 700, color: "#1a1a1a",
        letterSpacing: -0.3,
    },
    salePrice: {
        fontSize: 19, fontWeight: 700, color: "#c0392b",
        letterSpacing: -0.3,
    },
    origPrice: {
        fontSize: 12, color: "#bbb",
        textDecoration: "line-through",
    },
    stockWarn: {
        fontSize: 10, color: "#c0392b",
        fontWeight: 600, marginTop: 1,
    },
    overlay: {
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, animation: "fadeIn 0.12s ease",
    },
    modal: {
        background: "#fff", borderRadius: 14,
        width: 680, maxWidth: "100%", maxHeight: "90vh",
        overflow: "hidden", position: "relative" as const,
        animation: "scaleIn 0.18s ease",
        display: "flex", flexDirection: "column" as const,
    },
    closeBtn: {
        position: "absolute" as const, top: 12, right: 12, zIndex: 3,
        width: 30, height: 30, borderRadius: "50%",
        background: "rgba(0,0,0,0.3)",
        border: "none", color: "#fff", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
    },
    modalInner: {
        display: "flex", flexWrap: "wrap" as const,
        overflow: "auto",
    },
    modalLeft: {
        flex: "1 1 50%", minWidth: 260,
        borderRight: "1px solid #EBEAE8",
        boxSizing: "border-box" as const,
    },
    modalImgWrap: {
        width: "100%", height: 320,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "#F8F8F7",
    },
    modalImg: {
        width: "100%", height: "100%",
        objectFit: "contain" as const,
        padding: 24, boxSizing: "border-box" as const,
    },
    thumbRow: {
        display: "flex", gap: 8,
        padding: "10px 20px 14px",
        justifyContent: "center",
        flexWrap: "wrap" as const,
    },
    thumbBtn: {
        width: 40, height: 40, borderRadius: 6,
        overflow: "hidden",
        border: "1.5px solid #EBEAE8",
        background: "#F8F8F7",
        cursor: "pointer", padding: 0,
    },
    thumbImg: {
        width: "100%", height: "100%",
        objectFit: "contain" as const,
        padding: 2, boxSizing: "border-box" as const,
    },
    modalRight: {
        flex: "1 1 50%", minWidth: 240,
        padding: "28px 24px",
        display: "flex", flexDirection: "column", gap: 5,
        boxSizing: "border-box" as const,
    },
    modalCat: {
        fontSize: 10, color: "#bbb",
        textTransform: "uppercase" as const,
        letterSpacing: 1,
    },
    modalTitle: {
        fontSize: 19, fontWeight: 600, color: "#1a1a1a",
        margin: 0, lineHeight: 1.3,
    },
    modalDesc: {
        fontSize: 13, color: "#666",
        lineHeight: 1.6, margin: "3px 0 0",
    },
    modalPriceRow: {
        display: "flex", alignItems: "baseline" as const,
        gap: 7, marginTop: 8,
    },
    modalStock: {
        fontSize: 13, color: "#888",
        margin: "4px 0 0",
    },
};
