import { useEffect, useMemo, useState } from "react";
import { Alert, MenuItem, Stack, TextField } from "@mui/material";
import PageHeader from "../../components/common/PageHeader";
import LoadingScreen from "../../components/common/LoadingScreen";
import LeaderboardCard from "../../components/gamification/LeaderboardCard";
import gamificationService from "../../services/gamificationService";
import { getErrorMessage } from "../../services/api";
import {
  listSchoolYearOptions,
  schoolYearChoiceMissing,
} from "../../utils/schoolYears";
import { useSchoolYear } from "../../contexts/SchoolYearContext";

export default function StudentLeaderboardPage() {
  const { schoolYear: currentSchoolYear, options: managedYears } = useSchoolYear();
  const schoolYearOptions = useMemo(
    () =>
      managedYears.length
        ? managedYears
        : listSchoolYearOptions({ includeAll: false }),
    [managedYears, currentSchoolYear],
  );
  const [entries, setEntries] = useState([]);
  const [period, setPeriod] = useState("overall");
  const [schoolYear, setSchoolYear] = useState(currentSchoolYear);

  useEffect(() => {
    if (!schoolYearOptions.length) return;
    if (schoolYearOptions.some((option) => option.value === schoolYear)) return;
    const nextYear = schoolYearOptions.some(
      (option) => option.value === currentSchoolYear,
    )
      ? currentSchoolYear
      : schoolYearOptions[0].value;
    if (nextYear !== schoolYear) setSchoolYear(nextYear);
  }, [schoolYearOptions, schoolYear, currentSchoolYear]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError("");
    const params = { limit: 20, period };
    if (schoolYear && schoolYear !== "all") {
      params.schoolYear = schoolYear;
    }
    gamificationService
      .leaderboard(params)
      .then((response) => setEntries(response.data.data || []))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [period, schoolYear]);

  if (loading && !entries.length) return <LoadingScreen />;

  const schoolYearLabel =
    schoolYear === "all" ? "all school years" : `SY ${schoolYear}`;

  return (
    <>
      <PageHeader
        title="Leaderboard"
        subtitle={`XP rankings for ${schoolYearLabel} (${period}).`}
      />
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <TextField
          select
          label="School year"
          value={schoolYear}
          onChange={(e) => setSchoolYear(e.target.value)}
          fullWidth
          sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 200 } }}
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
          label="Period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          fullWidth
          sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 180 } }}
        >
          <MenuItem value="weekly">Weekly</MenuItem>
          <MenuItem value="monthly">Monthly</MenuItem>
          <MenuItem value="overall">Overall</MenuItem>
        </TextField>
      </Stack>
      {!loading && !entries.length ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          No XP activity for this school year / period yet.
        </Alert>
      ) : null}
      <LeaderboardCard entries={entries} />
    </>
  );
}
