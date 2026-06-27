/**
 * UsersPage — ZenithGym
 *
 * Requiere agregar en user.service.ts:
 *   export const getUsers    = ()         => api.get("/users");
 *   export const updateUser  = (id, data) => api.patch(`/users/${id}`, data);
 *   export const deleteUser  = (id)       => api.delete(`/users/${id}`);
 *
 * El endpoint registerRequest ya existe (se usaba antes para crear).
 */

import { useEffect, useState, useMemo } from "react";
import { registerRequest, forgotPasswordRequest } from "../services/auth.service";
import { getUsers, updateUser, deleteUser } from "../services/user.service";
import PageHeader from "../components/PageHeader";
import GymButton from "../components/GymButton";
import type { UserRole } from "../hooks/useAuth";
import { useSocketRefresh } from "../hooks/useSocketRefresh";
import { useToast } from "../hooks/useToast";
import { useUnsavedChanges } from "../hooks/useUnsavedChanges";
import ConfirmModal from "../components/ConfirmModal";

// ─────────────────────────────────────────────
// Constantes de rol
// ─────────────────────────────────────────────
const ROLE_LABEL: Record<UserRole, string> = {
    admin: "Administrador",
    receptionist: "Recepcionista",
    trainer: "Entrenador",
};

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
    admin: ["Dashboard", "Miembros", "Planes", "Suscripciones", "Pagos", "Asistencia", "Usuarios"],
    receptionist: ["Dashboard", "Miembros", "Suscripciones", "Pagos", "Asistencia"],
    trainer: ["Miembros", "Asistencia"],
};

const ROLE_COLOR: Record<UserRole, { bg: string; color: string }> = {
    admin: { bg: "#EEF2FF", color: "#4338CA" },
    receptionist: { bg: "#F0F7F1", color: "#3a7d44" },
    trainer: { bg: "#FEF9F0", color: "#854F0B" },
};

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: UserRole;
    isActive?: boolean;
    createdAt: string;
    updatedAt?: string;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const initials = (f: string, l: string) => `${f?.[0] ?? ""}${l?.[0] ?? ""}`.toUpperCase();
const fmtDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—";

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

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface FormErrors { firstName?: string; lastName?: string; email?: string; phone?: string; password?: string; role?: string; }

// ─────────────────────────────────────────────
// Field
// ─────────────────────────────────────────────
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

const validateUser = (values: EditForm, isEdit: boolean): FormErrors => {
    const e: FormErrors = {};
    if (!values.firstName.trim()) e.firstName = "Obligatorio";
    else if (values.firstName.trim().length < 2) e.firstName = "Mínimo 2 caracteres";
    if (!values.lastName.trim()) e.lastName = "Obligatorio";
    else if (values.lastName.trim().length < 2) e.lastName = "Mínimo 2 caracteres";
    if (!values.email.trim()) e.email = "Obligatorio";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) e.email = "Correo inválido";
    if (!isEdit && !values.password.trim()) e.password = "Obligatorio";
    else if (values.password && values.password.length < 8) e.password = "Mínimo 8 caracteres";
    if (!values.role) e.role = "Selecciona un rol";
    return e;
};

// ─────────────────────────────────────────────
// Detail Drawer
// ─────────────────────────────────────────────
function UserDetailDrawer({
    user, open, onClose, onEdit, onSendReset, sendingReset,
}: {
    user: User | null; open: boolean; onClose: () => void; onEdit: () => void;
    onSendReset: () => void; sendingReset: boolean;
}) {
    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [open]);

    if (!user) return null;

    const rc = ROLE_COLOR[user.role];

    return (
        <>
            <div
                style={{ ...s.drawerOverlay, opacity: open ? 1 : 0, pointerEvents: open ? "all" : "none" }}
                onClick={onClose} aria-hidden
            />
            <div
                style={{ ...s.drawer, transform: open ? "translateX(0)" : "translateX(100%)" }}
                role="dialog" aria-modal aria-label="Detalle de usuario"
            >
                {/* Header */}
                <div style={s.drawerHeader}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ ...sd.bigAvatar, background: rc.bg, color: rc.color }}>
                            {initials(user.firstName, user.lastName)}
                        </div>
                        <div>
                            <p style={s.drawerTitle}>{user.firstName} {user.lastName}</p>
                            <span style={{ ...sd.roleBadge, background: rc.bg, color: rc.color }}>
                                {ROLE_LABEL[user.role]}
                            </span>
                        </div>
                    </div>
                    <button style={s.btnClose} onClick={onClose} aria-label="Cerrar">
                        <i className="ti ti-x" style={{ fontSize: 16 }} aria-hidden />
                    </button>
                </div>

                {/* Body */}
                <div style={{ ...s.drawerBody, gap: 0 }}>

                    {/* Datos */}
                    <p style={s.sectionLabel}>
                        <i className="ti ti-user" style={{ fontSize: 12 }} aria-hidden /> Información
                    </p>
                    <div style={sd.section}>
                        <DetailRow label="Nombre" value={`${user.firstName} ${user.lastName}`} />
                        <DetailRow label="Correo" value={user.email} />
                        <DetailRow label="Teléfono" value={user.phone} />
                        <DetailRow label="Estado" value={user.isActive !== false ? "Activo" : "Inactivo"} />
                        <DetailRow label="Alta" value={fmtDate(user.createdAt)} />
                    </div>

                    {/* Permisos */}
                    <p style={{ ...s.sectionLabel, marginTop: 20 }}>
                        <i className="ti ti-shield-check" style={{ fontSize: 12 }} aria-hidden /> Acceso del rol
                    </p>
                    <div style={sd.section}>
                        {ROLE_PERMISSIONS[user.role].map((p, i, arr) => (
                            <div
                                key={p}
                                style={{
                                    ...sd.permRow,
                                    borderBottom: i < arr.length - 1 ? "1px solid #F5F5F4" : "none",
                                }}
                            >
                                <i className="ti ti-check" style={{ fontSize: 12, color: "#3a7d44" }} aria-hidden />
                                <span style={{ fontSize: 12, color: "#555" }}>{p}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div style={s.drawerFooter}>
                    <button style={{ ...s.btnGhost, float: "left" } as React.CSSProperties} onClick={onClose}>Cerrar</button>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button style={{ ...s.btnAction, color: "#854F0B", borderColor: "#FDE68A" }}
                            onClick={onSendReset} disabled={sendingReset}>
                            {sendingReset ? <span style={s.spinner} /> : <i className="ti ti-mail" style={{ fontSize: 13 }} aria-hidden />}
                            Restablecer contraseña
                        </button>
                        <button style={s.btnPrimary} onClick={onEdit}>
                            <i className="ti ti-edit" style={{ fontSize: 13 }} aria-hidden />
                            Editar usuario
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
    if (!value) return null;
    return (
        <div style={sd.detailRow}>
            <span style={sd.detailLabel}>{label}</span>
            <span style={sd.detailValue}>{value}</span>
        </div>
    );
}

// ─────────────────────────────────────────────
// Edit / Create Drawer
// ─────────────────────────────────────────────
interface EditForm {
    firstName: string; lastName: string;
    email: string; phone: string;
    role: UserRole; password: string;
}

function UserFormDrawer({
    open, editingId, saving, values, errors, touched, onChange, onBlur, onSubmit, onClose,
}: {
    open: boolean; editingId: string | null; saving: boolean;
    values: EditForm; errors: FormErrors; touched: Record<string, boolean>;
    onChange: (f: keyof EditForm, v: string) => void;
    onBlur: (f: keyof EditForm) => void;
    onSubmit: (e: React.FormEvent) => void;
    onClose: () => void;
}) {
    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [open]);

    const rc = ROLE_COLOR[values.role];

    return (
        <>
            <div
                style={{ ...s.drawerOverlay, opacity: open ? 1 : 0, pointerEvents: open ? "all" : "none" }}
                onClick={onClose} aria-hidden
            />
            <div
                style={{ ...s.drawer, transform: open ? "translateX(0)" : "translateX(100%)" }}
                role="dialog" aria-modal aria-label={editingId ? "Editar usuario" : "Nuevo usuario"}
            >
                <div style={s.drawerHeader}>
                    <div>
                        <p style={s.drawerTitle}>{editingId ? "Editar usuario" : "Nuevo usuario"}</p>
                        <p style={s.drawerSub}>
                            {editingId ? "Modifica los datos del usuario" : "Completa los datos para crear la cuenta"}
                        </p>
                    </div>
                    <button style={s.btnClose} onClick={onClose} aria-label="Cerrar">
                        <i className="ti ti-x" style={{ fontSize: 16 }} aria-hidden />
                    </button>
                </div>

                <form onSubmit={onSubmit} style={s.drawerBody} noValidate>

                    <p style={s.sectionLabel}>
                        <i className="ti ti-user" style={{ fontSize: 12 }} aria-hidden /> Datos personales
                    </p>
                    <div style={s.formGrid2}>
                        <Field label="Nombre" required error={errors.firstName} touched={touched.firstName}>
                            <input style={{ ...s.input, ...(touched.firstName && errors.firstName ? s.inputError : {}) }}
                                placeholder="Carlos" value={values.firstName}
                                onChange={(e) => onChange("firstName", e.target.value)} onBlur={() => onBlur("firstName")} />
                        </Field>
                        <Field label="Apellido" required error={errors.lastName} touched={touched.lastName}>
                            <input style={{ ...s.input, ...(touched.lastName && errors.lastName ? s.inputError : {}) }}
                                placeholder="Reyes" value={values.lastName}
                                onChange={(e) => onChange("lastName", e.target.value)} onBlur={() => onBlur("lastName")} />
                        </Field>
                    </div>
                    <Field label="Teléfono" error={errors.phone} touched={touched.phone}>
                        <input style={{ ...s.input, ...(touched.phone && errors.phone ? s.inputError : {}) }}
                            placeholder="55 1234 5678" value={values.phone}
                            onChange={(e) => onChange("phone", e.target.value)} onBlur={() => onBlur("phone")} />
                    </Field>

                    <p style={{ ...s.sectionLabel, marginTop: 20 }}>
                        <i className="ti ti-lock" style={{ fontSize: 12 }} aria-hidden /> Acceso
                    </p>
                    <Field label="Correo" required error={errors.email} touched={touched.email}>
                        <input style={{ ...s.input, ...(touched.email && errors.email ? s.inputError : {}) }}
                            type="email" placeholder="correo@ejemplo.com" value={values.email}
                            onChange={(e) => onChange("email", e.target.value)} onBlur={() => onBlur("email")} />
                    </Field>
                    {!editingId && (
                        <Field label="Contraseña" required error={errors.password} touched={touched.password}>
                            <input style={{ ...s.input, ...(touched.password && errors.password ? s.inputError : {}) }}
                                type="password" placeholder="Mínimo 8 caracteres" value={values.password}
                                onChange={(e) => onChange("password", e.target.value)} onBlur={() => onBlur("password")} />
                        </Field>
                    )}

                    <p style={{ ...s.sectionLabel, marginTop: 20 }}>
                        <i className="ti ti-shield-lock" style={{ fontSize: 12 }} aria-hidden /> Rol
                    </p>
                    <Field label="Rol" required error={errors.role} touched={touched.role}>
                        <select style={{ ...s.input, ...(touched.role && errors.role ? s.inputError : {}) }}
                            value={values.role} onChange={(e) => onChange("role", e.target.value as UserRole)}
                            onBlur={() => onBlur("role")}>
                            <option value="">Seleccionar</option>
                            <option value="admin">Administrador</option>
                            <option value="receptionist">Recepcionista</option>
                            <option value="trainer">Entrenador</option>
                        </select>
                    </Field>

                    {/* Preview permisos */}
                    <div style={{ ...sd.permPreview, borderColor: rc.bg }}>
                        <p style={{ ...sd.permPreviewTitle, color: rc.color }}>
                            {ROLE_LABEL[values.role]} · acceso a:
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                            {ROLE_PERMISSIONS[values.role].map((p) => (
                                <span key={p} style={{ ...sd.permTag, background: rc.bg, color: rc.color }}>{p}</span>
                            ))}
                        </div>
                    </div>

                    <div style={s.drawerFooter}>
                        <button type="button" style={s.btnGhost} onClick={onClose} disabled={saving}>Cancelar</button>
                        <button type="submit" style={{ ...s.btnPrimary, opacity: saving ? 0.7 : 1 }} disabled={saving}>
                            {saving
                                ? <><span style={s.spinner} />Guardando…</>
                                : <><i className="ti ti-check" style={{ fontSize: 13 }} aria-hidden />
                                    {editingId ? "Guardar cambios" : "Crear usuario"}</>
                            }
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

// ─────────────────────────────────────────────
// Page principal
// ─────────────────────────────────────────────
const emptyForm: EditForm = {
    firstName: "", lastName: "", email: "",
    phone: "", role: "receptionist", password: "",
};

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Drawers
    const [viewUser, setViewUser] = useState<User | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [formValues, setFormValues] = useState<EditForm>({ ...emptyForm });
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    // Restablecer contraseña
    const [sendingReset, setSendingReset] = useState(false);

    // Eliminar
    const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Filtro rápido por rol
    const [filterRole, setFilterRole] = useState("");
    const [showInactive, setShowInactive] = useState(false);

    // Selección múltiple
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

    const { addToast } = useToast();
    useUnsavedChanges(formOpen);

    const loadUsers = async () => {
        try {
            const res = await getUsers();
            setUsers(res.data ?? []);
        } catch { setUsers([]); }
    };

    useSocketRefresh(["user_updated", "user_deactivated"], loadUsers);

    useEffect(() => {
        (async () => { try { await loadUsers(); } catch { setUsers([]); } finally { setLoading(false); } })();
    }, []);

    // Filtrado
    const filtered = useMemo(() => {
        let list = users;
        if (filterRole) list = list.filter((u) => u.role === filterRole);
        if (!showInactive) list = list.filter((u) => u.isActive !== false);
        return list;
    }, [users, filterRole, showInactive]);

    // Form helpers
    const openNew = () => {
        setEditingId(null);
        setFormValues({ ...emptyForm });
        setErrors({}); setTouched({});
        setFormOpen(true);
    };

    const openEdit = (u: User) => {
        setEditingId(u.id);
        setFormValues({
            firstName: u.firstName, lastName: u.lastName,
            email: u.email, phone: u.phone ?? "",
            role: u.role, password: "",
        });
        setErrors({}); setTouched({});
        setViewUser(null);
        setFormOpen(true);
    };

    const handleFieldChange = (f: keyof EditForm, v: string) => {
        setFormValues((p) => { const next = { ...p, [f]: v }; setErrors(validateUser(next, !!editingId)); return next; });
    };
    const handleBlur = (f: keyof EditForm) => { setTouched((p) => ({ ...p, [f]: true })); setErrors(validateUser(formValues, !!editingId)); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const allTouched = Object.keys(formValues).reduce((acc, k) => ({ ...acc, [k]: true }), {});
        setTouched(allTouched);
        const validation = validateUser(formValues, !!editingId);
        setErrors(validation);
        if (Object.keys(validation).length > 0) return;
        setSaving(true);
        try {
            const { firstName, lastName, email, phone, role, password } = formValues;
            if (editingId) {
                const data: Record<string, string> = { firstName, lastName, email, role };
                if (phone) data.phone = phone;
                if (password) data.password = password;
                await updateUser(editingId, data);
                addToast(
                    "Usuario actualizado. Si cambiaste su rol, deberá volver a iniciar sesión."
                );
            } else {
                await registerRequest({ firstName, lastName, email, password, role, phone });
                addToast("Usuario creado correctamente");
            }
            setFormOpen(false);
            await loadUsers();
        } catch {
            addToast("Error al guardar. Verifica los datos.", "error");
        } finally {
            setSaving(false);
        }
    };

    // Restablecer contraseña
    const handleSendReset = async () => {
        if (!viewUser) return;
        setSendingReset(true);
        try {
            await forgotPasswordRequest(viewUser.email);
            addToast(`Correo de restablecimiento enviado a ${viewUser.email}`);
            setViewUser(null);
        } catch {
            addToast("Error al enviar correo.", "error");
        } finally {
            setSendingReset(false);
        }
    };

    // Eliminar
    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            await deleteUser(deleteTarget.id);
            addToast(`${deleteTarget.firstName} eliminado del sistema`);
            await loadUsers();
        } catch {
            addToast("No se pudo eliminar el usuario.", "error");
        } finally {
            setDeleteLoading(false);
            setDeleteTarget(null);
        }
    };

    return (
        <div style={s.page}>
            <ConfirmModal
                open={!!deleteTarget}
                title={deleteTarget?.isActive !== false ? "Desactivar usuario" : "Eliminar usuario"}
                body={deleteTarget?.isActive !== false
                    ? `¿Desactivar a ${deleteTarget?.firstName} ${deleteTarget?.lastName}? El usuario ya no podrá iniciar sesión.`
                    : `¿Eliminar a ${deleteTarget?.firstName} ${deleteTarget?.lastName}? Esta acción no se puede deshacer.`
                }
                confirmLabel={deleteTarget?.isActive !== false ? "Sí, desactivar" : "Sí, eliminar"}
                loading={deleteLoading}
                onConfirm={() => {
                    playConfirmSound();
                    confirmDelete();
                }}
                onCancel={() => setDeleteTarget(null)}
            />

            <ConfirmModal
                open={bulkConfirmOpen}
                title="Desactivar usuarios"
                body={`¿Desactivar ${selectedIds.length} usuario${selectedIds.length !== 1 ? "s" : ""} seleccionado${selectedIds.length !== 1 ? "s" : ""}? No podrán iniciar sesión.`}
                confirmLabel="Sí, desactivar todos"
                loading={bulkDeleting}
                onConfirm={async () => {
                    playConfirmSound();
                    setBulkDeleting(true);
                    try {
                        await Promise.all(selectedIds.map((id) => deleteUser(id)));
                        addToast(`${selectedIds.length} usuario${selectedIds.length !== 1 ? "s" : ""} desactivado${selectedIds.length !== 1 ? "s" : ""}`);
                        setSelectedIds([]);
                        await loadUsers();
                    } catch {
                        addToast("Error al desactivar usuarios.", "error");
                    } finally {
                        setBulkDeleting(false);
                        setBulkConfirmOpen(false);
                    }
                }}
                onCancel={() => setBulkConfirmOpen(false)}
            />

            <UserDetailDrawer
                user={viewUser}
                open={!!viewUser}
                onClose={() => setViewUser(null)}
                onEdit={() => viewUser && openEdit(viewUser)}
                onSendReset={handleSendReset}
                sendingReset={sendingReset}
            />

            <UserFormDrawer
                open={formOpen}
                editingId={editingId}
                saving={saving}
                values={formValues}
                errors={errors}
                touched={touched}
                onChange={handleFieldChange}
                onBlur={handleBlur}
                onSubmit={handleSubmit}
                onClose={() => setFormOpen(false)}
            />

            <PageHeader
                title="Usuarios"
                action={
                    <GymButton icon="ti-plus" onClick={openNew}>
                        Nuevo usuario
                    </GymButton>
                }
            />

            <div style={s.content}>

                {/* Resumen de roles */}
                <div style={s.rolesGrid}>
                    {(["admin", "receptionist", "trainer"] as UserRole[]).map((r) => {
                        const count = users.filter((u) => u.role === r).length;
                        const rc = ROLE_COLOR[r];
                        const active = filterRole === r;
                        return (
                            <button
                                key={r}
                                style={{
                                    ...s.roleCard,
                                    borderColor: active ? rc.color : "#E5E4E2",
                                    background: active ? rc.bg : "#fff",
                                    cursor: "pointer",
                                }}
                                onClick={() => setFilterRole(active ? "" : r)}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div>
                                        <p style={{ ...s.roleTitle, color: active ? rc.color : "#1a1a1a" }}>
                                            {ROLE_LABEL[r]}
                                        </p>
                                        <p style={s.roleSub}>{ROLE_PERMISSIONS[r].length} módulos</p>
                                    </div>
                                    <span style={{
                                        fontSize: 22, fontWeight: 600,
                                        color: active ? rc.color : "#1a1a1a",
                                        letterSpacing: -0.5,
                                    }}>
                                        {count}
                                    </span>
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10 }}>
                                    {ROLE_PERMISSIONS[r].slice(0, 4).map((p) => (
                                        <span key={p} style={{
                                            fontSize: 10, padding: "2px 7px", borderRadius: 20,
                                            background: active ? "#fff" : "#F7F7F6",
                                            color: active ? rc.color : "#aaa",
                                            border: `1px solid ${active ? rc.bg : "#F0F0EE"}`,
                                        }}>{p}</span>
                                    ))}
                                    {ROLE_PERMISSIONS[r].length > 4 && (
                                        <span style={{ fontSize: 10, color: "#bbb" }}>
                                            +{ROLE_PERMISSIONS[r].length - 4}
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Contador + mostrar inactivos */}
                {!loading && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <p style={s.resultCount}>
                            {filterRole
                                ? `${filtered.length} ${ROLE_LABEL[filterRole as UserRole].toLowerCase()}${filtered.length !== 1 ? "s" : ""}`
                                : `${filtered.length} usuario${filtered.length !== 1 ? "s" : ""}`
                            }
                            {!showInactive && !filterRole && users.filter((u) => u.isActive === false).length > 0 && (
                                <span style={{ color: "#bbb", marginLeft: 4 }}>
                                    · {users.filter((u) => u.isActive === false).length} inactivo{users.filter((u) => u.isActive === false).length !== 1 ? "s" : ""}
                                </span>
                            )}
                            {filterRole && (
                                <button style={s.btnInlineReset} onClick={() => setFilterRole("")}>
                                    · Ver todos
                                </button>
                            )}
                        </p>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: "#888", userSelect: "none" }}>
                            <input type="checkbox" checked={showInactive} onChange={(e) => { setShowInactive(e.target.checked); setSelectedIds([]); }}
                                style={{ accentColor: "#1a1a1a", cursor: "pointer" }} />
                            Mostrar inactivos
                        </label>
                    </div>
                )}

                {/* Barra de eliminación masiva */}
                {selectedIds.length > 0 && (
                    <div style={s.bulkBar}>
                        <span style={{ fontSize: 12, color: "#555", fontWeight: 500 }}>
                            {selectedIds.length} seleccionado{selectedIds.length !== 1 ? "s" : ""}
                        </span>
                        <button style={s.bulkDeleteBtn} onClick={() => setBulkConfirmOpen(true)}>
                            <i className="ti ti-trash" style={{ fontSize: 13 }} aria-hidden />
                            Eliminar seleccionados
                        </button>
                        <button style={s.bulkCancelBtn} onClick={() => setSelectedIds([])}>
                            Cancelar
                        </button>
                    </div>
                )}

                {/* Tabla */}
                {loading ? (
                    <p style={s.empty}>Cargando usuarios…</p>
                ) : filtered.length === 0 ? (
                    <div style={s.emptyState}>
                        <i className="ti ti-users" style={{ fontSize: 30, color: "#D0D0CE", marginBottom: 10 }} aria-hidden />
                        <p style={{ margin: 0, fontSize: 13, color: "#bbb" }}>Sin usuarios en este rol</p>
                    </div>
                ) : (
                    <div style={{ ...s.card, padding: 0 }}>
                        <table style={s.table}>
                            <thead>
                                <tr style={s.thead}>
                                    <th style={{ ...s.th, width: 36 }}>
                                        <input type="checkbox" checked={selectedIds.length === filtered.length && filtered.length > 0}
                                            onChange={(e) => setSelectedIds(e.target.checked ? filtered.map((u) => u.id) : [])}
                                            style={{ accentColor: "#1a1a1a", cursor: "pointer", margin: 0 }} />
                                    </th>
                                    <th style={s.th}>Usuario</th>
                                    <th style={s.th}>Correo</th>
                                    <th style={s.th}>Rol</th>
                                    <th style={s.th}>Estado</th>
                                    <th style={s.th}>Alta</th>
                                    <th style={s.th}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((u) => {
                                    const rc = ROLE_COLOR[u.role];
                                    const isActive = u.isActive !== false;
                                    const checked = selectedIds.includes(u.id);
                                    return (
                                        <tr key={u.id} style={{ ...s.row, opacity: isActive ? 1 : 0.6 }} className="user-row">
                                            <td style={{ ...s.td, width: 36 }}>
                                                <input type="checkbox" checked={checked}
                                                    onChange={() => setSelectedIds((prev) =>
                                                        checked ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                                                    )}
                                                    style={{ accentColor: "#1a1a1a", cursor: "pointer", margin: 0 }} />
                                            </td>
                                            <td style={s.td}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                    <div style={{ ...sd.avatar, background: rc.bg, color: rc.color }}>
                                                        {initials(u.firstName, u.lastName)}
                                                    </div>
                                                    <p style={s.listName}>{u.firstName} {u.lastName}</p>
                                                </div>
                                            </td>
                                            <td style={{ ...s.td, ...s.muted }}>{u.email}</td>
                                            <td style={s.td}>
                                                <span style={{ ...sd.roleBadge, background: rc.bg, color: rc.color }}>
                                                    {ROLE_LABEL[u.role]}
                                                </span>
                                            </td>
                                            <td style={s.td}>
                                                <span style={{
                                                    ...s.badge,
                                                    background: isActive ? "#F0F7F1" : "#F0F0EE",
                                                    color: isActive ? "#3a7d44" : "#888",
                                                }}>
                                                    {isActive ? "Activo" : "Inactivo"}
                                                </span>
                                            </td>
                                            <td style={{ ...s.td, ...s.muted }}>{fmtDate(u.createdAt)}</td>
                                            <td style={s.td}>
                                                <div style={{ display: "flex", gap: 6 }}>
                                                    <button style={s.btnAction} onClick={() => setViewUser(u)}>
                                                        Ver
                                                    </button>
                                                    <button style={s.btnAction} onClick={() => openEdit(u)}>
                                                        <i className="ti ti-edit" style={{ fontSize: 13 }} aria-hidden />
                                                        Editar
                                                    </button>
                                                    <button
                                                        style={{ ...s.btnAction, color: isActive ? "#854F0B" : "#c0392b", borderColor: isActive ? "#FDE68A" : "#fecaca" }}
                                                        onClick={() => setDeleteTarget(u)}
                                                    >
                                                        <i className={`ti ${isActive ? "ti-user-x" : "ti-trash"}`} style={{ fontSize: 13 }} aria-hidden />
                                                        {isActive ? "Desactivar" : "Eliminar"}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <style>{`
                .user-row { transition: background 0.1s ease; }
                .user-row:hover { background: #FAFAFA; }
                .user-row:last-child { border-bottom: none !important; }
                @keyframes fadeInDown {
                    from { opacity: 0; transform: translateY(-6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

// ─────────────────────────────────────────────
// Styles — s (compartidos con Members) + sd (específicos)
// ─────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
    page: { display: "flex", flexDirection: "column", minHeight: "100%", position: "relative" },
    content: { padding: "16px 28px 28px", display: "flex", flexDirection: "column", gap: 10 },

    overlay: {
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.35)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "fadeInDown 0.15s ease",
    },
    modal: {
        background: "#fff", borderRadius: 10, padding: "22px 24px",
        width: 380, boxShadow: "0 8px 32px rgba(0,0,0,0.14)", outline: "none",
    },
    modalIcon: {
        width: 36, height: 36, borderRadius: 8, background: "#FFF4F0",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 12,
    },
    modalTitle: { fontSize: 14, fontWeight: 600, color: "#1a1a1a", margin: "0 0 6px" },
    modalBody: { fontSize: 13, color: "#666", margin: 0, lineHeight: 1.5 },

    drawerOverlay: {
        position: "fixed", inset: 0, zIndex: 800,
        background: "rgba(0,0,0,0.28)",
        transition: "opacity 0.22s ease",
    },
    drawer: {
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 900,
        width: 420, background: "#fff",
        borderLeft: "1px solid #E5E4E2",
        display: "flex", flexDirection: "column",
        transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.08)",
    },
    drawerHeader: {
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        padding: "20px 20px 16px",
        borderBottom: "1px solid #F0F0EE",
        flexShrink: 0,
    },
    drawerTitle: { fontSize: 14, fontWeight: 600, color: "#1a1a1a", margin: 0 },
    drawerSub: { fontSize: 11, color: "#bbb", margin: "3px 0 0" },
    drawerBody: {
        flex: 1, overflowY: "auto", padding: "18px 20px",
        display: "flex", flexDirection: "column", gap: 12,
    },
    drawerFooter: {
        display: "flex", gap: 8, justifyContent: "flex-end",
        padding: "14px 20px",
        borderTop: "1px solid #F0F0EE",
        flexShrink: 0,
    },
    sectionLabel: {
        fontSize: 10, fontWeight: 600, color: "#bbb",
        textTransform: "uppercase" as const, letterSpacing: "0.06em",
        margin: "4px 0 4px", display: "flex", alignItems: "center", gap: 5,
    },
    formGrid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
    fieldLabel: { fontSize: 11, fontWeight: 500, color: "#555" },
    fieldError: { fontSize: 10, color: "#c0392b", marginTop: 1 },
    inputError: { borderColor: "#fecaca" },
    input: {
        background: "#F7F7F6", border: "1px solid #E5E4E2", borderRadius: 6,
        padding: "8px 11px", fontSize: 13, color: "#1a1a1a", outline: "none",
        width: "100%", fontFamily: "inherit",
        boxSizing: "border-box" as const,
        transition: "border-color 0.15s, background 0.15s",
    },

    // Resumen roles
    rolesGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
    roleCard: {
        background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8,
        padding: "14px 16px", textAlign: "left",
        fontFamily: "inherit", transition: "border-color 0.15s, background 0.15s",
    },
    roleTitle: { fontSize: 12, fontWeight: 600, margin: "0 0 2px" },
    roleSub: { fontSize: 10, color: "#bbb", margin: 0 },

    resultCount: { fontSize: 11, color: "#bbb", margin: 0, display: "flex", alignItems: "center", gap: 4 },
    btnInlineReset: {
        background: "none", border: "none", color: "#bbb", fontSize: 11,
        cursor: "pointer", padding: 0, fontFamily: "inherit",
        textDecoration: "underline",
    },

    // Table
    card: { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 8, overflow: "hidden" },
    table: { width: "100%", borderCollapse: "collapse" },
    thead: { borderBottom: "1px solid #E5E4E2", background: "#FAFAFA" },
    th: { padding: "10px 14px", fontSize: 11, fontWeight: 500, color: "#bbb", textAlign: "left", whiteSpace: "nowrap" },
    row: { borderBottom: "1px solid #F0F0EE" },
    td: { padding: "11px 14px", fontSize: 13, color: "#1a1a1a" },
    muted: { color: "#888", fontSize: 12 },
    badge: { display: "inline-flex", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500 },
    listName: { margin: 0, fontWeight: 500, fontSize: 13, color: "#1a1a1a" },

    btnPrimary: {
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "#1a1a1a", color: "#fff", border: "none",
        borderRadius: 7, padding: "9px 16px", fontSize: 13, fontWeight: 500,
        fontFamily: "inherit", cursor: "pointer", transition: "opacity 0.15s",
    },
    btnGhost: {
        background: "none", color: "#555", border: "1px solid #E5E4E2",
        borderRadius: 7, padding: "9px 16px", fontSize: 13, fontWeight: 500,
        fontFamily: "inherit", cursor: "pointer", transition: "background 0.12s",
    },
    btnDanger: {
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
        background: "#c0392b", color: "#fff", border: "none", borderRadius: 7,
        padding: "9px 16px", fontSize: 13, fontWeight: 500,
        fontFamily: "inherit", cursor: "pointer", minWidth: 100,
        transition: "opacity 0.15s",
    },
    btnAction: {
        display: "inline-flex", alignItems: "center", gap: 5,
        background: "none", color: "#555",
        border: "1px solid #E5E4E2", borderRadius: 6,
        padding: "6px 11px", fontSize: 12, fontWeight: 500,
        fontFamily: "inherit", cursor: "pointer",
        transition: "background 0.12s, border-color 0.12s, color 0.12s",
    },
    btnClose: {
        background: "none", border: "none", cursor: "pointer",
        color: "#bbb", padding: 4, borderRadius: 6,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "color 0.12s",
    },
    spinner: {
        display: "inline-block", width: 12, height: 12,
        border: "2px solid rgba(255,255,255,0.3)",
        borderTopColor: "#fff", borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
    },

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
    empty: { fontSize: 13, color: "#bbb", padding: "40px 0", textAlign: "center" },
    emptyState: {
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "52px 0", background: "#fff",
        border: "1px solid #E5E4E2", borderRadius: 8,
    },
};

const sd: Record<string, React.CSSProperties> = {
    avatar: {
        width: 30, height: 30, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 10, fontWeight: 600, flexShrink: 0,
    },
    bigAvatar: {
        width: 40, height: 40, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 600, flexShrink: 0,
    },
    roleBadge: {
        display: "inline-flex", padding: "2px 8px",
        borderRadius: 20, fontSize: 11, fontWeight: 500,
    },
    section: {
        background: "#FAFAFA", border: "1px solid #F0F0EE",
        borderRadius: 7, overflow: "hidden", marginTop: 6,
    },
    detailRow: {
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        padding: "9px 12px", borderBottom: "1px solid #F5F5F4", gap: 16,
    },
    detailLabel: { fontSize: 11, color: "#bbb", fontWeight: 500, flexShrink: 0 },
    detailValue: { fontSize: 12, color: "#1a1a1a", textAlign: "right" as const, wordBreak: "break-word" as const },
    permRow: {
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px",
    },
    permPreview: {
        background: "#FAFAFA", border: "1px solid",
        borderRadius: 7, padding: "11px 13px", marginTop: 4,
    },
    permPreviewTitle: {
        fontSize: 11, fontWeight: 600, margin: "0 0 8px",
    },
    permTag: {
        fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 500,
    },
};