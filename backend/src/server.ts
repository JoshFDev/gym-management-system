import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connectDB } from "./config/database";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
};

startServer();