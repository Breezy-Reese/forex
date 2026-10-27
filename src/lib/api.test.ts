import { afterEach, describe, expect, it, vi } from "vitest";
import { closeTrade, getPairHistory, moveFunds, openTrade, signIn } from "./api";

function mockFetch(body: unknown, status = 200) {
  const f = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", f);
  return f;
}
afterEach(() => vi.unstubAllGlobals());

describe("api client", () => {
  it("sends credentials and JSON, and unwraps the user on sign in", async () => {
    const f = mockFetch({ user: { id: "1" }, token: "t" });
    const u = await signIn({ data: { email: "a@b.co", password: "pw" } });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://localhost:4000/api/auth/login");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(init.body).toBe(JSON.stringify({ email: "a@b.co", password: "pw" }));
    expect(u).toEqual({ id: "1" });
  });
  it("encodes the pair in history requests", async () => {
    const f = mockFetch([]);
    await getPairHistory({ data: { pair: "EUR/USD" } });
    expect((f.mock.calls[0] as unknown as [string])[0]).toContain("pair=EUR%2FUSD");
  });
  it("maps wallet moves and trade close to their routes", async () => {
    const f = mockFetch({ ok: true });
    await moveFunds({ data: { type: "withdraw", amount: 50 } });
    await openTrade({ data: { pair: "EUR/USD", side: "buy", units: 1000 } });
    await closeTrade({ data: { id: "abc" } });
    const urls = f.mock.calls.map((c) => (c as unknown as [string])[0]);
    expect(urls).toEqual([
      "http://localhost:4000/api/wallet/withdraw",
      "http://localhost:4000/api/trades",
      "http://localhost:4000/api/trades/abc/close",
    ]);
  });
  it("surfaces the backend's error message", async () => {
    mockFetch({ error: "Wrong email or password" }, 401);
    await expect(signIn({ data: { email: "a@b.co", password: "x" } })).rejects.toThrow("Wrong email or password");
  });
  it("gives a friendly message when the backend is down", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));
    await expect(signIn({ data: { email: "a@b.co", password: "x" } })).rejects.toThrow(/Can't reach the server/);
  });
});
