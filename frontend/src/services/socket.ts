import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export interface NotificationPayload {
    type:
        | "user_updated" | "user_created" | "user_deactivated"
        | "member_created" | "member_updated" | "member_deactivated"
        | "plan_created" | "plan_updated" | "plan_deactivated"
        | "subscription_created" | "subscription_renewed"
        | "payment_created"
        | "attendance_created"
        | "info";
    title: string;
    message: string;
    userId?: string;
    timestamp: string;
}

type NotificationCallback = (data: NotificationPayload) => void;
const listeners = new Set<NotificationCallback>();

export const connectSocket = (token: string) => {
    if (socket?.connected) return socket;

    socket = io("http://localhost:3000", {
        auth: { token },
    });

    socket.on("connect", () => { });

    socket.on("notification", (data: NotificationPayload) => {
        listeners.forEach((cb) => cb(data));
    });

    socket.on("disconnect", () => { });

    socket.on("connect_error", () => { });

    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

export const getSocket = (): Socket | null => socket;

export const onNotification = (cb: NotificationCallback) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
};
