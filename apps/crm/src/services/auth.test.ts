import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  RESET_PASSWORD_PATH,
  isPlausibleEmail,
  passwordResetRedirectUrl,
  requestPasswordReset,
  requestStaffSignup,
  validateNewPassword,
  verifyCurrentPassword,
} from "./auth";

function authClient(auth: Record<string, unknown>) {
  return { auth } as unknown as SupabaseClient;
}

describe("validateNewPassword", () => {
  it("refuse un mot de passe trop court", () => {
    expect(validateNewPassword("abc", "abc")).toMatch(/au moins/);
  });

  it("refuse si les deux mots de passe ne correspondent pas", () => {
    expect(validateNewPassword("abcdef", "abcdefg")).toMatch(/correspondent/);
  });

  it("accepte un mot de passe valide et confirmé", () => {
    expect(validateNewPassword("abcdef", "abcdef")).toBeNull();
  });
});

describe("passwordResetRedirectUrl", () => {
  it("ramène vers la page de réinitialisation de l'origine courante", () => {
    expect(passwordResetRedirectUrl("https://dmh-stack.vercel.app")).toBe(`https://dmh-stack.vercel.app${RESET_PASSWORD_PATH}`);
  });

  it("ignore une barre oblique finale", () => {
    expect(passwordResetRedirectUrl("http://localhost:5173/")).toBe("http://localhost:5173/reset-password");
  });
});

describe("isPlausibleEmail", () => {
  it("accepte une adresse ordinaire, espaces autour compris", () => {
    expect(isPlausibleEmail(" lrd@dmhassocies.com ")).toBe(true);
  });

  it("refuse une adresse sans domaine ou avec un espace", () => {
    expect(isPlausibleEmail("lrd@dmhassocies")).toBe(false);
    expect(isPlausibleEmail("lrd @dmhassocies.com")).toBe(false);
  });
});

describe("requestPasswordReset", () => {
  it("envoie l'e-mail avec l'adresse de retour du CRM, sans espaces autour de l'adresse", async () => {
    const resetPasswordForEmail = vi.fn(async () => ({ error: null }));
    await requestPasswordReset(authClient({ resetPasswordForEmail }), " lrd@dmhassocies.com ", "https://dmh-stack.vercel.app");
    expect(resetPasswordForEmail).toHaveBeenCalledWith("lrd@dmhassocies.com", {
      redirectTo: "https://dmh-stack.vercel.app/reset-password",
    });
  });

  it("traduit la limite d'envoi de Supabase en message clair", async () => {
    const resetPasswordForEmail = vi.fn(async () => ({ error: { status: 429, message: "email rate limit exceeded" } }));
    await expect(requestPasswordReset(authClient({ resetPasswordForEmail }), "a@b.fr", "https://x.fr")).rejects.toThrow(
      "réessaie dans une heure",
    );
  });

  it("remonte toute autre erreur telle quelle", async () => {
    const resetPasswordForEmail = vi.fn(async () => ({ error: { status: 500, message: "panne" } }));
    await expect(requestPasswordReset(authClient({ resetPasswordForEmail }), "a@b.fr", "https://x.fr")).rejects.toThrow("panne");
  });
});

describe("verifyCurrentPassword", () => {
  it("passe quand le mot de passe actuel est bon", async () => {
    const signInWithPassword = vi.fn(async () => ({ error: null }));
    await expect(verifyCurrentPassword(authClient({ signInWithPassword }), "a@b.fr", "secret")).resolves.toBeUndefined();
    expect(signInWithPassword).toHaveBeenCalledWith({ email: "a@b.fr", password: "secret" });
  });

  it("refuse avec un message clair quand il est faux", async () => {
    const signInWithPassword = vi.fn(async () => ({ error: { message: "Invalid login credentials" } }));
    await expect(verifyCurrentPassword(authClient({ signInWithPassword }), "a@b.fr", "faux")).rejects.toThrow(
      "Mot de passe actuel incorrect.",
    );
  });
});

describe("requestStaffSignup", () => {
  function functionsClient(invoke: (...args: unknown[]) => Promise<unknown>) {
    return { functions: { invoke } } as unknown as SupabaseClient;
  }

  it("appelle staff-signup avec le nom, l'adresse et l'origine du CRM", async () => {
    const invoke = vi.fn(async () => ({ data: { ok: true, status: "invited" }, error: null }));
    await expect(
      requestStaffSignup(functionsClient(invoke), { name: "Loïc", email: "lrd@dmhassocies.com" }, "https://dmh-stack.vercel.app"),
    ).resolves.toBe("invited");
    expect(invoke).toHaveBeenCalledWith("staff-signup", {
      body: { name: "Loïc", email: "lrd@dmhassocies.com", origin: "https://dmh-stack.vercel.app" },
    });
  });

  it("signale un compte déjà existant", async () => {
    const invoke = vi.fn(async () => ({ data: { ok: true, status: "already_registered" }, error: null }));
    await expect(requestStaffSignup(functionsClient(invoke), { name: "L", email: "a@dmhassocies.com" }, "https://x.fr")).resolves.toBe(
      "already_registered",
    );
  });

  it("remonte le message de la fonction plutôt que l'erreur HTTP générique", async () => {
    const invoke = vi.fn(async () => ({
      data: null,
      error: { message: "Edge Function returned a non-2xx status code", context: { json: async () => ({ error: "Réservé à @dmhassocies.com" }) } },
    }));
    await expect(requestStaffSignup(functionsClient(invoke), { name: "L", email: "a@gmail.com" }, "https://x.fr")).rejects.toThrow(
      "Réservé à @dmhassocies.com",
    );
  });
});
