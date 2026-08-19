import { useEffect, useState } from "react";

const EVENT_NAME = "eduwow:class-sections-changed";
const STORAGE_KEY = "eduwow_class_sections_rev";

/** Call after class section create / update / delete so selects & filters refresh. */
export function notifyClassSectionsChanged() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // ignore quota / private mode
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT_NAME));
  }
}

/** Bumps when class sections catalog changes (same tab or other tabs). */
export function useClassSectionsRevision() {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    const onStorage = (event) => {
      if (event.key === STORAGE_KEY) bump();
    };
    window.addEventListener(EVENT_NAME, bump);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, bump);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return revision;
}
