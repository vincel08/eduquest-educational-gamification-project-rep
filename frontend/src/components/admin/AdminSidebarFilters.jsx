import { useEffect, useState } from "react";
import {
  Box,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useAdminFilters } from "../../contexts/AdminFiltersContext";
import userService from "../../services/userService";
import { useClassSectionsRevision } from "../../utils/classSectionsEvents";

export default function AdminSidebarFilters() {
  const {
    schoolYear,
    gradeLevel,
    section,
    setSchoolYear,
    setGradeLevel,
    setSection,
    schoolYearOptions,
    gradeOptions,
    toQueryParams,
  } = useAdminFilters();
  const sectionsRevision = useClassSectionsRevision();
  const [sections, setSections] = useState([]);

  useEffect(() => {
    let active = true;
    const params = toQueryParams();
    delete params.section;
    userService
      .listSections(params)
      .then((response) => {
        if (!active) return;
        const next = response.data.data || [];
        setSections(next);
        setSection((current) =>
          current !== "all" && !next.includes(current) ? "all" : current,
        );
      })
      .catch(() => {
        if (!active) return;
        setSections([]);
        setSection((current) => (current !== "all" ? "all" : current));
      });
    return () => {
      active = false;
    };
  }, [schoolYear, gradeLevel, toQueryParams, sectionsRevision, setSection]);

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
        <TextField
          select
          size="small"
          label="Section"
          value={section}
          onChange={(event) => setSection(event.target.value)}
          fullWidth
        >
          <MenuItem value="all">All sections</MenuItem>
          {sections.map((item) => (
            <MenuItem key={item} value={item}>
              {item}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
    </Box>
  );
}
