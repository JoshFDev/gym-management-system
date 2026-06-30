import { createContext, useContext } from "react";

interface ToastContextValue {
    addToast: (text: string, type?: "success" | "error") => void;
}

export const ToastContext = createContext<ToastContextValue>({ addToast: () => {} });

export const useToast = () => useContext(ToastContext);
