import mongoose from "mongoose";

export const connectDB = async (): Promise<void> => {
    try {
        await mongoose.connect(process.env.MONGO_URI as string);

        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("Error connecting to MongoDB");
        console.error(error);

        process.exit(1);
    }
};