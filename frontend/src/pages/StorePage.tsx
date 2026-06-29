import { useEffect, useState, useMemo, useRef } from "react";
import { getProducts, createProduct, updateProduct, deactivateProduct, reactivateProduct, getCategories, uploadProductImage, deleteProductImage, type Product } from "../services/product.service";
import { getSales, createSale, returnSale, type Sale } from "../services/sale.service";
import { getMembers } from "../services/member.service";
import { getUsers } from "../services/user.service";
import PageHeader from "../components/PageHeader";
import LoadingSkeleton from "../components/LoadingSkeleton";
import GymButton from "../components/GymButton";
import Pagination from "../components/Pagination";
import { useSocketRefresh } from "../hooks/useSocketRefresh";
import { useToast } from "../hooks/useToast";
import ConfirmModal from "../components/ConfirmModal";

const PAYMENT_LABEL: Record<string, string> = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia" };
const PAYMENT_OPTIONS = Object.entries(PAYMENT_LABEL);

const emptyProduct = { name: "", description: "", price: 0, stock: 0, category: "" };

export default function StorePage() {
    const { addToast } = useToast();
    const [tab, setTab] = useState<"products" | "sales">("sales");

    // Products
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // Sales
    const [sales, setSales] = useState<Sale[]>([]);
    const [salesLoading, setSalesLoading] = useState(false);

    // Filters
    const [search, setSearch] = useState("");
    const [catFilter, setCatFilter] = useState("");
    const [priceMin, setPriceMin] = useState("");
    const [priceMax, setPriceMax] = useState("");
    const [stockFilter, setStockFilter] = useState("");

    // Product drawer
    const [prodDrawer, setProdDrawer] = useState(false);
    const [editingProd, setEditingProd] = useState<string | null>(null);
    const [prodForm, setProdForm] = useState(emptyProduct);
    const [prodSaving, setProdSaving] = useState(false);
    const [prodImageFile, setProdImageFile] = useState<File | null>(null);
    const [prodImagePreview, setProdImagePreview] = useState<string | null>(null);
    const prodImageRef = useRef<HTMLInputElement>(null);

    // Sale drawer
    const [saleDrawer, setSaleDrawer] = useState(false);
    const [saleItems, setSaleItems] = useState<{ productId: string; productName: string; quantity: number; unitPrice: number }[]>([]);
    const [saleBuyerType, setSaleBuyerType] = useState<"member" | "staff">("member");
    const [saleBuyerName, setSaleBuyerName] = useState("");
    const [saleBuyerId, setSaleBuyerId] = useState("");
    const [salePayment, setSalePayment] = useState("cash");
    const [saleSaving, setSaleSaving] = useState(false);
    const [members, setMembers] = useState<{ id: string; fullName: string }[]>([]);
    const [staffUsers, setStaffUsers] = useState<{ id: string; fullName: string }[]>([]);
    const [selectedProdId, setSelectedProdId] = useState("");

    // Confirm
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<"deactivate" | "reactivate" | "return" | "delete">("deactivate");
    const [confirmTarget, setConfirmTarget] = useState<string | null>(null);
    const [confirmLoading, setConfirmLoading] = useState(false);

    // View product detail
    const [viewProduct, setViewProduct] = useState<Product | null>(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 20;

    const loadProducts = async () => {
        try {
            const res = await getProducts();
            setProducts(res.data ?? []);
        } catch { setError(true); }
    };

    const loadSales = async () => {
        setSalesLoading(true);
        try {
            const res = await getSales();
            setSales(res.data ?? []);
        } catch { /* ignore */ }
        finally { setSalesLoading(false); }
    };

    useSocketRefresh(["product_created", "product_updated", "product_deactivated", "product_reactivated", "sale_created", "sale_returned"], () => {
        loadProducts();
        if (tab === "sales") loadSales();
    });

    useEffect(() => {
        Promise.all([loadProducts(), getCategories().then((r) => setCategories(r.data ?? [])).catch(() => {})])
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (tab === "sales") loadSales();
    }, [tab]);

    useEffect(() => {
        if (saleDrawer) {
            Promise.all([
                getMembers(1, 200).then((r) => setMembers(r.data ?? [])).catch(() => {}),
                getUsers().then((r) => setStaffUsers((r.data ?? []).map((u: any) => ({ id: u.id, fullName: `${u.firstName} ${u.lastName}` })))).catch(() => {}),
            ]);
        }
    }, [saleDrawer]);

    // Filtered products
    const filtered = useMemo(() => {
        return products.filter((p) => {
            if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
            if (catFilter && p.category !== catFilter) return false;
            if (priceMin && p.price < Number(priceMin)) return false;
            if (priceMax && p.price > Number(priceMax)) return false;
            if (stockFilter === "low" && (p.stock > 5 || p.status !== "active")) return false;
            if (stockFilter === "out" && (p.stock > 0 || p.status !== "active")) return false;
            if (stockFilter === "available" && (p.stock === 0 || p.status !== "active")) return false;
            return true;
        });
    }, [products, search, catFilter, priceMin, priceMax, stockFilter]);

    // Paginated
    const paginated = useMemo(() => {
        const start = (page - 1) * limit;
        return filtered.slice(start, start + limit);
    }, [filtered, page, limit]);

    useEffect(() => {
        const tp = Math.max(1, Math.ceil(filtered.length / limit));
        setTotalPages(tp);
        setTotal(filtered.length);
        if (page > tp) setPage(tp);
    }, [filtered.length, limit, page]);

    const allCategories = useMemo(() => {
        const s = new Set(products.map((p) => p.category));
        return Array.from(s).sort();
    }, [products]);

    // Product CRUD
    const openNewProd = () => { setEditingProd(null); setProdForm(emptyProduct); setProdImageFile(null); setProdImagePreview(null); setProdDrawer(true); };
    const openEditProd = (p: Product) => { setEditingProd(p.id); setProdForm({ name: p.name, description: p.description ?? "", price: p.price, stock: p.stock, category: p.category }); setProdImageFile(null); setProdImagePreview(p.image ?? null); setProdDrawer(true); };

    const handleSaveProd = async () => {
        if (!prodForm.name.trim() || !prodForm.category.trim()) return;
        setProdSaving(true);
        try {
            let productId = editingProd;
            if (editingProd) {
                await updateProduct(editingProd, prodForm);
                addToast("Producto actualizado");
            } else {
                const res = await createProduct(prodForm);
                productId = res.data.id;
                addToast("Producto creado");
            }
            if (prodImageFile && productId) {
                await uploadProductImage(productId, prodImageFile);
                addToast("Imagen subida");
            }
            setProdDrawer(false);
            loadProducts();
        } catch (err: any) {
            addToast(err?.response?.data?.message || "Error al guardar", "error");
        } finally { setProdSaving(false); }
    };

    const requestDeactivate = (id: string) => { setConfirmTarget(id); setConfirmAction("deactivate"); setConfirmOpen(true); };
    const requestReactivate = (id: string) => { setConfirmTarget(id); setConfirmAction("reactivate"); setConfirmOpen(true); };
    const requestReturn = (id: string) => { setConfirmTarget(id); setConfirmAction("return"); setConfirmOpen(true); };

    const handleConfirm = async () => {
        if (!confirmTarget) return;
        setConfirmLoading(true);
        try {
            if (confirmAction === "deactivate") {
                await deactivateProduct(confirmTarget);
                addToast("Producto desactivado");
                setProducts((prev) => prev.map((p) => p.id === confirmTarget ? { ...p, status: "inactive" } : p));
            } else if (confirmAction === "reactivate") {
                await reactivateProduct(confirmTarget);
                addToast("Producto reactivado");
                setProducts((prev) => prev.map((p) => p.id === confirmTarget ? { ...p, status: "active" } : p));
            } else if (confirmAction === "return") {
                await returnSale(confirmTarget);
                addToast("Devolución procesada");
                loadSales();
                loadProducts();
            }
        } catch (err: any) {
            addToast(err?.response?.data?.message || "Error", "error");
        } finally { setConfirmLoading(false); setConfirmOpen(false); setConfirmTarget(null); }
    };

    // Sale
    const addSaleItem = () => {
        if (!selectedProdId) return;
        const prod = products.find((p) => p.id === selectedProdId);
        if (!prod) return;
        const existing = saleItems.find((i) => i.productId === selectedProdId);
        if (existing) {
            setSaleItems((prev) => prev.map((i) => i.productId === selectedProdId ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setSaleItems((prev) => [...prev, { productId: prod.id, productName: prod.name, quantity: 1, unitPrice: prod.price }]);
        }
        setSelectedProdId("");
    };

    const removeSaleItem = (productId: string) => {
        setSaleItems((prev) => prev.filter((i) => i.productId !== productId));
    };

    const updateSaleQty = (productId: string, qty: number) => {
        if (qty < 1) return;
        setSaleItems((prev) => prev.map((i) => i.productId === productId ? { ...i, quantity: qty } : i));
    };

    const totalSale = useMemo(() => saleItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0), [saleItems]);

    const handleCreateSale = async () => {
        if (saleItems.length === 0) { addToast("Agrega al menos un producto", "error"); return; }
        if (!saleBuyerName.trim()) { addToast("Nombre del comprador requerido", "error"); return; }
        setSaleSaving(true);
        try {
            await createSale({
                items: saleItems,
                total: totalSale,
                buyerType: saleBuyerType,
                buyerId: saleBuyerId || undefined,
                buyerName: saleBuyerName,
                paymentMethod: salePayment,
            });
            addToast("Venta registrada");
            setSaleDrawer(false);
            setSaleItems([]);
            setSaleBuyerName("");
            setSaleBuyerId("");
            loadProducts();
            loadSales();
        } catch (err: any) {
            addToast(err?.response?.data?.message || "Error al registrar venta", "error");
        } finally { setSaleSaving(false); }
    };

    const openSaleDrawer = () => {
        setSaleItems([]);
        setSaleBuyerType("member");
        setSaleBuyerName("");
        setSaleBuyerId("");
        setSalePayment("cash");
        setSelectedProdId("");
        setSaleDrawer(true);
    };

    return (
        <div className="store-page" style={styles.page}>
            <PageHeader title="Tienda" action={
                <div style={{ display: "flex", gap: 8 }}>
                    <GymButton icon="ti-shopping-cart" onClick={openSaleDrawer}>Nueva venta</GymButton>
                    <GymButton icon="ti-plus" onClick={openNewProd}>Nuevo producto</GymButton>
                </div>
            } />

            <div className="store-content" style={styles.content}>
                {/* Tabs */}
                <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #E5E4E2" }}>
                    <button onClick={() => { setTab("products"); setPage(1); }}
                        style={{ ...styles.tab, borderBottom: tab === "products" ? "2px solid #1a1a1a" : "2px solid transparent", color: tab === "products" ? "#1a1a1a" : "#bbb" }}>
                        Productos
                    </button>
                    <button onClick={() => { setTab("sales"); setPage(1); }}
                        style={{ ...styles.tab, borderBottom: tab === "sales" ? "2px solid #1a1a1a" : "2px solid transparent", color: tab === "sales" ? "#1a1a1a" : "#bbb" }}>
                        Ventas
                    </button>
                </div>

                {/* Toolbar */}
                <div className="toolbar-card" style={styles.toolbarCard}>
                    <div className="toolbar-wrap" style={styles.toolbar}>
                        {tab === "products" ? (
                            <>
                                <div style={styles.searchWrap}>
                                    <i className="ti ti-search" style={styles.searchIcon} aria-hidden />
                                    <input style={styles.searchInput} placeholder="Buscar producto…" value={search}
                                        onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                                    {search && <button style={styles.clearBtn} onClick={() => { setSearch(""); setPage(1); }}><i className="ti ti-x" style={{ fontSize: 12 }} aria-hidden /></button>}
                                </div>
                                <select style={styles.filterSelect} value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setPage(1); }}>
                                    <option value="">Todas las categorías</option>
                                    {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select style={styles.filterSelect} value={stockFilter} onChange={(e) => { setStockFilter(e.target.value); setPage(1); }}>
                                    <option value="">Stock: Todos</option>
                                    <option value="available">Disponible</option>
                                    <option value="low">Stock bajo (≤5)</option>
                                    <option value="out">Agotado</option>
                                </select>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ fontSize: 11, color: "#888", whiteSpace: "nowrap" }}>Precio:</span>
                                    <input type="number" min={0} placeholder="Min" value={priceMin}
                                        onChange={(e) => { setPriceMin(e.target.value); setPage(1); }}
                                        style={{ ...styles.filterInput, width: 65 }} />
                                    <span style={{ fontSize: 11, color: "#ccc" }}>—</span>
                                    <input type="number" min={0} placeholder="Max" value={priceMax}
                                        onChange={(e) => { setPriceMax(e.target.value); setPage(1); }}
                                        style={{ ...styles.filterInput, width: 65 }} />
                                </div>
                            </>
                        ) : (
                            <span style={{ fontSize: 13, color: "#888" }}>{total} venta(s) registradas</span>
                        )}
                    </div>
                </div>

                {/* Low stock notification banner */}
                {tab === "products" && products.filter((p) => p.status === "active" && p.stock > 0 && p.stock <= 5).length > 0 && (
                    <div style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
                        background: "#FFF8E1", border: "1px solid #FFE082", borderRadius: 8,
                        fontSize: 12, color: "#795548"
                    }}>
                        <i className="ti ti-alert-triangle" style={{ fontSize: 14, color: "#FFA000" }} aria-hidden />
                        <span>
                            <strong>Stock faltante: </strong>
                            {products.filter((p) => p.status === "active" && p.stock > 0 && p.stock <= 5).length} producto(s) por agotarse
                        </span>
                    </div>
                )}

                {tab === "products" ? (
                    <>
                        {loading ? (
                            <div style={{ padding: "20px 14px" }}><LoadingSkeleton rows={5} /></div>
                        ) : error ? (
                            <div style={{ textAlign: "center", padding: 40 }}>
                                <p style={{ fontSize: 13, color: "#c0392b", marginBottom: 12 }}>Error al cargar datos.</p>
                                <button onClick={() => { setError(false); setLoading(true); loadProducts().finally(() => setLoading(false)); }}
                                    style={{ background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                                    Reintentar
                                </button>
                            </div>
                        ) : paginated.length === 0 ? (
                            <p style={styles.empty}>{search || catFilter || priceMin || priceMax ? "No hay productos con esos filtros." : "No hay productos registrados."}</p>
                        ) : (
                            <div className="product-grid">
                                {paginated.map((p) => {
                                    const inactive = p.status !== "active";
                                    const lowStock = p.stock <= 5 && !inactive;
                                    return (
                                        <div key={p.id} className={`product-card ${inactive ? "product-card-inactive" : ""}`}>
                                            <div className="product-card-img">
                                                {p.image ? (
                                                    <img src={p.image} alt={p.name} style={inactive ? { filter: "grayscale(1)", opacity: 0.5 } : undefined} />
                                                ) : (
                                                    <div className="product-card-placeholder">
                                                        <i className="ti ti-photo" style={{ fontSize: 32, color: "#ddd" }} />
                                                    </div>
                                                )}
                                                {inactive ? (
                                                    <span className="product-card-badge badge-inactive">Inactivo</span>
                                                ) : lowStock ? (
                                                    <span className="product-card-badge badge-low">{p.stock} uds.</span>
                                                ) : (
                                                    <span className="product-card-badge badge-ok">{p.stock} disp.</span>
                                                )}
                                            </div>
                                            <div className="product-card-body">
                                                <span className="product-card-category">{p.category}</span>
                                                <h3 className="product-card-name">{p.name}</h3>
                                                <p className="product-card-price">${p.price.toFixed(2)}</p>
                                                <div className="product-card-actions">
                                                    <button className="btn-icon-action" style={styles.btnIconAction} title="Ver detalle" onClick={() => setViewProduct(p)}>
                                                        <i className="ti ti-eye" style={{ fontSize: 14 }} aria-hidden />
                                                    </button>
                                                    {inactive ? (
                                                        <button className="btn-icon-action" title="Reactivar" style={{ ...styles.btnIconAction, color: "#3a7d44" }}
                                                            onClick={() => requestReactivate(p.id)}>
                                                            <i className="ti ti-refresh" style={{ fontSize: 14 }} aria-hidden />
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button className="btn-icon-action" style={styles.btnIconAction} title="Editar" onClick={() => openEditProd(p)}>
                                                                <i className="ti ti-pencil" style={{ fontSize: 14 }} aria-hidden />
                                                            </button>
                                                            <button className="btn-icon-action" title="Desactivar" style={{ ...styles.btnIconAction, color: "#c0392b" }}
                                                                onClick={() => requestDeactivate(p.id)}>
                                                                <i className="ti ti-circle-off" style={{ fontSize: 14 }} aria-hidden />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {!loading && !error && (
                            <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onChange={setPage} />
                        )}
                    </>
                ) : (
                    <>
                        {salesLoading ? (
                            <div style={{ padding: "20px 14px" }}><LoadingSkeleton rows={5} /></div>
                        ) : sales.length === 0 ? (
                            <p style={styles.empty}>No hay ventas registradas.</p>
                        ) : (
                            <div style={{ ...styles.card, padding: 0 }}>
                                <table style={styles.table}>
                                    <thead><tr style={styles.thead}>
                                        <th style={{ ...styles.th, paddingLeft: 16 }}>Fecha</th>
                                        <th style={styles.th}>Comprador</th>
                                        <th style={styles.th}>Items</th>
                                        <th style={styles.th}>Total</th>
                                        <th style={styles.th}>Pago</th>
                                        <th style={styles.th}>Estado</th>
                                        <th style={styles.th}>Acciones</th>
                                    </tr></thead>
                                    <tbody>{sales.map((s) => {
                                        const returned = s.status === "returned";
                                        return (
                                            <tr key={s.id} style={styles.row}>
                                                <td style={{ ...styles.td, paddingLeft: 16, ...styles.muted, whiteSpace: "nowrap" }}>
                                                    {new Date(s.createdAt).toLocaleDateString()}
                                                </td>
                                                <td style={styles.td}>{s.buyerName}</td>
                                                <td style={{ ...styles.td, ...styles.muted }}>{s.items.map((i) => i.productName).join(", ")}</td>
                                                <td style={styles.td}>${s.total}</td>
                                                <td style={{ ...styles.td, ...styles.muted }}>{PAYMENT_LABEL[s.paymentMethod] ?? s.paymentMethod}</td>
                                                <td style={styles.td}>
                                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 500,
                                                        background: returned ? "#F5F5F4" : "#F0F7F1", color: returned ? "#999" : "#3a7d44" }}>
                                                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: returned ? "#ccc" : "#3a7d44" }} />
                                                        {returned ? "Devuelta" : "Completada"}
                                                    </span>
                                                </td>
                                                <td style={styles.td}>
                                                    {!returned && (
                                                        <button className="btn-icon-action" title="Devolver" style={{ ...styles.btnIconAction, color: "#c0392b" }}
                                                            onClick={() => requestReturn(s.id)}>
                                                            <i className="ti ti-receipt-refund" style={{ fontSize: 14 }} aria-hidden />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}</tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Product drawer */}
            {prodDrawer && <div style={styles.overlay} onClick={() => setProdDrawer(false)}>
                <div style={styles.drawer} onClick={(e) => e.stopPropagation()}>
                    <div style={styles.drawerHeader}>
                        <p style={styles.drawerTitle}>{editingProd ? "Editar producto" : "Nuevo producto"}</p>
                        <button style={styles.closeBtn} onClick={() => setProdDrawer(false)}><i className="ti ti-x" /></button>
                    </div>
                    <div style={styles.drawerBody}>
                        <label style={styles.label}>Nombre</label>
                        <input style={styles.input} value={prodForm.name} onChange={(e) => setProdForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ej: Proteína whey" />

                        <label style={{ ...styles.label, marginTop: 12 }}>Descripción</label>
                        <textarea style={styles.input} rows={2} value={prodForm.description} onChange={(e) => setProdForm((p) => ({ ...p, description: e.target.value }))} />

                        <label style={{ ...styles.label, marginTop: 12 }}>Precio</label>
                        <input type="number" min={0} style={styles.input} value={prodForm.price} onChange={(e) => setProdForm((p) => ({ ...p, price: Number(e.target.value) }))} />

                        <label style={{ ...styles.label, marginTop: 12 }}>Stock inicial</label>
                        <input type="number" min={0} style={styles.input} value={prodForm.stock} onChange={(e) => setProdForm((p) => ({ ...p, stock: Number(e.target.value) }))} />

                        <label style={{ ...styles.label, marginTop: 12 }}>Categoría</label>
                        <input style={styles.input} value={prodForm.category} onChange={(e) => setProdForm((p) => ({ ...p, category: e.target.value }))} list="cat-list" placeholder="Ej: Proteínas" />
                        <datalist id="cat-list">
                            {allCategories.map((c) => <option key={c} value={c} />)}
                        </datalist>

                        <label style={{ ...styles.label, marginTop: 12 }}>Imagen</label>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <button type="button" style={styles.imageBtn} onClick={() => prodImageRef.current?.click()}>
                                <i className="ti ti-upload" style={{ fontSize: 14 }} aria-hidden /> Subir imagen
                            </button>
                            <input ref={prodImageRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }}
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setProdImageFile(file);
                                        setProdImagePreview(URL.createObjectURL(file));
                                    }
                                }} />
                            {prodImagePreview && (
                                <div style={{ position: "relative", display: "inline-block" }}>
                                    <img src={prodImagePreview} alt="preview" style={{ width: 48, height: 48, borderRadius: 6, objectFit: "cover", border: "1px solid #E5E4E2" }} />
                                    <button type="button" style={{ position: "absolute", top: -6, right: -6, background: "#c0392b", color: "#fff", border: "none", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}
                                        onClick={() => { setProdImageFile(null); setProdImagePreview(null); }}>
                                        <i className="ti ti-x" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div style={styles.drawerFooter}>
                        <button style={styles.cancelBtn} onClick={() => setProdDrawer(false)}>Cancelar</button>
                        <button style={styles.saveBtn} onClick={handleSaveProd} disabled={prodSaving}>
                            {prodSaving ? "Guardando..." : "Guardar"}
                        </button>
                    </div>
                </div>
            </div>}

            {/* Sale drawer */}
            {saleDrawer && <div style={styles.overlay} onClick={() => setSaleDrawer(false)}>
                <div style={{ ...styles.drawer, width: 480 }} onClick={(e) => e.stopPropagation()}>
                    <div style={styles.drawerHeader}>
                        <p style={styles.drawerTitle}>Nueva venta</p>
                        <button style={styles.closeBtn} onClick={() => setSaleDrawer(false)}><i className="ti ti-x" /></button>
                    </div>
                    <div style={styles.drawerBody}>
                        {/* Add product */}
                        <label style={styles.label}>Agregar producto</label>
                        <div style={{ display: "flex", gap: 6 }}>
                            <select style={{ ...styles.input, flex: 1 }} value={selectedProdId} onChange={(e) => setSelectedProdId(e.target.value)}>
                                <option value="">Seleccionar…</option>
                                {products.filter((p) => p.status === "active" && p.stock > 0).map((p) => (
                                    <option key={p.id} value={p.id}>{p.name} — ${p.price} ({p.stock} disp.)</option>
                                ))}
                            </select>
                            <button style={styles.addBtn} onClick={addSaleItem}><i className="ti ti-plus" style={{ fontSize: 14 }} aria-hidden /></button>
                        </div>

                        {/* Items list */}
                        {saleItems.length > 0 && (
                            <div style={{ marginTop: 12 }}>
                                {saleItems.map((item) => (
                                    <div key={item.productId} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #F0F0EE" }}>
                                        <span style={{ flex: 1, fontSize: 13 }}>{item.productName}</span>
                                        <input type="number" min={1} style={{ width: 50, padding: "4px 6px", borderRadius: 4, border: "1px solid #E5E4E2", fontSize: 12, textAlign: "center" }}
                                            value={item.quantity} onChange={(e) => updateSaleQty(item.productId, Number(e.target.value))} />
                                        <span style={{ fontSize: 12, color: "#888", width: 60, textAlign: "right" }}>${(item.quantity * item.unitPrice).toFixed(2)}</span>
                                        <button style={{ ...styles.closeBtn, fontSize: 14 }} onClick={() => removeSaleItem(item.productId)}><i className="ti ti-x" /></button>
                                    </div>
                                ))}
                                <div style={{ textAlign: "right", fontSize: 15, fontWeight: 600, marginTop: 8 }}>Total: ${totalSale.toFixed(2)}</div>
                            </div>
                        )}

                        {/* Buyer */}
                        <label style={{ ...styles.label, marginTop: 12 }}>Tipo de comprador</label>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => setSaleBuyerType("member")}
                                style={{ ...styles.tabBtn, background: saleBuyerType === "member" ? "#1a1a1a" : "#F7F7F6", color: saleBuyerType === "member" ? "#fff" : "#555" }}>
                                Miembro
                            </button>
                            <button onClick={() => setSaleBuyerType("staff")}
                                style={{ ...styles.tabBtn, background: saleBuyerType === "staff" ? "#1a1a1a" : "#F7F7F6", color: saleBuyerType === "staff" ? "#fff" : "#555" }}>
                                Staff
                            </button>
                        </div>

                        {saleBuyerType === "member" ? (
                            <>
                                <label style={{ ...styles.label, marginTop: 8 }}>Miembro</label>
                                <select style={styles.input} value={saleBuyerId} onChange={(e) => {
                                    const val = e.target.value;
                                    setSaleBuyerId(val);
                                    const m = members.find((m) => m.id === val);
                                    if (m) setSaleBuyerName(m.fullName);
                                }}>
                                    <option value="">Seleccionar miembro…</option>
                                    {members.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                                </select>
                            </>
                        ) : (
                            <>
                                <label style={{ ...styles.label, marginTop: 8 }}>Staff</label>
                                <select style={styles.input} value={saleBuyerId} onChange={(e) => {
                                    const val = e.target.value;
                                    setSaleBuyerId(val);
                                    const u = staffUsers.find((u) => u.id === val);
                                    if (u) setSaleBuyerName(u.fullName);
                                }}>
                                    <option value="">Seleccionar staff…</option>
                                    {staffUsers.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                                </select>
                            </>
                        )}

                        <label style={{ ...styles.label, marginTop: 8 }}>Nombre del comprador</label>
                        <input style={styles.input} value={saleBuyerName} onChange={(e) => setSaleBuyerName(e.target.value)} placeholder="Nombre" />

                        {/* Payment */}
                        <label style={{ ...styles.label, marginTop: 12 }}>Método de pago</label>
                        <select style={styles.input} value={salePayment} onChange={(e) => setSalePayment(e.target.value)}>
                            {PAYMENT_OPTIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                    </div>
                    <div style={styles.drawerFooter}>
                        <button style={styles.cancelBtn} onClick={() => setSaleDrawer(false)}>Cancelar</button>
                        <button style={{ ...styles.saveBtn, background: "#D4AF37" }} onClick={handleCreateSale} disabled={saleSaving}>
                            {saleSaving ? "Registrando..." : `Cobrar $${totalSale.toFixed(2)}`}
                        </button>
                    </div>
                </div>
            </div>}

            <ConfirmModal open={confirmOpen} title={
                    confirmAction === "deactivate" ? "Desactivar producto" :
                    confirmAction === "reactivate" ? "Reactivar producto" :
                    "Devolver venta"
                }
                body={
                    confirmAction === "deactivate" ? "¿Desactivar este producto? No estará disponible para la venta." :
                    confirmAction === "reactivate" ? "¿Reactivar este producto?" :
                    "¿Procesar la devolución? Se restaurará el stock."
                }
                confirmLabel={
                    confirmAction === "deactivate" ? "Desactivar" :
                    confirmAction === "reactivate" ? "Reactivar" : "Devolver"
                }
                confirmColor={confirmAction === "return" ? "#c0392b" : undefined}
                loading={confirmLoading} onConfirm={handleConfirm}
                onCancel={() => { setConfirmOpen(false); setConfirmTarget(null); }} />

            {/* View product detail */}
            {viewProduct && <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setViewProduct(null)}>
                <div style={{ background: "#fff", borderRadius: 12, width: 420, maxWidth: "90vw", maxHeight: "85vh", overflow: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ position: "relative" }}>
                        {viewProduct.image ? (
                            <img src={viewProduct.image} alt={viewProduct.name} style={{ width: "100%", maxHeight: 300, objectFit: "contain", background: "#FAFAFA", padding: 16, boxSizing: "border-box" }} />
                        ) : (
                            <div style={{ width: "100%", height: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "#F7F7F6" }}>
                                <i className="ti ti-photo" style={{ fontSize: 48, color: "#ddd" }} />
                            </div>
                        )}
                        <button onClick={() => setViewProduct(null)} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.4)", color: "#fff", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                            <i className="ti ti-x" />
                        </button>
                    </div>
                    <div style={{ padding: "16px 20px 20px" }}>
                        <span style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>{viewProduct.category}</span>
                        <h2 style={{ fontSize: 17, fontWeight: 600, color: "#1a1a1a", margin: "4px 0 2px" }}>{viewProduct.name}</h2>
                        <p style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a", margin: "4px 0 8px" }}>${viewProduct.price.toFixed(2)}</p>
                        {viewProduct.description && <p style={{ fontSize: 12, color: "#888", margin: "0 0 10px", lineHeight: 1.4 }}>{viewProduct.description}</p>}
                        <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#555" }}>
                            <span><strong>Stock:</strong> {viewProduct.stock} uds.</span>
                            <span><strong>Estado:</strong> {viewProduct.status === "active" ? "Activo" : "Inactivo"}</span>
                        </div>
                    </div>
                </div>
            </div>}

            <style>{`
                .product-grid {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 12px;
                }
                .product-card {
                    background: #fff;
                    border: 1px solid #E5E4E2;
                    border-top: 2px solid #D4AF37;
                    border-radius: 8px;
                    overflow: hidden;
                    transition: box-shadow 0.2s, transform 0.2s;
                }
                .product-card:hover {
                    box-shadow: 0 3px 12px rgba(0,0,0,0.08);
                    transform: translateY(-1px);
                }
                .product-card-inactive {
                    opacity: 0.6;
                    border-top-color: #ccc;
                }
                .product-card-inactive:hover {
                    opacity: 0.8;
                }
                .product-card-img {
                    position: relative;
                    width: 100%;
                    height: 120px;
                    padding: 10px;
                    background: #FAFAFA;
                    overflow: hidden;
                    box-sizing: border-box;
                }
                .product-card-img img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }
                .product-card-placeholder {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #F7F7F6;
                }
                .product-card-badge {
                    position: absolute;
                    bottom: 6px;
                    left: 6px;
                    padding: 1px 7px;
                    border-radius: 20px;
                    font-size: 9px;
                    font-weight: 600;
                    color: #fff;
                }
                .badge-ok { background: #3a7d44; }
                .badge-low { background: #c0392b; }
                .badge-inactive { background: #888; }
                .product-card-body {
                    padding: 6px 8px 8px;
                    display: flex;
                    flex-direction: column;
                    gap: 1px;
                }
                .product-card-category {
                    font-size: 8px;
                    color: #888;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .product-card-name {
                    font-size: 11px;
                    font-weight: 600;
                    color: #1a1a1a;
                    margin: 0;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .product-card-price {
                    font-size: 13px;
                    font-weight: 700;
                    color: #1a1a1a;
                    margin: 0;
                }
                .product-card-actions {
                    display: flex;
                    gap: 2px;
                    margin-top: 2px;
                    opacity: 0.4;
                    transition: opacity 0.15s;
                }
                .product-card:hover .product-card-actions {
                    opacity: 1;
                }
                .btn-icon-action:hover {
                    background: #F0F0EE !important;
                    border-color: #E5E4E2 !important;
                    color: #1a1a1a !important;
                }
                @media (max-width: 1100px) {
                    .product-grid { grid-template-columns: repeat(4, 1fr); }
                }
                @media (max-width: 800px) {
                    .product-grid { grid-template-columns: repeat(2, 1fr); }
                }
                @media (max-width: 900px) {
                    .product-grid { grid-template-columns: repeat(2, 1fr); }
                    .store-page > div:first-child { padding: 14px 20px 12px !important; }
                    .toolbar-wrap { flex-direction: column !important; align-items: stretch !important; gap: 6px !important; }
                    .toolbar-wrap .search-wrap { flex: none !important; width: 100% !important; }
                    .filter-group { width: 100% !important; }
                    .toolbar-card { padding: 8px 10px !important; }
                    .store-content { padding: 6px 14px 20px !important; gap: 6px !important; }
                }
                @media (max-width: 600px) {
                    .product-grid { grid-template-columns: 1fr; }
                    .store-page > div:first-child { padding: 10px 14px 8px !important; }
                    .filter-group { flex-direction: column !important; }
                    .filter-group > * { width: 100% !important; }
                    .toolbar-card { padding: 6px 8px !important; }
                    .store-content { padding: 4px 10px 16px !important; gap: 4px !important; }
                }
                @media (max-width: 480px) {
                    .store-page > div:first-child { padding: 8px 10px 6px !important; }
                    .store-content { padding: 4px 6px 12px !important; gap: 4px !important; }
                }
            `}</style>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    page: { display: "flex", flexDirection: "column", minHeight: "100%", position: "relative" },
    content: { padding: "16px 28px 28px", display: "flex", flexDirection: "column", gap: 10 },
    tab: { padding: "10px 20px", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", background: "none", border: "none", transition: "color 0.12s" },
    toolbarCard: { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, padding: "12px 16px", borderTop: "2px solid #D4AF37" },
    toolbar: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const },
    searchWrap: { position: "relative", flex: "1 1 160px", maxWidth: 500 } as React.CSSProperties,
    searchIcon: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "#bbb", pointerEvents: "none" as const },
    searchInput: { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 7, padding: "7px 26px 7px 30px", fontSize: 13, color: "#1a1a1a", outline: "none", width: "100%", fontFamily: "inherit", boxSizing: "border-box" as const },
    clearBtn: { position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#bbb", padding: 4, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" },
    filterSelect: { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 7, padding: "7px 24px 7px 10px", fontSize: 13, color: "#1a1a1a", outline: "none", fontFamily: "inherit", cursor: "pointer", appearance: "none" as const, backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23bbb'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", minWidth: 130 },
    filterInput: { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 7, padding: "7px 8px", fontSize: 12, color: "#1a1a1a", outline: "none", fontFamily: "inherit", textAlign: "center" as const },
    card: { background: "#fff", border: "1px solid #E5E4E2", borderTop: "2px solid #D4AF37", borderRadius: 8, overflow: "hidden" },
    table: { width: "100%", borderCollapse: "collapse" },
    thead: { borderBottom: "1px solid #E5E4E2", background: "#FAFAFA" },
    th: { padding: "12px 14px", fontSize: 11, fontWeight: 500, color: "#bbb", textAlign: "left" as const, whiteSpace: "nowrap" as const },
    row: { borderBottom: "1px solid #F0F0EE" },
    td: { padding: "12px 14px", fontSize: 13, color: "#1a1a1a", verticalAlign: "middle" as const },
    muted: { color: "#888", fontSize: 12 },
    empty: { fontSize: 13, color: "#bbb", padding: "40px 0", textAlign: "center" as const },
    btnIconAction: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, background: "none", color: "#888", border: "1px solid transparent", borderRadius: 6, cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit" },
    overlay: { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" },
    drawer: { background: "#fff", borderRadius: 12, width: 420, maxHeight: "85vh", overflowY: "auto" as const, boxShadow: "0 8px 32px rgba(0,0,0,0.14)", padding: 0 },
    drawerHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "22px 24px 18px", borderBottom: "1px solid #F0F0EE" },
    drawerTitle: { fontSize: 15, fontWeight: 600, color: "#1a1a1a", margin: 0 },
    closeBtn: { background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 18, padding: 0 },
    drawerBody: { padding: "20px 24px" },
    drawerFooter: { display: "flex", gap: 8, justifyContent: "flex-end", padding: "14px 24px", borderTop: "1px solid #F0F0EE" },
    label: { display: "block", fontSize: 11, fontWeight: 500, color: "#555", margin: "0 0 4px" },
    input: { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 7, padding: "8px 11px", fontSize: 13, color: "#1a1a1a", outline: "none", width: "100%", fontFamily: "inherit", boxSizing: "border-box" as const },
    cancelBtn: { background: "none", color: "#555", border: "1px solid #E5E4E2", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" },
    saveBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", minWidth: 110 },
    addBtn: { background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 7, width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
    tabBtn: { padding: "6px 14px", borderRadius: 20, border: "1px solid #E5E4E2", fontSize: 12, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", transition: "background 0.12s" },
    imageBtn: { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 7, background: "#F7F7F6", border: "1px solid #E5E4E2", fontSize: 12, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", color: "#555", transition: "background 0.12s" },
};
