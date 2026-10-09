import type { BookingQuestion } from "@dmh/booking";

/** S39-5 — appels de la page publique de réservation à l'Edge Function `booking-public` (HTTP direct, sans session). */
export interface PublicMeetingType {
  slug: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  videoProvider: "teams" | "none";
  location: string | null;
  timezone: string;
  questions: BookingQuestion[];
}

export interface PublicBookingRequest {
  slotStart: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
  answers: Record<string, string | boolean>;
  website: string;
}

export class PublicBookingError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

async function call<T>(functionsBaseUrl: string, body: Record<string, unknown>, fetchImpl: typeof fetch): Promise<T> {
  const res = await fetchImpl(`${functionsBaseUrl}/booking-public`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new PublicBookingError(data.error ?? "Erreur inconnue", res.status, data.fields ?? {});
  return data as T;
}

export function fetchPublicBookingPage(functionsBaseUrl: string, page: string, fetchImpl: typeof fetch = fetch) {
  return call<{ page: { title: string; description: string | null }; types: PublicMeetingType[] }>(
    functionsBaseUrl,
    { action: "page", page },
    fetchImpl,
  );
}

export function fetchPublicSlots(functionsBaseUrl: string, page: string, type: string, fetchImpl: typeof fetch = fetch) {
  return call<{ type: PublicMeetingType; slots: Array<{ start: string; end: string }> }>(
    functionsBaseUrl,
    { action: "slots", page, type },
    fetchImpl,
  );
}

export function submitPublicBooking(
  functionsBaseUrl: string,
  page: string,
  type: string,
  request: PublicBookingRequest,
  fetchImpl: typeof fetch = fetch,
) {
  return call<{ ok: true; redirectUrl: string | null }>(functionsBaseUrl, { action: "request", page, type, ...request }, fetchImpl);
}

/** S39-8 — lien « reprogrammer / annuler » du prospect. */
export interface ManagedMeeting {
  meeting: { status: "pending" | "confirmed" | "declined" | "cancelled"; startsAt: string; endsAt: string; guestName: string | null; onlineMeetingUrl: string | null };
  type: PublicMeetingType | null;
  rights: { canCancel: boolean; canReschedule: boolean; reason: string | null };
  slots: Array<{ start: string; end: string }>;
}

export function fetchManagedMeeting(functionsBaseUrl: string, token: string, fetchImpl: typeof fetch = fetch) {
  return call<ManagedMeeting>(functionsBaseUrl, { action: "manage-get", token }, fetchImpl);
}

export function cancelManagedMeeting(functionsBaseUrl: string, token: string, fetchImpl: typeof fetch = fetch) {
  return call<{ ok: true; status: "cancelled" }>(functionsBaseUrl, { action: "manage-cancel", token }, fetchImpl);
}

export function rescheduleManagedMeeting(functionsBaseUrl: string, token: string, slotStart: string, fetchImpl: typeof fetch = fetch) {
  return call<{ ok: true; status: "pending" }>(functionsBaseUrl, { action: "manage-reschedule", token, slotStart }, fetchImpl);
}
