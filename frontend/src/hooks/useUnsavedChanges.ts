import { useEffect } from "react";
import { useBlocker } from "react-router-dom";

export function useUnsavedChanges(hasChanges: boolean) {
    useEffect(() => {
        if (!hasChanges) return;
        const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [hasChanges]);

    const blocker = useBlocker(hasChanges);

    useEffect(() => {
        if (blocker.state === "blocked") {
            const proceed = window.confirm("Tienes cambios sin guardar. ¿Salir de todas formas?");
            if (proceed) blocker.proceed();
            else blocker.reset();
        }
    }, [blocker]);
}
