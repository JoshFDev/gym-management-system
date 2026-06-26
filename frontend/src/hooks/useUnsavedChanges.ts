import { useEffect, useRef } from "react";

export function useUnsavedChanges(hasChanges: boolean) {
    const hasChangesRef = useRef(hasChanges);
    hasChangesRef.current = hasChanges;

    useEffect(() => {
        if (!hasChanges) return;
        const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [hasChanges]);

    useEffect(() => {
        if (!hasChanges) return;
        const handler = () => {
            if (!window.confirm("Tienes cambios sin guardar. ¿Salir de todas formas?")) {
                history.pushState(null, "", location.href);
            }
        };
        history.pushState(null, "", location.href);
        window.addEventListener("popstate", handler);
        return () => window.removeEventListener("popstate", handler);
    }, [hasChanges]);
}
