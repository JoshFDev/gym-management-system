import bcrypt from "bcrypt";
import User from "./modules/auth/auth.model";
import { UserRole } from "./modules/auth/auth.types";

export async function seedAdmin() {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) return;

    const existing = await User.findOne({ email: adminEmail }).collation({ locale: "en", strength: 2 });
    if (existing) return;

    const firstName = process.env.ADMIN_FIRST_NAME || "Admin";
    const lastName = process.env.ADMIN_LAST_NAME || "ZenithGym";
    const password = process.env.ADMIN_PASSWORD;
    if (!password) {
        console.warn("ADMIN_PASSWORD not set — skipping admin seed");
        return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await User.create({
        firstName,
        lastName,
        email: adminEmail,
        password: hashedPassword,
        role: UserRole.ADMIN,
        isActive: true,
        isOwner: true,
    });

    console.log(`Admin user created: ${firstName} ${lastName} (${adminEmail})`);
}
