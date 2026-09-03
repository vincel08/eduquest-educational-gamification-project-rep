import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import PageContainer from "../../components/common/PageContainer";
import LoadingScreen from "../../components/common/LoadingScreen";
import EmptyState from "../../components/common/EmptyState";
import ResponsiveTableContainer from "../../components/common/ResponsiveTableContainer";
import classSectionService from "../../services/classSectionService";
import { getErrorMessage } from "../../services/api";
import { useTeacherFilters } from "../../contexts/TeacherFiltersContext";

export default function TeacherSectionsPage() {
  const navigate = useNavigate();
  const {
    toQueryParams,
    schoolYear,
    gradeLevel,
    section: sectionFilter,
    setSection,
  } = useTeacherFilters();

  const [sections, setSections] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const filterParams = toQueryParams();
    const listParams = { limit: 200 };
    if (filterParams.schoolYear && filterParams.schoolYear !== "all") {
      listParams.schoolYear = filterParams.schoolYear;
    }
    if (filterParams.gradeLevel && filterParams.gradeLevel !== "all") {
      listParams.gradeLevel = filterParams.gradeLevel;
    }

    const response = await classSectionService.list(listParams);
    let nextSections = response.data.data.sections || [];
    if (filterParams.section && filterParams.section !== "all") {
      const wanted = String(filterParams.section).trim().toLowerCase();
      nextSections = nextSections.filter(
        (item) =>
          String(item.name || "")
            .trim()
            .toLowerCase() === wanted,
      );
    }
    setSections(nextSections);
  }, [toQueryParams]);

  useEffect(() => {
    setLoading(true);
    setError("");
    load()
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [load, schoolYear, gradeLevel, sectionFilter]);

  function openStudentsForSection(sectionName) {
    setSection(sectionName);
    navigate("/teacher/students");
  }

  if (loading) return <LoadingScreen label="Loading sections..." />;

  return (
    <PageContainer>
      <PageHeader
        title="Class Sections"
        subtitle="Browse sections for the selected school year and grade. Open a section to view its students."
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Paper sx={{ p: { xs: 1.5, sm: 2 } }}>
        {!sections.length ? (
          <EmptyState
            title="No sections found"
            description="Ask an administrator to add class sections for this school year and grade."
          />
        ) : (
          <ResponsiveTableContainer>
            <Table size="small" sx={{ minWidth: 520 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>School Year</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Grade</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Section</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Adviser</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Students</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sections.map((section) => (
                  <TableRow key={section.id} hover>
                    <TableCell>SY {section.schoolYear}</TableCell>
                    <TableCell>{section.gradeLevel}</TableCell>
                    <TableCell>
                      <Typography fontWeight={700}>{section.name}</Typography>
                    </TableCell>
                    <TableCell>{section.adviserName || "—"}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" justifyContent="flex-end">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => openStudentsForSection(section.name)}
                        >
                          View students
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ResponsiveTableContainer>
        )}
      </Paper>
    </PageContainer>
  );
}
