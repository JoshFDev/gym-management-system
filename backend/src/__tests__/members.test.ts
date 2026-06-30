import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";
import { getAuthToken } from "./setup";

describe("Members CRUD", () => {
    let token: string;

    beforeAll(async () => {
        token = await getAuthToken();
    });

    it("POST /api/members — debería crear un miembro", async () => {
        const res = await request(app)
            .post("/api/members")
            .set("Authorization", `Bearer ${token}`)
            .send({
                firstName: "Carlos",
                lastName: "Mendoza",
                email: "carlos@test.com",
                phone: "5512345678",
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.firstName).toBe("Carlos");
    });

    it("GET /api/members — debería listar miembros con paginación", async () => {
        await request(app)
            .post("/api/members")
            .set("Authorization", `Bearer ${token}`)
            .send({ firstName: "List", lastName: "Test", phone: "5511111111" });

        const res = await request(app)
            .get("/api/members")
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.total).toBe(1);
    });

    it("GET /api/members?search= — debería filtrar por búsqueda", async () => {
        await request(app)
            .post("/api/members")
            .set("Authorization", `Bearer ${token}`)
            .send({ firstName: "Searchable", lastName: "Person", phone: "5511111111" });

        const res = await request(app)
            .get("/api/members?search=searchable")
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
    });

    it("GET /api/members/:id — debería obtener un miembro por ID", async () => {
        const createRes = await request(app)
            .post("/api/members")
            .set("Authorization", `Bearer ${token}`)
            .send({ firstName: "GetBy", lastName: "Id", phone: "5511111111" });

        const memberId = createRes.body.data.id;

        const res = await request(app)
            .get(`/api/members/${memberId}`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.data.firstName).toBe("GetBy");
    });

    it("PUT /api/members/:id — debería actualizar un miembro", async () => {
        const createRes = await request(app)
            .post("/api/members")
            .set("Authorization", `Bearer ${token}`)
            .send({ firstName: "Update", lastName: "Test", phone: "5511111111" });

        const memberId = createRes.body.data.id;

        const res = await request(app)
            .put(`/api/members/${memberId}`)
            .set("Authorization", `Bearer ${token}`)
            .send({ phone: "5598765432" });

        expect(res.status).toBe(200);
        expect(res.body.data.phone).toBe("5598765432");
    });

    it("DELETE /api/members/:id — debería desactivar un miembro", async () => {
        const createRes = await request(app)
            .post("/api/members")
            .set("Authorization", `Bearer ${token}`)
            .send({ firstName: "Deactivate", lastName: "Me", phone: "5511111111" });

        const memberId = createRes.body.data.id;

        const res = await request(app)
            .delete(`/api/members/${memberId}`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.data.membershipStatus).toBe("inactive");
    });

    it("DELETE /api/members/:id/force — debería eliminar un miembro inactivo", async () => {
        const createRes = await request(app)
            .post("/api/members")
            .set("Authorization", `Bearer ${token}`)
            .send({ firstName: "ForceDelete", lastName: "Me", phone: "5511111111" });

        const memberId = createRes.body.data.id;

        await request(app)
            .delete(`/api/members/${memberId}`)
            .set("Authorization", `Bearer ${token}`);

        const res = await request(app)
            .delete(`/api/members/${memberId}/force`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it("debería rechazar crear miembro sin autenticación", async () => {
        const res = await request(app)
            .post("/api/members")
            .send({ firstName: "No", lastName: "Auth", phone: "5511111111" });

        expect(res.status).toBe(401);
    });

    it("GET /api/members/:id — debería devolver 404 si no existe", async () => {
        const res = await request(app)
            .get("/api/members/507f1f77bcf86cd799439011")
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Miembro no encontrado.");
    });
});
