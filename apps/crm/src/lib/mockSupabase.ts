import type { ProspectStatus } from "@dmh/types";
import { mockClients, mockCompanies, mockContacts, mockMessages, mockProspects } from "./mockData";

/**
 * Client Supabase factice pour le mode démo local (`SUPABASE_DEMO_MODE=true`
 * dans `.env.local`, jamais commité/poussé) — reproduit le sous-ensemble de
 * l'API `@supabase/supabase-js` réellement utilisé par `apps/crm`
 * (auth.getSession/onAuthStateChange/signInWithPassword/signOut,
 * from().select().order()/.eq()/.single()/.maybeSingle()/.update()).
 * Sert uniquement quand le vrai projet Supabase est injoignable — jamais
 * une source de vérité, ne remplace pas un vrai test fonctionnel.
 */

type Listener = (event: string, session: MockSession | null) => void;

interface MockSession {
  user: { id: string; email: string };
}

function findCompany(id: string) {
  return mockCompanies.find((c) => c.id === id) ?? null;
}
function findContact(id: string) {
  return mockContacts.find((c) => c.id === id) ?? null;
}
function findClient(id: string) {
  return mockClients.find((c) => c.id === id) ?? null;
}

class MockQuery<T> implements PromiseLike<{ data: T | null; error: { message: string } | null }> {
  private eqFilters: Array<[string, string]> = [];
  private mode: "list" | "single" | "maybeSingle" = "list";
  private updatePatch: Record<string, unknown> | null = null;

  constructor(private table: string) {}

  select(_columns: string) {
    return this;
  }

  order(_column: string, _opts?: { ascending?: boolean }) {
    return this;
  }

  limit(_n: number) {
    return this;
  }

  eq(column: string, value: string) {
    this.eqFilters.push([column, value]);
    return this;
  }

  single() {
    this.mode = "single";
    return this;
  }

  maybeSingle() {
    this.mode = "maybeSingle";
    return this;
  }

  update(patch: Record<string, unknown>) {
    this.updatePatch = patch;
    return this;
  }

  private execute(): { data: unknown; error: { message: string } | null } {
    if (this.updatePatch) return this.executeUpdate();

    if (this.table === "prospects") return this.executeProspectsSelect();
    if (this.table === "messages_generated") return this.executeMessagesSelect();

    return { data: this.mode === "list" ? [] : null, error: null };
  }

  private executeUpdate(): { data: unknown; error: { message: string } | null } {
    const idFilter = this.eqFilters.find(([col]) => col === "id");
    if (!idFilter) return { data: null, error: { message: "update sans filtre id (mock)" } };
    const [, id] = idFilter;

    if (this.table === "prospects") {
      const prospect = mockProspects.find((p) => p.id === id);
      if (prospect && this.updatePatch) {
        Object.assign(prospect, this.updatePatch as { status?: ProspectStatus });
      }
    }
    if (this.table === "messages_generated") {
      const message = mockMessages.find((m) => m.id === id);
      if (message && this.updatePatch) {
        Object.assign(message, this.updatePatch);
      }
    }
    return { data: null, error: null };
  }

  private executeProspectsSelect() {
    let rows = mockProspects.slice();
    const idFilter = this.eqFilters.find(([col]) => col === "id");
    if (idFilter) rows = rows.filter((p) => p.id === idFilter[1]);

    const joined = rows.map((p) => ({
      id: p.id,
      status: p.status,
      companies: findCompany(p.company_id),
      contacts: findContact(p.contact_id),
      dmh_clients: findClient(p.client_id),
    }));

    if (this.mode === "single") {
      return { data: joined[0] ?? null, error: joined[0] ? null : { message: "Prospect introuvable (mock)" } };
    }
    if (this.mode === "maybeSingle") {
      return { data: joined[0] ?? null, error: null };
    }
    return { data: joined, error: null };
  }

  private executeMessagesSelect() {
    let rows = mockMessages.slice();
    const prospectFilter = this.eqFilters.find(([col]) => col === "prospect_id");
    if (prospectFilter) rows = rows.filter((m) => m.prospect_id === prospectFilter[1]);
    rows = rows.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));

    if (this.mode === "maybeSingle" || this.mode === "single") {
      return { data: rows[0] ?? null, error: null };
    }
    return { data: rows, error: null };
  }

  then<TResult1 = { data: T | null; error: { message: string } | null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: T | null; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    const result = this.execute() as { data: T | null; error: { message: string } | null };
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }
}

export function createMockSupabaseClient() {
  let session: MockSession | null = null;
  const listeners = new Set<Listener>();

  const auth = {
    async getSession() {
      return { data: { session } };
    },
    onAuthStateChange(callback: Listener) {
      listeners.add(callback);
      return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
    },
    async signInWithPassword({ email }: { email: string; password: string }) {
      session = { user: { id: "mock-staff-id", email: email || "demo@dmhassocies.com" } };
      listeners.forEach((cb) => cb("SIGNED_IN", session));
      return { data: { session }, error: null };
    },
    async signOut() {
      session = null;
      listeners.forEach((cb) => cb("SIGNED_OUT", null));
      return { error: null };
    },
  };

  return {
    auth,
    from(table: string) {
      return new MockQuery(table);
    },
  };
}
