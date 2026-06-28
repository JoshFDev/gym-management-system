export default function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "4px 0" }}>
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ ...s.bone, width: "30%", height: 14 }} />
                    <div style={{ ...s.bone, width: "20%", height: 14 }} />
                    <div style={{ ...s.bone, width: "25%", height: 14 }} />
                    <div style={{ ...s.bone, width: "15%", height: 14 }} />
                    <div style={{ ...s.bone, width: "10%", height: 14 }} />
                </div>
            ))}
            <style>{`@keyframes shimmer { 0% { opacity: 0.4; } 50% { opacity: 0.8; } 100% { opacity: 0.4; } }`}</style>
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    bone: { background: "#E5E4E2", borderRadius: 4, animation: "shimmer 1.2s ease-in-out infinite" },
};