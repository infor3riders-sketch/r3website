import { describe, expect, it } from "vitest";
import { normalizePermissions, permissionsFromForm } from "./member-permissions";

describe("member permissions", () => {
  it("uses the defaults when settings are missing or malformed: changes allowed, roster printing off", () => {
    for (const v of [null, [], { rsvp: "no", print_roster: "yes" }]) {
      const p = normalizePermissions(v);
      expect(p.rsvp && p.edit_profile && p.submit_dues).toBe(true);
      expect(p.print_roster).toBe(false);
    }
  });

  it("only an explicit false turns a permission off", () => {
    const p = normalizePermissions({ edit_profile: false, rsvp: true });
    expect(p.edit_profile).toBe(false);
    expect(p.rsvp).toBe(true);
    expect(p.submit_dues).toBe(true);
    expect(normalizePermissions({ print_roster: true }).print_roster).toBe(true);
  });

  it("reads checkboxes: unchecked means off", () => {
    const form: Record<string, string> = { rsvp: "on", volunteer: "on" };
    expect(permissionsFromForm((k) => form[k])).toEqual({ edit_profile: false, manage_motorcycles: false, rsvp: true, volunteer: true, submit_dues: false, print_roster: false });
  });
});
