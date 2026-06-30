import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../modules/auth/auth.model";
import { UserRole } from "../modules/auth/auth.types";
import { generateToken } from "../utils/jwt";

let mongoServer: MongoMemoryServer;
let userCounter = 0;

beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.LOG_LEVEL = "silent";
    process.env.JWT_SECRET = "test-secret-key";

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        // Don't wipe users — test suites reuse the admin token
        if (key === "users") continue;
        await collections[key].deleteMany({});
    }
});

export const createTestUser = async (overrides: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: UserRole;
}> = {}) => {
    const id = ++userCounter;
    const data = {
        firstName: "Admin",
        lastName: "Test",
        email: `admin${id}@test.com`,
        password: await bcrypt.hash("Password123!", 12),
        role: UserRole.ADMIN as UserRole,
        ...overrides,
    };
    return User.create(data);
};

export const getAuthToken = async (overrides?: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: UserRole;
}>) => {
    const user = await createTestUser(overrides);
    return generateToken({ userId: user._id.toString(), role: user.role });
};

export const getAuthTokenForUser = (user: { _id: { toString(): string }; role: string }) =>
    generateToken({ userId: user._id.toString(), role: user.role });
