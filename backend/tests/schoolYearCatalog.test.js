import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  managedSchoolYearError,
  normalizeManagedSchoolYear,
  schoolYearTiming,
} from "../utils/schoolYears.js";
import {
  applyConfiguredSchoolYear,
  applySchoolYearCatalog,
  currentSchoolYearStartYear,
  listSchoolYearOptions,
  managedSchoolYearError as frontendManagedError,
  schoolYearTiming as frontendTiming,
} from "../../frontend/src/utils/schoolYears.js";

const november2026 = new Date("2026-11-11T00:00:00");

describe("school year catalog", () => {
  it("classifies previous, current, and future against the system year", () => {
    assert.equal(schoolYearTiming("2025-2026", november2026), "previous");
    assert.equal(schoolYearTiming("2026-2027", november2026), "current");
    assert.equal(schoolYearTiming("2027-2028", november2026), "future");
    assert.equal(frontendTiming("2028-2029", november2026), "future");
  });

  it("accepts a start year and rejects years outside the managed range", () => {
    assert.equal(normalizeManagedSchoolYear("2027"), "2027-2028");
    assert.equal(normalizeManagedSchoolYear(" 2025-2026 "), "2025-2026");
    assert.equal(managedSchoolYearError("2027-2028", november2026), "");
    assert.match(managedSchoolYearError("1999-2000", november2026), /2000-2001/);
    assert.match(managedSchoolYearError("school", november2026), /2026-2027/);
    assert.equal(frontendManagedError("2024-2025", november2026), "");
  });

  it("adds catalog years to menus without changing the current school year", () => {
    try {
      applyConfiguredSchoolYear("2026-2027");
      applySchoolYearCatalog([
        { value: "2027-2028", label: "SY 2027-2028" },
        { value: "2025-2026", label: "SY 2025-2026" },
        { value: "2026-2027", label: "SY 2026-2027" },
      ]);

      assert.equal(currentSchoolYearStartYear(november2026), 2026);
      assert.deepEqual(
        listSchoolYearOptions({ includeAll: false }).map((option) => option.value),
        ["2025-2026", "2026-2027", "2027-2028"],
      );
    } finally {
      applySchoolYearCatalog(null);
      applyConfiguredSchoolYear(null);
    }
  });
});
