import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./app";
import { connectDB } from "./config/database";
import { initSocket } from "./shared/services/socket.service";
import { startReminderJob } from "./shared/jobs/reminder.job";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    await connectDB();

    const httpServer = http.createServer(app);
    initSocket(httpServer);

    startReminderJob();

    httpServer.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
};

startServer();
