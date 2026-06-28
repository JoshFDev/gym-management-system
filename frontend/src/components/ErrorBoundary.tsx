import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
    children: ReactNode;
}
interface State {
    hasError: boolean;
    error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }
    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("ErrorBoundary caught:", error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={s.container}>
                    <div style={s.card}>
                        <i className="ti ti-alert-triangle" style={{ fontSize: 32, color: "#c0392b" }} aria-hidden />
                        <h2 style={s.title}>Algo salió mal</h2>
                        <p style={s.text}>{this.state.error?.message ?? "Error inesperado."}</p>
                        <button style={s.btn} onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}>
                            Reintentar
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

const s: Record<string, React.CSSProperties> = {
    container: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100svh", background: "#F7F7F6", padding: 20 },
    card: { background: "#fff", border: "1px solid #E5E4E2", borderRadius: 12, padding: "32px 36px", textAlign: "center", maxWidth: 400 },
    title: { fontSize: 18, fontWeight: 600, color: "#1a1a1a", margin: "12px 0 6px" },
    text: { fontSize: 13, color: "#888", margin: "0 0 20px", lineHeight: 1.5 },
    btn: { background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" },
};