import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';

/**
 * App-styled confirmation dialog (replaces window.confirm).
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  details,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColor = 'primary',
  loading = false,
  loadingLabel,
  onClose,
  onConfirm,
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog
      open={Boolean(open)}
      onClose={() => {
        if (loading) return;
        onClose?.();
      }}
      fullWidth
      maxWidth="xs"
      fullScreen={fullScreen}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {typeof description === 'string' ? (
          <Typography>{description}</Typography>
        ) : (
          description
        )}
        {details ? (
          typeof details === 'string' ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              {details}
            </Typography>
          ) : (
            details
          )
        ) : null}
      </DialogContent>
      <DialogActions
        sx={{
          px: 3,
          pb: 2,
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 1,
        }}
      >
        <Button onClick={onClose} disabled={loading} fullWidth={fullScreen}>
          {cancelLabel}
        </Button>
        <Button
          color={confirmColor}
          variant="contained"
          disabled={loading}
          onClick={onConfirm}
          fullWidth={fullScreen}
        >
          {loading ? (loadingLabel || 'Working…') : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
