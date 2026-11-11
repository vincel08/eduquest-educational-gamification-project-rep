import { useEffect, useState } from "react";
import {
  Box,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useLocation } from "react-router-dom";
import { useAdminFilters } from "../../contexts/AdminFiltersContext";
import userService from "../../services/userService";
import {
  formatSectionWithGrade,
  normalizeSectionOptions,
  parseSectionOptionValue,
  reconcileSectionFilter,
  sectionOptionValue,
  sectionSelectValue,
} from "../../utils/classSections";
import { useClassSectionsRevision } from "../../utils/classSectionsEvents";
import { schoolYearChoiceMissing } from "../../utils/schoolYears";

/** Badges & Medals are global system unlockables — not roster-scoped. */
function hideFiltersForPath(pathname) {
  return pathname.startsWith("/admin/badges");
}

/** Quiz/game banks are subject-scoped, not section-roster scoped. */
function hideSectionForPath(pathname) {
  return (
    pathname.startsWith("/admin/quizzes") || pathname.startsWith("/admin/games")
  );
}

export default function AdminSidebarFilters() {
  const location = useLocation();
  const {
    schoolYear,
    gradeLevel,
    section,
    setSchoolYear,
    setGradeLevel,
    setGradeAndSection,
    setSection,
    schoolYearOptions,
    gradeOptions,
    toQueryParams,
  } = useAdminFilters();
  const sectionsRevision = useClassSectionsRevision();
  const [sections, setSections] = useState([]);
  const hideFilters = hideFiltersForPath(location.pathname);
  const hideSection = hideSectionForPath(location.pathname);

  useEffect(() => {
    if (hideFilters || hideSection) {
      setSections([]);
      return undefined;
    }

    let active = true;
    const params = toQueryParams();
    delete params.section;
    userService
      .listSections(params)
      .then((response) => {
        if (!active) return;
        const next = normalizeSectionOptions(response.data.data || []);
        setSections(next);
        const reconciled = reconcileSectionFilter(next, gradeLevel, section);
        if (!reconciled) return;
        if (reconciled.gradeLevel !== gradeLevel) {
          setGradeAndSection(reconciled.gradeLevel, reconciled.section);
          return;
        }
        setSection(reconciled.section);
      })
      .catch(() => {
        if (!active) return;
        setSections([]);
        setSection((current) => (current !== "all" ? "all" : current));
      });
    return () => {
      active = false;
    };
  }, [
    hideFilters,
    hideSection,
    schoolYear,
    gradeLevel,
    toQueryParams,
    sectionsRevision,
    section,
    setGradeAndSection,
    setSection,
  ]);

  const selectedSection = sectionSelectValue(sections, gradeLevel, section);
  const selectedSectionListed = sections.some(
    (item) => sectionOptionValue(item.gradeLevel, item.name) === selectedSection,
  );

  if (hideFilters) return null;

  return (
    <Box sx={{ px: 1.5, pb: 1.5 }}>
      <Divider sx={{ mb: 1.5 }} />
      <Typography
        variant="caption"
        color="text.secondary"
        fontWeight={800}
        sx={{
          display: "block",
          mb: 1,
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        Filters
      </Typography>
      <Stack spacing={1.25}>
        <TextField
          select
          size="small"
          label="School Year"
          value={schoolYear}
          onChange={(event) => setSchoolYear(event.target.value)}
          fullWidth
        >
          {schoolYearChoiceMissing(schoolYearOptions, schoolYear) ? (
            <MenuItem value={schoolYear}>SY {schoolYear}</MenuItem>
          ) : null}
          {schoolYearOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Level / Grade"
          value={gradeLevel}
          onChange={(event) => setGradeLevel(event.target.value)}
          fullWidth
        >
          <MenuItem value="all">All grades</MenuItem>
          {gradeOptions.map((grade) => (
            <MenuItem key={grade} value={grade}>
              {grade}
            </MenuItem>
          ))}
        </TextField>
        {hideSection ? null : (
          <TextField
            select
            size="small"
            label="Section"
            value={selectedSection}
            onChange={(event) => {
              const parsed = parseSectionOptionValue(event.target.value);
              if (!parsed) {
                setSection("all");
                return;
              }
              setGradeAndSection(parsed.gradeLevel, parsed.name);
            }}
            fullWidth
          >
            <MenuItem value="all">All sections</MenuItem>
            {sections.map((item) => (
              <MenuItem
                key={`${item.gradeLevel}-${item.name}`}
                value={sectionOptionValue(item.gradeLevel, item.name)}
              >
                {item.label}
              </MenuItem>
            ))}
            {selectedSection !== "all" && !selectedSectionListed ? (
              <MenuItem value={selectedSection}>
                {formatSectionWithGrade(section, gradeLevel)}
              </MenuItem>
            ) : null}
          </TextField>
        )}
      </Stack>
    </Box>
  );
}
