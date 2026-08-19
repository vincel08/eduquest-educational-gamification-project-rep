import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { GRADE_LEVELS } from "../utils/gradeLevels";
import {
  defaultSchoolYearValue,
  listSchoolYearOptions,
} from "../utils/schoolYears";

const STORAGE_KEY = "eduwow_admin_filters";

const AdminFiltersContext = createContext(null);

function readStoredFilters() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const current = defaultSchoolYearValue();
    const schoolYear = parsed.schoolYear || current;
    const allowed = new Set([
      "all",
      ...listSchoolYearOptions({ count: 1, includeAll: false }).map(
        (option) => option.value,
      ),
    ]);
    return {
      schoolYear: allowed.has(schoolYear) ? schoolYear : current,
      gradeLevel: parsed.gradeLevel || "all",
      section: parsed.section || "all",
    };
  } catch {
    return null;
  }
}

export function AdminFiltersProvider({ children }) {
  const [filters, setFilters] = useState(
    () =>
      readStoredFilters() || {
        schoolYear: defaultSchoolYearValue(),
        gradeLevel: "all",
        section: "all",
      },
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  const setSchoolYear = useCallback((schoolYear) => {
    setFilters((prev) => ({ ...prev, schoolYear, section: "all" }));
  }, []);

  const setGradeLevel = useCallback((gradeLevel) => {
    setFilters((prev) => ({ ...prev, gradeLevel, section: "all" }));
  }, []);

  const setSection = useCallback((sectionOrUpdater) => {
    setFilters((prev) => {
      const next =
        typeof sectionOrUpdater === "function"
          ? sectionOrUpdater(prev.section)
          : sectionOrUpdater;
      if (next === prev.section) return prev;
      return { ...prev, section: next };
    });
  }, []);
  const toQueryParams = useCallback(() => {
    const params = {};
    if (filters.schoolYear && filters.schoolYear !== "all") {
      params.schoolYear = filters.schoolYear;
    }
    if (filters.gradeLevel && filters.gradeLevel !== "all") {
      params.gradeLevel = filters.gradeLevel;
    }
    if (filters.section && filters.section !== "all") {
      params.section = filters.section;
    }
    return params;
  }, [filters]);

  const schoolYearOptions = useMemo(
    () => listSchoolYearOptions({ count: 1, includeAll: true }),
    [],
  );

  const value = useMemo(
    () => ({
      schoolYear: filters.schoolYear,
      gradeLevel: filters.gradeLevel,
      section: filters.section,
      setSchoolYear,
      setGradeLevel,
      setSection,
      toQueryParams,
      schoolYearOptions,
      gradeOptions: GRADE_LEVELS,
    }),
    [
      filters,
      setSchoolYear,
      setGradeLevel,
      setSection,
      toQueryParams,
      schoolYearOptions,
    ],
  );

  return (
    <AdminFiltersContext.Provider value={value}>
      {children}
    </AdminFiltersContext.Provider>
  );
}

export function useAdminFilters() {
  const context = useContext(AdminFiltersContext);
  if (!context) {
    throw new Error("useAdminFilters must be used within AdminFiltersProvider");
  }
  return context;
}
