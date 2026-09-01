import { describe, expect, it, vi } from "vitest";
import { getStoredTheme, nextTheme, resolveEffectiveTheme, setStoredTheme, themeLabel } from "./theme";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
    _data: data,
  };
}

describe("getStoredTheme", () => {
  it("retourne system par défaut si rien n'est stocké", () => {
    expect(getStoredTheme(fakeStorage())).toBe("system");
  });

  it("retourne la valeur stockée si valide", () => {
    expect(getStoredTheme(fakeStorage({ "dmh-crm-theme": "dark" }))).toBe("dark");
  });

  it("retombe sur system si la valeur stockée est invalide", () => {
    expect(getStoredTheme(fakeStorage({ "dmh-crm-theme": "n'importe quoi" }))).toBe("system");
  });
});

describe("setStoredTheme", () => {
  it("écrit la valeur", () => {
    const storage = fakeStorage();
    setStoredTheme(storage, "dark");
    expect(storage._data["dmh-crm-theme"]).toBe("dark");
  });

  it("ne lève pas si setItem échoue", () => {
    const storage = { setItem: vi.fn(() => { throw new Error("quota"); }) };
    expect(() => setStoredTheme(storage, "dark")).not.toThrow();
  });
});

describe("resolveEffectiveTheme", () => {
  it("retourne light/dark tels quels", () => {
    expect(resolveEffectiveTheme("light", true)).toBe("light");
    expect(resolveEffectiveTheme("dark", false)).toBe("dark");
  });

  it("résout system selon la préférence OS", () => {
    expect(resolveEffectiveTheme("system", true)).toBe("dark");
    expect(resolveEffectiveTheme("system", false)).toBe("light");
  });
});

describe("nextTheme", () => {
  it("fait défiler dans l'ordre clair -> sombre -> système -> clair", () => {
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("system");
    expect(nextTheme("system")).toBe("light");
  });
});

describe("themeLabel", () => {
  it("retourne un libellé FR pour chaque thème", () => {
    expect(themeLabel("light")).toBe("Clair");
    expect(themeLabel("dark")).toBe("Sombre");
    expect(themeLabel("system")).toBe("Système");
  });
});
