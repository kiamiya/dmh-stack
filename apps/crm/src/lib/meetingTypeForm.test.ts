import { describe, expect, it } from "vitest";
import { buildMeetingTypePayload, emptyMeetingTypeForm, meetingTypeToForm, publicBookingUrl } from "./meetingTypeForm";
import type { MeetingType } from "@dmh/types";

describe("buildMeetingTypePayload", () => {
  it("formulaire par défaut + nom : valide, slug déduit du nom", () => {
    const { payload, errors } = buildMeetingTypePayload({ ...emptyMeetingTypeForm(), name: "Découverte 30 min" });
    expect(errors).toEqual([]);
    expect(payload).toMatchObject({
      name: "Découverte 30 min",
      slug: "decouverte-30-min",
      duration_minutes: 30,
      buffer_minutes: 15,
      video_provider: "teams",
      location: null,
      reminder_hours: [24],
      redirect_url: null,
    });
    expect(payload?.weekly_availability).toHaveLength(5);
  });

  it("signale chaque erreur", () => {
    const { payload, errors } = buildMeetingTypePayload({
      ...emptyMeetingTypeForm(),
      slug: "Mauvais Slug",
      durationMinutes: 0,
      weeklyAvailability: [{ day: 1, start: "12:00", end: "10:00" }],
      questions: [{ id: "q", label: "", type: "text", required: false }],
      reminderHours: [200],
      redirectUrl: "http://site.fr/merci",
    });
    expect(payload).toBeNull();
    expect(errors).toEqual([
      "Le nom est obligatoire.",
      "Le lien personnalisé ne peut contenir que des minuscules, chiffres et tirets.",
      "La durée doit être comprise entre 5 et 480 minutes.",
      "Une plage horaire est invalide (l'heure de fin doit suivre l'heure de début).",
      "Une question est incomplète (libellé manquant, ou liste de choix vide).",
      "Un rappel doit être compris entre 1 et 168 heures avant le RDV.",
      "La page de remerciement doit être une adresse https://.",
    ]);
  });

  it("exige au moins une plage", () => {
    expect(buildMeetingTypePayload({ ...emptyMeetingTypeForm(), name: "X", weeklyAvailability: [] }).errors).toEqual([
      "Ajoute au moins une plage de disponibilité.",
    ]);
  });

  it("lieu conservé seulement sans visio ; rappels dédoublonnés et triés", () => {
    const { payload } = buildMeetingTypePayload({
      ...emptyMeetingTypeForm(),
      name: "Visite",
      videoProvider: "none",
      location: " Bureaux DMH ",
      reminderHours: [1, 24, 1],
    });
    expect(payload).toMatchObject({ location: "Bureaux DMH", reminder_hours: [24, 1] });
  });
});

describe("meetingTypeToForm", () => {
  it("relit une ligne en base, JSON normalisé", () => {
    const row = {
      id: "t1",
      booking_page_id: "p1",
      slug: "demo",
      name: "Démo",
      description: null,
      duration_minutes: 45,
      buffer_minutes: 10,
      min_notice_hours: 12,
      max_days_ahead: 20,
      video_provider: "teams",
      location: null,
      timezone: "Europe/Paris",
      weekly_availability: [{ day: 2, start: "10:00", end: "12:00" }, { day: 9 }],
      questions: "corrompu",
      reminder_hours: [24],
      redirect_url: null,
      active: false,
      position: 0,
      created_at: "",
      updated_at: "",
    } as MeetingType;
    expect(meetingTypeToForm(row)).toMatchObject({
      name: "Démo",
      description: "",
      durationMinutes: 45,
      weeklyAvailability: [{ day: 2, start: "10:00", end: "12:00" }],
      questions: [],
      active: false,
    });
  });
});

describe("publicBookingUrl", () => {
  it("page et type", () => {
    expect(publicBookingUrl("https://crm.dmh.fr/", "acme")).toBe("https://crm.dmh.fr/rdv/acme");
    expect(publicBookingUrl("https://crm.dmh.fr", "acme", "demo")).toBe("https://crm.dmh.fr/rdv/acme/demo");
  });
});
