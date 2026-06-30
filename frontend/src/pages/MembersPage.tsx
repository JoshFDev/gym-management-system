import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { QRCodeSVG } from "qrcode.react";
import { createMember, getMembers, updateMember, deleteMember, sendQRCodeEmail } from "../services/member.service";
import PageHeader from "../components/PageHeader";
import GymButton from "../components/GymButton";
import Pagination from "../components/Pagination";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { useSocketRefresh } from "../hooks/useSocketRefresh";
import { useToast } from "../hooks/useToast";
import { useDebounce } from "../hooks/useDebounce";
import { useUnsavedChanges } from "../hooks/useUnsavedChanges";
import ConfirmModal from "../components/ConfirmModal";

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

interface FormErrors { firstName?: string; lastName?: string; phone?: string; email?: string; birthDate?: string }

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
    if (values.birthDate) {
        const birth = new Date(values.birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        if (age < 12) e.birthDate = "Debe tener al menos 12 años";
        else if (age > 100) e.birthDate = "Fecha inválida";
    }
    return e;
};



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
            <div className="drawer-panel" style={{ ...s.drawer, transform: open ? "translateX(0)" : "translateX(100%)" }} role="dialog" aria-modal aria-label={editingId ? "Editar miembro" : "Nuevo miembro"}>
                <div style={s.drawerHeader}>
                    <div>
                        <p style={s.drawerTitle}>{editingId ? "Editar miembro" : "Nuevo miembro"}</p>
                        <p style={s.drawerSub}>{editingId ? "Modifica los datos del miembro" : "Completa los datos para registrar"}</p>
                    </div>
                    <button style={s.btnIcon} onClick={onClose}><i className="ti ti-x" style={{ fontSize: 16 }} aria-hidden /></button>
                </div>
                <form onSubmit={onSubmit} style={s.drawerBody} noValidate>
                    <p style={s.sectionLabel}><i className="ti ti-user" style={{ fontSize: 12 }} aria-hidden /> Datos personales</p>
                    <div className="drawer-grid-2" style={s.formGrid2}>
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

function MemberDetailDrawer({ member, open, onClose, onEdit, addToast }: {
    member: Member | null; open: boolean; onClose: () => void; onEdit: () => void; addToast: (msg: string, type?: "success" | "error") => void;
}) {
    const navigate = useNavigate();
    useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);
    if (!member) return null;
    const fmtDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" }) : undefined;
    return (
        <>
            <div style={{ ...s.overlay, opacity: open ? 1 : 0, pointerEvents: open ? "all" : "none", zIndex: 800 }} onClick={onClose} aria-hidden />
            <div className="drawer-panel" style={{ ...s.drawer, transform: open ? "translateX(0)" : "translateX(100%)" }} role="dialog" aria-modal aria-label="Detalle del miembro">
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
                        <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid #F0F0EE" }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{member.firstName} {member.lastName}</p>
                            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#888" }}>{member.phone}</p>
                            {member.email && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#888" }}>{member.email}</p>}
                            <span style={{ display: "inline-flex", marginTop: 6, padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 500, background: member.membershipStatus === "active" ? "#F0F7F1" : "#F0F0EE", color: member.membershipStatus === "active" ? "#3a7d44" : "#888" }}>
                                {statusLabel[member.membershipStatus] ?? member.membershipStatus}
                            </span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "14px" }}>
                            <QRCodeSVG id="member-qr" value={member.id} size={130} level="M" />
                            <p style={{ fontSize: 10, color: "#bbb", margin: "8px 0 0" }}>
                                Escanea para registrar entrada
                            </p>
                            <button style={{ ...s.btnAction, marginTop: 10, background: "#1a1a1a", color: "#fff", borderColor: "#1a1a1a", gap: 6 }}
                                onClick={() => {
                                    const svg = document.getElementById("member-qr");
                                    if (!svg) return;
                                    const svgData = new XMLSerializer().serializeToString(svg);
                                    const canvas = document.createElement("canvas");
                                    canvas.width = 300; canvas.height = 300;
                                    const ctx = canvas.getContext("2d");
                                    const img = new Image();
                                    img.onload = () => {
                                        ctx!.fillStyle = "#fff";
                                        ctx!.fillRect(0, 0, 300, 300);
                                        ctx!.drawImage(img, 10, 10, 280, 280);
                                        const link = document.createElement("a");
                                        link.download = `${member.firstName}_${member.lastName}_QR.png`;
                                        link.href = canvas.toDataURL("image/png");
                                        link.click();
                                    };
                                    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
                                }}>
                                <i className="ti ti-download" style={{ fontSize: 13 }} aria-hidden />Descargar QR
                            </button>
                            {member.email && (
                                <button style={{ ...s.btnAction, marginTop: 8, background: "none", color: "#555", borderColor: "#E5E4E2", gap: 6 }}
                                    onClick={async () => {
                                        try {
                                            await sendQRCodeEmail(member.id);
                                            addToast("QR enviado al correo del miembro");
                                        } catch { addToast("No se pudo enviar el QR", "error"); }
                                    }}>
                                    <i className="ti ti-mail" style={{ fontSize: 13 }} aria-hidden />Enviar QR por correo
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                <div style={s.drawerFooter}>
                    <button style={s.btnGhost} onClick={onClose}>Cerrar</button>
                    <button style={s.btnPrimary} onClick={() => navigate(`/members/${member.id}`)}>
                        <i className="ti ti-external-link" style={{ fontSize: 13 }} aria-hidden />Perfil completo
                    </button>
                    <button style={s.btnPrimary} onClick={onEdit}><i className="ti ti-edit" style={{ fontSize: 13 }} aria-hidden />Editar</button>
                </div>
            </div>
        </>
    );
}

const sd: Record<string, React.CSSProperties> = {
    avatar: { width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, flexShrink: 0 },
    badge: { display: "inline-flex", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500, color: "#fff", marginTop: 4 },
    section: { background: "#FAFAFA", border: "1px solid #F0F0EE", borderRadius: 7, marginTop: 6 },
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

const playConfirmSound = () => {
    try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 660;
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
    } catch { /* ignore */ }
};

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
    const [search, setSearchState] = useState("");
    const debouncedSearch = useDebounce(search);
    const [filterStatus, setFilterStatusState] = useState("");
    const [filterGender, setFilterGenderState] = useState("");
    const setSearch = (v: string) => { setSearchState(v); setPage(1); };
    const setFilterStatus = (v: string) => { setFilterStatusState(v); setPage(1); };
    const setFilterGender = (v: string) => { setFilterGenderState(v); setPage(1); };
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmTarget, setConfirmTarget] = useState<Member | null>(null);
    const [confirmLoading, setConfirmLoading] = useState(false);

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
    const [bulkDeleting, setBulkDeleting] = useState(false);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 20;
    const { addToast } = useToast();
    useUnsavedChanges(drawerOpen);

    const loadMembers = useCallback(async (targetPage: number) => {
        const res = await getMembers(targetPage, limit, { search: debouncedSearch, status: filterStatus, gender: filterGender });
        setMembers(res.data ?? []);
        setTotal(res.total ?? 0);
        setTotalPages(res.totalPages ?? 1);
    }, [debouncedSearch, filterStatus, filterGender]);

    useSocketRefresh(["member_created", "member_updated", "member_deactivated", "member_deleted"], () => loadMembers(page));

    useEffect(() => { (async () => { try { await loadMembers(page); } catch { /* handled in loadMembers */ } finally { setLoading(false); } })(); }, [loadMembers, page]);

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
            setDrawerOpen(false); await loadMembers(page);
        } catch { addToast("Error al guardar.", "error"); } finally { setSaving(false); }
    };

    const requestToggle = (m: Member) => { setConfirmTarget(m); setConfirmOpen(true); };
    const confirmToggle = async () => {
        if (!confirmTarget) return;
        const newStatus = confirmTarget.membershipStatus === "active" ? "inactive" : "active";
        const prev = members;
        setMembers((current) => current.map((m) => m.id === confirmTarget.id ? { ...m, membershipStatus: newStatus } : m));
        setConfirmLoading(true);
        try {
            await updateMember(confirmTarget.id, { membershipStatus: newStatus });
            addToast(newStatus === "active" ? `${confirmTarget.firstName} activado` : `${confirmTarget.firstName} desactivado`);
        } catch {
            setMembers(prev);
            addToast("No se pudo cambiar el estado.", "error");
        } finally { setConfirmLoading(false); setConfirmOpen(false); setConfirmTarget(null); }
    };
    const isDeactivating = confirmTarget?.membershipStatus === "active";
    const selectedMembers = members.filter((m) => selectedIds.includes(m.id));
    const allInactive = selectedMembers.length > 0 && selectedMembers.every((m) => m.membershipStatus === "inactive");

    return (
        <div style={s.page}>

            <ConfirmModal open={confirmOpen} title={isDeactivating ? "Desactivar miembro" : "Activar miembro"}
                body={isDeactivating ? `${confirmTarget?.firstName} ${confirmTarget?.lastName} perderá acceso al gimnasio.` : `${confirmTarget?.firstName} ${confirmTarget?.lastName} volverá a tener acceso activo.`}
                confirmLabel={isDeactivating ? "Sí, desactivar" : "Sí, activar"} confirmColor={isDeactivating ? "#c0392b" : "#3a7d44"}
                loading={confirmLoading} onConfirm={() => { playConfirmSound(); confirmToggle(); }} onCancel={() => { setConfirmOpen(false); setConfirmTarget(null); }} />

            <ConfirmModal open={bulkConfirmOpen}
                title={allInactive ? "Eliminar miembros" : "Desactivar miembros"}
                body={allInactive
                    ? `¿Eliminar ${selectedIds.length} miembro${selectedIds.length !== 1 ? "s" : ""} seleccionado${selectedIds.length !== 1 ? "s" : ""} permanentemente? Los miembros con suscripción activa no se eliminarán.`
                    : `¿Desactivar ${selectedIds.length} miembro${selectedIds.length !== 1 ? "s" : ""} seleccionado${selectedIds.length !== 1 ? "s" : ""}? Perderán acceso al gimnasio.`}
                confirmLabel={allInactive ? "Sí, eliminar" : "Sí, desactivar"}
                confirmColor={allInactive ? "#c0392b" : "#854F0B"}
                loading={bulkDeleting}
                onConfirm={async () => {
                    playConfirmSound();
                    setBulkDeleting(true);
                    let ok = 0;
                    let skipped = 0;
                    for (const id of selectedIds) {
                        try {
                            if (allInactive) {
                                await deleteMember(id);
                            } else {
                                await updateMember(id, { membershipStatus: "inactive" });
                            }
                            ok++;
                        } catch {
                            skipped++;
                        }
                    }
                    if (ok > 0) addToast(allInactive
                        ? `${ok} miembro${ok !== 1 ? "s" : ""} eliminado${ok !== 1 ? "s" : ""}`
                        : `${ok} miembro${ok !== 1 ? "s" : ""} desactivado${ok !== 1 ? "s" : ""}`);
                    if (skipped > 0) addToast(`${skipped} omitido${skipped !== 1 ? "s" : ""}`, "error");
                    setSelectedIds([]);
                    await loadMembers(page);
                    setBulkDeleting(false);
                    setBulkConfirmOpen(false);
                }}
                onCancel={() => setBulkConfirmOpen(false)} />
            <MemberDetailDrawer member={viewMember} open={!!viewMember} onClose={() => setViewMember(null)}
                onEdit={() => { if (viewMember) { openEdit(viewMember); setViewMember(null); } }} addToast={addToast} />
            <MemberDrawer open={drawerOpen} editingId={editingId} saving={saving} values={formValues} errors={errors} touched={touched}
                onChange={handleFieldChange} onBlur={handleBlur} onSubmit={handleSubmit} onClose={() => setDrawerOpen(false)} />
            <PageHeader title="Miembros" action={<GymButton icon="ti-plus" onClick={openNew}>Nuevo miembro</GymButton>} />
            <div style={s.content}>
                <div className="toolbar-card" style={s.toolbarCard}>
                <div className="toolbar-wrap" style={s.toolbar}>
                    <div className="search-wrap" style={s.searchWrap}>
                        <i className="ti ti-search" style={s.searchIcon} aria-hidden />
                        <input style={s.searchInput} placeholder="Buscar por nombre, correo o teléfono…" value={search} onChange={(e) => setSearch(e.target.value)} />
                        {search && <button style={s.clearBtn} onClick={() => setSearch("")}><i className="ti ti-x" style={{ fontSize: 12 }} aria-hidden /></button>}
                    </div>
                    <div className="filter-group" style={s.filterGroup}>
                        <select style={s.filterSelect} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                            <option value="">Todos los estados</option><option value="active">Activos</option><option value="inactive">Inactivos</option>
                        </select>
                        <select style={s.filterSelect} value={filterGender} onChange={(e) => setFilterGender(e.target.value)}>
                            <option value="">Todos los géneros</option><option value="male">Masculino</option><option value="female">Femenino</option><option value="other">Otro</option>
                        </select>
                        {hasFilters && <button style={s.btnClear} onClick={clearFilters}><i className="ti ti-filter-off" style={{ fontSize: 12 }} aria-hidden /> Limpiar</button>}
                    </div>
                    <div className="export-group" style={s.exportGroup}>
                        <button style={s.btnExport} onClick={() => exportExcel(members)}><i className="ti ti-table-export" style={{ fontSize: 14 }} aria-hidden />Excel</button>
                        <button style={s.btnExport} onClick={() => exportPDF(members)}><i className="ti ti-file-type-pdf" style={{ fontSize: 14 }} aria-hidden />PDF</button>
                    </div>
                </div>
                </div>
                {!loading && <p style={s.resultCount}>{hasFilters ? `${members.length} de ${total}` : `${total} miembro${total !== 1 ? "s" : ""}`}</p>}
                {loading ? <div style={{ padding: "20px 14px" }}><LoadingSkeleton rows={6} /></div>
                : members.length === 0 ? (
                    <div style={s.emptyState}>
                        <i className="ti ti-users-group" style={{ fontSize: 32, color: "#D0D0CE", marginBottom: 10 }} aria-hidden />
                        <p style={{ margin: 0, fontSize: 13, color: "#bbb", fontWeight: 500 }}>{hasFilters ? "Sin resultados" : "No hay miembros registrados"}</p>
                        {hasFilters && <button style={{ ...s.btnClear, marginTop: 12 }} onClick={clearFilters}>Quitar filtros</button>}
                    </div>
                ) : (
                    <>
                    {selectedIds.length > 0 && (
                        <div style={s.bulkBar}>
                            <span style={{ fontSize: 12, color: "#555", fontWeight: 500 }}>
                                {selectedIds.length} seleccionado{selectedIds.length !== 1 ? "s" : ""}
                            </span>
                            <button style={{ ...s.bulkDeleteBtn, background: allInactive ? "#c0392b" : undefined }} onClick={() => setBulkConfirmOpen(true)}>
                                <i className={`ti ${allInactive ? "ti-trash" : "ti-user-off"}`} style={{ fontSize: 13 }} aria-hidden />
                                {allInactive ? "Eliminar seleccionados" : "Desactivar seleccionados"}
                            </button>
                            <button style={s.bulkCancelBtn} onClick={() => setSelectedIds([])}>
                                Cancelar
                            </button>
                        </div>
                    )}
                    <div style={{ ...s.card, padding: 0 }}>
                        <div className="table-scroll">
                        <table style={s.table}>
                            <thead><tr style={s.thead}>
                                <th style={{ ...s.th, width: 36, paddingLeft: 16 }}>
                                    <input type="checkbox" checked={selectedIds.length === members.length && members.length > 0}
                                        onChange={(e) => setSelectedIds(e.target.checked ? members.map((m) => m.id) : [])}
                                        style={{ accentColor: "#1a1a1a", cursor: "pointer", margin: 0 }} />
                                </th>
                                <th style={s.th}>Miembro</th><th style={s.th}>Contacto</th><th style={s.th}>Género</th><th style={s.th}>Estado</th><th style={s.th}>Acciones</th>
                            </tr></thead>
                            <tbody>{members.map((m) => {
                                const checked = selectedIds.includes(m.id);
                                const isActive = m.membershipStatus === "active";
                                return (
                                <tr key={m.id} style={s.row} className="member-row" onClick={() => setViewMember(m)}>
                                    <td style={{ ...s.td, width: 36, paddingLeft: 16 }} onClick={(e) => e.stopPropagation()}>
                                        <input type="checkbox" checked={checked}
                                            onChange={() => setSelectedIds((prev) =>
                                                checked ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                                            )}
                                            style={{ accentColor: "#1a1a1a", cursor: "pointer", margin: 0 }} />
                                    </td>
                                    <td style={s.td}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                                            <div style={{ position: "relative" }}>
                                                <div style={{ ...s.avatar, background: isActive ? "#F0F7F1" : "#F0F0EE", color: isActive ? "#3a7d44" : "#999" }}>{initials(m.firstName, m.lastName)}</div>
                                                <span style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderRadius: "50%", border: "2px solid #fff", background: isActive ? "#3a7d44" : "#ccc" }} />
                                            </div>
                                            <div>
                                                <p style={s.listName}>{m.firstName} {m.lastName}</p>
                                                {m.email && <p style={s.listSub}>{m.email}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ ...s.td, ...s.muted }}>{m.phone}{m.email && <><br /><span style={{ fontSize: 11, color: "#bbb" }}>{m.email}</span></>}</td>
                                    <td style={{ ...s.td, ...s.muted }}>{genderLabel[m.gender ?? ""] ?? "—"}</td>
                                    <td style={s.td}>
                                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500, background: isActive ? "#F0F7F1" : "#F5F5F4", color: isActive ? "#3a7d44" : "#999" }}>
                                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: isActive ? "#3a7d44" : "#ccc" }} />
                                            {statusLabel[m.membershipStatus] ?? m.membershipStatus}
                                        </span>
                                    </td>
                                    <td style={s.td}>
                                        <div className="actions-group" style={{ display: "flex", gap: 4 }}>
                                            <button className="btn-icon-action" style={s.btnIconAction} onClick={(e) => { e.stopPropagation(); setViewMember(m); }} title="Ver detalles">
                                                <i className="ti ti-eye" style={{ fontSize: 14 }} aria-hidden />
                                            </button>
                                            <button className="btn-icon-action" style={s.btnIconAction} onClick={(e) => { e.stopPropagation(); openEdit(m); }} title="Editar">
                                                <i className="ti ti-edit" style={{ fontSize: 14 }} aria-hidden />
                                            </button>
                                            <button className="btn-icon-action" style={{ ...s.btnIconAction, color: isActive ? "#c0392b" : "#3a7d44" }}
                                                onClick={(e) => { e.stopPropagation(); requestToggle(m); }}
                                                title={isActive ? "Desactivar" : "Activar"}>
                                                <i className={`ti ${isActive ? "ti-user-off" : "ti-user-check"}`} style={{ fontSize: 14 }} aria-hidden />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}</tbody>
                        </table>
                        </div>
                    </div>
                    {!loading && (
                        <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onChange={setPage} />
                    )}
                    </>
                )}
            </div>
            <style>{`
                .member-row { transition: background 0.1s ease; }
                .member-row:hover { background: #FAFAFA; }
                .member-row:last-child td { border-bottom: none !important; }
                .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }

                .actions-group { opacity: 0.4; transition: opacity 0.15s; }
                .member-row:hover .actions-group { opacity: 1; }
                .btn-icon-action:hover { background: #F0F0EE !important; border-color: #E5E4E2 !important; color: #1a1a1a !important; }

                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

                @media (max-width: 900px) {
                    .toolbar-wrap { flex-direction: column !important; align-items: stretch !important; }
                    .toolbar-wrap .search-wrap { flex: none !important; width: 100% !important; }
                    .export-group { margin-left: 0 !important; width: 100% !important; justify-content: flex-end !important; }
                    .filter-group { width: 100% !important; }
                }
                @media (max-width: 768px) {
                    .drawer-panel { width: 100vw !important; border-left: none !important; }
                    .drawer-grid-2 { grid-template-columns: 1fr !important; }
                }
                @media (max-width: 600px) {
                    .table-scroll table { min-width: 620px; }
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
    drawerBody: { flex: 1, overflowY: "auto", padding: "20px 24px" },
    drawerFooter: { display: "flex", gap: 8, justifyContent: "flex-end", padding: "14px 24px", borderTop: "1px solid #F0F0EE", flexShrink: 0 },
    sectionLabel: { fontSize: 10, fontWeight: 600, color: "#bbb", textTransform: "uppercase" as const, letterSpacing: "0.06em", margin: "4px 0 4px", display: "flex", alignItems: "center", gap: 5 },
    formGrid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
    fieldLabel: { fontSize: 11, fontWeight: 500, color: "#555" },
    fieldError: { fontSize: 10, color: "#c0392b", marginTop: 1 },
    input: { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 7, padding: "8px 11px", fontSize: 13, color: "#1a1a1a", outline: "none", width: "100%", fontFamily: "inherit", boxSizing: "border-box" as const, transition: "border-color 0.15s" },
    inputError: { border: "1px solid #fecaca" },
    toolbarCard: { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, padding: "12px 16px", borderTop: "2px solid #D4AF37" },
    toolbar: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const },
    filterGroup: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const },
    exportGroup: { display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" as const },
    searchWrap: { position: "relative", display: "flex", alignItems: "center", flex: "0 0 340px" },
    searchIcon: { position: "absolute", left: 12, fontSize: 15, color: "#bbb", pointerEvents: "none" },
    searchInput: { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 8, padding: "9px 30px 9px 34px", fontSize: 13, color: "#1a1a1a", outline: "none", width: "100%", fontFamily: "inherit" },
    clearBtn: { position: "absolute", right: 8, background: "none", border: "none", cursor: "pointer", color: "#bbb", padding: 2, display: "flex", alignItems: "center" },
    filterSelect: { background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#555", fontFamily: "inherit", cursor: "pointer", outline: "none" },
    btnClear: { display: "inline-flex", alignItems: "center", gap: 5, background: "none", color: "#888", border: "1px solid #E5E4E2", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontFamily: "inherit", cursor: "pointer" },
    btnExport: { display: "inline-flex", alignItems: "center", gap: 5, background: "#F7F7F6", color: "#555", border: "1px solid #E5E4E2", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" },
    resultCount: { fontSize: 11, color: "#bbb", margin: 0 },
    btnPrimary: { display: "inline-flex", alignItems: "center", gap: 6, background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" },
    btnGhost: { background: "none", color: "#555", border: "1px solid #E5E4E2", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" },
    btnConfirm: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", minWidth: 110 },
    btnIcon: { background: "none", border: "none", cursor: "pointer", color: "#bbb", padding: 4, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" },
    spinner: { display: "inline-block", width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
    card: { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, overflow: "hidden", borderTop: "2px solid #D4AF37" },
    table: { width: "100%", borderCollapse: "collapse" },
    thead: { borderBottom: "1px solid #E5E4E2", background: "#FAFAFA" },
    th: { padding: "10px 12px", fontSize: 11, fontWeight: 500, color: "#bbb", textAlign: "left", whiteSpace: "nowrap" },
    row: { borderBottom: "1px solid #F0F0EE", cursor: "pointer" },
    td: { padding: "10px 12px", fontSize: 13, color: "#1a1a1a", verticalAlign: "middle" },
    muted: { color: "#888", fontSize: 12 },
    badge: { display: "inline-flex", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500 },
    avatar: { width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, flexShrink: 0 },
    listName: { margin: 0, fontWeight: 500, fontSize: 13, color: "#1a1a1a" },
    listSub: { margin: 0, fontSize: 11, color: "#bbb" },
    empty: { fontSize: 13, color: "#bbb", padding: "40px 0", textAlign: "center" },
    emptyState: { display: "flex", flexDirection: "column", alignItems: "center", padding: "52px 0", background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8 },
    btnAction: { display: "inline-flex", alignItems: "center", gap: 6, background: "none", color: "#555", border: "1px solid #E5E4E2", borderRadius: 6, padding: "8px 13px", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", transition: "background 0.12s, border-color 0.12s, color 0.12s" },
    btnIconAction: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, background: "none", color: "#888", border: "1px solid transparent", borderRadius: 6, cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit" },
    bulkBar: {
        display: "flex", alignItems: "center", gap: 10,
        background: "#FFF4F0", border: "1px solid #fecaca", borderRadius: 8,
        padding: "10px 14px",
    },
    bulkDeleteBtn: {
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "#c0392b", color: "#fff", border: "none", borderRadius: 6,
        padding: "7px 14px", fontSize: 12, fontWeight: 500,
        fontFamily: "inherit", cursor: "pointer",
    },
    bulkCancelBtn: {
        background: "none", color: "#888", border: "1px solid #E5E4E2", borderRadius: 6,
        padding: "7px 14px", fontSize: 12, fontWeight: 500,
        fontFamily: "inherit", cursor: "pointer",
    },
};
