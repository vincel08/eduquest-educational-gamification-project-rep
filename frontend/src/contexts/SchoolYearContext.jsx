import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import schoolYearService from "../services/schoolYearService";
import LoadingScreen from "../components/common/LoadingScreen";
import {
  applyConfiguredSchoolYear,
  defaultSchoolYearValue,
  formatSchoolYearLabel,
  calendarSchoolYearStartYear,
  listCalendarSchoolYearOptions,
  listSchoolYearOptions,
} from "../utils/schoolYears";

export const SCHOOL_YEAR_CHANGED_EVENT = "eduwow:school-year-changed";

const SchoolYearContext = createContext(null);

function fallbackSnapshot() {
  const schoolYear = formatSchoolYearLabel(calendarSchoolYearStartYear());
  applyConfiguredSchoolYear(null);
  return {
    schoolYear,
    calendarSchoolYear: schoolYear,
    configured: false,
    options: listSchoolYearOptions({ includeAll: false }),
    settableYears: listCalendarSchoolYearOptions(),
    nextSchoolYear: null,
    refresh: null,
  };
}

export function SchoolYearProvider({ children }) {
  const [snapshot, setSnapshot] = useState(null);

  const applySnapshot = useCallback((data, { notify = false } = {}) => {
    applyConfiguredSchoolYear(data?.schoolYear);
    const next = {
      schoolYear: data.schoolYear || defaultSchoolYearValue(),
      calendarSchoolYear: data.calendarSchoolYear || data.schoolYear,
      start: data.start || null,
      endExclusive: data.endExclusive || null,
      configured: Boolean(data.configured),
      options: data.options || listSchoolYearOptions({ includeAll: false }),
      settableYears: data.settableYears || data.options || [],
      nextSchoolYear: data.nextSchoolYear || null,
      refresh: data.refresh || null,
    };
    setSnapshot(next);
    if (notify && next.schoolYear) {
      window.dispatchEvent(
        new CustomEvent(SCHOOL_YEAR_CHANGED_EVENT, {
          detail: { schoolYear: next.schoolYear, refresh: next.refresh },
        }),
      );
    }
    return next;
  }, []);

  useEffect(() => {
    let active = true;
    schoolYearService
      .getCurrent()
      .then((response) => {
        if (!active) return;
        applySnapshot(response.data.data || {});
      })
      .catch(() => {
        if (!active) return;
        setSnapshot(fallbackSnapshot());
      });
    return () => {
      active = false;
    };
  }, [applySnapshot]);

  const value = useMemo(
    () => ({
      ready: Boolean(snapshot),
      schoolYear: snapshot?.schoolYear || defaultSchoolYearValue(),
      calendarSchoolYear: snapshot?.calendarSchoolYear || null,
      start: snapshot?.start || null,
      endExclusive: snapshot?.endExclusive || null,
      configured: Boolean(snapshot?.configured),
      options: snapshot?.options || [],
      settableYears: snapshot?.settableYears || [],
      nextSchoolYear: snapshot?.nextSchoolYear || null,
      refresh: snapshot?.refresh || null,
      applySnapshot,
    }),
    [snapshot, applySnapshot],
  );

  if (!snapshot) {
    return <LoadingScreen label="Loading school year..." />;
  }

  return (
    <SchoolYearContext.Provider value={value}>
      {children}
    </SchoolYearContext.Provider>
  );
}

export function useSchoolYear() {
  const context = useContext(SchoolYearContext);
  if (!context) {
    throw new Error("useSchoolYear must be used within SchoolYearProvider");
  }
  return context;
}
