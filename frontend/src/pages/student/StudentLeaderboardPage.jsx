import { useEffect, useMemo, useState } from "react";
import { Alert, MenuItem, Stack, TextField } from "@mui/material";
import PageHeader from "../../components/common/PageHeader";
import LoadingScreen from "../../components/common/LoadingScreen";
import LeaderboardCard from "../../components/gamification/LeaderboardCard";
import gamificationService from "../../services/gamificationService";
import { getErrorMessage } from "../../services/api";
import {
  listSchoolYearOptions,
} from "../../utils/schoolYears";

export default function StudentLeaderboardPage() {
  const schoolYearOptions = useMemo(
    () => listSchoolYearOptions({ count: 1, pastCount: 3, includeAll: true }),
    [],
  );
  const [entries, setEntries] = useState([]);
  const [period, setPeriod] = useState("overall");
  const [schoolYear, setSchoolYear] = useState("all");
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
          sx={{ minWidth: 200 }}
        >
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
          sx={{ minWidth: 180 }}
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
