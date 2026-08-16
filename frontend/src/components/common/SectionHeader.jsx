import { Box, Button, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export default function SectionHeader({
  title,
  subtitle,
  actionLabel,
  actionTo,
  icon,
}) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      justifyContent="space-between"
      alignItems={{ sm: "center" }}
      sx={{ mb: 2 }}
    >
      <Box>
        <Stack direction="row" spacing={1} alignItems="center">
          {icon}
          <Typography variant="h6" fontWeight={900}>
            {title}
          </Typography>
        </Stack>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {actionLabel && actionTo ? (
        <Button
          component={RouterLink}
          to={actionTo}
          size="small"
          variant="outlined"
        >
          {actionLabel}
        </Button>
      ) : null}
    </Stack>
  );
}
