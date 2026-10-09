import { describe, expect, it } from "vitest";
import { BROWSER_CORS_HEADERS, corsPreflightResponse } from "./cors.js";

describe("corsPreflightResponse", () => {
  it("répond 204 avec les en-têtes CORS à une requête OPTIONS", () => {
    const res = corsPreflightResponse(new Request("https://x.test/fn", { method: "OPTIONS" }));
    expect(res?.status).toBe(204);
    expect(res?.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("renvoie null pour une requête qui n'est pas un preflight", () => {
    expect(corsPreflightResponse(new Request("https://x.test/fn", { method: "POST", body: "{}" }))).toBeNull();
  });

  it("autorise les en-têtes envoyés par supabase.functions.invoke", () => {
    const allowed = BROWSER_CORS_HEADERS["Access-Control-Allow-Headers"]!.split(",").map((h) => h.trim());
    expect(allowed).toEqual(expect.arrayContaining(["authorization", "x-client-info", "apikey", "content-type"]));
  });
});
