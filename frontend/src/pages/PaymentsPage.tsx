import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../hooks/useAuth";
import { createPayment, getPayments, refundPayment } from "../services/payment.service";
import { getMembers } from "../services/member.service";
import { getSubscriptions } from "../services/subscription.service";
import PageHeader from "../components/PageHeader";
import LoadingSkeleton from "../components/LoadingSkeleton";
import GymButton from "../components/GymButton";
import Pagination from "../components/Pagination";
import { useSocketRefresh } from "../hooks/useSocketRefresh";

interface Payment {
    id: string;
    member: { id: string; fullName: string; email?: string; phone?: string };
    subscription: { id: string; startDate: string; endDate: string; status: string; planName?: string };
    amount: number;
    method: string;
    status: string;
    paidAt: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

interface Member { id: string; firstName: string; lastName: string; membershipStatus: string }
interface Subscription { id: string; member: { id: string; fullName: string }; plan: { id: string; name: string; price: number }; status: string; endDate: string }

interface FormErrors { memberId?: string; subscriptionId?: string; amount?: string; method?: string; }

const statusStyle = (status: string): React.CSSProperties => ({
    paid: { background: "#F0F7F1", color: "#3a7d44" },
    pending: { background: "#FFF4F0", color: "#c0392b" },
    refunded: { background: "#F0F0EE", color: "#888", textDecoration: "line-through" },
}[status] ?? { background: "#F0F0EE", color: "#888" });

const statusLabel: Record<string, string> = { paid: "Pagado", pending: "Pendiente", refunded: "Reembolsado" };
const methodLabel: Record<string, string> = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia" };

const fmtDate = (d: string) => new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

const fmtDateTime = (d: string) => new Date(d).toLocaleString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function Field({ label, required, error, touched, children }: {
    label: string; required?: boolean; error?: string; touched?: boolean; children: React.ReactNode;
}) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={s.fieldLabel}>{label}{required && <span style={{ color: "#c0392b", marginLeft: 2 }}>*</span>}</label>
            {children}
            {touched && error && <span style={s.fieldError}>{error}</span>}
        </div>
    );
}

interface DrawerProps {
    open: boolean; saving: boolean;
    values: Record<string, string>; errors: FormErrors; touched: Record<string, boolean>;
    members: Member[]; memberSubscriptions: Subscription[];
    onChange: (field: string, val: string) => void; onBlur: (field: string) => void;
    onSubmit: (e: React.FormEvent) => void; onClose: () => void;
}

function PaymentDrawer({ open, saving, values, errors, touched, members, memberSubscriptions, onChange, onBlur, onSubmit, onClose }: DrawerProps) {
    useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);
    const firstRef = useRef<HTMLSelectElement>(null);
    useEffect(() => { if (open) setTimeout(() => firstRef.current?.focus(), 300); }, [open]);

    const [processing, setProcessing] = useState(false);
    const [processed, setProcessed] = useState(false);

    const selectedSub = memberSubscriptions.find(s => s.id === values.subscriptionId);

    const handleMemberChange = (id: string) => {
        onChange("memberId", id);
        onChange("subscriptionId", "");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (values.method === "card") {
            setProcessing(true);
            await new Promise((r) => setTimeout(r, 2000));
            setProcessing(false);
            setProcessed(true);
            return;
        }
        onSubmit(e);
    };

    const handleProceed = (e: React.MouseEvent) => {
        e.preventDefault();
        setProcessed(false);
        const synthetic = { preventDefault: () => { } } as React.FormEvent;
        onSubmit(synthetic);
    };

    return (
        <>
            <div style={{ ...s.overlay, opacity: open ? 1 : 0, pointerEvents: open ? "all" : "none", zIndex: 800 }} onClick={onClose} aria-hidden />
            <div style={{ ...s.drawer, transform: open ? "translateX(0)" : "translateX(100%)" }} className="drawer-panel" role="dialog" aria-modal aria-label="Registrar pago">
                <div style={s.drawerHeader}>
                    <div>
                        <p style={s.drawerTitle}>Registrar pago</p>
                        <p style={s.drawerSub}>Completa los datos del pago</p>
                    </div>
                    <button style={s.btnIcon} onClick={onClose}><i className="ti ti-x" style={{ fontSize: 16 }} aria-hidden /></button>
                </div>
                <form onSubmit={handleSubmit} style={s.drawerBody} noValidate>
                    <Field label="Miembro" required error={errors.memberId} touched={touched.memberId}>
                        <select ref={firstRef} style={{ ...s.input, ...(touched.memberId && errors.memberId ? s.inputError : {}) }}
                            value={values.memberId} onChange={(e) => handleMemberChange(e.target.value)} onBlur={() => onBlur("memberId")}>
                            <option value="">Seleccionar miembro</option>
                            {members.map((m) => (
                                <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Suscripción" required error={errors.subscriptionId} touched={touched.subscriptionId}>
                        <select style={{ ...s.input, ...(touched.subscriptionId && errors.subscriptionId ? s.inputError : {}) }}
                            value={values.subscriptionId} onChange={(e) => onChange("subscriptionId", e.target.value)}
                            onBlur={() => onBlur("subscriptionId")} disabled={!values.memberId}>
                            <option value="">{!values.memberId ? "Primero selecciona un miembro" : memberSubscriptions.length === 0 ? "Sin suscripciones activas" : "Seleccionar suscripción"}</option>
                            {memberSubscriptions.map((sub) => (
                                <option key={sub.id} value={sub.id}>{sub.plan?.name ?? "Plan"} — vence {fmtDate(sub.endDate)}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Monto ($)" required error={errors.amount} touched={touched.amount}>
                        {selectedSub && (
                            <p style={{ margin: "0 0 2px", fontSize: 11, color: "#888" }}>
                                Plan: ${selectedSub.plan.price} — {selectedSub.plan.name}
                            </p>
                        )}
                        <input style={{ ...s.input, ...(touched.amount && errors.amount ? s.inputError : {}) }}
                            type="number" placeholder={selectedSub ? String(selectedSub.plan.price) : "450"} value={values.amount}
                            onChange={(e) => onChange("amount", e.target.value)} onBlur={() => onBlur("amount")} min={0} />
                    </Field>
                    <Field label="Método de pago" required error={errors.method} touched={touched.method}>
                        <select style={{ ...s.input, ...(touched.method && errors.method ? s.inputError : {}) }}
                            value={values.method} onChange={(e) => { onChange("method", e.target.value); setProcessed(false); }} onBlur={() => onBlur("method")}>
                            <option value="">Seleccionar método</option>
                            <option value="cash">Efectivo</option>
                            <option value="card">Tarjeta</option>
                            <option value="transfer">Transferencia</option>
                        </select>
                    </Field>
                    <Field label="Notas">
                        <input style={s.input} placeholder="Notas opcionales" value={values.notes}
                            onChange={(e) => onChange("notes", e.target.value)} />
                    </Field>

                    {values.method === "card" && !processed && (
                        <div style={{ border: "1px solid #E5E4E2", borderRadius: 8, padding: 16, display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#555" }}>Datos de la tarjeta</p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                <label style={s.fieldLabel}>Número de tarjeta</label>
                                <input style={s.input} placeholder="4242 4242 4242 4242" maxLength={19}
                                    value={values.cardNumber ?? ""} onChange={(e) => {
                                        const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
                                        const formatted = raw.replace(/(.{4})/g, "$1 ").trim();
                                        onChange("cardNumber", formatted);
                                    }} />
                            </div>
                            <div style={{ display: "flex", gap: 10 }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                                    <label style={s.fieldLabel}>Vencimiento</label>
                                    <input style={s.input} placeholder="MM/AA" maxLength={5}
                                        value={values.cardExpiry ?? ""} onChange={(e) => {
                                            const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
                                            const formatted = raw.length > 2 ? raw.slice(0, 2) + "/" + raw.slice(2) : raw;
                                            onChange("cardExpiry", formatted);
                                        }} />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                                    <label style={s.fieldLabel}>CVC</label>
                                    <input style={s.input} placeholder="123" maxLength={4}
                                        value={values.cardCvc ?? ""} onChange={(e) => {
                                            onChange("cardCvc", e.target.value.replace(/\D/g, "").slice(0, 4));
                                        }} />
                                </div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                <label style={s.fieldLabel}>Titular</label>
                                <input style={s.input} placeholder="Nombre en la tarjeta"
                                    value={values.cardName ?? ""} onChange={(e) => onChange("cardName", e.target.value)} />
                            </div>
                        </div>
                    )}

                    {processed && (
                        <div style={{ textAlign: "center", padding: "20px 0" }}>
                            <div style={{ fontSize: 36, color: "#3a7d44", marginBottom: 8 }}>✓</div>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "#1a1a1a" }}>Pago procesado exitosamente</p>
                            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#888" }}>Tarjeta terminada en ••••{values.cardNumber?.replace(/\s/g, "").slice(-4) ?? "4242"}</p>
                            <button style={{ ...s.btnPrimary, marginTop: 16 }} onClick={handleProceed}>Confirmar y guardar</button>
                        </div>
                    )}

                    {!(values.method === "card" && processed) && (
                        <div style={s.drawerFooter}>
                            <button type="button" style={s.btnGhost} onClick={onClose} disabled={saving || processing}>Cancelar</button>
                            <button type="submit" style={{ ...s.btnPrimary, opacity: saving || processing ? 0.7 : 1 }} disabled={saving || processing}>
                                {processing ? <><span style={s.spinner} />Procesando…</>
                                    : values.method === "card" ? <><i className="ti ti-credit-card" style={{ fontSize: 13 }} aria-hidden />Cobrar tarjeta</>
                                        : <><i className="ti ti-check" style={{ fontSize: 13 }} aria-hidden />Registrar pago</>}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </>
    );
}

const validate = (values: Record<string, string>): FormErrors => {
    const e: FormErrors = {};
    if (!values.memberId) e.memberId = "Selecciona un miembro";
    if (!values.subscriptionId) e.subscriptionId = "Selecciona una suscripción";
    if (!values.amount.trim()) e.amount = "Obligatorio";
    else if (isNaN(Number(values.amount)) || Number(values.amount) <= 0) e.amount = "Debe ser un número mayor a 0";
    if (!values.method) e.method = "Selecciona un método";
    return e;
};

function exportExcel(payments: Payment[]) {
    const rows = payments.map((p) => ({
        Miembro: p.member.fullName, Email: p.member.email ?? "", Teléfono: p.member.phone ?? "",
        Monto: p.amount, Método: methodLabel[p.method] ?? p.method, Estado: statusLabel[p.status] ?? p.status,
        "Fecha de pago": new Date(p.paidAt).toLocaleDateString("es-MX"),
        "Vence suscripción": new Date(p.subscription.endDate).toLocaleDateString("es-MX"),
        Notas: p.notes ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 28 }, { wch: 28 }, { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 24 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pagos");
    XLSX.writeFile(wb, `ZenithGym_Pagos_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function exportPDF(payments: Payment[]) {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(26, 26, 26);
    doc.text("ZenithGym · Lista de pagos", 14, 16);
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(136, 136, 136);
    doc.text(`Generado el ${new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })} · ${payments.length} pago${payments.length !== 1 ? "s" : ""}`, 14, 22);
    autoTable(doc, {
        startY: 28, head: [["Miembro", "Email", "Monto", "Método", "Estado", "Fecha de pago", "Vence suscripción", "Notas"]],
        body: payments.map((p) => [
            p.member.fullName, p.member.email ?? "—", `$${p.amount}`,
            methodLabel[p.method] ?? p.method, statusLabel[p.status] ?? p.status,
            new Date(p.paidAt).toLocaleDateString("es-MX"),
            new Date(p.subscription.endDate).toLocaleDateString("es-MX"),
            p.notes ?? "—",
        ]),
        styles: { font: "helvetica", fontSize: 9, cellPadding: 3, textColor: [26, 26, 26] },
        headStyles: { fillColor: [250, 250, 250], textColor: [136, 136, 136], fontStyle: "normal", lineWidth: 0.1, lineColor: [229, 228, 226] },
        alternateRowStyles: { fillColor: [252, 252, 251] }, tableLineColor: [229, 228, 226], tableLineWidth: 0.1,
    });
    doc.save(`ZenithGym_Pagos_${new Date().toISOString().slice(0, 10)}.pdf`);
}

const emptyForm = { memberId: "", subscriptionId: "", amount: "", method: "", notes: "", cardNumber: "", cardExpiry: "", cardCvc: "", cardName: "" };

export default function PaymentsPage() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formValues, setFormValues] = useState({ ...emptyForm });
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [refundingId, setRefundingId] = useState<string | null>(null);
    const [refundingLoading, setRefundingLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [planFilter, setPlanFilter] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const limit = 20;
    const { user: currentUser } = useAuth();
    const { addToast } = useToast();

    const uniquePlans = Array.from(
        new Map(subscriptions.filter(s => s.plan?.name).map(s => [s.plan.id, s.plan])).values()
    );
    const hasActiveFilters = search || statusFilter || planFilter || dateFrom || dateTo;

    const memberSubscriptions = subscriptions.filter(
        (sub) => sub.member?.id === formValues.memberId && sub.status === "active"
    );

    const loadPayments = async (targetPage: number) => {
        try {
            const filters: Record<string, string> = {};
            if (search) filters.search = search;
            if (statusFilter) filters.status = statusFilter;
            if (planFilter) filters.planId = planFilter;
            if (dateFrom) filters.dateFrom = dateFrom;
            if (dateTo) filters.dateTo = dateTo;
            const res = await getPayments(targetPage, limit, filters);
            setPayments(res.data ?? []);
            setTotal(res.total ?? 0);
            setTotalPages(res.totalPages ?? 1);
        } catch { setError(true); }
    };

    useSocketRefresh(["payment_created", "payment_refunded"], () => loadPayments(page));

    useEffect(() => {
        const init = async () => {
            try {
                const filters: Record<string, string> = {};
                if (search) filters.search = search;
                if (statusFilter) filters.status = statusFilter;
                if (planFilter) filters.planId = planFilter;
                if (dateFrom) filters.dateFrom = dateFrom;
                if (dateTo) filters.dateTo = dateTo;
                const [paymentsRes, membersRes, subsRes] = await Promise.all([
                    getPayments(page, limit, filters), getMembers(), getSubscriptions(),
                ]);
                setPayments(paymentsRes.data ?? []);
                setTotal(paymentsRes.total ?? 0);
                setTotalPages(paymentsRes.totalPages ?? 1);
                setMembers(membersRes.data ?? []);
                setSubscriptions(subsRes.data ?? []);
            } catch { setError(true); } finally { setLoading(false); }
        };
        init();
    }, [page, search, statusFilter, planFilter, dateFrom, dateTo, addToast]);

    const openNew = () => { setFormValues({ ...emptyForm }); setErrors({}); setTouched({}); setDrawerOpen(true); };

    const handleFieldChange = (field: string, val: string) => {
        setFormValues((p) => { const next = { ...p, [field]: val }; setErrors(validate(next)); return next; });
    };
    const handleBlur = (field: string) => { setTouched((p) => ({ ...p, [field]: true })); setErrors(validate(formValues)); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const allTouched = Object.keys(formValues).reduce((acc, k) => ({ ...acc, [k]: true }), {});
        setTouched(allTouched);
        const validation = validate(formValues);
        setErrors(validation);
        if (Object.keys(validation).length > 0) return;
        setSaving(true);
        try {
            await createPayment({
                memberId: formValues.memberId,
                subscriptionId: formValues.subscriptionId,
                amount: Number(formValues.amount),
                method: formValues.method,
                ...(formValues.notes && { notes: formValues.notes }),
            });
            addToast("Pago registrado correctamente");
            setDrawerOpen(false); await loadPayments(page);
        } catch { addToast("Error al registrar pago.", "error"); } finally { setSaving(false); }
    };

    const clearFilters = () => {
        setSearch(""); setStatusFilter(""); setPlanFilter(""); setDateFrom(""); setDateTo(""); setPage(1);
    };

    const handlePrintTicket = (payment: Payment) => {
        const sub = subscriptions.find(s => s.id === payment.subscription.id);
        const planName = payment.subscription.planName || sub?.plan?.name || "—";
        const ticketHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Ticket de pago</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 8px 12px; }
  h1 { font-size: 18px; text-align: center; letter-spacing: 2px; margin-bottom: 2px; }
  .sub { text-align: center; font-size: 10px; color: #888; margin-bottom: 8px; }
  .divider { border-top: 1px dashed #333; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; padding: 2px 0; }
  .label { color: #666; }
  .total { font-size: 14px; font-weight: 700; }
  .thank { text-align: center; margin-top: 10px; font-size: 10px; color: #888; }
  .folio { text-align: center; font-size: 10px; color: #aaa; margin-top: 4px; }
  @media print { body { width: 80mm; padding: 0; } @page { margin: 0; size: 80mm auto; } }
</style></head><body>
  <h1>ZENITHGYM</h1>
  <p class="sub">Comprobante de pago</p>
  <div class="divider"></div>
  <div class="row"><span class="label">Folio</span><span>#${payment.id.slice(-8).toUpperCase()}</span></div>
  <div class="row"><span class="label">Fecha</span><span>${fmtDateTime(payment.paidAt)}</span></div>
  <div class="row"><span class="label">Atendió</span><span>${currentUser?.firstName ?? ""} ${currentUser?.lastName ?? ""}</span></div>
  <div class="divider"></div>
  <div class="row"><span class="label">Miembro</span><span>${payment.member.fullName}</span></div>
  <div class="row"><span class="label">Plan</span><span>${planName}</span></div>
  <div class="row"><span class="label">Vigencia</span><span>${fmtDate(payment.subscription.startDate)} – ${fmtDate(payment.subscription.endDate)}</span></div>
  <div class="divider"></div>
  <div class="row"><span class="label">Método</span><span>${methodLabel[payment.method] ?? payment.method}</span></div>
  <div class="row total"><span>Total</span><span>$${payment.amount.toFixed(2)}</span></div>
  <div class="row"><span class="label">Estado</span><span>${statusLabel[payment.status] ?? payment.status}</span></div>
  <div class="divider"></div>
  <p class="thank">¡Gracias por tu preferencia!</p>
  <p class="folio">ZenithGym · ${new Date().toLocaleDateString("es-MX")}</p>
<script>window.print();window.onafterprint=()=>window.close();setTimeout(()=>window.close(),500);</script>
</body></html>`;
        const win = window.open("", "_blank");
        if (win) { win.document.write(ticketHtml); win.document.close(); }
    };

    const handleRefund = async (paymentId: string) => {
        const prev = payments;
        setPayments((current) => current.map((p) => p.id === paymentId ? { ...p, status: "refunded" } : p));
        setRefundingId(paymentId);
        setRefundingLoading(true);
        try {
            await refundPayment(paymentId);
            addToast("Pago reembolsado correctamente");
        } catch {
            setPayments(prev);
            addToast("Error al reembolsar el pago.", "error");
        } finally {
            setRefundingLoading(false);
            setRefundingId(null);
        }
    };

    return (
        <div style={s.page}>
            <PaymentDrawer open={drawerOpen} saving={saving} values={formValues} errors={errors} touched={touched}
                members={members} memberSubscriptions={memberSubscriptions}
                onChange={handleFieldChange} onBlur={handleBlur} onSubmit={handleSubmit} onClose={() => setDrawerOpen(false)} />
            <PageHeader title="Pagos" action={<GymButton icon="ti-plus" onClick={openNew}>Registrar pago</GymButton>} />
            <div style={s.content}>
                <div className="toolbar-card" style={s.toolbarCard}>
                <div className="toolbar-wrap" style={s.toolbar}>
                    <input style={s.filterInput} placeholder="Buscar por miembro…" value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                    <div className="filter-group" style={s.filterGroup}>
                        <select style={s.filterSelect} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                            <option value="">Todos</option>
                            <option value="paid">Pagado</option>
                            <option value="pending">Pendiente</option>
                            <option value="cancelled">Cancelado</option>
                        </select>
                        <select style={s.filterSelect} value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}>
                            <option value="">Todos los planes</option>
                            {uniquePlans.map((pl) => (
                                <option key={pl.id} value={pl.id}>{pl.name}</option>
                            ))}
                        </select>
                        <input type="date" style={s.filterInput} value={dateFrom}
                            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} title="Desde" />
                        <input type="date" style={s.filterInput} value={dateTo}
                            onChange={(e) => { setDateTo(e.target.value); setPage(1); }} title="Hasta" />
                        {hasActiveFilters && (
                            <button style={s.clearBtn} onClick={clearFilters}>Limpiar filtros</button>
                        )}
                    </div>
                    <div className="export-group" style={s.exportGroup}>
                        <button style={s.exportBtn} onClick={() => exportExcel(payments)}><i className="ti ti-file-spreadsheet" style={{ fontSize: 13 }} aria-hidden />Excel</button>
                        <button style={s.exportBtn} onClick={() => exportPDF(payments)}><i className="ti ti-file-text" style={{ fontSize: 13 }} aria-hidden />PDF</button>
                    </div>
                </div>
                </div>
                {error ? (
                    <div style={{ textAlign: "center", padding: 40 }}>
                        <p style={{ fontSize: 13, color: "#c0392b", marginBottom: 12 }}>Error al cargar datos.</p>
                        <button onClick={() => { setError(false); setLoading(true); loadPayments(page).finally(() => setLoading(false)); }}
                            style={{ background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                            Reintentar
                        </button>
                    </div>
                ) : loading ? (
                    <div style={{ padding: "20px 14px" }}><LoadingSkeleton rows={5} /></div>
                ) : payments.length === 0 ? (
                    <p style={s.empty}>No hay pagos registrados.</p>
                ) : (
                    <div style={{ ...s.card, padding: 0 }} className="table-scroll">
                        <table style={s.table}>
                            <thead><tr style={s.thead}>
                                <th style={s.th}>Miembro</th><th style={s.th}>Monto</th><th style={s.th}>Método</th>
                                <th style={s.th}>Estado</th><th style={s.th}>Fecha de pago</th>
                                <th style={s.th}>Fin suscripción</th><th style={s.th}>Notas</th><th style={s.th}>Acción</th>
                            </tr></thead>
                            <tbody>{payments.map((p) => (
                                <tr key={p.id} style={s.row}>
                                    <td style={s.td}>
                                        <p style={{ margin: 0, fontWeight: 500, fontSize: 13, color: "#1a1a1a" }}>{p.member.fullName}</p>
                                        {p.member.email && <p style={{ margin: 0, fontSize: 11, color: "#bbb" }}>{p.member.email}</p>}
                                    </td>
                                    <td style={{ ...s.td, fontWeight: 500 }}>${p.amount}</td>
                                    <td style={{ ...s.td, ...s.muted }}>{methodLabel[p.method] ?? p.method}</td>
                                    <td style={s.td}><span style={{ ...s.badge, ...statusStyle(p.status) }}>{statusLabel[p.status] ?? p.status}</span></td>
                                    <td style={{ ...s.td, ...s.muted }}>{fmtDateTime(p.paidAt)}</td>
                                    <td style={{ ...s.td, ...s.muted }}>{fmtDate(p.subscription.endDate)}</td>
                                    <td style={{ ...s.td, ...s.muted }}>{p.notes ?? "—"}</td>
                                    <td style={s.td}>
                                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                            <button style={s.ticketBtn} onClick={() => handlePrintTicket(p)} title="Imprimir ticket">
                                                <i className="ti ti-receipt" style={{ fontSize: 13 }} aria-hidden />
                                            </button>
                                            {p.status === "paid" && (
                                                <button style={{ ...s.refundBtn, opacity: refundingLoading && refundingId === p.id ? 0.6 : 1 }}
                                                    onClick={() => handleRefund(p.id)} disabled={refundingLoading && refundingId === p.id} title="Reembolsar">
                                                    {refundingLoading && refundingId === p.id
                                                        ? <span style={s.spinner} />
                                                        : <i className="ti ti-arrow-back-up" style={{ fontSize: 13 }} aria-hidden />}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                )}
                {!loading && (
                    <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onChange={setPage} />
                )}
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
            <style>{`
    .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    @media (max-width: 768px) {
        .table-scroll table { min-width: 650px; }
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
    page: { display: "flex", flexDirection: "column", minHeight: "100%", position: "relative" },
    content: { padding: "16px 28px 28px", display: "flex", flexDirection: "column", gap: 10 },
    filterBar: { display: "flex", gap: 8, flexWrap: "wrap" as const, alignItems: "center" },
    toolbar: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const },
    toolbarCard: { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, padding: "12px 16px", borderTop: "2px solid #D4AF37" },
    filterGroup: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const },
    exportGroup: { display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" as const },
    filterInput: { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 7, padding: "9px 13px", fontSize: 13, color: "#1a1a1a", outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const, minWidth: 140 },
    filterSelect: { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 7, padding: "9px 13px", fontSize: 13, color: "#1a1a1a", outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const, cursor: "pointer" },
    clearBtn: { background: "none", border: "1px solid #E5E4E2", borderRadius: 7, padding: "9px 13px", fontSize: 13, color: "#c0392b", fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap" as const },
    exportBtn: { display: "inline-flex", alignItems: "center", gap: 6, background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 7, padding: "9px 13px", fontSize: 13, fontWeight: 500, color: "#555", fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap" as const },
    ticketBtn: { background: "none", border: "1px solid #1a1a1a", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 500, color: "#1a1a1a", fontFamily: "inherit", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 },
    refundBtn: { background: "none", border: "1px solid #fecaca", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 500, color: "#c0392b", fontFamily: "inherit", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 },
    toastStack: { position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" },
    toast: { display: "flex", alignItems: "center", gap: 8, color: "#fff", fontSize: 12, fontWeight: 500, padding: "9px 14px", borderRadius: 8, animation: "fadeIn 0.2s ease", cursor: "pointer", pointerEvents: "all", boxShadow: "0 2px 12px rgba(0,0,0,0.18)" },
    overlay: { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity 0.2s ease" },
    drawer: { position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 900, width: 420, background: "#fff", borderLeft: "1px solid #E5E4E2", display: "flex", flexDirection: "column", transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)", boxShadow: "-4px 0 24px rgba(0,0,0,0.08)" },
    drawerHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "22px 24px 18px", borderBottom: "1px solid #F0F0EE", flexShrink: 0 },
    drawerTitle: { fontSize: 15, fontWeight: 600, color: "#1a1a1a", margin: 0 },
    drawerSub: { fontSize: 12, color: "#bbb", margin: "3px 0 0" },
    drawerBody: { flex: 1, overflowY: "auto", padding: "20px 24px" },
    drawerFooter: { display: "flex", gap: 8, justifyContent: "flex-end", padding: "14px 24px", borderTop: "1px solid #F0F0EE", flexShrink: 0 },
    fieldLabel: { fontSize: 11, fontWeight: 500, color: "#555" },
    fieldError: { fontSize: 10, color: "#c0392b", marginTop: 1 },
    input: { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 7, padding: "8px 11px", fontSize: 13, color: "#1a1a1a", outline: "none", width: "100%", fontFamily: "inherit", boxSizing: "border-box" as const, transition: "border-color 0.15s" },
    inputError: { border: "1px solid #fecaca" },
    btnPrimary: { display: "inline-flex", alignItems: "center", gap: 6, background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" },
    btnGhost: { background: "none", color: "#555", border: "1px solid #E5E4E2", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" },
    btnIcon: { background: "none", border: "none", cursor: "pointer", color: "#bbb", padding: 4, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" },
    spinner: { display: "inline-block", width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
    card: { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, borderTop: "2px solid #D4AF37", overflow: "hidden" },
    table: { width: "100%", borderCollapse: "collapse" },
    thead: { borderBottom: "1px solid #E5E4E2", background: "#FAFAFA" },
    th: { padding: "10px 14px", fontSize: 11, fontWeight: 500, color: "#bbb", textAlign: "left", whiteSpace: "nowrap" },
    row: { borderBottom: "1px solid #F0F0EE" },
    td: { padding: "11px 14px", fontSize: 13, color: "#1a1a1a", verticalAlign: "middle" },
    muted: { color: "#888", fontSize: 12 },
    badge: { display: "inline-flex", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500 },
    empty: { fontSize: 13, color: "#bbb", padding: "40px 0", textAlign: "center" },
};
