import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";

describe("POST /api/auth/register", () => {
    it("debería registrar un usuario nuevo", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({
                firstName: "Juan",
                lastName: "Pérez",
                email: "juan@test.com",
                password: "Pass1234!",
                role: "admin",
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Usuario registrado exitosamente.");
        expect(res.body.data.email).toBe("juan@test.com");
    });

    it("debería rechazar registro con correo duplicado", async () => {
        await request(app)
            .post("/api/auth/register")
            .send({ firstName: "Ana", lastName: "Luna", email: "dup@test.com", password: "Pass1234!", role: "admin" });

        const res = await request(app)
            .post("/api/auth/register")
            .send({ firstName: "Carlos", lastName: "Mora", email: "dup@test.com", password: "Pass1234!", role: "admin" });

        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("El correo ya está registrado.");
    });

    it("debería rechazar registro con datos inválidos", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({ firstName: "", lastName: "", email: "invalido", password: "123" });

        expect(res.status).toBe(400);
    });
});

describe("POST /api/auth/login", () => {
    it("debería iniciar sesión con credenciales válidas", async () => {
        await request(app)
            .post("/api/auth/register")
            .send({ firstName: "Ana", lastName: "López", email: "ana@test.com", password: "Pass1234!", role: "receptionist" });

        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "ana@test.com", password: "Pass1234!" });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.token).toBeDefined();
        expect(res.body.data.user.email).toBe("ana@test.com");
    });

    it("debería rechazar login con contraseña incorrecta", async () => {
        await request(app)
            .post("/api/auth/register")
            .send({ firstName: "Luis", lastName: "García", email: "luis@test.com", password: "Pass1234!", role: "receptionist" });

        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "luis@test.com", password: "wrongpass" });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });

    it("debería rechazar login con correo inexistente", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "noexiste@test.com", password: "Pass1234!" });

        expect(res.status).toBe(401);
    });
});
