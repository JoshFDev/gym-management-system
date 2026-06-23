import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginRequest } from "../services/auth.service";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

const handleSubmit = async (
    e: React.FormEvent
) => {
    e.preventDefault();

    try {
        const response = await loginRequest({
            email,
            password,
        });

        localStorage.setItem(
            "token",
            response.data.token
        );

        navigate("/dashboard");

    } catch {
        alert(
            "Correo o contraseña incorrectos."
        );
    }
};

    return (
        <div style={s.page}>
            <div style={s.card}>
                <div style={s.logo}>
                    <p style={s.logoName}>Gym Manager</p>
                    <p style={s.logoTag}>Inicia sesión para continuar</p>
                </div>

                <form onSubmit={handleSubmit} style={s.form}>
                    <div style={s.field}>
                        <label style={s.label}>Correo electrónico</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="correo@ejemplo.com"
                            style={s.input}
                            required
                        />
                    </div>
                    <div style={s.field}>
                        <label style={s.label}>Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            style={s.input}
                            required
                        />
                    </div>
                    <button type="submit" style={s.btn}>Entrar</button>
                </form>
            </div>
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    page: {
        minHeight: "100svh",
        background: "#F7F7F6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
    },
    card: {
        background: "#ffffff",
        border: "1px solid #E5E4E2",
        borderRadius: 10,
        padding: "40px 36px",
        width: "100%",
        maxWidth: 360,
    },
    logo: { marginBottom: 32 },
    logoName: { fontSize: 18, fontWeight: 600, color: "#1a1a1a", letterSpacing: -0.3 },
    logoTag: { fontSize: 13, color: "#bbbbbb", marginTop: 4 },
    form: { display: "flex", flexDirection: "column", gap: 18 },
    field: { display: "flex", flexDirection: "column", gap: 6 },
    label: { fontSize: 12, fontWeight: 500, color: "#888" },
    input: {
        background: "#F7F7F6",
        border: "1px solid #E5E4E2",
        borderRadius: 6,
        padding: "9px 12px",
        fontSize: 13,
        color: "#1a1a1a",
        outline: "none",
        width: "100%",
    },
    btn: {
        background: "#1a1a1a",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        padding: "10px",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        width: "100%",
        marginTop: 4,
    },
};