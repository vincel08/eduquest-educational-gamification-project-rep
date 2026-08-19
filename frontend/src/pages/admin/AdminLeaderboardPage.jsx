import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import PageHeader from "../../components/common/PageHeader";
import LoadingScreen from "../../components/common/LoadingScreen";
import gamificationService from "../../services/gamificationService";
import { getErrorMessage } from "../../services/api";
import { useAdminFilters } from "../../contexts/AdminFiltersContext";

export default function AdminLeaderboardPage() {
  const { toQueryParams, schoolYear, gradeLevel, section } = useAdminFilters();
  const [period, setPeriod] = useState("overall");
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const filterParams = useMemo(() => toQueryParams(), [toQueryParams]);

  useEffect(() => {
    setLoading(true);
    gamificationService
      .leaderboard({ limit: 20, period, ...filterParams })
      .then((response) => setRows(response.data.data || []))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [period, schoolYear, gradeLevel, section, filterParams]);

  const schoolYearLabel =
    schoolYear === "all" ? "all school years" : `SY ${schoolYear}`;
  const gradeLabel = gradeLevel === "all" ? "all grades" : gradeLevel;
  const sectionLabel = section === "all" ? "all sections" : `Section ${section}`;

  if (loading) return <LoadingScreen />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <>
      <PageHeader
        title="Leaderboard"
        subtitle={`XP rankings for ${schoolYearLabel} · ${gradeLabel} · ${sectionLabel} (${period}).`}
      />
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          select
          size="small"
          label="Period"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="overall">Overall</MenuItem>
          <MenuItem value="monthly">Monthly</MenuItem>
          <MenuItem value="weekly">Weekly</MenuItem>
        </TextField>
      </Stack>

      <Paper sx={{ p: 2 }}>
        {!rows.length ? (
          <Typography color="text.secondary">No rankings for this filter set.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Rank</TableCell>
                <TableCell>Student</TableCell>
                <TableCell align="right">XP</TableCell>
                <TableCell align="right">Level</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.userId}>
                  <TableCell>{row.rank}</TableCell>
                  <TableCell>
                    {row.firstName} {row.lastName}
                  </TableCell>
                  <TableCell align="right">{row.xp}</TableCell>
                  <TableCell align="right">{row.level}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </>
  );
}
