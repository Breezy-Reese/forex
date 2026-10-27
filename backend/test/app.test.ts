import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

process.env.MONGODB_URI = "mongodb://127.0.0.1:1"; // never reached by these tests
process.env.JWT_SECRET = "test-secret-test-secret-test-secret";

let app: import("express").Express;
beforeAll(async () => {
  const { createApp } = await import("../src/app.js");
  app = createApp();
});

describe("API surface (no database needed)", () => {
  it("health check", async () => {
    const r = await request(app).get("/health");
    expect(r.status).toBe(200);
  });
  it("rejects protected routes without a session", async () => {
    for (const path of ["/api/portfolio", "/api/wallet", "/api/admin/overview"]) {
      const r = await request(app).get(path);
      expect(r.status).toBe(401);
    }
    const r = await request(app).post("/api/trades").send({ pair: "EUR/USD", side: "buy", units: 5000 });
    expect(r.status).toBe(401);
  });
  it("validates signup input before touching the database", async () => {
    const r = await request(app).post("/api/auth/signup").send({ name: "", email: "nope", password: "x" });
    expect(r.status).toBe(400);
    expect(r.body.error).toBeTruthy();
  });
  it("validates the pair on history", async () => {
    const r = await request(app).get("/api/market/history?pair=FOO/BAR");
    expect(r.status).toBe(400);
  });
  it("returns JSON 404 for unknown routes", async () => {
    const r = await request(app).get("/api/nope");
    expect(r.status).toBe(404);
  });
});
