import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";
import { getAuthToken } from "./setup";

describe("Plans CRUD", () => {
    let token: string;

    beforeAll(async () => {
        token = await getAuthToken();
    });

    it("POST /api/plans — debería crear un plan", async () => {
        const res = await request(app)
            .post("/api/plans")
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "Plan Básico", price: 299, durationDays: 30 });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe("Plan Básico");
    });

    it("POST /api/plans — debería rechazar nombre duplicado", async () => {
        await request(app)
            .post("/api/plans")
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "Plan Único", price: 199, durationDays: 15 });

        const res = await request(app)
            .post("/api/plans")
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "Plan Único", price: 199, durationDays: 15 });

        expect(res.status).toBe(409);
        expect(res.body.message).toBe("El plan ya existe.");
    });

    it("POST /api/plans — debería rechazar sin autenticación", async () => {
        const res = await request(app)
            .post("/api/plans")
            .send({ name: "Sin Token", price: 100, durationDays: 10 });

        expect(res.status).toBe(401);
    });

    it("GET /api/plans — debería listar planes", async () => {
        await request(app)
            .post("/api/plans")
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "Plan List", price: 100, durationDays: 10 });

        const res = await request(app)
            .get("/api/plans")
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("GET /api/plans/:id — debería obtener un plan por ID", async () => {
        const createRes = await request(app)
            .post("/api/plans")
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "Plan ById", price: 150, durationDays: 20 });

        const planId = createRes.body.data.id;

        const res = await request(app)
            .get(`/api/plans/${planId}`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.data.name).toBe("Plan ById");
    });

    it("PUT /api/plans/:id — debería actualizar un plan", async () => {
        const createRes = await request(app)
            .post("/api/plans")
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "Plan Update", price: 200, durationDays: 30 });

        const planId = createRes.body.data.id;

        const res = await request(app)
            .put(`/api/plans/${planId}`)
            .set("Authorization", `Bearer ${token}`)
            .send({ price: 349 });

        expect(res.status).toBe(200);
        expect(res.body.data.price).toBe(349);
    });

    it("DELETE /api/plans/:id — debería desactivar un plan", async () => {
        const createRes = await request(app)
            .post("/api/plans")
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "Plan Deactivate", price: 200, durationDays: 30 });

        const planId = createRes.body.data.id;

        const res = await request(app)
            .delete(`/api/plans/${planId}`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe("inactive");
    });

    it("PATCH /api/plans/:id/reactivate — debería reactivar un plan", async () => {
        const createRes = await request(app)
            .post("/api/plans")
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "Plan Reactivate", price: 200, durationDays: 30 });

        const planId = createRes.body.data.id;

        await request(app)
            .delete(`/api/plans/${planId}`)
            .set("Authorization", `Bearer ${token}`);

        const res = await request(app)
            .patch(`/api/plans/${planId}/reactivate`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe("active");
    });

    it("DELETE /api/plans/:id — debería rechazar sin rol admin", async () => {
        const createRes = await request(app)
            .post("/api/plans")
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "Plan Auth", price: 200, durationDays: 30 });

        const planId = createRes.body.data.id;
        const receptionistToken = await getAuthToken({ role: "receptionist" as any });

        const res = await request(app)
            .delete(`/api/plans/${planId}`)
            .set("Authorization", `Bearer ${receptionistToken}`);

        expect(res.status).toBe(403);
    });
});
