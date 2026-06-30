import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";
import { getAuthToken } from "./setup";

describe("Subscriptions", () => {
    let token: string;

    beforeAll(async () => {
        token = await getAuthToken();
    });

    const createPlanMember = async () => {
        const planRes = await request(app)
            .post("/api/plans")
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "Plan Mensual", price: 499, durationDays: 30 });
        const planId = planRes.body.data.id;

        const memberRes = await request(app)
            .post("/api/members")
            .set("Authorization", `Bearer ${token}`)
            .send({ firstName: "Suscriptor", lastName: "Test", phone: "5511112222" });
        const memberId = memberRes.body.data.id;

        return { planId, memberId };
    };

    it("POST /api/subscriptions — debería crear una suscripción", async () => {
        const { planId, memberId } = await createPlanMember();

        const res = await request(app)
            .post("/api/subscriptions")
            .set("Authorization", `Bearer ${token}`)
            .send({ memberId, planId });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.member.fullName).toContain("Suscriptor");
        expect(res.body.data.plan.name).toBe("Plan Mensual");
        expect(res.body.data.status).toBe("active");
    });

    it("POST /api/subscriptions — debería rechazar miembro inexistente", async () => {
        const { planId } = await createPlanMember();

        const res = await request(app)
            .post("/api/subscriptions")
            .set("Authorization", `Bearer ${token}`)
            .send({ memberId: "507f1f77bcf86cd799439011", planId });

        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Miembro no encontrado.");
    });

    it("GET /api/subscriptions — debería listar suscripciones", async () => {
        const { planId, memberId } = await createPlanMember();
        await request(app)
            .post("/api/subscriptions")
            .set("Authorization", `Bearer ${token}`)
            .send({ memberId, planId });

        const res = await request(app)
            .get("/api/subscriptions")
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it("PUT /api/subscriptions/:id/renew — debería renovar suscripción", async () => {
        const { planId, memberId } = await createPlanMember();
        const subRes = await request(app)
            .post("/api/subscriptions")
            .set("Authorization", `Bearer ${token}`)
            .send({ memberId, planId });
        const subId = subRes.body.data.id;

        const res = await request(app)
            .put(`/api/subscriptions/${subId}/renew`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it("PATCH /api/subscriptions/:id/cancel — debería cancelar suscripción", async () => {
        const { planId, memberId } = await createPlanMember();
        const subRes = await request(app)
            .post("/api/subscriptions")
            .set("Authorization", `Bearer ${token}`)
            .send({ memberId, planId });
        const subId = subRes.body.data.id;

        const res = await request(app)
            .patch(`/api/subscriptions/${subId}/cancel`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe("cancelled");
    });

    it("PATCH /api/subscriptions/:id/cancel — debería rechazar cancelar ya cancelada", async () => {
        const { planId, memberId } = await createPlanMember();
        const subRes = await request(app)
            .post("/api/subscriptions")
            .set("Authorization", `Bearer ${token}`)
            .send({ memberId, planId });
        const subId = subRes.body.data.id;

        await request(app)
            .patch(`/api/subscriptions/${subId}/cancel`)
            .set("Authorization", `Bearer ${token}`);

        const res = await request(app)
            .patch(`/api/subscriptions/${subId}/cancel`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("La suscripción ya está cancelada.");
    });

    it("DELETE /api/subscriptions/:id — debería eliminar suscripción cancelada", async () => {
        const { planId, memberId } = await createPlanMember();
        const subRes = await request(app)
            .post("/api/subscriptions")
            .set("Authorization", `Bearer ${token}`)
            .send({ memberId, planId });
        const subId = subRes.body.data.id;

        await request(app)
            .patch(`/api/subscriptions/${subId}/cancel`)
            .set("Authorization", `Bearer ${token}`);

        const res = await request(app)
            .delete(`/api/subscriptions/${subId}`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
    });
});
