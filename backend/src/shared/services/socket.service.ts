import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import { verifyToken } from "../../utils/jwt";

interface SocketUser {
    userId: string;
    role: string;
}

let io: Server | null = null;

export const initSocket = (httpServer: HTTPServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:5173",
            methods: ["GET", "POST"],
        },
    });

    io.use((socket: Socket, next: (err?: Error) => void) => {
        const token = socket.handshake.auth?.token as string | undefined;
        if (!token) return next(new Error("Authentication required"));

        try {
            const decoded = verifyToken(token) as SocketUser;
            (socket as any).user = decoded;
            next();
        } catch {
            next(new Error("Invalid token"));
        }
    });

    io.on("connection", (socket: Socket) => {
        const user = (socket as any).user as SocketUser;

        socket.join(`role:${user.role}`);
        socket.join(`user:${user.userId}`);

        socket.on("disconnect", () => { });
    });

    return io;
};

export const getIO = (): Server => {
    if (!io) throw new Error("Socket.io not initialized");
    return io;
};

type NotificationType =
    | "user_updated" | "user_created" | "user_deactivated"
    | "member_created" | "member_updated" | "member_deactivated"
    | "plan_created" | "plan_updated" | "plan_deactivated"
    | "subscription_created" | "subscription_renewed"
    | "payment_created"
    | "attendance_created"
    | "info";

interface NotificationPayload {
    type: NotificationType;
    title: string;
    message: string;
    userId?: string;
    timestamp: string;
}

export const notifyAdmins = (payload: NotificationPayload) => {
    io?.to("role:admin").emit("notification", payload);
};

export const notifyAll = (payload: NotificationPayload) => {
    io?.emit("notification", payload);
};

export const notifyUser = (userId: string, payload: NotificationPayload) => {
    io?.to(`user:${userId}`).emit("notification", payload);
};
