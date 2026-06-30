import { useEffect, useState, useMemo, useRef } from "react";
import { getProducts, createProduct, updateProduct, deactivateProduct, reactivateProduct, getCategories, uploadProductImage, deleteProductImageByIndex, toggleProductFeatured, type Product } from "../services/product.service";
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

const emptyProduct = { name: "", description: "", price: 0, stock: 0, category: "", featured: false, originalPrice: 0, salePrice: 0, saleEndDate: "" };

function exportCSV(products: Product[]) {
    const headers = ["Nombre", "Categoría", "Precio", "Precio oferta", "Stock", "Estado", "Destacado"];
    const rows = products.map((p) => [
        `"${p.name}"`,
        `"${p.category}"`,
        p.price.toFixed(2),
        p.salePrice ? p.salePrice.toFixed(2) : "",
        p.stock,
        p.status === "active" ? "Activo" : "Inactivo",
        p.featured ? "Sí" : "No",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventario-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

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
    const [sortBy, setSortBy] = useState("name");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    // Inline stock editing
    const [editingStockId, setEditingStockId] = useState<string | null>(null);
    const [editingStockVal, setEditingStockVal] = useState(0);

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
    const [saleBuyerType, setSaleBuyerType] = useState<"member" | "staff" | "other">("member");
    const [saleBuyerName, setSaleBuyerName] = useState("");
    const [saleBuyerId, setSaleBuyerId] = useState("");
    const [saleBuyerEmail, setSaleBuyerEmail] = useState("");
    const [sendTicketEmail, setSendTicketEmail] = useState(true);
    const [salePayment, setSalePayment] = useState("cash");
    const [saleSaving, setSaleSaving] = useState(false);
    const [members, setMembers] = useState<{ id: string; fullName: string; email?: string }[]>([]);
    const [staffUsers, setStaffUsers] = useState<{ id: string; fullName: string; email?: string }[]>([]);
    const [selectedProdId, setSelectedProdId] = useState("");
    const [saleMemberSearch, setSaleMemberSearch] = useState("");

    // Sales filters
    const [saleSearch, setSaleSearch] = useState("");
    const [salePayFilter, setSalePayFilter] = useState("");
    const [saleStatusFilter, setSaleStatusFilter] = useState("");
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
                getMembers(1, 200).then((r) => setMembers(r.data?.items ?? [])).catch(() => {}),
                getUsers().then((r) => setStaffUsers((r.data ?? []).map((u: any) => ({ id: u.id, fullName: `${u.firstName} ${u.lastName}`, email: u.email })))).catch(() => {}),
            ]);
        }
    }, [saleDrawer]);

    // Filtered + sorted products
    const filtered = useMemo(() => {
        let result = products.filter((p) => {
            if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
            if (catFilter && p.category !== catFilter) return false;
            if (priceMin && p.price < Number(priceMin)) return false;
            if (priceMax && p.price > Number(priceMax)) return false;
            if (stockFilter === "low" && (p.stock > 5 || p.status !== "active")) return false;
            if (stockFilter === "out" && (p.stock > 0 || p.status !== "active")) return false;
            if (stockFilter === "available" && (p.stock === 0 || p.status !== "active")) return false;
            return true;
        });
        result.sort((a, b) => {
            const aFeatured = a.featured ? 0 : 1;
            const bFeatured = b.featured ? 0 : 1;
            if (aFeatured !== bFeatured) return aFeatured - bFeatured;
            if (sortBy === "price") return a.price - b.price;
            if (sortBy === "price-desc") return b.price - a.price;
            if (sortBy === "stock") return a.stock - b.stock;
            if (sortBy === "stock-desc") return b.stock - a.stock;
            if (sortBy === "created") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            return a.name.localeCompare(b.name);
        });
        return result;
    }, [products, search, catFilter, priceMin, priceMax, stockFilter, sortBy]);

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
        const map = new Map<string, number>();
        products.forEach((p) => map.set(p.category, (map.get(p.category) ?? 0) + 1));
        return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [products]);

    const filteredSales = useMemo(() => {
        return sales.filter((s) => {
            if (saleSearch && !s.buyerName.toLowerCase().includes(saleSearch.toLowerCase())) return false;
            if (salePayFilter && s.paymentMethod !== salePayFilter) return false;
            if (saleStatusFilter === "completed" && s.status !== "completed") return false;
            if (saleStatusFilter === "returned" && s.status !== "returned") return false;
            return true;
        });
    }, [sales, saleSearch, salePayFilter, saleStatusFilter]);

    // Product CRUD
    const openNewProd = () => { setEditingProd(null); setProdForm(emptyProduct); setProdImageFile(null); setProdImagePreview(null); setProdDrawer(true); };
    const openEditProd = (p: Product) => {
        setEditingProd(p.id);
        setProdForm({
            name: p.name,
            description: p.description ?? "",
            price: p.price,
            stock: p.stock,
            category: p.category,
            featured: p.featured ?? false,
            originalPrice: p.originalPrice ?? 0,
            salePrice: p.salePrice ?? 0,
            saleEndDate: p.saleEndDate ? new Date(p.saleEndDate).toISOString().slice(0, 10) : "",
        });
        setProdImageFile(null);
        setProdImagePreview(p.image ?? null);
        setProdDrawer(true);
    };

    const handleSaveProd = async () => {
        if (!prodForm.name.trim() || !prodForm.category.trim()) return;
        setProdSaving(true);
        try {
            const payload: any = {
                name: prodForm.name,
                description: prodForm.description || undefined,
                price: prodForm.price,
                stock: prodForm.stock,
                category: prodForm.category,
                featured: prodForm.featured,
            };
            if (prodForm.originalPrice > 0) payload.originalPrice = prodForm.originalPrice;
            if (prodForm.salePrice > 0) payload.salePrice = prodForm.salePrice;
            if (prodForm.saleEndDate) payload.saleEndDate = new Date(prodForm.saleEndDate).toISOString();

            let productId = editingProd;
            if (editingProd) {
                await updateProduct(editingProd, payload);
                addToast("Producto actualizado");
            } else {
                const res = await createProduct(payload);
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

    const handleQuickStockSave = async (productId: string) => {
        try {
            await updateProduct(productId, { stock: editingStockVal });
            setProducts((prev) => prev.map((p) => p.id === productId ? { ...p, stock: editingStockVal } : p));
            setEditingStockId(null);
            addToast("Stock actualizado");
        } catch (err: any) {
            addToast(err?.response?.data?.message || "Error", "error");
        }
    };

    const handleToggleFeatured = async (id: string) => {
        try {
            const res = await toggleProductFeatured(id);
            setProducts((prev) => prev.map((p) => p.id === id ? { ...p, featured: res.data.featured } : p));
            addToast(res.data.featured ? "Producto destacado" : "Producto no destacado");
        } catch (err: any) {
            addToast(err?.response?.data?.message || "Error", "error");
        }
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
                buyerEmail: sendTicketEmail && saleBuyerEmail ? saleBuyerEmail : undefined,
                paymentMethod: salePayment,
            });
            addToast("Venta registrada");
            setSaleDrawer(false);
            setSaleItems([]);
            setSaleBuyerName("");
            setSaleBuyerId("");
            setSaleBuyerEmail("");
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
        setSaleBuyerEmail("");
        setSendTicketEmail(true);
        setSalePayment("cash");
        setSelectedProdId("");
        setSaleMemberSearch("");
        setSaleDrawer(true);
    };

    const printSaleTicket = (s: Sale) => {
        const itemsLines = s.items.map((i) =>
            `<tr><td>${i.productName}</td><td>${i.quantity}</td><td>$${i.unitPrice.toFixed(2)}</td><td>$${(i.quantity * i.unitPrice).toFixed(2)}</td></tr>`
        ).join("");
        const win = window.open("", "_blank");
        if (!win) return;
        win.document.write(`
            <html><head><title>Ticket - ZenithGym</title>
            <style>
                body { font-family: 'Courier New', monospace; font-size: 12px; width: 300px; margin: 0 auto; padding: 16px; }
                h2 { text-align: center; margin: 0 0 4px; font-size: 16px; }
                .header { text-align: center; font-size: 11px; color: #555; margin-bottom: 12px; }
                table { width: 100%; border-collapse: collapse; margin: 8px 0; }
                th, td { padding: 4px 2px; text-align: left; border-bottom: 1px solid #ddd; font-size: 11px; }
                th { font-size: 10px; color: #888; }
                .total { font-weight: bold; font-size: 14px; text-align: right; margin: 8px 0; }
                .footer { text-align: center; font-size: 10px; color: #888; margin-top: 12px; border-top: 1px dashed #ccc; padding-top: 8px; }
                .label { color: #888; font-size: 10px; }
            </style></head><body>
            <h2>ZenithGym</h2>
            <div class="header">Ticket de compra<br/>${new Date(s.createdAt).toLocaleString("es-ES")}</div>
            <p><span class="label">Comprador:</span> ${s.buyerName}</p>
            <table><thead><tr><th>Producto</th><th>Cant</th><th>P/U</th><th>Subtotal</th></tr></thead>
            <tbody>${itemsLines}</tbody></table>
            <div class="total">Total: $${s.total.toFixed(2)}</div>
            <p><span class="label">Pago:</span> ${PAYMENT_LABEL[s.paymentMethod] ?? s.paymentMethod}</p>
            <div class="footer">Gracias por tu compra</div>
            </body></html>
        `);
        win.document.close();
        setTimeout(() => { win.focus(); win.print(); }, 300);
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
                                    {allCategories.map(([cat, count]) => <option key={cat} value={cat}>{cat} ({count})</option>)}
                                </select>
                                <select style={styles.filterSelect} value={stockFilter} onChange={(e) => { setStockFilter(e.target.value); setPage(1); }}>
                                    <option value="">Stock: Todos</option>
                                    <option value="available">Disponible</option>
                                    <option value="low">Stock bajo (≤5)</option>
                                    <option value="out">Agotado</option>
                                </select>
                                <select style={styles.filterSelect} value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }}>
                                    <option value="name">Nombre A-Z</option>
                                    <option value="price">Precio: menor</option>
                                    <option value="price-desc">Precio: mayor</option>
                                    <option value="stock">Stock: menor</option>
                                    <option value="stock-desc">Stock: mayor</option>
                                    <option value="created">Más recientes</option>
                                </select>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ fontSize: 11, color: "#888", whiteSpace: "nowrap" }}>Precio:</span>
                                    <input type="number" min={0} placeholder="Min" value={priceMin}
                                        onChange={(e) => { setPriceMin(e.target.value); setPage(1); }}
                                        style={{ ...styles.filterInput, width: 60 }} />
                                    <span style={{ fontSize: 11, color: "#ccc" }}>—</span>
                                    <input type="number" min={0} placeholder="Max" value={priceMax}
                                        onChange={(e) => { setPriceMax(e.target.value); setPage(1); }}
                                        style={{ ...styles.filterInput, width: 60 }} />
                                </div>
                                <div style={{ display: "flex", gap: 2, marginLeft: "auto" }}>
                                    <button onClick={() => exportCSV(filtered)} title="Exportar CSV"
                                        style={{ ...styles.viewToggleBtn, color: "#3a7d44" }}>
                                        <i className="ti ti-file-spreadsheet" style={{ fontSize: 14 }} aria-hidden />
                                    </button>
                                    <button onClick={() => setViewMode("grid")} title="Vista cuadrícula"
                                        style={{ ...styles.viewToggleBtn, background: viewMode === "grid" ? "#1a1a1a" : "transparent", color: viewMode === "grid" ? "#fff" : "#888" }}>
                                        <i className="ti ti-layout-grid" style={{ fontSize: 14 }} aria-hidden />
                                    </button>
                                    <button onClick={() => setViewMode("list")} title="Vista lista"
                                        style={{ ...styles.viewToggleBtn, background: viewMode === "list" ? "#1a1a1a" : "transparent", color: viewMode === "list" ? "#fff" : "#888" }}>
                                        <i className="ti ti-list" style={{ fontSize: 14 }} aria-hidden />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={styles.searchWrap}>
                                    <i className="ti ti-search" style={styles.searchIcon} aria-hidden />
                                    <input style={styles.searchInput} placeholder="Buscar por comprador…" value={saleSearch}
                                        onChange={(e) => setSaleSearch(e.target.value)} />
                                    {saleSearch && <button style={styles.clearBtn} onClick={() => setSaleSearch("")}><i className="ti ti-x" style={{ fontSize: 12 }} aria-hidden /></button>}
                                </div>
                                <select style={styles.filterSelect} value={salePayFilter} onChange={(e) => setSalePayFilter(e.target.value)}>
                                    <option value="">Todos los pagos</option>
                                    {PAYMENT_OPTIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                                <select style={styles.filterSelect} value={saleStatusFilter} onChange={(e) => setSaleStatusFilter(e.target.value)}>
                                    <option value="">Todos los estados</option>
                                    <option value="completed">Completadas</option>
                                    <option value="returned">Devueltas</option>
                                </select>
                            </>
                        )}
                    </div>
                </div>

                {/* Low stock notification banners */}
                {tab === "products" && (
                    <>
                        {products.filter((p) => p.status === "active" && p.stock > 0 && p.stock <= 5).length > 0 && (
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
                        {products.filter((p) => p.status === "active" && p.stock === 0).length > 0 && (
                            <div style={{
                                display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
                                background: "#FFEBEE", border: "1px solid #EF9A9A", borderRadius: 8,
                                fontSize: 12, color: "#c0392b"
                            }}>
                                <i className="ti ti-alert-circle" style={{ fontSize: 14, color: "#E53935" }} aria-hidden />
                                <span>
                                    <strong>Stock crítico: </strong>
                                    {products.filter((p) => p.status === "active" && p.stock === 0).length} producto(s) agotados
                                </span>
                            </div>
                        )}
                    </>
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
                        ) : viewMode === "list" ? (
                            <div style={{ ...styles.card, padding: 0 }}>
                                <div className="table-scroll">
                                <table style={styles.table}>
                                    <thead><tr style={styles.thead}>
                                        <th style={{ ...styles.th, paddingLeft: 16 }}>Producto</th>
                                        <th style={styles.th}>Categoría</th>
                                        <th style={styles.th}>Precio</th>
                                        <th style={styles.th}>Stock</th>
                                        <th style={styles.th}>Estado</th>
                                        <th style={{ ...styles.th, textAlign: "left" }}>Acciones</th>
                                    </tr></thead>
                                    <tbody>{paginated.map((p) => {
                                        const inactive = p.status !== "active";
                                        const lowStock = p.stock <= 5 && !inactive;
                                        return (
                                            <tr key={p.id} style={styles.row} className="store-row">
                                                <td style={{ ...styles.td, paddingLeft: 16, fontWeight: 500, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                                    title={p.description || p.name}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                                                        {p.image ? (
                                                            <img src={p.image} alt={p.name} style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                                                        ) : (
                                                            <span style={{ width: 40, height: 40, borderRadius: 6, background: "#F7F7F6", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#ccc", fontSize: 14, flexShrink: 0 }}><i className="ti ti-photo" /></span>
                                                        )}
                                                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                                                    {p.featured && <i className="ti ti-star" style={{ fontSize: 12, color: "#D4AF37", flexShrink: 0 }} />}
                                                    </div>
                                                </td>
                                                <td style={{ ...styles.td, ...styles.muted }}>{p.category}</td>
                                                <td style={styles.td}>
                                                    {p.salePrice && p.salePrice > 0 ? (
                                                        <span><span style={{ textDecoration: "line-through", color: "#bbb", marginRight: 4 }}>${p.price.toFixed(2)}</span>${p.salePrice.toFixed(2)}</span>
                                                    ) : (
                                                        `$${p.price.toFixed(2)}`
                                                    )}
                                                </td>
                                                <td style={styles.td}>
                                                    {editingStockId === p.id ? (
                                                        <input type="number" min={0} autoFocus value={editingStockVal}
                                                            onChange={(e) => setEditingStockVal(Number(e.target.value))}
                                                            onBlur={() => handleQuickStockSave(p.id)}
                                                            onKeyDown={(e) => e.key === "Enter" && handleQuickStockSave(p.id)}
                                                            style={{ width: 60, padding: "3px 6px", borderRadius: 4, border: "1px solid #D4AF37", fontSize: 12, textAlign: "center", fontFamily: "inherit" }} />
                                                    ) : (
                                                        <span onClick={() => { if (!inactive) { setEditingStockId(p.id); setEditingStockVal(p.stock); } }}
                                                            style={{ cursor: inactive ? "default" : "pointer", borderBottom: inactive ? "none" : "1px dashed #ccc", color: lowStock ? "#c0392b" : inactive ? "#ccc" : "#3a7d44", fontWeight: 500 }}>
                                                            {p.stock}
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={styles.td}>
                                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 500,
                                                        background: inactive ? "#F5F5F4" : "#F0F7F1", color: inactive ? "#999" : "#3a7d44" }}>
                                                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: inactive ? "#ccc" : "#3a7d44" }} />
                                                        {inactive ? "Inactivo" : "Activo"}
                                                    </span>
                                                </td>
                                                <td style={{ ...styles.td, verticalAlign: "middle" }}>
                                                    <div className="actions-group" style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                                        <button className="btn-icon-action" style={styles.btnIconAction} title="Ver detalle" onClick={() => setViewProduct(p)}>
                                                            <i className="ti ti-eye" style={{ fontSize: 14 }} aria-hidden />
                                                        </button>
                                                        <button className="btn-icon-action" style={{ ...styles.btnIconAction, color: p.featured ? "#D4AF37" : "#888" }} title={p.featured ? "Quitar destacado" : "Destacar"} onClick={() => handleToggleFeatured(p.id)}>
                                                            <i className="ti ti-star" style={{ fontSize: 14 }} aria-hidden />
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
                                            </td>
                                        </tr>
                                    );
                                    })}</tbody>
                                </table>
                                </div>
                            </div>
                        ) : (
                            <div className="product-grid">
                                {paginated.map((p) => {
                                    const inactive = p.status !== "active";
                                    const lowStock = p.stock <= 5 && !inactive;
                                    const onSale = p.salePrice && p.salePrice > 0 && (!p.saleEndDate || new Date(p.saleEndDate) > new Date());
                                    return (
                                        <div key={p.id} className={`product-card ${inactive ? "product-card-inactive" : ""} ${p.featured ? "product-card-featured" : ""}`}>
                                            <div className="product-card-img">
                                                {p.image ? (
                                                    <img src={p.image} alt={p.name} style={inactive ? { filter: "grayscale(1)", opacity: 0.5 } : undefined} />
                                                ) : (
                                                    <div className="product-card-placeholder">
                                                        <i className="ti ti-photo" style={{ fontSize: 32, color: "#ddd" }} />
                                                    </div>
                                                )}
                                                {p.images && p.images.length > 1 && (
                                                    <span className="product-card-multi" title="Múltiples imágenes"><i className="ti ti-gallery" /></span>
                                                )}
                                                {p.featured && !inactive && (
                                                    <span className="product-card-featured-badge"><i className="ti ti-star" /></span>
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
                                                <h3 className="product-card-name" title={p.description || ""}>{p.name}</h3>
                                                {onSale ? (
                                                    <p className="product-card-price">
                                                        <span style={{ textDecoration: "line-through", color: "#bbb", fontSize: 11, marginRight: 4 }}>${p.price.toFixed(2)}</span>
                                                        <span style={{ color: "#c0392b" }}>${p.salePrice.toFixed(2)}</span>
                                                    </p>
                                                ) : (
                                                    <p className="product-card-price">${p.price.toFixed(2)}</p>
                                                )}
                                                <div className="product-card-actions">
                                                    <button className="btn-icon-action" style={styles.btnIconAction} title="Ver detalle" onClick={() => setViewProduct(p)}>
                                                        <i className="ti ti-eye" style={{ fontSize: 14 }} aria-hidden />
                                                    </button>
                                                    <button className="btn-icon-action" style={{ ...styles.btnIconAction, color: p.featured ? "#D4AF37" : "#888" }} title={p.featured ? "Quitar destacado" : "Destacar"} onClick={() => handleToggleFeatured(p.id)}>
                                                        <i className="ti ti-star" style={{ fontSize: 14 }} aria-hidden />
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
                        ) : filteredSales.length === 0 ? (
                            <p style={styles.empty}>{saleSearch || salePayFilter || saleStatusFilter ? "No hay ventas con esos filtros." : "No hay ventas registradas."}</p>
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
                                    <tbody>{filteredSales.map((s) => {
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
                                                <td style={{ ...styles.td, verticalAlign: "middle" }}>
                                                    <div className="actions-group" style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                                        <button className="btn-icon-action" title="Imprimir ticket" style={styles.btnIconAction}
                                                            onClick={() => printSaleTicket(s)}>
                                                            <i className="ti ti-printer" style={{ fontSize: 14 }} aria-hidden />
                                                        </button>
                                                        {!returned && (
                                                            <button className="btn-icon-action" title="Devolver" style={{ ...styles.btnIconAction, color: "#c0392b" }}
                                                                onClick={() => requestReturn(s.id)}>
                                                                <i className="ti ti-receipt-refund" style={{ fontSize: 14 }} aria-hidden />
                                                            </button>
                                                        )}
                                                    </div>
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
                        <input type="number" min={0} style={styles.input} value={prodForm.price} onChange={(e) => setProdForm((p) => ({ ...p, price: Number(e.target.value) }))} onWheel={(e) => (e.target as HTMLElement).blur()} />

                        <label style={{ ...styles.label, marginTop: 12 }}>Precio de oferta</label>
                        <input type="number" min={0} style={styles.input} value={prodForm.salePrice || ""} onChange={(e) => setProdForm((p) => ({ ...p, salePrice: Number(e.target.value) }))} onWheel={(e) => (e.target as HTMLElement).blur()} placeholder="Opcional" />

                        <label style={{ ...styles.label, marginTop: 12 }}>Precio original (tachado)</label>
                        <input type="number" min={0} style={styles.input} value={prodForm.originalPrice || ""} onChange={(e) => setProdForm((p) => ({ ...p, originalPrice: Number(e.target.value) }))} onWheel={(e) => (e.target as HTMLElement).blur()} placeholder="Opcional" />

                        <label style={{ ...styles.label, marginTop: 12 }}>Vigencia oferta (opcional)</label>
                        <input type="date" style={styles.input} value={prodForm.saleEndDate} onChange={(e) => setProdForm((p) => ({ ...p, saleEndDate: e.target.value }))} />

                        <label style={{ ...styles.label, marginTop: 12 }}>Stock inicial</label>
                        <input type="number" min={0} style={styles.input} value={prodForm.stock} onChange={(e) => setProdForm((p) => ({ ...p, stock: Number(e.target.value) }))} onWheel={(e) => (e.target as HTMLElement).blur()} />

                        <label style={{ ...styles.label, marginTop: 12 }}>Categoría</label>
                        <input style={styles.input} value={prodForm.category} onChange={(e) => setProdForm((p) => ({ ...p, category: e.target.value }))} list="cat-list" placeholder="Ej: Proteínas" />
                        <datalist id="cat-list">
                            {allCategories.map((c) => <option key={c} value={c} />)}
                        </datalist>

                        {/* Featured toggle */}
                        <label style={{ ...styles.label, marginTop: 12 }}>Destacado</label>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: "#555" }}>
                                <input type="checkbox" checked={prodForm.featured} onChange={(e) => setProdForm((p) => ({ ...p, featured: e.target.checked }))} />
                                {prodForm.featured ? "Producto destacado (aparece primero)" : "Marcar como destacado"}
                            </label>
                        </div>

                        <label style={{ ...styles.label, marginTop: 12 }}>Imágenes (hasta 3)</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {/* Existing images (edit mode) */}
                            {editingProd && (products.find((p) => p.id === editingProd)?.images ?? []).map((imgUrl, idx) => (
                                <div key={idx} style={{ position: "relative", display: "inline-block" }}>
                                    <img src={imgUrl} alt={`img-${idx}`} style={{ width: 60, height: 60, borderRadius: 6, objectFit: "cover", border: "1px solid #E5E4E2" }} />
                                    <button type="button" title="Eliminar imagen"
                                        style={{ position: "absolute", top: -6, right: -6, background: "#c0392b", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}
                                        onClick={async () => {
                                            try {
                                                await deleteProductImageByIndex(editingProd!, idx);
                                                addToast("Imagen eliminada");
                                                loadProducts();
                                            } catch { addToast("Error al eliminar imagen", "error"); }
                                        }}>
                                        <i className="ti ti-x" />
                                    </button>
                                </div>
                            ))}
                            {/* Pending upload preview */}
                            {prodImagePreview && (
                                <div style={{ position: "relative", display: "inline-block" }}>
                                    <img src={prodImagePreview} alt="preview" style={{ width: 60, height: 60, borderRadius: 6, objectFit: "cover", border: "1px solid #D4AF37" }} />
                                    <button type="button" style={{ position: "absolute", top: -6, right: -6, background: "#c0392b", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}
                                        onClick={() => { setProdImageFile(null); setProdImagePreview(null); }}>
                                        <i className="ti ti-x" />
                                    </button>
                                </div>
                            )}
                            {(editingProd ? (products.find((p) => p.id === editingProd)?.images ?? []).length < 3 : !prodImagePreview) && (
                                <button type="button" style={{ ...styles.imageBtn, width: 60, height: 60, justifyContent: "center", padding: 0 }} onClick={() => prodImageRef.current?.click()}>
                                    <i className="ti ti-plus" style={{ fontSize: 18 }} />
                                </button>
                            )}
                            <input ref={prodImageRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }}
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setProdImageFile(file);
                                        setProdImagePreview(URL.createObjectURL(file));
                                    }
                                }} />
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
                            <button onClick={() => { setSaleBuyerType("other"); setSaleBuyerId(""); setSaleBuyerName(""); setSaleBuyerEmail(""); }}
                                style={{ ...styles.tabBtn, background: saleBuyerType === "other" ? "#1a1a1a" : "#F7F7F6", color: saleBuyerType === "other" ? "#fff" : "#555" }}>
                                Otro
                            </button>
                        </div>

                        {saleBuyerType !== "other" && (
                            <div style={{ position: "relative", marginTop: 8 }}>
                                <label style={styles.label}>{saleBuyerType === "member" ? "Buscar miembro" : "Buscar staff"}</label>
                                <input style={styles.input} placeholder="Escribe para buscar…" value={saleMemberSearch}
                                    onChange={(e) => setSaleMemberSearch(e.target.value)} />
                                {saleMemberSearch && (
                                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #E5E4E2", borderRadius: 7, zIndex: 10, maxHeight: 180, overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                                        {(saleBuyerType === "member" ? members : staffUsers)
                                            .filter((p) => p.fullName.toLowerCase().includes(saleMemberSearch.toLowerCase()))
                                            .slice(0, 20)
                                            .map((p) => (
                                                <div key={p.id} onClick={() => {
                                                    setSaleBuyerId(p.id);
                                                    setSaleBuyerName(p.fullName);
                                                    setSaleBuyerEmail(p.email ?? "");
                                                    setSaleMemberSearch(p.fullName);
                                                }} style={{ padding: "8px 11px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid #F0F0EE", transition: "background 0.1s" }}
                                                    onMouseEnter={(e) => (e.currentTarget.style.background = "#F7F7F6")}
                                                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                                                    {p.fullName}
                                                    {p.email && <span style={{ color: "#bbb", fontSize: 11, marginLeft: 6 }}>({p.email})</span>}
                                                </div>
                                            ))}
                                        {(saleBuyerType === "member" ? members : staffUsers).filter((p) => p.fullName.toLowerCase().includes(saleMemberSearch.toLowerCase())).length === 0 && (
                                            <div style={{ padding: "8px 11px", fontSize: 12, color: "#bbb" }}>Sin resultados</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <label style={{ ...styles.label, marginTop: saleBuyerType === "other" ? 8 : 44 }}>Nombre del comprador</label>
                        <input style={styles.input} value={saleBuyerName}
                            onChange={(e) => setSaleBuyerName(e.target.value)} placeholder={saleBuyerType === "other" ? "Nombre del cliente" : "O editable"} />

                        {/* Email & send ticket */}
                        <label style={{ ...styles.label, marginTop: 12 }}>Correo para ticket</label>
                        <input style={styles.input} type="email" value={saleBuyerEmail} onChange={(e) => setSaleBuyerEmail(e.target.value)} placeholder="correo@ejemplo.com" />
                        <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 12, color: "#555", cursor: "pointer" }}>
                            <input type="checkbox" checked={sendTicketEmail} onChange={(e) => setSendTicketEmail(e.target.checked)} />
                            Enviar ticket por correo
                        </label>

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
                <div style={{ background: "#fff", borderRadius: 12, width: 440, maxWidth: "90vw", maxHeight: "85vh", overflow: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }} onClick={(e) => e.stopPropagation()}>
                    {/* Image gallery */}
                    <div style={{ position: "relative", background: "#FAFAFA" }}>
                        {(() => {
                            const detailImgs = viewProduct.images && viewProduct.images.length > 0
                                ? viewProduct.images
                                : viewProduct.image
                                    ? [viewProduct.image]
                                    : [];
                            return detailImgs.length > 0 ? (
                                <>
                                    {detailImgs.map((imgUrl, idx) => (
                                        <img key={idx} src={imgUrl} alt={`${viewProduct.name}-${idx}`} style={{ width: "100%", maxHeight: 260, objectFit: "contain", padding: 16, boxSizing: "border-box", display: idx === 0 ? "block" : "none" }} />
                                    ))}
                                    {detailImgs.length > 1 && (
                                        <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 }}>
                                            {detailImgs.map((_, idx) => (
                                                <span key={idx} style={{ width: 8, height: 8, borderRadius: "50%", background: "#ccc", cursor: "pointer", opacity: 0.7 }} onClick={(e) => {
                                                    e.stopPropagation();
                                                    const parent = e.currentTarget.parentElement?.previousElementSibling as HTMLElement;
                                                    const imgs = parent?.querySelectorAll?.("img");
                                                    imgs?.forEach((img, i) => img.style.display = i === idx ? "block" : "none");
                                                }} />
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{ width: "100%", height: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "#F7F7F6" }}>
                                    <i className="ti ti-photo" style={{ fontSize: 48, color: "#ddd" }} />
                                </div>
                            );
                        })()}
                        <button onClick={() => setViewProduct(null)} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.4)", color: "#fff", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                            <i className="ti ti-x" />
                        </button>
                    </div>
                    <div style={{ padding: "16px 20px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>{viewProduct.category}</span>
                            {viewProduct.featured && <i className="ti ti-star" style={{ fontSize: 12, color: "#D4AF37" }} />}
                        </div>
                        <h2 style={{ fontSize: 17, fontWeight: 600, color: "#1a1a1a", margin: "4px 0 2px" }}>{viewProduct.name}</h2>
                        {viewProduct.salePrice && viewProduct.salePrice > 0 && (!viewProduct.saleEndDate || new Date(viewProduct.saleEndDate) > new Date()) ? (
                            <p style={{ fontSize: 22, fontWeight: 700, color: "#c0392b", margin: "4px 0 8px" }}>
                                <span style={{ textDecoration: "line-through", color: "#bbb", fontSize: 16, fontWeight: 400, marginRight: 6 }}>${viewProduct.price.toFixed(2)}</span>
                                ${viewProduct.salePrice.toFixed(2)}
                            </p>
                        ) : (
                            <p style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a", margin: "4px 0 8px" }}>${viewProduct.price.toFixed(2)}</p>
                        )}
                        {viewProduct.description && <p style={{ fontSize: 12, color: "#888", margin: "0 0 10px", lineHeight: 1.4 }}>{viewProduct.description}</p>}
                        <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#555" }}>
                            <span><strong>Stock:</strong> {viewProduct.stock} uds.</span>
                            <span><strong>Estado:</strong> {viewProduct.status === "active" ? "Activo" : "Inactivo"}</span>
                            {viewProduct.images && viewProduct.images.length > 0 && <span><strong>Imágenes:</strong> {viewProduct.images.length}</span>}
                        </div>
                        <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                            <button style={{ ...styles.cancelBtn, fontSize: 11, padding: "6px 12px" }} onClick={() => { const p = viewProduct; setViewProduct(null); openEditProd(p); }}>
                                <i className="ti ti-pencil" style={{ fontSize: 12, marginRight: 4 }} aria-hidden /> Editar producto
                            </button>
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
                .product-card-featured {
                    border-top-color: #D4AF37;
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
                .product-card-multi {
                    position: absolute;
                    top: 6px;
                    right: 6px;
                    background: rgba(0,0,0,0.5);
                    color: #fff;
                    border-radius: 4px;
                    padding: 2px 5px;
                    font-size: 10px;
                }
                .product-card-featured-badge {
                    position: absolute;
                    top: 6px;
                    left: 6px;
                    color: #D4AF37;
                    font-size: 16px;
                    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
                }
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
                .store-row { transition: background 0.1s ease; }
                .store-row:hover { background: #FAFAFA; }
                .store-row:last-child td { border-bottom: none !important; }
                .actions-group { opacity: 0.4; transition: opacity 0.15s; }
                .store-row:hover .actions-group { opacity: 1; }
                .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
                .table-scroll table { min-width: 600px; }
                @media (max-width: 1100px) {
                    .product-grid { grid-template-columns: repeat(4, 1fr); }
                }
                @media (max-width: 900px) {
                    .product-grid { grid-template-columns: repeat(2, 1fr); }
                    .store-page > div:first-child { padding: 14px 20px 12px !important; }
                    .toolbar-wrap { flex-direction: column !important; align-items: stretch !important; gap: 6px !important; }
                    .toolbar-wrap .search-wrap { flex: none !important; width: 100% !important; }
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
    viewToggleBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, border: "1px solid #E5E4E2", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s" },
};
