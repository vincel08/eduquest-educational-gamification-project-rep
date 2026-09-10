import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

export default function LeavePlayDialog({
  open,
  activityLabel = 'this activity',
  leaving = false,
  onStay,
  onLeave,
}) {
  return (
    <Dialog
      open={Boolean(open)}
      onClose={leaving ? undefined : onStay}
      disableEscapeKeyDown={leaving}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningAmberRoundedIcon color="warning" />
        Leave {activityLabel}?
      </DialogTitle>
      <DialogContent>
        <DialogContentText component="div">
          If you leave now:
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>Your current progress will be lost</li>
            <li>Your score will be submitted as-is (unanswered items count as wrong)</li>
            <li>This attempt will be used up</li>
          </ul>
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onStay} disabled={leaving} variant="outlined">
          Stay and continue
        </Button>
        <Button
          onClick={onLeave}
          disabled={leaving}
          color="error"
          variant="contained"
        >
          {leaving ? 'Leaving…' : 'Leave anyway'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
