import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
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
  return (
    <Dialog
      open={Boolean(open)}
      onClose={() => {
        if (loading) return;
        onClose?.();
      }}
      fullWidth
      maxWidth="xs"
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
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          color={confirmColor}
          variant="contained"
          disabled={loading}
          onClick={onConfirm}
        >
          {loading ? (loadingLabel || 'Working…') : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
