import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { QRCodeSVG } from "qrcode.react";
import { createMember, getMembers, updateMember } from "../services/member.service";
import PageHeader from "../components/PageHeader";
import GymButton from "../components/GymButton";
import { useSocketRefresh } from "../hooks/useSocketRefresh";

interface Member {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
    birthDate?: string;
    gender?: string;
    address?: string;
    emergencyContact?: string;
    membershipStatus: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

interface FormErrors { firstName?: string; lastName?: string; phone?: string; email?: string }

const statusStyle = (status: string): React.CSSProperties =>
    status === "active"
        ? { background: "#F0F7F1", color: "#3a7d44" }
        : { background: "#F0F0EE", color: "#888" };

const statusLabel: Record<string, string> = { active: "Activo", inactive: "Inactivo" };
const genderLabel: Record<string, string> = { male: "Masculino", female: "Femenino", other: "Otro" };
const initials = (f: string, l: string) => `${f?.[0] ?? ""}${l?.[0] ?? ""}`.toUpperCase();

const fmtPhone = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 10);
    if (d.length <= 2) return d;
    if (d.length <= 6) return `${d.slice(0, 2)}-${d.slice(2)}`;
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`;
};

const validate = (values: Record<string, string>): FormErrors => {
    const e: FormErrors = {};
    if (!values.firstName.trim()) e.firstName = "Obligatorio";
    else if (values.firstName.trim().length < 2) e.firstName = "Mínimo 2 caracteres";
    if (!values.lastName.trim()) e.lastName = "Obligatorio";
    else if (values.lastName.trim().length < 2) e.lastName = "Mínimo 2 caracteres";
    if (!values.phone.trim()) e.phone = "Obligatorio";
    else if (values.phone.replace(/\D/g, "").length < 10) e.phone = "Formato: XX-XXXX-XXXX";
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) e.email = "Correo inválido";
    return e;
};

interface ToastMsg { id: number; text: string; type: "success" | "error" }

function Toast({ toasts, onRemove }: { toasts: ToastMsg[]; onRemove: (id: number) => void }) {
    return (
        <div style={s.toastStack}>
            {toasts.map((t) => (
                <div key={t.id} style={{ ...s.toast, background: t.type === "success" ? "#1a1a1a" : "#c0392b" }}
                    onClick={() => onRemove(t.id)}>
                    <i className={`ti ${t.type === "success" ? "ti-check" : "ti-alert-circle"}`} style={{ fontSize: 13 }} aria-hidden />
                    {t.text}
                </div>
            ))}
        </div>
    );
}

function ConfirmModal({ open, title, body, confirmLabel, confirmColor, loading, onConfirm, onCancel }: {
    open: boolean; title: string; body: string;
    confirmLabel: string; confirmColor: string;
    loading: boolean; onConfirm: () => void; onCancel: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => { if (open) ref.current?.focus(); }, [open]);
    if (!open) return null;
    return (
        <div style={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }} role="dialog" aria-modal>
            <div ref={ref} tabIndex={-1} style={s.modal} onKeyDown={(e) => e.key === "Escape" && onCancel()}>
                <p style={s.modalTitle}>{title}</p>
                <p style={s.modalBody}>{body}</p>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
                    <button style={s.btnGhost} onClick={onCancel} disabled={loading}>Cancelar</button>
                    <button style={{ ...s.btnConfirm, background: confirmColor, opacity: loading ? 0.7 : 1 }}
                        onClick={onConfirm} disabled={loading}>
                        {loading ? <span style={s.spinner} /> : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

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
    open: boolean; editingId: string | null; saving: boolean;
    values: Record<string, string>; errors: FormErrors; touched: Record<string, boolean>;
    onChange: (field: string, val: string) => void; onBlur: (field: string) => void;
    onSubmit: (e: React.FormEvent) => void; onClose: () => void;
}

function MemberDrawer({ open, editingId, saving, values, errors, touched, onChange, onBlur, onSubmit, onClose }: DrawerProps) {
    useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);
    const firstRef = useRef<HTMLInputElement>(null);
    useEffect(() => { if (open) setTimeout(() => firstRef.current?.focus(), 300); }, [open]);

    return (
        <>
            <div style={{ ...s.overlay, opacity: open ? 1 : 0, pointerEvents: open ? "all" : "none", zIndex: 800 }} onClick={onClose} aria-hidden />
            <div style={{ ...s.drawer, transform: open ? "translateX(0)" : "translateX(100%)" }} role="dialog" aria-modal aria-label={editingId ? "Editar miembro" : "Nuevo miembro"}>
                <div style={s.drawerHeader}>
                    <div>
                        <p style={s.drawerTitle}>{editingId ? "Editar miembro" : "Nuevo miembro"}</p>
                        <p style={s.drawerSub}>{editingId ? "Modifica los datos del miembro" : "Completa los datos para registrar"}</p>
                    </div>
                    <button style={s.btnIcon} onClick={onClose}><i className="ti ti-x" style={{ fontSize: 16 }} aria-hidden /></button>
                </div>
                <form onSubmit={onSubmit} style={s.drawerBody} noValidate>
                    <p style={s.sectionLabel}><i className="ti ti-user" style={{ fontSize: 12 }} aria-hidden /> Datos personales</p>
                    <div style={s.formGrid2}>
                        <Field label="Nombre" required error={errors.firstName} touched={touched.firstName}>
                            <input ref={firstRef} style={{ ...s.input, ...(touched.firstName && errors.firstName ? s.inputError : {}) }}
                                placeholder="Carlos" value={values.firstName}
                                onChange={(e) => onChange("firstName", e.target.value)} onBlur={() => onBlur("firstName")} />
                        </Field>
                        <Field label="Apellido" required error={errors.lastName} touched={touched.lastName}>
                            <input style={{ ...s.input, ...(touched.lastName && errors.lastName ? s.inputError : {}) }}
                                placeholder="Reyes" value={values.lastName}
                                onChange={(e) => onChange("lastName", e.target.value)} onBlur={() => onBlur("lastName")} />
                        </Field>
                    </div>
                    <div style={s.formGrid2}>
                        <Field label="Género">
                            <select style={s.input} value={values.gender} onChange={(e) => onChange("gender", e.target.value)}>
                                <option value="">Seleccionar</option>
                                <option value="male">Masculino</option>
                                <option value="female">Femenino</option>
                                <option value="other">Otro</option>
                            </select>
                        </Field>
                        <Field label="Fecha de nacimiento">
                            <input style={s.input} type="date" value={values.birthDate} onChange={(e) => onChange("birthDate", e.target.value)} />
                        </Field>
                    </div>

                    <p style={{ ...s.sectionLabel, marginTop: 16 }}><i className="ti ti-phone" style={{ fontSize: 12 }} aria-hidden /> Contacto</p>
                    <Field label="Teléfono" required error={errors.phone} touched={touched.phone}>
                        <input style={{ ...s.input, ...(touched.phone && errors.phone ? s.inputError : {}) }}
                            placeholder="55-1234-5678" value={values.phone}
                            onChange={(e) => onChange("phone", fmtPhone(e.target.value))} onBlur={() => onBlur("phone")} />
                    </Field>
                    <Field label="Correo electrónico" error={errors.email} touched={touched.email}>
                        <input style={{ ...s.input, ...(touched.email && errors.email ? s.inputError : {}) }}
                            type="email" placeholder="correo@ejemplo.com" value={values.email}
                            onChange={(e) => onChange("email", e.target.value)} onBlur={() => onBlur("email")} />
                    </Field>
                    <Field label="Dirección">
                        <input style={s.input} placeholder="Calle, colonia, ciudad..." value={values.address} onChange={(e) => onChange("address", e.target.value)} />
                    </Field>
                    <Field label="Contacto de emergencia">
                        <input style={s.input} placeholder="Nombre · Teléfono" value={values.emergencyContact} onChange={(e) => onChange("emergencyContact", e.target.value)} />
                    </Field>

                    <p style={{ ...s.sectionLabel, marginTop: 16 }}><i className="ti ti-notes" style={{ fontSize: 12 }} aria-hidden /> Notas</p>
                    <textarea style={{ ...s.input, resize: "vertical", minHeight: 72, lineHeight: 1.5 }}
                        placeholder="Lesiones, preferencias, observaciones..." value={values.notes}
                        onChange={(e) => onChange("notes", e.target.value)} />

                    <div style={s.drawerFooter}>
                        <button type="button" style={s.btnGhost} onClick={onClose} disabled={saving}>Cancelar</button>
                        <button type="submit" style={{ ...s.btnPrimary, opacity: saving ? 0.7 : 1 }} disabled={saving}>
                            {saving ? <><span style={s.spinner} />Guardando…</>
                                : <><i className="ti ti-check" style={{ fontSize: 13 }} aria-hidden />{editingId ? "Guardar cambios" : "Crear miembro"}</>}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
    if (!value) return null;
    return <div style={sd.row}><span style={sd.label}>{label}</span><span style={sd.value}>{value}</span></div>;
}

function MemberDetailDrawer({ member, open, onClose, onEdit }: {
    member: Member | null; open: boolean; onClose: () => void; onEdit: () => void;
}) {
    useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);
    if (!member) return null;
    const fmtDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" }) : undefined;
    return (
        <>
            <div style={{ ...s.overlay, opacity: open ? 1 : 0, pointerEvents: open ? "all" : "none", zIndex: 800 }} onClick={onClose} aria-hidden />
            <div style={{ ...s.drawer, transform: open ? "translateX(0)" : "translateX(100%)" }} role="dialog" aria-modal aria-label="Detalle del miembro">
                <div style={s.drawerHeader}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ ...sd.avatar, background: member.membershipStatus === "inactive" ? "#FFF4F0" : "#1a1a1a", color: "#fff" }}>
                            {initials(member.firstName, member.lastName)}
                        </div>
                        <div>
                            <p style={s.drawerTitle}>{member.firstName} {member.lastName}</p>
                            <span style={{ ...sd.badge, background: member.membershipStatus === "active" ? "#3a7d44" : "#888" }}>
                                {statusLabel[member.membershipStatus] ?? member.membershipStatus}
                            </span>
                        </div>
                    </div>
                    <button style={s.btnIcon} onClick={onClose}><i className="ti ti-x" style={{ fontSize: 16 }} aria-hidden /></button>
                </div>
                <div style={{ ...s.drawerBody, gap: 0 }}>
                    <p style={s.sectionLabel}><i className="ti ti-user" style={{ fontSize: 12 }} aria-hidden /> Datos personales</p>
                    <div style={sd.section}>
                        <DetailRow label="Nombre completo" value={`${member.firstName} ${member.lastName}`} />
                        <DetailRow label="Género" value={genderLabel[member.gender ?? ""] ?? undefined} />
                        <DetailRow label="Fecha de nacimiento" value={fmtDate(member.birthDate)} />
                    </div>
                    <p style={{ ...s.sectionLabel, marginTop: 16 }}><i className="ti ti-phone" style={{ fontSize: 12 }} aria-hidden /> Contacto</p>
                    <div style={sd.section}>
                        <DetailRow label="Teléfono" value={member.phone} />
                        <DetailRow label="Correo" value={member.email} />
                        <DetailRow label="Dirección" value={member.address} />
                        <DetailRow label="Contacto emergencia" value={member.emergencyContact} />
                    </div>
                    {member.notes && <>
                        <p style={{ ...s.sectionLabel, marginTop: 16 }}><i className="ti ti-notes" style={{ fontSize: 12 }} aria-hidden /> Notas</p>
                        <p style={{ margin: 0, fontSize: 13, color: "#555", lineHeight: 1.6, padding: "9px 12px", background: "#FAFAFA", border: "1px solid #F0F0EE", borderRadius: 7 }}>{member.notes}</p>
                    </>}
                    <p style={{ ...s.sectionLabel, marginTop: 16 }}><i className="ti ti-clock" style={{ fontSize: 12 }} aria-hidden /> Registro</p>
                    <div style={sd.section}>
                        <DetailRow label="Alta" value={fmtDate(member.createdAt)} />
                        <DetailRow label="Última actualización" value={fmtDate(member.updatedAt)} />
                    </div>
                    <p style={{ ...s.sectionLabel, marginTop: 16 }}><i className="ti ti-qrcode" style={{ fontSize: 12 }} aria-hidden /> Código QR</p>
                    <div style={sd.section}>
                        <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
                            <QRCodeSVG value={member.id} size={140} level="M" />
                        </div>
                        <p style={{ fontSize: 10, color: "#bbb", textAlign: "center", margin: "0 0 12px" }}>
                            Escanea para registrar entrada
                        </p>
                    </div>
                </div>
                <div style={s.drawerFooter}>
                    <button style={s.btnGhost} onClick={onClose}>Cerrar</button>
                    <button style={s.btnPrimary} onClick={onEdit}><i className="ti ti-edit" style={{ fontSize: 13 }} aria-hidden />Editar miembro</button>
                </div>
            </div>
        </>
    );
}

const sd: Record<string, React.CSSProperties> = {
    avatar: { width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, flexShrink: 0 },
    badge: { display: "inline-flex", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500, color: "#fff", marginTop: 4 },
    section: { background: "#FAFAFA", border: "1px solid #F0F0EE", borderRadius: 7, overflow: "hidden", marginTop: 6 },
    row: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "9px 12px", borderBottom: "1px solid #F5F5F4", gap: 16 },
    label: { fontSize: 11, color: "#bbb", fontWeight: 500, flexShrink: 0 },
    value: { fontSize: 12, color: "#1a1a1a", textAlign: "right" as const, wordBreak: "break-word" as const },
};

function exportExcel(members: Member[]) {
    const rows = members.map((m) => ({
        Nombre: `${m.firstName} ${m.lastName}`, Correo: m.email ?? "", Teléfono: m.phone,
        Género: genderLabel[m.gender ?? ""] ?? "", Estado: statusLabel[m.membershipStatus] ?? m.membershipStatus,
        "Fecha de nacimiento": m.birthDate ? m.birthDate.slice(0, 10) : "", Dirección: m.address ?? "",
        "Contacto emergencia": m.emergencyContact ?? "", Notas: m.notes ?? "",
        "Registrado el": new Date(m.createdAt).toLocaleDateString("es-MX"),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 28 }, { wch: 28 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 30 }, { wch: 24 }, { wch: 24 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Miembros");
    XLSX.writeFile(wb, `ZenithGym_Miembros_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function exportPDF(members: Member[]) {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(26, 26, 26);
    doc.text("ZenithGym · Lista de miembros", 14, 16);
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(136, 136, 136);
    doc.text(`Generado el ${new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })} · ${members.length} miembro${members.length !== 1 ? "s" : ""}`, 14, 22);
    autoTable(doc, {
        startY: 28, head: [["Nombre", "Correo", "Teléfono", "Género", "Estado", "Registrado el"]],
        body: members.map((m) => [`${m.firstName} ${m.lastName}`, m.email ?? "—", m.phone, genderLabel[m.gender ?? ""] ?? "—", statusLabel[m.membershipStatus] ?? m.membershipStatus, new Date(m.createdAt).toLocaleDateString("es-MX")]),
        styles: { font: "helvetica", fontSize: 9, cellPadding: 3, textColor: [26, 26, 26] },
        headStyles: { fillColor: [250, 250, 250], textColor: [136, 136, 136], fontStyle: "normal", lineWidth: 0.1, lineColor: [229, 228, 226] },
        alternateRowStyles: { fillColor: [252, 252, 251] }, tableLineColor: [229, 228, 226], tableLineWidth: 0.1,
    });
    doc.save(`ZenithGym_Miembros_${new Date().toISOString().slice(0, 10)}.pdf`);
}

const emptyForm = { firstName: "", lastName: "", email: "", phone: "", gender: "", birthDate: "", address: "", emergencyContact: "", notes: "" };

export default function MembersPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [formValues, setFormValues] = useState({ ...emptyForm });
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [viewMember, setViewMember] = useState<Member | null>(null);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterGender, setFilterGender] = useState("");
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmTarget, setConfirmTarget] = useState<Member | null>(null);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [toasts, setToasts] = useState<ToastMsg[]>([]);
    const toastId = useRef(0);

    const addToast = useCallback((text: string, type: "success" | "error" = "success") => {
        const id = ++toastId.current;
        setToasts((p) => [...p, { id, text, type }]);
        setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
    }, []);

    const loadMembers = useCallback(async () => { const res = await getMembers(); setMembers(res.data ?? []); }, []);

    useSocketRefresh(["member_created", "member_updated", "member_deactivated"], loadMembers);

    useEffect(() => { (async () => { try { await loadMembers(); } finally { setLoading(false); } })(); }, [loadMembers]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        return members.filter((m) => {
            const nameMatch = !q || `${m.firstName} ${m.lastName} ${m.email ?? ""} ${m.phone}`.toLowerCase().includes(q);
            const statusMatch = !filterStatus || m.membershipStatus === filterStatus;
            const genderMatch = !filterGender || m.gender === filterGender;
            return nameMatch && statusMatch && genderMatch;
        });
    }, [members, search, filterStatus, filterGender]);

    const hasFilters = search || filterStatus || filterGender;
    const clearFilters = () => { setSearch(""); setFilterStatus(""); setFilterGender(""); };

    const openNew = () => { setEditingId(null); setFormValues({ ...emptyForm }); setErrors({}); setTouched({}); setDrawerOpen(true); };

    const openEdit = (m: Member) => {
        setEditingId(m.id);
        setFormValues({ firstName: m.firstName, lastName: m.lastName, email: m.email ?? "", phone: m.phone, gender: m.gender ?? "", birthDate: m.birthDate ? m.birthDate.slice(0, 10) : "", address: m.address ?? "", emergencyContact: m.emergencyContact ?? "", notes: m.notes ?? "" });
        setErrors({}); setTouched({}); setDrawerOpen(true);
    };

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
            const { firstName, lastName, email, phone, gender, birthDate, address, emergencyContact, notes } = formValues;
            const data = { firstName, lastName, phone, ...(email && { email }), ...(gender && { gender }), ...(birthDate && { birthDate }), ...(address && { address }), ...(emergencyContact && { emergencyContact }), ...(notes && { notes }) };
            if (editingId) { await updateMember(editingId, data); addToast("Miembro actualizado"); }
            else { await createMember(data); addToast("Miembro creado correctamente"); }
            setDrawerOpen(false); await loadMembers();
        } catch { addToast("Error al guardar.", "error"); } finally { setSaving(false); }
    };

    const requestToggle = (m: Member) => { setConfirmTarget(m); setConfirmOpen(true); };
    const confirmToggle = async () => {
        if (!confirmTarget) return;
        setConfirmLoading(true);
        try {
            const newStatus = confirmTarget.membershipStatus === "active" ? "inactive" : "active";
            await updateMember(confirmTarget.id, { membershipStatus: newStatus });
            addToast(newStatus === "active" ? `${confirmTarget.firstName} activado` : `${confirmTarget.firstName} desactivado`);
            await loadMembers();
        } catch { addToast("No se pudo cambiar el estado.", "error"); } finally { setConfirmLoading(false); setConfirmOpen(false); setConfirmTarget(null); }
    };
    const isDeactivating = confirmTarget?.membershipStatus === "active";

    return (
        <div style={s.page}>
            <Toast toasts={toasts} onRemove={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
            <ConfirmModal open={confirmOpen} title={isDeactivating ? "Desactivar miembro" : "Activar miembro"}
                body={isDeactivating ? `${confirmTarget?.firstName} ${confirmTarget?.lastName} perderá acceso al gimnasio.` : `${confirmTarget?.firstName} ${confirmTarget?.lastName} volverá a tener acceso activo.`}
                confirmLabel={isDeactivating ? "Sí, desactivar" : "Sí, activar"} confirmColor={isDeactivating ? "#c0392b" : "#3a7d44"}
                loading={confirmLoading} onConfirm={confirmToggle} onCancel={() => { setConfirmOpen(false); setConfirmTarget(null); }} />
            <MemberDetailDrawer member={viewMember} open={!!viewMember} onClose={() => setViewMember(null)}
                onEdit={() => { if (viewMember) { openEdit(viewMember); setViewMember(null); } }} />
            <MemberDrawer open={drawerOpen} editingId={editingId} saving={saving} values={formValues} errors={errors} touched={touched}
                onChange={handleFieldChange} onBlur={handleBlur} onSubmit={handleSubmit} onClose={() => setDrawerOpen(false)} />
            <PageHeader title="Miembros" action={<GymButton icon="ti-plus" onClick={openNew}>Nuevo miembro</GymButton>} />
            <div style={s.content}>
                <div style={s.toolbar}>
                    <div style={s.searchWrap}>
                        <i className="ti ti-search" style={s.searchIcon} aria-hidden />
                        <input style={s.searchInput} placeholder="Buscar por nombre, correo o teléfono…" value={search} onChange={(e) => setSearch(e.target.value)} />
                        {search && <button style={s.clearBtn} onClick={() => setSearch("")}><i className="ti ti-x" style={{ fontSize: 12 }} aria-hidden /></button>}
                    </div>
                    <select style={s.filterSelect} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="">Todos los estados</option><option value="active">Activos</option><option value="inactive">Inactivos</option>
                    </select>
                    <select style={s.filterSelect} value={filterGender} onChange={(e) => setFilterGender(e.target.value)}>
                        <option value="">Todos los géneros</option><option value="male">Masculino</option><option value="female">Femenino</option><option value="other">Otro</option>
                    </select>
                    {hasFilters && <button style={s.btnClear} onClick={clearFilters}><i className="ti ti-filter-off" style={{ fontSize: 12 }} aria-hidden /> Limpiar</button>}
                    <div style={{ flex: 1 }} />
                    <button style={s.btnExport} onClick={() => exportExcel(filtered)}><i className="ti ti-table-export" style={{ fontSize: 14 }} aria-hidden />Excel</button>
                    <button style={s.btnExport} onClick={() => exportPDF(filtered)}><i className="ti ti-file-type-pdf" style={{ fontSize: 14 }} aria-hidden />PDF</button>
                </div>
                {!loading && <p style={s.resultCount}>{hasFilters ? `${filtered.length} de ${members.length}` : `${members.length} miembro${members.length !== 1 ? "s" : ""}`}</p>}
                {loading ? <p style={s.empty}>Cargando miembros…</p>
                : filtered.length === 0 ? (
                    <div style={s.emptyState}>
                        <i className="ti ti-users-group" style={{ fontSize: 32, color: "#D0D0CE", marginBottom: 10 }} aria-hidden />
                        <p style={{ margin: 0, fontSize: 13, color: "#bbb", fontWeight: 500 }}>{hasFilters ? "Sin resultados" : "No hay miembros registrados"}</p>
                        {hasFilters && <button style={{ ...s.btnClear, marginTop: 12 }} onClick={clearFilters}>Quitar filtros</button>}
                    </div>
                ) : (
                    <div style={{ ...s.card, padding: 0 }}>
                        <table style={s.table}>
                            <thead><tr style={s.thead}>
                                <th style={s.th}>Miembro</th><th style={s.th}>Correo</th><th style={s.th}>Teléfono</th><th style={s.th}>Género</th><th style={s.th}>Estado</th><th style={s.th}>Acciones</th>
                            </tr></thead>
                            <tbody>{filtered.map((m) => (
                                <tr key={m.id} style={s.row} className="member-row">
                                    <td style={s.td}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <div style={{ ...s.avatar, background: m.membershipStatus === "inactive" ? "#FFF4F0" : "#F0F0EE", color: m.membershipStatus === "inactive" ? "#c0392b" : "#666" }}>{initials(m.firstName, m.lastName)}</div>
                                            <div><p style={s.listName}>{m.firstName} {m.lastName}</p>{m.notes && <p style={s.listSub}>{m.notes}</p>}</div>
                                        </div>
                                    </td>
                                    <td style={{ ...s.td, ...s.muted }}>{m.email ?? "—"}</td>
                                    <td style={{ ...s.td, ...s.muted }}>{m.phone}</td>
                                    <td style={{ ...s.td, ...s.muted }}>{genderLabel[m.gender ?? ""] ?? "—"}</td>
                                    <td style={s.td}><span style={{ ...s.badge, ...statusStyle(m.membershipStatus) }}>{statusLabel[m.membershipStatus] ?? m.membershipStatus}</span></td>
                                    <td style={s.td}>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            <button style={s.btnAction} onClick={() => setViewMember(m)}>Ver</button>
                                            <button style={s.btnAction} onClick={() => openEdit(m)}><i className="ti ti-edit" style={{ fontSize: 13 }} aria-hidden />Editar</button>
                                            <button style={{ ...s.btnAction, color: m.membershipStatus === "active" ? "#c0392b" : "#3a7d44", borderColor: m.membershipStatus === "active" ? "#fecaca" : "#bbf7d0" }}
                                                onClick={() => requestToggle(m)}>
                                                <i className={`ti ${m.membershipStatus === "active" ? "ti-user-off" : "ti-user-check"}`} style={{ fontSize: 13 }} aria-hidden />
                                                {m.membershipStatus === "active" ? "Desactivar" : "Activar"}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                )}
            </div>
            <style>{`.member-row { transition: background 0.1s ease; } .member-row:hover { background: #FAFAFA; } .member-row:last-child { border-bottom: none !important; } @keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    page: { display: "flex", flexDirection: "column", minHeight: "100%", position: "relative" },
    content: { padding: "16px 28px 28px", display: "flex", flexDirection: "column", gap: 10 },
    toastStack: { position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" },
    toast: { display: "flex", alignItems: "center", gap: 8, color: "#fff", fontSize: 12, fontWeight: 500, padding: "9px 14px", borderRadius: 8, animation: "fadeIn 0.2s ease", cursor: "pointer", pointerEvents: "all", boxShadow: "0 2px 12px rgba(0,0,0,0.18)" },
    overlay: { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity 0.2s ease" },
    modal: { background: "#fff", borderRadius: 12, padding: "24px", width: 360, boxShadow: "0 8px 32px rgba(0,0,0,0.14)", outline: "none" },
    modalTitle: { fontSize: 14, fontWeight: 600, color: "#1a1a1a", margin: "0 0 8px" },
    modalBody: { fontSize: 13, color: "#666", margin: 0, lineHeight: 1.5 },
    drawer: { position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 900, width: 440, background: "#fff", borderLeft: "1px solid #E5E4E2", display: "flex", flexDirection: "column", transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)", boxShadow: "-4px 0 24px rgba(0,0,0,0.08)" },
    drawerHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "22px 24px 18px", borderBottom: "1px solid #F0F0EE", flexShrink: 0 },
    drawerTitle: { fontSize: 15, fontWeight: 600, color: "#1a1a1a", margin: 0 },
    drawerSub: { fontSize: 12, color: "#bbb", margin: "3px 0 0" },
    drawerBody: { flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 },
    drawerFooter: { display: "flex", gap: 8, justifyContent: "flex-end", padding: "14px 24px", borderTop: "1px solid #F0F0EE", flexShrink: 0 },
    sectionLabel: { fontSize: 10, fontWeight: 600, color: "#bbb", textTransform: "uppercase" as const, letterSpacing: "0.06em", margin: "4px 0 4px", display: "flex", alignItems: "center", gap: 5 },
    formGrid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
    fieldLabel: { fontSize: 11, fontWeight: 500, color: "#555" },
    fieldError: { fontSize: 10, color: "#c0392b", marginTop: 1 },
    input: { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 7, padding: "8px 11px", fontSize: 13, color: "#1a1a1a", outline: "none", width: "100%", fontFamily: "inherit", boxSizing: "border-box" as const, transition: "border-color 0.15s" },
    inputError: { borderColor: "#fecaca" },
    toolbar: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const },
    searchWrap: { position: "relative", display: "flex", alignItems: "center", flex: "0 0 260px" },
    searchIcon: { position: "absolute", left: 10, fontSize: 14, color: "#bbb", pointerEvents: "none" },
    searchInput: { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 8, padding: "7px 28px 7px 32px", fontSize: 12, color: "#1a1a1a", outline: "none", width: "100%", fontFamily: "inherit" },
    clearBtn: { position: "absolute", right: 8, background: "none", border: "none", cursor: "pointer", color: "#bbb", padding: 2, display: "flex", alignItems: "center" },
    filterSelect: { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 8, padding: "7px 10px", fontSize: 12, color: "#555", fontFamily: "inherit", cursor: "pointer", outline: "none" },
    btnClear: { display: "inline-flex", alignItems: "center", gap: 5, background: "none", color: "#888", border: "1px solid #E5E4E2", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontFamily: "inherit", cursor: "pointer" },
    btnExport: { display: "inline-flex", alignItems: "center", gap: 5, background: "#F7F7F6", color: "#555", border: "1px solid #E5E4E2", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" },
    resultCount: { fontSize: 11, color: "#bbb", margin: 0 },
    btnPrimary: { display: "inline-flex", alignItems: "center", gap: 6, background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" },
    btnGhost: { background: "none", color: "#555", border: "1px solid #E5E4E2", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" },
    btnConfirm: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", minWidth: 110 },
    btnIcon: { background: "none", border: "none", cursor: "pointer", color: "#bbb", padding: 4, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" },
    spinner: { display: "inline-block", width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
    card: { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, overflow: "hidden" },
    table: { width: "100%", borderCollapse: "collapse" },
    thead: { borderBottom: "1px solid #E5E4E2", background: "#FAFAFA" },
    th: { padding: "10px 14px", fontSize: 11, fontWeight: 500, color: "#bbb", textAlign: "left", whiteSpace: "nowrap" },
    row: { borderBottom: "1px solid #F0F0EE" },
    td: { padding: "11px 14px", fontSize: 13, color: "#1a1a1a" },
    muted: { color: "#888", fontSize: 12 },
    badge: { display: "inline-flex", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500 },
    avatar: { width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, flexShrink: 0 },
    listName: { margin: 0, fontWeight: 500, fontSize: 13, color: "#1a1a1a" },
    listSub: { margin: 0, fontSize: 11, color: "#bbb" },
    empty: { fontSize: 13, color: "#bbb", padding: "40px 0", textAlign: "center" },
    emptyState: { display: "flex", flexDirection: "column", alignItems: "center", padding: "52px 0", background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8 },
    btnAction: { display: "inline-flex", alignItems: "center", gap: 5, background: "none", color: "#555", border: "1px solid #E5E4E2", borderRadius: 6, padding: "6px 11px", fontSize: 12, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", transition: "background 0.12s, border-color 0.12s, color 0.12s" },
};
