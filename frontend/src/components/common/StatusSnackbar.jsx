import { Alert, Snackbar } from "@mui/material";

export default function StatusSnackbar({
  message = "",
  severity = "error",
  onClose,
}) {
  return (
    <Snackbar
      open={Boolean(message)}
      autoHideDuration={7000}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        severity={severity}
        variant="filled"
        onClose={onClose}
        sx={{ width: "100%", maxWidth: 520 }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
