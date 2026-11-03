import { describe, expect, it } from "vitest";
import { isBookableSlot } from "./bookings.functions";

// 2026-11-03 14:15 in Buenos Aires (UTC-3) = 17:15 UTC
const NOW = new Date("2026-11-03T17:15:00Z");

describe("isBookableSlot", () => {
  it("rejects a past date", () => expect(isBookableSlot("2026-11-02", "16:00", NOW)).toBe(false));
  it("rejects a time already past today (Buenos Aires time)", () => expect(isBookableSlot("2026-11-03", "14:00", NOW)).toBe(false));
  it("accepts a later time today", () => expect(isBookableSlot("2026-11-03", "14:30", NOW)).toBe(true));
  it("accepts 60 days ahead", () => expect(isBookableSlot("2027-01-02", "10:00", NOW)).toBe(true));
  it("rejects more than 60 days ahead", () => expect(isBookableSlot("2027-01-03", "10:00", NOW)).toBe(false));
});
